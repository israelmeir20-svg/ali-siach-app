// main.js - מנוע האתחול, הניווט וההתחברות המרכזי (עלי שיח SPA)

// 1. הגדרת משתני המצב הגלובליים של האפליקציה (Shared State)
window.appData = {};
window.teamMembers = [];
window.teamMessages = [];
window.shifts = []; // משתנה גלובלי חדש עבור מערכת המשמרות
window.currentUser = null;
window.cloudUrl = localStorage.getItem('aliSiachCloudUrl') || "";
window.isDarkMode = localStorage.getItem('aliSiachDarkMode') === 'true';
window.activeFilter = 'all';
window.activeDayFilter = 'all';
window.activeSortMode = localStorage.getItem('aliSiachSortMode') || 'manual';
window.searchQuery = '';
window.walkthroughItems = [];
window.walkthroughIndex = 0;
window.myChart = null;
window.activeEdit = null; 
window.viewMode = localStorage.getItem('aliSiachViewMode') || 'table'; 
window.messageCenterTab = 'received';

window.isNotificationOpen = false;
window.isChatOpen = false;
window.isAIChatOpen = false;

// 2. פונקציית האתחול הרשמית של האתר - רצה ברגע שטעינת ה-DOM מושלמת
async function init() {
    loadLocalBackupData(); 
    applyDarkModeStyles(); 
    buildUserLoginSelect(); 
    buildChatTargetSelect();
    
    // אתחול פאי-צ'ארט (הפונקציה יושבת בתוך inventory.js)
    if (typeof window.initChart === "function") {
        window.initChart(); 
    }
    
    // רנדור ראשוני של נתוני הדאשבורד
    renderDashboardData();
    
    // משיכת מידע עדכני משרת גוגל במידה והוגדר URL
    if (window.cloudUrl) { 
        const cloudInp = document.getElementById('cloud-url-input');
        if (cloudInp) cloudInp.value = window.cloudUrl; 
        
        if (typeof window.fetchCloudData === "function") {
            await window.fetchCloudData(); 
        }
    }
}
window.onload = init;

// 3. פונקציית הניווט המרכזית בין מסכי ה-SPA (החלפת הבמה המרכזית)
function switchView(viewId) {
    // אבטחה: מניעת מעבר בין מסכים אם המשתמש עדיין לא התחבר במערכת
    if (!window.currentUser && viewId !== 'view-dashboard') {
        window.showToast("יש להתחבר למערכת תחילה!", "🔒");
        return;
    }

    // א. הסתרת כל מכולות התוכן על הבמה המרכזית
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // ב. הצגת המכולה הספציפית שנבחרה
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.remove('hidden');
    }
    
    // ג. ניקוי עיצוב אקטיבי מכל לחצני סרגל הניווט הימני
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-700', 'text-white');
        btn.classList.add('hover:bg-slate-800', 'text-slate-400');
    });
    
    // ד. צביעת הכפתור הנוכחי שנלחץ בסגול בולט
    let targetBtnId = "btn-" + viewId.replace("view-", "");
    const activeBtn = document.getElementById(targetBtnId);
    if (activeBtn) {
        activeBtn.classList.remove('hover:bg-slate-800', 'text-slate-400');
        activeBtn.classList.add('bg-indigo-700', 'text-white');
    }
    
    // ה. הרצת פונקציות עדכון ורנדור ייעודיות לפי המסך שנפתח
    if (viewId === 'view-dashboard') {
        renderDashboardData();
    } else if (viewId === 'view-inventory') {
        if (typeof window.renderApp === "function") window.renderApp();
    } else if (viewId === 'view-shifts') {
        if (typeof window.renderWeeklyCalendar === "function") window.renderWeeklyCalendar();
    } else if (viewId === 'view-recipes') {
        if (typeof window.buildAILists === "function") window.buildAILists();
        if (typeof window.buildPantryManualSelectionDOM === "function") window.buildPantryManualSelectionDOM();
    }
}
window.switchView = switchView;

// 4. ניהול נתוני מסך הפתיחה (דאשבורד "מבט על")
function renderDashboardData() {
    const lowStockContainer = document.getElementById('dashboard-low-stock');
    if (!lowStockContainer) return;
    
    if (!window.appData || Object.keys(window.appData).length === 0) {
        lowStockContainer.innerHTML = `<p class="text-xs text-slate-400 italic">אין נתוני מלאי זמינים. חבר ענן או טען גיבוי.</p>`;
        return;
    }
    
    let lowStockItems = [];
    // סריקה מהירה של המלאי ואיתור מוצרים חסרים עבור לוח הבקרה של מסך הבית
    for (let category in window.appData) {
        window.appData[category].forEach(item => {
            let req = (parseFloat(item.recommended) || 0) - (parseFloat(item.existing) || 0);
            if (req > 0) {
                lowStockItems.push({ ...item, category: category, toOrder: req });
            }
        });
    }
    
    if (lowStockItems.length === 0) {
        lowStockContainer.innerHTML = `
            <div class="text-center py-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <p class="text-xs text-emerald-600 dark:text-emerald-400 font-bold">🎉 כל המלאי בדירה מלא ותקין! אין פריטים חסרים.</p>
            </div>`;
        return;
    }
    
    // בניית טבלת מחסור קומפקטית וממוקדת לדאשבורד
    let html = `
        <table class="w-full text-right text-xs text-slate-600 dark:text-slate-300">
            <thead>
                <tr class="text-[10px] font-black text-slate-400 uppercase border-b dark:border-slate-700">
                    <th class="pb-2">שם המוצר</th>
                    <th class="pb-2">מחלקה</th>
                    <th class="pb-2 text-center">קיים</th>
                    <th class="pb-2 text-center">יעד מומלץ</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50">
    `;
    
    // הצגת מקסימום 5 פריטים דחופים ביותר כדי לא להעמיס ויזואלית על מסך הפתיחה
    lowStockItems.slice(0, 5).forEach(item => {
        let itemEmoji = typeof window.getEmoji === "function" ? window.getEmoji(item.name) : "📦";
        html += `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 font-bold">
                <td class="py-2 flex items-center gap-1.5"><span class="text-base">${itemEmoji}</span><span>${item.name}</span></td>
                <td class="py-2 text-[10px] text-slate-400 font-normal">${item.category}</td>
                <td class="py-2 text-center text-red-500 font-black">${item.existing}</td>
                <td class="py-2 text-center text-slate-400">${item.recommended}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    if (lowStockItems.length > 5) {
        html += `<p class="text-[10px] text-indigo-600 dark:text-indigo-400 pt-2 cursor-pointer font-black" onclick="window.switchView('view-inventory')">+ ועוד ${lowStockItems.length - 5} מוצרים חסרים. לחץ לצפייה בניהול מלאי מלא...</p>`;
    }
    lowStockContainer.innerHTML = html;
    
    // קריאה דינמית לרנדור ווידג'ט המשמרות של היום בדאשבורד
    if (typeof window.renderTodayShiftsWidget === "function") {
        window.renderTodayShiftsWidget();
    }
}
window.renderDashboardData = renderDashboardData;

// 5. ניהול מערכת ההתחברות (Login / Logout) המקורית שלך
function buildUserLoginSelect() {
    const select = document.getElementById('login-user-select'); if (!select) return; select.innerHTML = '';
    window.teamMembers.forEach(m => { select.innerHTML += `<option value="${m.name}">${m.name} (${m.role === 'admin' ? 'מנהל' : 'מדריך'})</option>`; });
}
window.buildUserLoginSelect = buildUserLoginSelect;

function handleLogin() {
    const selectedName = document.getElementById('login-user-select').value; 
    const inputPin = document.getElementById('login-pin-input').value;
    const user = window.teamMembers.find(m => m.name === selectedName && m.pin === inputPin);
    if (user) { 
        window.currentUser = user; 
        document.getElementById('login-screen').classList.add('hidden'); 
        document.getElementById('current-user-display').innerText = user.name; 
        document.getElementById('current-shift-top-badge').classList.remove('hidden'); // מציג את תג התורן העליון
        
        if (user.role === 'admin') {
            document.getElementById('admin-management-section').classList.remove('hidden'); 
            document.getElementById('admin-calendar-controls-box').classList.remove('hidden'); // כפתורי אדמין ביומן
        }
        
        // מעדכן את הגרפים ומציג את הדאשבורד
        if (typeof window.updateChartData === "function") window.updateChartData();
        window.switchView('view-dashboard');
    } else { alert("קוד PIN שגוי! נסה שנית."); }
}
window.handleLogin = handleLogin;

function handleLogout() { 
    window.currentUser = null; 
    document.getElementById('login-pin-input').value = ''; 
    document.getElementById('login-screen').classList.remove('hidden'); 
    document.getElementById('admin-management-section').classList.add('hidden'); 
    document.getElementById('admin-calendar-controls-box').classList.add('hidden');
    document.getElementById('current-shift-top-badge').classList.add('hidden');
    window.switchView('view-dashboard'); 
}
window.handleLogout = handleLogout;

// 6. ניהול חלוניות פופאפ ותפריטי הודעות/התראות
function toggleNotificationDropdown() { 
    if (!window.currentUser) return; 
    const dropdown = document.getElementById('notification-dropdown'); 
    window.isNotificationOpen = !window.isNotificationOpen; 
    if (window.isNotificationOpen) { dropdown.classList.remove('hidden'); window.renderMessages(); } 
    else { dropdown.classList.add('hidden'); window.teamMessages.forEach(m => { if (!m.readBy.includes(window.currentUser.name)) m.readBy.push(window.currentUser.name); }); if(typeof window.renderApp === "function") window.renderApp(); } 
}
window.toggleNotificationDropdown = toggleNotificationDropdown;

function toggleFloatingChat() { 
    if (!window.currentUser) return; 
    const win = document.getElementById('floating-chat-window'); 
    window.isChatOpen = !window.isChatOpen; 
    if (window.isChatOpen) { 
        win.classList.remove('hidden'); 
        setMessageCenterTabUI();
        if (typeof window.renderChatMessages === "function") window.renderChatMessages(); 
    } else { 
        win.classList.add('hidden'); 
    } 
}
window.toggleFloatingChat = toggleFloatingChat;

function setMessageCenterTab(tab) { window.messageCenterTab = tab; setMessageCenterTabUI(); if (typeof window.renderChatMessages === "function") window.renderChatMessages(); }
window.setMessageCenterTab = setMessageCenterTab;

function setMessageCenterTabUI() {
    let tab = window.messageCenterTab;
    document.getElementById('msg-tab-received').className = tab === 'received' ? "px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white flex-1 text-center" : "px-2 py-1 rounded text-slate-500 dark:text-slate-300 flex-1 text-center";
    document.getElementById('msg-tab-sent').className = tab === 'sent' ? "px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white flex-1 text-center" : "px-2 py-1 rounded text-slate-500 dark:text-slate-300 flex-1 text-center";
    document.getElementById('msg-tab-archive').className = tab === 'archive' ? "px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white flex-1 text-center" : "px-2 py-1 rounded text-slate-500 dark:text-slate-300 flex-1 text-center";
}

function toggleDarkMode() { window.isDarkMode = !window.isDarkMode; localStorage.setItem('aliSiachDarkMode', window.isDarkMode); applyDarkModeStyles(); }
window.toggleDarkMode = toggleDarkMode;

function applyDarkModeStyles() {
    const btn = document.getElementById('dark-mode-toggle-btn');
    if (window.isDarkMode) { document.documentElement.classList.add('dark'); if(btn) btn.innerText = "פעיל"; } 
    else { document.documentElement.classList.remove('dark'); if(btn) btn.innerText = "כבוי"; }
}

// 7. תשתית פנימית לניהול זיכרון מטמון מקומי (Cache Management)
function loadLocalBackupData() {
    try {
        const cached = localStorage.getItem('aliSiachLocalCache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.appData && Array.isArray(parsed.teamMembers)) {
                window.appData = parsed.appData; 
                window.teamMembers = parsed.teamMembers; 
                window.teamMessages = parsed.teamMessages || [];
                if (parsed.vegetableMatrix) window.vegetableMatrix = parsed.vegetableMatrix;
                if (parsed.toolMatrix) window.toolMatrix = parsed.toolMatrix;
                return;
            }
        }
    } catch (e) { console.error("שגיאה בטעינת קאש מקומי:", e); }
    
    // נתוני ברירת מחדל במידה והדפדפן נקי לחלוטין
    window.appData = { "טואלטיקה וניקיון": [], "מוצרים יבשים ושימורים": [] };
    window.teamMembers = [
        { name: "בצלאל", pin: "1234", role: "admin" }, 
        { name: "אסתי", pin: "5678", role: "admin" }, 
        { name: "אבריימי", pin: "1111", role: "staff" }, 
        { name: "יהודה", pin: "2222", role: "staff" }
    ];
    window.teamMessages = [];
}

// מערכת טוסטר צף להתראות מהירות
function showToast(msg, icon = "✨") { 
    const t = document.getElementById('toast'); 
    document.getElementById('toast-message').innerText = msg; 
    document.getElementById('toast-icon').innerText = icon; 
    t.classList.remove('translate-y-20', 'opacity-0'); 
    t.classList.add('translate-y-0', 'opacity-100'); 
    setTimeout(() => { 
        t.classList.remove('translate-y-0', 'opacity-100'); 
        t.classList.add('translate-y-20', 'opacity-0'); 
    }, 3000); 
}
window.showToast = showToast;
// מנוע אייקוני SVG וקטוריים אחיד ומקצועי לעלי שיח (תומך במעבר עכבר צץ)
function getIconHtml(name) {
    // מילון מפות ה-SVG הוקטוריים עבור כל המערכת
    const svgMap = {
        "מלפפון": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5c3-3 1.5-10.5 4.5-13.5s10.5-1.5 13.5 4.5-1.5 10.5-4.5 13.5-10.5 1.5-13.5-4.5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M9 13.5c.5-.5 1-1.5 1-2.5M13.5 10c.5-.5 1.5-1 2.5-1" /></svg>`,
        
        "חסה": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-1.5 0-3 1-3.5 2.5C7.5 5 6 6 5.5 7.5 4 8 3 9.5 3 11c0 2 1.5 3.5 3.5 4 .5 1.5 2 2.5 3.5 2.5h4c1.5 0 3-1 3.5-2.5 2-.5 3.5-2 3.5-4 0-1.5-1-3-2.5-3.5-.5-1.5-2-2.5-3.5-2.5H12Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 17.5V11m0 0c-1-1-2.5-1.5-4-1m4 1c1-1 2.5-1.5 4-1" /></svg>`,
        
        "קולרבי": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><circle cx="12" cy="14" r="5" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 9V4M12 4c1-.5 2-1 3-1M14.5 10.5l3.5-3.5M9.5 10.5L6 7" /></svg>`,
        
        "קישוא": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 16.5c2-4 6-10.5 10.5-12.5s7.5 1 8.5 3.5-1.5 7.5-6 10.5-11 2.5-13-1.5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21.5 6.5l1.25-1.25M8 14.5c2-1 4-3 5-5" /></svg>`,
        
        "דלורית": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3.5c-1.5 0-2.5 1-2.5 2.5 0 1.5 1 2 1 3.5s-4 1.5-4 5.5c0 3.5 2.5 5.5 5.5 5.5s5.5-2 5.5-5.5c0-4-4-4-4-5.5s1-2 1-3.5c0-1.5-1-2.5-2.5-2.5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 3.5V2" /></svg>`,
        
        "תפוח עץ": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6C9.5 3.5 4 4.5 4 11c0 4.5 4 8 8 9.5 4-1.5 8-5 8-9.5 0-6.5-5.5-7.5-8-5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V3M12 4.5c1.5-.5 3-1.5 4-1.5" /></svg>`,
        
        "תפוז": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><circle cx="12" cy="12" r="8.25" /><circle cx="12" cy="5" r="0.5" fill="currentColor" /><path stroke-linecap="round" stroke-linejoin="round" d="M11.5 5.5l1-1M12.5 5.5l-1-1M9 10h.008M15 11h.008M10 14h.008M14 15h.008" /></svg>`,
        
        "אפרסק": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20c4.5 0 7.5-3.5 7.5-8s-3-7.5-7.5-7.5S4.5 8 4.5 12s3 8 7.5 8Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5V20M12 4.5c1-1 2.5-1.5 3.5-1" /></svg>`,
        
        "גמבה": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75C6 6.75 4.5 8.5 4.5 12c0 4.5 2 6.75 4.5 6.75A3.75 3.75 0 0 0 12 17.25a3.75 3.75 0 0 0 3 1.5c2.5 0 4.5-2.25 4.5-6.75 0-3.5-1.5-5.25-3.75-5.25" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75V4M8.25 6.75a3.75 3.75 0 0 0 7.5 0" /></svg>`,
        "פלפל": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75C6 6.75 4.5 8.5 4.5 12c0 4.5 2 6.75 4.5 6.75A3.75 3.75 0 0 0 12 17.25a3.75 3.75 0 0 0 3 1.5c2.5 0 4.5-2.25 4.5-6.75 0-3.5-1.5-5.25-3.75-5.25" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75V4M8.25 6.75a3.75 3.75 0 0 0 7.5 0" /></svg>`,

        // כלי מטבח מהסבב הקודם
        "מחבת ללא מכסה בשרית": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13h12c0 2.5-1.5 4.5-4.5 4.5h-3C4.5 17.5 3 15.5 3 13Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 14h6" /></svg>`,
        "סיר שטוח עם מכסה בשרי": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4 13h16v4c0 1.5-1 2.5-2.5 2.5h-11C5 19.5 4 18.5 4 13Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M4 15H2v2h2M20 15h2v2h-2M3.5 13h17M10 13v-2h4v2" /></svg>`,
        "סיר קטן גבוה עם מכסה בשרי": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M7 10h10v8c0 1.5-1 2.5-2.5 2.5h-5C8 20.5 7 19.5 7 10Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M7 12H5v2h2M17 12h2v2h-2M6.5 10h11M10 10V7.5h4V10" /></svg>`,
        "סיר רגיל עם מכסה בשרי": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4 11h16v7c0 2-1.5 3-3 3H7c-1.5 0-3-1-3-3v-7Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M4 14c-1.5 0-2-.5-2-2s.5-2 2-2M20 14c1.5 0 2-.5 2-2s-.5-2-2-2M3.5 11c0-1.5 3.5-2.5 8.5-2.5s8.5 1 8.5 2.5M10 8.5V6.5h4v1.5" /></svg>`,
        "סכין": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 4.5c-1-1-3.5 1-8 6L5 17v2h2.5l6.5-6.5c5-4.5 7-7 6-8Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M5 17l-1.5 1.5c-.5.5-.5 1.5 0 2s1.5.5 2 0L7 19" /></svg>`,
        "פומפייה": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M8 6h8l3 14H5L8 6Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M9.5 6V3.5h5V6" /><path stroke-linecap="round" stroke-linejoin="round" d="M9 10h.01M12 10h.01M15 10h.01M10 13h.01M13 13h.01M11 16h.01M14 16h.01" /></svg>`,
        "תנור בשרי": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><rect width="18" height="16" x="3" y="4" rx="2" /><rect width="14" height="8" x="5" y="9" rx="1" /><path stroke-linecap="round" stroke-linejoin="round" d="M7 11h10" /><circle cx="6" cy="6.5" r="0.75" /><circle cx="12" cy="6.5" r="0.75" /><circle cx="18" cy="6.5" r="0.75" /></svg>`,
        "טוסטר חלבי": `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4 9h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 9V7.5M11 9V7.5M13 9V7.5M18 9V7.5M22 13h1.5v2H22M7 7.5c0-.5.5-1 1-1h2c.5 0 1 .5 1 1v1.5H7V7.5Z" /></svg>`
    };

    // שליפת ה-SVG המתאים, או החזרת אימוג'י ברירת מחדל במידה והפריט לא רשום
    let innerSvg = svgMap[name];
    if (!innerSvg) {
        let fallbackEmoji = typeof window.getEmoji === "function" ? window.getEmoji(name) : "📦";
        return `<span title="${name}" class="select-none">${fallbackEmoji}</span>`;
    }

    // הזרקת ה-title ישירות לתוך אלמנט ה-SVG לצורך טקסט צץ במעבר עכבר מובנה
    return innerSvg.replace("<svg", `<svg title="${name}"`);
}
window.getIconHtml = getIconHtml;
