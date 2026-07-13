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
