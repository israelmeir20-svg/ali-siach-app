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
// מנוע האייקונים הרשמי של עלי שיח - מבוסס על קודי ה-SVG הריאליסטיים המלאים
function getIconHtml(name) {
    const svgMap = {
        // --- ירקות ופירות ---
        "אפרסק": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradPeach" cx="60%" cy="35%" r="65%"><stop offset="0%" stop-color="#FDE047" /><stop offset="40%" stop-color="#FB923C" /><stop offset="85%" stop-color="#F43F5E" /><stop offset="100%" stop-color="#9F1239" /></radialGradient></defs><path d="M50 28 C35 24 20 35 20 55 C20 78 40 85 50 82 C60 85 80 78 80 55 C80 35 65 24 50 28 Z" fill="url(#gradPeach)" /><path d="M50 28 C45 42 45 68 50 82" stroke="#BE123C" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.6" /><path d="M50 28 C46 22 40 16 42 10 C48 14 50 22 50 28 Z" fill="#22C55E" stroke="#15803D" stroke-width="1" /></svg>`,
        
        "תפוז": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradOrange" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="#FDBA74" /><stop offset="60%" stop-color="#F97316" /><stop offset="100%" stop-color="#C2410C" /></radialGradient></defs><circle cx="50" cy="52" r="38" fill="url(#gradOrange)" /><circle cx="30" cy="40" r="1" fill="#C2410C" opacity="0.8" /><circle cx="45" cy="30" r="1" fill="#C2410C" opacity="0.8" /><circle cx="65" cy="38" r="1" fill="#C2410C" opacity="0.8" /><circle cx="35" cy="65" r="1" fill="#C2410C" opacity="0.8" /><circle cx="55" cy="70" r="1" fill="#C2410C" opacity="0.8" /><circle cx="70" cy="60" r="1" fill="#C2410C" opacity="0.8" /><circle cx="50" cy="14" r="2.5" fill="#15803D" /><path d="M50 14 C54 10 62 8 64 12 C58 14 54 14 50 14 Z" fill="#22C55E" /></svg>`,
        
        "חסה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradLettuceDark" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#15803D" /><stop offset="100%" stop-color="#22C55E" /></linearGradient><linearGradient id="gradLettuceLight" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#4ADE80" /><stop offset="100%" stop-color="#86EFAC" /></linearGradient></defs><path d="M20 60 C10 40 25 20 40 25 C30 40 35 60 50 85 C30 80 22 75 20 60 Z" fill="url(#gradLettuceDark)" /><path d="M80 60 C90 40 75 20 60 25 C70 40 65 60 50 85 C70 80 78 75 80 60 Z" fill="url(#gradLettuceDark)" /><path d="M30 70 C20 50 35 30 50 35 C40 50 42 70 50 90 C38 88 32 80 30 70 Z" fill="url(#gradLettuceLight)" /><path d="M70 70 C80 50 65 30 50 35 C60 50 58 70 50 90 C62 88 68 80 70 70 Z" fill="url(#gradLettuceLight)" /><path d="M50 40 C42 45 40 60 50 90 C60 60 58 45 50 40 Z" fill="#BBF7D0" stroke="#22C55E" stroke-width="1" /><path d="M50 90 L50 55" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8" /><path d="M50 75 Q42 70 38 68" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.8" /><path d="M50 70 Q58 65 62 63" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.8" /></svg>`,
        
        "דלורית": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradSquash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FCD34D" /><stop offset="70%" stop-color="#F59E0B" /><stop offset="100%" stop-color="#D97706" /></linearGradient></defs><path d="M50 20 C42 20 40 32 40 42 C40 50 30 52 30 65 C30 78 38 85 50 85 C62 85 70 78 70 65 C70 52 60 50 60 42 C60 32 58 20 50 20 Z" fill="url(#gradSquash)" /><path d="M40 42 C44 48 56 48 60 42" stroke="#D97706" stroke-width="2.5" fill="none" opacity="0.5" /><ellipse cx="50" cy="30" rx="6" ry="3" fill="#FFFFFF" opacity="0.25" /><path d="M50 20 L50 12" stroke="#78350F" stroke-width="4.5" stroke-linecap="round" /></svg>`,
        
        "בצל": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradOnion" cx="50%" cy="60%" r="55%"><stop offset="0%" stop-color="#D946EF" /><stop offset="70%" stop-color="#A21CAF" /><stop offset="100%" stop-color="#4A044E" /></radialGradient></defs><path d="M50 15 C30 35 22 55 25 70 C30 85 70 85 75 70 C78 55 70 35 50 15 Z" fill="url(#gradOnion)" /><path d="M50 15 C40 35 35 55 38 78" stroke="#F472B6" stroke-width="1.5" fill="none" opacity="0.5" /><path d="M50 15 C60 35 65 55 62 78" stroke="#F472B6" stroke-width="1.5" fill="none" opacity="0.5" /><path d="M45 80 L42 88 M50 81 L50 90 M55 80 L58 88" stroke="#FDE047" stroke-width="2.5" stroke-linecap="round" /><path d="M50 15 L50 8" stroke="#854D0E" stroke-width="3.5" stroke-linecap="round" /></svg>`,
        
        "קולרבי": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradKohl" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#E2F9A3" /><stop offset="75%" stop-color="#A3E635" /><stop offset="100%" stop-color="#4D7C0F" /></radialGradient></defs><path d="M50 78 L50 86 M45 76 L40 84 M55 76 L60 84" stroke="#A3E635" stroke-width="2.5" /><ellipse cx="50" cy="55" rx="32" ry="26" fill="url(#gradKohl)" /><path d="M40 38 C35 25 32 15 35 8" stroke="#4D7C0F" stroke-width="3" stroke-linecap="round" fill="none" /><path d="M35 8 C30 12 25 10 28 15 C32 14 34 12 35 8 Z" fill="#84CC16" /><path d="M50 34 C50 20 54 12 52 5" stroke="#4D7C0F" stroke-width="3" stroke-linecap="round" fill="none" /><path d="M52 5 C48 8 45 5 48 10 C51 9 52 7 52 5 Z" fill="#84CC16" /><path d="M60 38 C65 25 68 15 65 8" stroke="#4D7C0F" stroke-width="3" stroke-linecap="round" fill="none" /><path d="M65 8 C70 12 75 10 72 15 C68 14 66 12 65 8 Z" fill="#84CC16" /></svg>`,
        
        "גזר": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradCarrot" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FB923C" /><stop offset="70%" stop-color="#F97316" /><stop offset="100%" stop-color="#C2410C" /></linearGradient></defs><path d="M70 30 C75 20 85 15 85 15 C85 15 75 25 72 32 Z" fill="#22C55E" /><path d="M68 28 C70 15 78 8 78 8 C78 8 70 18 67 26 Z" fill="#15803D" /><path d="M64 25 C62 12 65 5 65 5 C65 5 60 15 62 23 Z" fill="#166534" /><path d="M68 28 C64 24 58 24 54 28 L12 78 C10 80 10 84 12 86 C14 88 18 88 20 86 L70 42 C74 38 72 32 68 28 Z" fill="url(#gradCarrot)" /><path d="M50 42 C46 41 44 43 45 45" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" fill="none" /><path d="M38 55 C34 54 32 56 33 58" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" fill="none" /><path d="M26 68 C23 67 21 69 22 71" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" fill="none" /><path d="M58 35 L25 72" stroke="#FED7AA" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3" /></svg>`,
        
        "עגבניה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradTomato" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="#FF6B6B" /><stop offset="40%" stop-color="#E81B1B" /><stop offset="85%" stop-color="#BD0909" /><stop offset="100%" stop-color="#7A0000" /></radialGradient><linearGradient id="gradTomatoLeaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ADE80" /><stop offset="100%" stop-color="#166534" /></linearGradient></defs><ellipse cx="50" cy="55" rx="40" ry="36" fill="url(#gradTomato)" /><ellipse cx="38" cy="38" rx="10" ry="6" transform="rotate(-15 38 38)" fill="#FFFFFF" opacity="0.65" /><path d="M50 25 C48 20 40 18 35 22 C40 24 45 27 50 29 Z" fill="url(#gradTomatoLeaf)" /><path d="M50 25 C52 20 60 18 65 22 C60 24 55 27 50 29 Z" fill="url(#gradTomatoLeaf)" /><path d="M50 25 C42 22 36 30 38 36 C42 34 46 32 50 29 Z" fill="url(#gradTomatoLeaf)" /><path d="M50 25 C58 22 64 30 62 36 C58 34 54 32 50 29 Z" fill="url(#gradTomatoLeaf)" /><path d="M50 25 C50 18 48 12 52 10 C53 14 52 18 50 25 Z" fill="url(#gradTomatoLeaf)" /></svg>`,
        "עגבנייה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradTomato2" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="#FF6B6B" /><stop offset="40%" stop-color="#E81B1B" /><stop offset="85%" stop-color="#BD0909" /><stop offset="100%" stop-color="#7A0000" /></radialGradient><linearGradient id="gradTomatoLeaf2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ADE80" /><stop offset="100%" stop-color="#166534" /></linearGradient></defs><ellipse cx="50" cy="55" rx="40" ry="36" fill="url(#gradTomato2)" /><ellipse cx="38" cy="38" rx="10" ry="6" transform="rotate(-15 38 38)" fill="#FFFFFF" opacity="0.65" /><path d="M50 25 C48 20 40 18 35 22 C40 24 45 27 50 29 Z" fill="url(#gradTomatoLeaf2)" /><path d="M50 25 C52 20 60 18 65 22 C60 24 55 27 50 29 Z" fill="url(#gradTomatoLeaf2)" /><path d="M50 25 C42 22 36 30 38 36 C42 34 46 32 50 29 Z" fill="url(#gradTomatoLeaf2)" /><path d="M50 25 C58 22 64 30 62 36 C58 34 54 32 50 29 Z" fill="url(#gradTomatoLeaf2)" /><path d="M50 25 C50 18 48 12 52 10 C53 14 52 18 50 25 Z" fill="url(#gradTomatoLeaf2)" /></svg>`,
        
        "מלפפון": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradCukeImg" x1="50%" y1="0%" x2="20%" y2="100%"><stop offset="0%" stop-color="#C0E838" /><stop offset="25%" stop-color="#4ADE80" /><stop offset="65%" stop-color="#15803D" /><stop offset="100%" stop-color="#064E3B" /></linearGradient></defs><path d="M 45 8 C 52 8 56 12 55 22 C 50 45 35 75 18 90 C 12 94 6 88 10 78 C 25 50 40 15 45 8 Z" fill="url(#gradCukeImg)" stroke="#064E3B" stroke-width="1" /><ellipse cx="48" cy="8" rx="2.5" ry="1.5" fill="#78350F" /><path d="M 46 14 C 44 25 38 40 32 52" stroke="#DCFCE7" stroke-width="1.5" fill="none" opacity="0.6" /><path d="M 50 16 C 48 28 42 42 36 55" stroke="#A3E635" stroke-width="1.2" fill="none" opacity="0.5" /><circle cx="28" cy="62" r="1.2" fill="#022C22" opacity="0.6" /><circle cx="32" cy="58" r="1" fill="#022C22" opacity="0.6" /><circle cx="24" cy="70" r="1.5" fill="#022C22" opacity="0.6" /><circle cx="20" cy="78" r="1.2" fill="#022C22" opacity="0.6" /><circle cx="15" cy="82" r="1.5" fill="#022C22" opacity="0.6" /><circle cx="28" cy="74" r="1" fill="#022C22" opacity="0.6" /></svg>`,
        
        "פלפל": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><path d="M 65 24 C 82 24 90 42 88 68 C 86 80 75 88 65 88 Z" fill="#0D5C22" /><path d="M 38 25 C 18 25 10 45 15 72 C 18 88 32 92 42 92 C 45 80 40 32 38 25 Z" fill="#168535" /><path d="M 38 25 C 45 32 45 80 42 92 C 48 94 65 92 70 85 C 78 75 82 50 78 28 C 65 22 48 22 38 25 Z" fill="#22C55E" /><path d="M 15 35 C 10 48 18 85 30 90 C 22 82 18 60 22 40 Z" fill="#116B28" /><polygon points="34,32 42,28 58,26 62,34 52,36 40,35" fill="#4ADE80" /><path d="M 42 30 C 40 18 52 8 68 8 C 62 16 52 24 50 32 Z" fill="#15803D" stroke="#064E3B" stroke-width="1" /><path d="M 22 36 C 28 34 32 36 28 42 C 22 42 20 38 22 36 Z" fill="#FFFFFF" opacity="0.8" /><path d="M 25 45 C 32 43 32 48 26 50 Z" fill="#FFFFFF" opacity="0.7" /><path d="M 72 28 C 76 28 78 32 74 34 C 71 34 70 30 72 28 Z" fill="#FFFFFF" opacity="0.8" /></svg>`,
        
        "גמבה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><path d="M 65 24 C 82 24 90 42 88 68 C 86 80 75 88 65 88 Z" fill="#990000" /><path d="M 38 25 C 18 25 10 45 15 72 C 18 88 32 92 42 92 C 45 80 40 32 38 25 Z" fill="#D60000" /><path d="M 38 25 C 45 32 45 80 42 92 C 48 94 65 92 70 85 C 78 75 82 50 78 28 C 65 22 48 22 38 25 Z" fill="#EE0000" /><path d="M 15 35 C 10 48 18 85 30 90 C 22 82 18 60 22 40 Z" fill="#B30000" /><polygon points="34,32 42,28 58,26 62,34 52,36 40,35" fill="#55A000" /><path d="M 42 30 C 40 18 52 8 68 8 C 62 16 52 24 50 32 Z" fill="#228B22" stroke="#14532D" stroke-width="1" /><path d="M 22 36 C 28 34 32 36 28 42 C 22 42 20 38 22 36 Z" fill="#FFFFFF" opacity="0.8" /><path d="M 25 45 C 32 43 32 48 26 50 Z" fill="#FFFFFF" opacity="0.7" /><path d="M 72 28 C 76 28 78 32 74 34 C 71 34 70 30 72 28 Z" fill="#FFFFFF" opacity="0.8" /></svg>`,
        
        "תפוח אדמה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotatoImg" x1="20%" y1="20%" x2="80%" y2="80%"><stop offset="0%" stop-color="#F2D1A4" /><stop offset="40%" stop-color="#E5BE88" /><stop offset="100%" stop-color="#C59657" /></linearGradient></defs><ellipse cx="50" cy="88" rx="28" ry="3" fill="#000000" opacity="0.12" /><path d="M 28 62 C 16 50 28 32 50 26 C 72 20 88 32 86 54 C 84 72 62 82 42 76 C 32 73 35 68 28 62 Z" fill="url(#gradPotatoImg)" stroke="#A6783C" stroke-width="1.5" /><path d="M 62 32 C 66 31 68 33 65 34" stroke="#8C5E28" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M 48 56 C 50 56 51 58 49 59" stroke="#8C5E28" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M 70 48 C 72 48 73 50 71 51" stroke="#8C5E28" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M 28 60 C 29 60 30 61 29 62" stroke="#8C5E28" stroke-width="1.5" stroke-linecap="round" fill="none" /><path d="M 46 73 C 48 73 49 74 47 75" stroke="#8C5E28" stroke-width="1.5" stroke-linecap="round" fill="none" /></svg>`,
        "תפו\"א": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotatoImg2" x1="20%" y1="20%" x2="80%" y2="80%"><stop offset="0%" stop-color="#F2D1A4" /><stop offset="40%" stop-color="#E5BE88" /><stop offset="100%" stop-color="#C59657" /></linearGradient></defs><ellipse cx="50" cy="88" rx="28" ry="3" fill="#000000" opacity="0.12" /><path d="M 28 62 C 16 50 28 32 50 26 C 72 20 88 32 86 54 C 84 72 62 82 42 76 C 32 73 35 68 28 62 Z" fill="url(#gradPotatoImg2)" stroke="#A6783C" stroke-width="1.5" /><path d="M 62 32 C 66 31 68 33 65 34" stroke="#8C5E28" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M 48 56 C 50 56 51 58 49 59" stroke="#8C5E28" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M 70 48 C 72 48 73 50 71 51" stroke="#8C5E28" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M 28 60 C 29 60 30 61 29 62" stroke="#8C5E28" stroke-width="1.5" stroke-linecap="round" fill="none" /><path d="M 46 73 C 48 73 49 74 47 75" stroke="#8C5E28" stroke-width="1.5" stroke-linecap="round" fill="none" /></svg>`,
        
        "כרוב": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><style>.cb-outline { stroke: #1E4214; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }.cb-vein { stroke: #DCF8C3; stroke-width: 1.3; stroke-linecap: round; fill: none; opacity: 0.85; }</style></defs><path d="M 43 89 C 43 93 57 93 57 89 Z" fill="#6BBF3A" class="cb-outline" /><path d="M 30 30 C 22 20 32 10 48 12 C 52 20 48 28 42 32 Z" fill="#469D26" class="cb-outline" /><path d="M 46 12 C 60 10 74 18 72 32 C 65 38 52 35 46 28 Z" fill="#3E9120" class="cb-outline" /><path d="M 28 26 C 16 26 8 38 10 52 C 12 62 20 62 28 54 Z" fill="#4EA729" class="cb-outline" /><path d="M 72 30 C 84 32 88 48 84 62 C 78 70 72 65 68 54 Z" fill="#429622" class="cb-outline" /><path d="M 10 52 C 8 68 25 78 44 76 C 36 62 28 50 10 52 Z" fill="#52AD2C" class="cb-outline" /><path d="M 44 76 C 62 88 84 78 86 52 C 88 42 78 38 70 45 C 60 52 50 64 44 76 Z" fill="#59B532" class="cb-outline" /><path d="M 26 48 C 24 32 38 22 52 24 C 68 26 74 40 70 54 C 64 68 38 68 26 48 Z" fill="#64BF36" class="cb-outline" /><path d="M 36 30 C 42 22 58 22 64 30 C 56 36 44 36 36 30 Z" fill="#88E053" class="cb-outline" /><path d="M 42 32 C 60 26 72 38 65 55 C 55 48 48 40 42 32 Z" fill="#7FD94A" class="cb-outline" /><path d="M 26 44 C 36 32 58 36 60 54 C 48 60 35 56 26 44 Z" fill="#71CC3E" class="cb-outline" /><path d="M 24 48 C 30 62 48 68 56 58 C 48 46 34 42 24 48 Z" fill="#63C032" class="cb-outline" /><path d="M 72 74 Q 60 68 52 62" class="cb-vein" /><path d="M 64 70 Q 70 64 76 66" class="cb-vein" /><path d="M 58 66 Q 64 58 70 58" class="cb-vein" /><path d="M 22 70 Q 30 62 38 54" class="cb-vein" /><path d="M 28 64 Q 24 56 20 54" class="cb-vein" /><path d="M 32 58 Q 36 50 38 48" class="cb-vein" /><path d="M 16 48 Q 22 42 28 36" class="cb-vein" /><path d="M 80 50 Q 74 44 70 40" class="cb-vein" /><path d="M 38 18 Q 42 24 44 28" class="cb-vein" /><path d="M 60 18 Q 58 24 54 28" class="cb-vein" /><path d="M 42 42 Q 50 48 58 48" class="cb-vein" /><path d="M 34 48 Q 42 54 46 60" class="cb-vein" /><path d="M 48 26 Q 52 30 55 32" class="cb-vein" /></svg>`,
        
        "תפוח עץ": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradGreenApple" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#BBF7D0" /><stop offset="50%" stop-color="#4ADE80" /><stop offset="90%" stop-color="#15803D" /><stop offset="100%" stop-color="#14532D" /></radialGradient></defs><path d="M50 32 C40 28 20 32 20 55 C20 78 38 85 50 80 C62 85 80 78 80 55 C80 32 60 28 50 32 Z" fill="url(#gradGreenApple)" stroke="#14532D" stroke-width="1.5" /><ellipse cx="35" cy="42" rx="8" ry="4" transform="rotate(-20 35 42)" fill="#FFFFFF" opacity="0.5" /><path d="M50 30 C50 22 55 15 62 12" stroke="#78350F" stroke-width="3" stroke-linecap="round" fill="none" /><path d="M55 22 C62 20 72 22 74 28 C67 30 58 28 55 22 Z" fill="#84CC16" stroke="#4D7C0F" stroke-width="1" /></svg>`,
        
        "קישוא": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradKishu" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#DCFCE7" /><stop offset="50%" stop-color="#86EFAC" /><stop offset="100%" stop-color="#22C55E" /></linearGradient></defs><path d="M22 74 C14 62 30 35 58 20 C70 14 85 18 80 32 C72 50 42 80 28 84 C24 85 24 80 22 74 Z" fill="url(#gradKishu)" stroke="#15803D" stroke-width="1.5" /><path d="M28 72 C38 58 58 40 72 30" stroke="#15803D" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.4" /><path d="M24 66 C32 52 48 36 62 26" stroke="#15803D" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.4" /><path d="M34 76 C44 64 64 46 76 36" stroke="#15803D" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3" /><path d="M19 72 C15 74 12 70 14 77 C15 82 20 84 21 81 C22 78 21 74 19 72 Z" fill="#FBBF24" stroke="#D97706" stroke-width="1" /><path d="M23 76 C21 79 17 83 19 86 C22 88 26 84 25 81 Z" fill="#F59E0B" stroke="#D97706" stroke-width="1" /></svg>`,

        // --- כלי מטבח וציוד ---
        "סכין": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradParingBlade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F1F5F9" /><stop offset="50%" stop-color="#CBD5E1" /><stop offset="100%" stop-color="#94A3B8" /></linearGradient></defs><path d="M20 55 C25 53 45 40 75 35 L75 42 C55 48 30 62 20 62 Z" fill="url(#gradParingBlade)" stroke="#475569" stroke-width="1.5" /><path d="M20 55 C25 53 45 40 75 35" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.7" /><rect x="73" y="32" width="22" height="10" rx="3" fill="#1E293B" stroke="#0F172A" stroke-width="1.5" transform="rotate(10 73 32)" /><circle cx="79" cy="38" r="1" fill="#E2E8F0" /><circle cx="88" cy="40" r="1" fill="#E2E8F0" /></svg>`,
        
        "טוסטר": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPressBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3B82F6" /><stop offset="100%" stop-color="#1E40AF" /></linearGradient></defs><rect x="15" y="55" width="70" height="24" rx="4" fill="#1E293B" stroke="#0F172A" stroke-width="2" /><rect x="15" y="55" width="70" height="10" fill="#94A3B8" /><path d="M18 36 C18 34 22 32 50 32 C78 32 82 34 82 36 L82 50 C82 52 78 54 50 54 C22 54 18 52 18 50 Z" fill="url(#gradPressBlue)" stroke="#1D4ED8" stroke-width="2" /><rect x="24" y="38" width="52" height="6" rx="1" fill="#475569" /><rect x="25" y="48" width="50" height="6" rx="3" fill="#1E293B" stroke="#0F172A" stroke-width="1.5" /><path d="M28 50 L28 58 M72 50 L72 58" stroke="#1E293B" stroke-width="4" stroke-linecap="round" /><circle cx="50" cy="41" r="2.5" fill="#EF4444" /><circle cx="56" cy="41" r="2.5" fill="#22C55E" /></svg>`,
        "טוסטר חלבי": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPressBlue2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3B82F6" /><stop offset="100%" stop-color="#1E40AF" /></linearGradient></defs><rect x="15" y="55" width="70" height="24" rx="4" fill="#1E293B" stroke="#0F172A" stroke-width="2" /><rect x="15" y="55" width="70" height="10" fill="#94A3B8" /><path d="M18 36 C18 34 22 32 50 32 C78 32 82 34 82 36 L82 50 C82 52 78 54 50 54 C22 54 18 52 18 50 Z" fill="url(#gradPressBlue2)" stroke="#1D4ED8" stroke-width="2" /><rect x="24" y="38" width="52" height="6" rx="1" fill="#475569" /><rect x="25" y="48" width="50" height="6" rx="3" fill="#1E293B" stroke="#0F172A" stroke-width="1.5" /><path d="M28 50 L28 58 M72 50 L72 58" stroke="#1E293B" stroke-width="4" stroke-linecap="round" /><circle cx="50" cy="41" r="2.5" fill="#EF4444" /><circle cx="56" cy="41" r="2.5" fill="#22C55E" /></svg>`,
        
        "מחבת ללא מכסה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradPanRedNoBadge" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></radialGradient><linearGradient id="gradMetalIntNoBadge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#64748B" /><stop offset="100%" stop-color="#1E293B" /></linearGradient></defs><rect x="52" y="44" width="40" height="10" rx="5" fill="#1E293B" transform="rotate(-15 52 44)" /><ellipse cx="36" cy="54" rx="30" ry="24" fill="url(#gradPanRedNoBadge)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="36" cy="51" rx="26" ry="20" fill="url(#gradMetalIntNoBadge)" /><path d="M18 42 C24 35 48 35 54 42" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.3" /></svg>`,
        "מחבת ללא מכסה בשרית": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><radialGradient id="gradPanRedNoBadge2" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></radialGradient><linearGradient id="gradMetalIntNoBadge2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#64748B" /><stop offset="100%" stop-color="#1E293B" /></linearGradient></defs><rect x="52" y="44" width="40" height="10" rx="5" fill="#1E293B" transform="rotate(-15 52 44)" /><ellipse cx="36" cy="54" rx="30" ry="24" fill="url(#gradPanRedNoBadge2)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="36" cy="51" rx="26" ry="20" fill="url(#gradMetalIntNoBadge2)" /><path d="M18 42 C24 35 48 35 54 42" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.3" /></svg>`,
        
        "סיר שטוח עם מכסה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotRedFlatNo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></linearGradient><linearGradient id="gradLidFlatNo" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E2E8F0" /><stop offset="50%" stop-color="#94A3B8" /><stop offset="100%" stop-color="#CBD5E1" /></linearGradient></defs><path d="M8 50 C2 50 2 62 8 62" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M92 50 C98 50 98 62 92 62" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M12 48 L12 70 C12 78 22 84 50 84 C78 84 88 78 88 70 L88 48 Z" fill="url(#gradPotRedFlatNo)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="50" cy="48" rx="38" ry="6" fill="#991B1B" /><path d="M12 48 C12 36 25 30 50 30 C75 30 88 36 88 48 Z" fill="none" stroke="url(#gradLidFlatNo)" stroke-width="4" /><rect x="42" y="24" width="16" height="8" rx="2" fill="#334155" /></svg>`,
        "סיר שטוח עם מכסה בשרי": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotRedFlatNo2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></linearGradient><linearGradient id="gradLidFlatNo2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E2E8F0" /><stop offset="50%" stop-color="#94A3B8" /><stop offset="100%" stop-color="#CBD5E1" /></linearGradient></defs><path d="M8 50 C2 50 2 62 8 62" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M92 50 C98 50 98 62 92 62" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M12 48 L12 70 C12 78 22 84 50 84 C78 84 88 78 88 70 L88 48 Z" fill="url(#gradPotRedFlatNo2)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="50" cy="48" rx="38" ry="6" fill="#991B1B" /><path d="M12 48 C12 36 25 30 50 30 C75 30 88 36 88 48 Z" fill="none" stroke="url(#gradLidFlatNo2)" stroke-width="4" /><rect x="42" y="24" width="16" height="8" rx="2" fill="#334155" /></svg>`,
        
        "סיר קטן גבוה עם מכסה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotRedTallNo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></linearGradient><linearGradient id="gradLidTallNo" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E2E8F0" /><stop offset="50%" stop-color="#94A3B8" /><stop offset="100%" stop-color="#CBD5E1" /></linearGradient></defs><path d="M18 48 C12 48 12 60 18 60" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M82 48 C88 48 88 60 82 60" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M22 42 L22 78 C22 86 30 90 50 90 C70 90 78 86 78 78 L78 42 Z" fill="url(#gradPotRedTallNo)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="50" cy="42" rx="28" ry="5" fill="#991B1B" /><path d="M22 42 C22 32 30 26 50 26 C70 26 78 32 78 42 Z" fill="none" stroke="url(#gradLidTallNo)" stroke-width="4" /><rect x="44" y="20" width="12" height="8" rx="2" fill="#334155" /></svg>`,
        "סיר קטן גבוה עם מכסה בשרי": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotRedTallNo2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></linearGradient><linearGradient id="gradLidTallNo2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E2E8F0" /><stop offset="50%" stop-color="#94A3B8" /><stop offset="100%" stop-color="#CBD5E1" /></linearGradient></defs><path d="M18 48 C12 48 12 60 18 60" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M82 48 C88 48 88 60 82 60" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M22 42 L22 78 C22 86 30 90 50 90 C70 90 78 86 78 78 L78 42 Z" fill="url(#gradPotRedTallNo2)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="50" cy="42" rx="28" ry="5" fill="#991B1B" /><path d="M22 42 C22 32 30 26 50 26 C70 26 78 32 78 42 Z" fill="none" stroke="url(#gradLidTallNo2)" stroke-width="4" /><rect x="44" y="20" width="12" height="8" rx="2" fill="#334155" /></svg>`,
        
        "סיר רגיל עם מכסה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotRedRegNo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></linearGradient><linearGradient id="gradLidRegNo" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E2E8F0" /><stop offset="50%" stop-color="#94A3B8" /><stop offset="100%" stop-color="#CBD5E1" /></linearGradient></defs><path d="M12 45 C6 45 6 58 12 58" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M88 45 C94 45 94 58 88 58" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M16 40 L16 74 C16 82 24 86 50 86 C76 86 84 82 84 74 L84 40 Z" fill="url(#gradPotRedRegNo)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="50" cy="40" rx="34" ry="5" fill="#991B1B" /><path d="M16 40 C16 30 25 24 50 24 C75 24 84 30 84 40 Z" fill="none" stroke="url(#gradLidRegNo)" stroke-width="4" /><rect x="43" y="18" width="14" height="8" rx="2" fill="#334155" /></svg>`,
        "סיר רגיל עם מכסה בשרי": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPotRedRegNo2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EF4444" /><stop offset="100%" stop-color="#991B1B" /></linearGradient><linearGradient id="gradLidRegNo2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E2E8F0" /><stop offset="50%" stop-color="#94A3B8" /><stop offset="100%" stop-color="#CBD5E1" /></linearGradient></defs><path d="M12 45 C6 45 6 58 12 58" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M88 45 C94 45 94 58 88 58" stroke="#64748B" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M16 40 L16 74 C16 82 24 86 50 86 C76 86 84 82 84 74 L84 40 Z" fill="url(#gradPotRedRegNo2)" stroke="#7F1D1D" stroke-width="1.5" /><ellipse cx="50" cy="40" rx="34" ry="5" fill="#991B1B" /><path d="M16 40 C16 30 25 24 50 24 C75 24 84 30 84 40 Z" fill="none" stroke="url(#gradLidRegNo2)" stroke-width="4" /><rect x="43" y="18" width="14" height="8" rx="2" fill="#334155" /></svg>`,
        
        "תנור": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradOvenBodyNo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#475569" /><stop offset="100%" stop-color="#0F172A" /></linearGradient></defs><rect x="10" y="10" width="80" height="80" rx="6" fill="url(#gradOvenBodyNo)" stroke="#1E293B" stroke-width="3" /><rect x="14" y="14" width="72" height="16" fill="#1E293B" /><circle cx="22" cy="22" r="4" fill="#64748B" stroke="#0F172A" /><circle cx="34" cy="22" r="4" fill="#64748B" stroke="#0F172A" /><rect x="44" y="17" width="16" height="10" rx="1" fill="#020617" /><text x="52" y="25" font-family="monospace" font-size="8" fill="#EF4444" text-anchor="middle">180</text><circle cx="68" cy="22" r="4" fill="#64748B" stroke="#0F172A" /><circle cx="80" cy="22" r="4" fill="#EF4444" stroke="#0F172A" /><rect x="14" y="36" width="72" height="48" rx="4" fill="#1E293B" stroke="#64748B" stroke-width="3" /><rect x="22" y="42" width="56" height="36" rx="2" fill="#020617" /><line x1="26" y1="52" x2="74" y2="52" stroke="#475569" stroke-width="2" /><line x1="26" y1="64" x2="74" y2="64" stroke="#475569" stroke-width="2" /><rect x="26" y="38" width="48" height="4" rx="2" fill="#E2E8F0" /></svg>`,
        "תנור בשרי": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradOvenBodyNo2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#475569" /><stop offset="100%" stop-color="#0F172A" /></linearGradient></defs><rect x="10" y="10" width="80" height="80" rx="6" fill="url(#gradOvenBodyNo2)" stroke="#1E293B" stroke-width="3" /><rect x="14" y="14" width="72" height="16" fill="#1E293B" /><circle cx="22" cy="22" r="4" fill="#64748B" stroke="#0F172A" /><circle cx="34" cy="22" r="4" fill="#64748B" stroke="#0F172A" /><rect x="44" y="17" width="16" height="10" rx="1" fill="#020617" /><text x="52" y="25" font-family="monospace" font-size="8" fill="#EF4444" text-anchor="middle">180</text><circle cx="68" cy="22" r="4" fill="#64748B" stroke="#0F172A" /><circle cx="80" cy="22" r="4" fill="#EF4444" stroke="#0F172A" /><rect x="14" y="36" width="72" height="48" rx="4" fill="#1E293B" stroke="#64748B" stroke-width="3" /><rect x="22" y="42" width="56" height="36" rx="2" fill="#020617" /><line x1="26" y1="52" x2="74" y2="52" stroke="#475569" stroke-width="2" /><line x1="26" y1="64" x2="74" y2="64" stroke="#475569" stroke-width="2" /><rect x="26" y="38" width="48" height="4" rx="2" fill="#E2E8F0" /></svg>`,
        
        "מיניבר": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradSilverDisp" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#94A3B8" /><stop offset="50%" stop-color="#F1F5F9" /><stop offset="100%" stop-color="#475569" /></linearGradient></defs><rect x="22" y="10" width="56" height="80" rx="6" fill="url(#gradSilverDisp)" stroke="#334155" stroke-width="2" /><rect x="32" y="44" width="36" height="30" rx="3" fill="#1E293B" stroke="#475569" stroke-width="1.5" /><path d="M42 38 L42 46 M40 46 L44 46" stroke="#EF4444" stroke-width="3" stroke-linecap="round" /><circle cx="42" cy="35" r="2" fill="#EF4444" /><path d="M58 38 L58 46 M56 46 L60 46" stroke="#3B82F6" stroke-width="3" stroke-linecap="round" /><circle cx="58" cy="35" r="2" fill="#3B82F6" /><path d="M47 62 L53 62 L55 72 L45 72 Z" fill="#60A5FA" stroke="#2563EB" stroke-width="1" /><rect x="32" y="18" width="36" height="10" rx="2" fill="#1E293B" /><circle cx="38" cy="23" r="1.5" fill="#22C55E" /><circle cx="50" cy="23" r="1.5" fill="#EF4444" opacity="0.6" /><circle cx="62" cy="23" r="1.5" fill="#3B82F6" /></svg>`,
        
        "כיריים": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><rect x="10" y="10" width="80" height="80" rx="8" fill="#18181B" stroke="#3F3F46" stroke-width="4" /><circle cx="32" cy="32" r="18" fill="none" stroke="#EA580C" stroke-width="2.5" opacity="0.8" /><circle cx="32" cy="32" r="13" fill="none" stroke="#F97316" stroke-width="2" stroke-dasharray="6,4" /><circle cx="32" cy="32" r="8" fill="none" stroke="#FDBA74" stroke-width="1.5" /><circle cx="32" cy="32" r="3" fill="#F97316" /><circle cx="68" cy="32" r="15" fill="none" stroke="#3F3F46" stroke-width="2" /><circle cx="68" cy="32" r="10" fill="none" stroke="#27272A" stroke-width="1.5" stroke-dasharray="4,3" /><circle cx="32" cy="68" r="14" fill="none" stroke="#3F3F46" stroke-width="2" /><circle cx="32" cy="68" r="9" fill="none" stroke="#27272A" stroke-width="1.5" stroke-dasharray="4,3" /><circle cx="68" cy="68" r="20" fill="none" stroke="#EA580C" stroke-width="3" opacity="0.8" /><circle cx="68" cy="68" r="15" fill="none" stroke="#F97316" stroke-width="2.5" stroke-dasharray="8,4" /><circle cx="68" cy="68" r="10" fill="none" stroke="#FDBA74" stroke-width="1.5" /><circle cx="68" cy="68" r="4" fill="#F97316" /><path d="M15 15 L85 85" stroke="#FFFFFF" stroke-width="1.5" opacity="0.08" /></svg>`,
        
        "פומפיה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradGraterMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#CBD5E1" /><stop offset="50%" stop-color="#F1F5F9" /><stop offset="100%" stop-color="#94A3B8" /></linearGradient></defs><path d="M38 20 C38 12 62 12 62 20" stroke="#334155" stroke-width="6" fill="none" stroke-linecap="round" /><path d="M34 22 L24 85 C24 87 26 88 28 88 L72 88 C74 88 76 87 76 85 L66 22 Z" fill="url(#gradGraterMetal)" stroke="#475569" stroke-width="2" /><rect x="22" y="84" width="56" height="5" rx="2" fill="#1E293B" /><path d="M40 35 Q44 33 44 35 M50 35 Q54 33 54 35 M60 35 Q64 33 64 35" stroke="#334155" stroke-width="2" fill="none" /><path d="M36 48 Q40 46 40 48 M46 48 Q50 46 50 48 M56 48 Q60 46 60 48 M66 48 Q70 46 70 48" stroke="#334155" stroke-width="2" fill="none" /><path d="M38 61 Q42 59 42 61 M48 61 Q52 59 52 61 M58 61 Q62 59 62 61 M68 61 Q72 59 72 61" stroke="#334155" stroke-width="2" fill="none" /><path d="M34 74 Q38 72 38 74 M44 74 Q48 72 48 74 M54 74 Q58 72 58 74 M64 74 Q68 72 68 74" stroke="#334155" stroke-width="2" fill="none" /></svg>`,
        "פומפייה": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradGraterMetal2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#CBD5E1" /><stop offset="50%" stop-color="#F1F5F9" /><stop offset="100%" stop-color="#94A3B8" /></linearGradient></defs><path d="M38 20 C38 12 62 12 62 20" stroke="#334155" stroke-width="6" fill="none" stroke-linecap="round" /><path d="M34 22 L24 85 C24 87 26 88 28 88 L72 88 C74 88 76 87 76 85 L66 22 Z" fill="url(#gradGraterMetal2)" stroke="#475569" stroke-width="2" /><rect x="22" y="84" width="56" height="5" rx="2" fill="#1E293B" /><path d="M40 35 Q44 33 44 35 M50 35 Q54 33 54 35 M60 35 Q64 33 64 35" stroke="#334155" stroke-width="2" fill="none" /><path d="M36 48 Q40 46 40 48 M46 48 Q50 46 50 48 M56 48 Q60 46 60 48 M66 48 Q70 46 70 48" stroke="#334155" stroke-width="2" fill="none" /><path d="M38 61 Q42 59 42 61 M48 61 Q52 59 52 61 M58 61 Q62 59 62 61 M68 61 Q72 59 72 61" stroke="#334155" stroke-width="2" fill="none" /><path d="M34 74 Q38 72 38 74 M44 74 Q48 72 48 74 M54 74 Q58 72 58 74 M64 74 Q68 72 68 74" stroke="#334155" stroke-width="2" fill="none" /></svg>`,
        
        "נייר כסף": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradFoilRoll" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#94A3B8" /><stop offset="20%" stop-color="#FFFFFF" /><stop offset="40%" stop-color="#CBD5E1" /><stop offset="70%" stop-color="#475569" /><stop offset="90%" stop-color="#E2E8F0" /><stop offset="100%" stop-color="#64748B" /></linearGradient><linearGradient id="gradFoilSheet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="35%" stop-color="#CBD5E1" /><stop offset="65%" stop-color="#64748B" /><stop offset="100%" stop-color="#F8FAFC" /></linearGradient><linearGradient id="gradCardboard" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#D97706" /><stop offset="100%" stop-color="#78350F" /></linearGradient></defs><ellipse cx="50" cy="85" rx="36" ry="6" fill="#000000" opacity="0.15" /><path d="M 28 42 L 78 52 L 68 80 L 18 70 Z" fill="url(#gradFoilSheet)" stroke="#475569" stroke-width="1" stroke-linejoin="round" /><path d="M 28 42 L 78 52 M 23 56 L 73 66" stroke="#FFFFFF" stroke-width="2" opacity="0.8" /><path d="M 22 25 L 82 37 C 88 38 88 48 82 49 L 22 37 C 16 36 16 26 22 25 Z" fill="url(#gradFoilRoll)" stroke="#334155" stroke-width="1.2" /><ellipse cx="82" cy="43" rx="5" ry="6" fill="#CBD5E1" stroke="#334155" stroke-width="1.2" /><ellipse cx="22" cy="31" rx="6" ry="6" fill="url(#gradFoilRoll)" stroke="#334155" stroke-width="1.2" /><ellipse cx="22" cy="31" rx="3.5" ry="3.5" fill="url(#gradCardboard)" stroke="#451A03" stroke-width="1" /><ellipse cx="22" cy="31" rx="2" ry="2" fill="#1E293B" /><path d="M 24 27.5 L 82 39" stroke="#FFFFFF" stroke-width="2.5" opacity="0.9" stroke-linecap="round" /><path d="M 23 33 L 81 44.5" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6" stroke-linecap="round" /></svg>`,
        
        "תבנית חד\"פ": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><polygon points="10,35 65,20 90,45 35,65" fill="#B0BEC5" stroke="#37474F" stroke-width="2.5" stroke-linejoin="round" /><polygon points="14,35 63,22 86,45 37,61" fill="#ECEFF1" stroke="#37474F" stroke-width="1.5" stroke-linejoin="round" /><polygon points="25,43 58,34 74,48 41,58" fill="#CFD8DC" stroke="#455A64" stroke-width="1.5" stroke-linejoin="round" /><polygon points="6,35 65,18 94,45 35,67" fill="none" stroke="#263238" stroke-width="3" stroke-linejoin="round" /><polygon points="6,35 65,18 94,45 35,67" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" /><line x1="8" y1="35" x2="65" y2="19" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" /></svg>`,
        
        "קערת פלסטיק": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8 inline-block"><defs><linearGradient id="gradPlasticOuter" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#38BDF8" /><stop offset="60%" stop-color="#0284C7" /><stop offset="100%" stop-color="#0369A1" /></linearGradient><linearGradient id="gradPlasticInner" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#BAE6FD" /><stop offset="100%" stop-color="#38BDF8" /></linearGradient></defs><ellipse cx="50" cy="84" rx="28" ry="6" fill="#000000" opacity="0.12" /><path d="M 10 38 C 10 68 28 82 50 82 C 72 82 90 68 90 38 Z" fill="url(#gradPlasticOuter)" stroke="#0284C7" stroke-width="1.5" /><ellipse cx="50" cy="38" rx="38" ry="16" fill="url(#gradPlasticInner)" stroke="#0284C7" stroke-width="1.5" /><ellipse cx="50" cy="46" rx="22" ry="7" fill="#0284C7" opacity="0.3" /><ellipse cx="50" cy="38" rx="40" ry="18" fill="none" stroke="#E0F2FE" stroke-width="2.5" /><ellipse cx="50" cy="38" rx="40" ry="18" fill="none" stroke="#0284C7" stroke-width="1" /><path d="M 20 54 C 28 72 42 76 50 76" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.6" /><path d="M 16 42 Q 18 58 24 64" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.4" /></svg>`
    };

    let innerSvg = svgMap[name];
    if (!innerSvg) {
        let fallbackEmoji = typeof window.getEmoji === "function" ? window.getEmoji(name) : "📦";
        return `<span title="${name}" class="select-none text-2xl">${fallbackEmoji}</span>`;
    }

    // הזרקת ה-title ישירות לתוך ה-SVG לצורך הצגת השם במעבר עכבר מובנה בדפדפן
    return innerSvg.replace("<svg", `<svg title="${name}"`);
}
window.getIconHtml = getIconHtml;
