// הצהרת משתנים גלובליים קריטיים למניעת זליגה
let appData = {};
let teamMembers = [];
let teamMessages = [];
let currentUser = null;
let cloudUrl = localStorage.getItem('aliSiachCloudUrl') || "";
let saveTimeout = null;
let isDarkMode = localStorage.getItem('aliSiachDarkMode') === 'true';
let activeFilter = 'all';
let searchQuery = '';
let walkthroughItems = [];
let walkthroughIndex = 0;
let myChart = null;
let activeEdit = null; 
let viewMode = localStorage.getItem('aliSiachViewMode') || 'grid'; 

// רכיב זיכרון משלים לקבלות (ייקרא על ידי ai.js)
let lastAnalyzedReceiptData = null;

// הגדרת קובץ אימוג'ים קבוע
const emojiMap = {
    "אבקת כביסה": "🧺", "אמה": "🧽", "ברזלית": "🧽", "דאורדורנט": "🧴", "כרית ניקוי": "🧽", "מבשם אוויר": "💨",
    "מסיר אבנית": "🧪", "מסיר כתמים": "🧪", "מסיר שומנים": "🔥", "מרכך כביסה": "🧼", "משחת שיניים": "🪥", "משמיד חרקים": "🪰",
    "משמיד עובש": "🧪", "נוזל לניקוי רצפות": "🧼", "נייר טואלט": "🧻", "שמפו": "🧴", "שקיות אשפה": "🗑️", "תרסיס אקונומיקה": "🧴",
    "אורז פרסי": "🍛", "פסטה": "🍝", "קוסקוס": "🍛", "פירורי לחם": "🍞", "רסק עגבניות": "🥫", "טונה": "🐟", "מלפפונים בחומץ": "🥒",
    "חומוס": "🥫", "פטריות": "🍄", "גפילטע פיש": "🐟", "קטשופ": "🍅", "טחינה": "🍯", "שמן קנולה": "🍾", "מיץ ענבים": "🍇",
    "קפה טסטר צ'ויס": "☕", "קפה נמס": "☕", "קורנפלקס": "🥣", "ופלים": "🍫", "עוגיות אוריאו": "🍪", "ערגליות": "🍪", "קולה": "🥤", "סודה": "🍾"
};

function getEmoji(name) { 
    for (const [key, value] of Object.entries(emojiMap)) { if (name.includes(key)) return value; } 
    return "📦"; 
}

function calculateToOrder(item) { 
    let req = (parseFloat(item.recommended) || 0) - (parseFloat(item.existing) || 0); 
    return req > 0 ? req : 0; 
}

// לוכדי שגיאות מערכת קשיחים
window.onerror = function(msg, url, line, col, error) {
    const errBox = document.getElementById('test-diagnostic-error');
    if (errBox) {
        errBox.innerText = `🚨 קריסת מערכת (סינכרונית):\nהודעה: ${msg}\nשורה: ${line}`;
        errBox.classList.remove('hidden');
    }
    return false;
};
window.onunhandledrejection = function(event) {
    const errBox = document.getElementById('test-diagnostic-error');
    if (errBox) {
        errBox.innerText = `🚨 קריסת מערכת (אסינכרונית):\nהודעה: ${event.reason}`;
        errBox.classList.remove('hidden');
    }
};

// טעינה וגיבוי מקומי כולל מטריצות ה-AI
function loadLocalBackupData() {
    try {
        const cached = localStorage.getItem('aliSiachLocalCache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.appData && Array.isArray(parsed.teamMembers)) {
                appData = parsed.appData; 
                teamMembers = parsed.teamMembers; 
                teamMessages = parsed.teamMessages || [];
                if (parsed.vegetableMatrix) vegetableMatrix = parsed.vegetableMatrix;
                if (parsed.toolMatrix) toolMatrix = parsed.toolMatrix;
                return;
            }
        }
    } catch (e) { console.error(e); }
    
    appData = {
        "טואלטיקה וניקיון": [
            { name: "אבקת כביסה", existing: 1, recommended: 3, price: 39, orderedLastMonth: 2, notes: "יום שני" },
            { name: "אמה (נוזל כלים)", existing: 3, recommended: 3, price: 7.2, orderedLastMonth: 3, notes: "" },
            { name: "ברזלית", existing: 0, recommended: 2, price: 4.5, orderedLastMonth: 2, notes: "יום שני" }
        ],
        "מוצרים יבשים ושימורים": [
            { name: "אורז פרסי", existing: 4, recommended: 5, price: 13, orderedLastMonth: 5, notes: "שבת" },
            { name: "פסטה", existing: 2, recommended: 4, price: 6, orderedLastMonth: 4, notes: "יום שישי" },
            { name: "טונה", existing: 12, recommended: 12, price: 5, orderedLastMonth: 12, notes: "" }
        ]
    };
    teamMembers = [
        { name: "בצלאל", pin: "1234", role: "admin" }, 
        { name: "אסתי", pin: "5678", role: "admin" }, 
        { name: "אבריימי", pin: "1111", role: "staff" }, 
        { name: "יהודה", pin: "2222", role: "staff" }
    ];
    teamMessages = [{ id: "msg_1", from: "מערכת", to: "כולם", text: "ברוכים הבאים למערכת המשותפת!", date: "8.7.2026", readBy: [] }];
}

async function init() {
    loadLocalBackupData(); 
    applyDarkModeStyles(); 
    buildUserLoginSelect(); 
    buildChatTargetSelect();
    initChart(); 
    renderApp(); 
    
    if (cloudUrl) { 
        const cloudInp = document.getElementById('cloud-url-input');
        if (cloudInp) cloudInp.value = cloudUrl; 
        await fetchCloudData(); 
    }
}

function initChart() {
    try {
        const ctx = document.getElementById('categoryChart'); if (!ctx) return;
        if (myChart) myChart.destroy();
        myChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'פריטים לחסר', data: [], backgroundColor: 'rgba(147, 51, 234, 0.6)', borderColor: 'rgb(147, 51, 234)', borderWidth: 1 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
        });
        updateChartData();
    } catch(e) { console.error(e); }
}

function updateChartData() {
    if (!myChart) return; let labels = [], data = [];
    for (const [cat, items] of Object.entries(appData)) { let sum = 0; items.forEach(i => { sum += calculateToOrder(i); }); labels.push(cat); data.push(sum); }
    myChart.data.labels = labels; myChart.data.datasets[0].data = data; myChart.update();
}

function buildChatTargetSelect() {
    const s = document.getElementById('chat-target-select'); if (!s) return; s.innerHTML = '<option value="כולם">📢 כולם (כל הצוות)</option>';
    teamMembers.forEach(m => { s.innerHTML += `<option value="${m.name}">👤 ${m.name}</option>`; });
}

function buildUserLoginSelect() {
    const select = document.getElementById('login-user-select'); if (!select) return; select.innerHTML = '';
    teamMembers.forEach(m => { select.innerHTML += `<option value="${m.name}">${m.name} (${m.role === 'admin' ? 'מנהל' : 'מדריך'})</option>`; });
}

function handleLogin() {
    const selectedName = document.getElementById('login-user-select').value; 
    const inputPin = document.getElementById('login-pin-input').value;
    const user = teamMembers.find(m => m.name === selectedName && m.pin === inputPin);
    if (user) { 
        currentUser = user; 
        document.getElementById('login-screen').classList.add('hidden'); 
        document.getElementById('current-user-display').innerText = user.name; 
        if (user.role === 'admin') {
            document.getElementById('admin-management-section').classList.remove('hidden'); 
        }
        renderApp(); 
    } else { alert("PIN שגוי!"); }
}

function handleLogout() { 
    currentUser = null; 
    document.getElementById('login-pin-input').value = ''; 
    document.getElementById('login-screen').classList.remove('hidden'); 
    document.getElementById('admin-management-section').classList.add('hidden'); 
    renderApp(); 
}

async function fetchCloudData() {
    if (!cloudUrl || !navigator.onLine) return;
    try {
        const res = await fetch(cloudUrl); const data = await res.json();
        if (data.success) {
            if (data.appData && Object.keys(data.appData).length > 0) appData = data.appData; 
            if (data.teamMembers && data.teamMembers.length > 0) teamMembers = data.teamMembers; 
            if (data.teamMessages) teamMessages = data.teamMessages;
            localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData, teamMembers, teamMessages, vegetableMatrix, toolMatrix })); 
            buildUserLoginSelect(); buildChatTargetSelect(); renderApp();
        }
    } catch (e) { console.error(e); }
}

function triggerDebouncedSync(immediate = false) {
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData, teamMembers, teamMessages, vegetableMatrix, toolMatrix }));
    if (saveTimeout) clearTimeout(saveTimeout); 
    if (immediate) syncWithCloud(); else saveTimeout = setTimeout(syncWithCloud, 1500);
}

async function syncWithCloud() {
    if (!cloudUrl || !navigator.onLine) return;
    try { await fetch(cloudUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ appData, teamMembers, teamMessages }) }); } catch (e) { console.error(e); }
}

function saveCloudUrl() { cloudUrl = document.getElementById('cloud-url-input').value.trim(); localStorage.setItem('aliSiachCloudUrl', cloudUrl); fetchCloudData(); showToast("הוגדר ענן!", "💾"); }
function saveGeminiKey() { localStorage.setItem('aliSiach_gemini_key', document.getElementById('gemini-key-input').value.trim()); showToast("הוגדר מפתח AI!", "🤖"); }

function adjustQuantity(category, index, change) {
    const item = appData[category][index]; let val = (parseFloat(item.existing) || 0) + change; item.existing = val < 0 ? 0 : Math.round(val * 2) / 2;
    renderApp(); triggerDebouncedSync();
}

function filterInventory() { searchQuery = document.getElementById('search-bar').value.toLowerCase(); renderApp(); }
function setFilter(type) {
    activeFilter = type; ['all', 'to-order', 'in-stock'].forEach(t => { document.getElementById(`filter-${t}`).className = t === type ? "px-3 py-1.5 rounded-lg bg-white text-blue-600 shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200"; });
    renderApp();
}

function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('aliSiachViewMode', mode);
    ['grid', 'table'].forEach(m => {
        document.getElementById(`view-${m}-btn`).className = m === mode ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200";
    });
    renderApp();
}

function renderApp() {
    const container = document.getElementById('inventory-container'); if (!container) return; container.innerHTML = '';
    let criticalCount = 0, totalToOrderItems = 0, totalCost = 0;

    for (const [catName, items] of Object.entries(appData)) {
        const filtered = items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery) || (item.notes && item.notes.toLowerCase().includes(searchQuery));
            const toOrder = calculateToOrder(item);
            if (item.existing === 0) criticalCount++;
            if (toOrder > 0) { totalToOrderItems += toOrder; totalCost += toOrder * (item.price || 0); }
            if (activeFilter === 'to-order') return matchesSearch && toOrder > 0;
            if (activeFilter === 'in-stock') return matchesSearch && toOrder === 0;
            return matchesSearch;
        });
        if (filtered.length === 0 && searchQuery !== '') continue;

        const catSection = document.createElement('div');
        catSection.className = "space-y-3 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm";
        
        catSection.innerHTML = `
            <div class="flex justify-between items-center border-b pb-2 px-1">
                <h2 class="text-sm font-black text-slate-900 border-r-4 border-blue-600 pr-2">${catName}</h2>
                <span class="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md">${filtered.length} פריטים</span>
            </div>
        `;

        if (viewMode === 'grid') {
            const gridContainer = document.createElement('div');
            gridContainer.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2";

            filtered.forEach(item => {
                const toOrder = calculateToOrder(item);
                const origIndex = items.findIndex(i => i.name === item.name);
                
                const itemCard = document.createElement('div');
                itemCard.className = `border-2 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition hover:shadow-md min-h-[240px] bg-white ${item.existing === 0 ? 'border-red-300 bg-red-50/5' : 'border-slate-200'}`;
                
                itemCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">₪${item.price || 0}</span>
                        <button class="text-slate-400 hover:text-blue-600 text-sm edit-modal-trigger">✏️</button>
                    </div>
                    
                    <div class="flex flex-col items-center justify-center flex-1 my-3 space-y-1">
                        <h3 class="text-lg font-black text-slate-900 text-center leading-tight">${item.name}</h3>
                        <span class="text-5xl select-none block pt-1">${getEmoji(item.name)}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 border-t pt-3 text-[11px] text-center font-bold">
                        <div class="p-1 rounded-lg data-existing">קיים: <span class="block text-sm font-black">${item.existing}</span></div>
                        <div class="p-1 rounded-lg data-recommended">יעד: <span class="block text-sm font-black">${item.recommended}</span></div>
                        <div class="p-1 rounded-lg data-lastmonth">קודם: <span class="block text-sm font-black">${item.orderedLastMonth || 0}</span></div>
                        <div class="p-1 rounded-lg ${toOrder > 0 ? 'data-toorder-active' : 'data-toorder'}">להזמנה: <span class="block text-sm font-black">${toOrder || '-'}</span></div>
                    </div>
                    
                    <div class="flex items-center justify-between mt-3 border-t pt-2 gap-2">
                        <button class="w-8 h-8 rounded-lg border font-black bg-slate-50 text-slate-700 minus-btn">-</button>
                        ${item.notes ? `<span class="text-[9px] text-slate-400 truncate max-w-[100px]" title="${item.notes}">💡 ${item.notes}</span>` : '<span class="flex-1"></span>'}
                        <button class="w-8 h-8 rounded-lg border font-black bg-slate-50 text-slate-700 plus-btn">+</button>
                    </div>
                `;

                itemCard.querySelector('.minus-btn').onclick = () => adjustQuantity(catName, origIndex, -0.5);
                itemCard.querySelector('.plus-btn').onclick = () => adjustQuantity(catName, origIndex, 0.5);
                itemCard.querySelector('.edit-modal-trigger').onclick = () => openProductModal(catName, origIndex);
                gridContainer.appendChild(itemCard);
            });
            catSection.appendChild(gridContainer);
        } else {
            const tableWrapper = document.createElement('div');
            tableWrapper.className = "overflow-x-auto pt-2";
            let rowsHtml = '';

            filtered.forEach(item => {
                const toOrder = calculateToOrder(item);
                const origIndex = items.findIndex(i => i.name === item.name);
                rowsHtml += `
                    <tr class="border-b text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                        <td class="p-3 text-slate-900 text-sm font-black max-w-xs">${item.name}</td>
                        <td class="p-3 data-existing text-center text-sm font-black">${item.existing}</td>
                        <td class="p-3 data-recommended text-center">${item.recommended}</td>
                        <td class="p-3 data-lastmonth text-center font-medium italic">${item.orderedLastMonth || 0}</td>
                        <td class="p-3 text-center text-sm font-black ${toOrder > 0 ? 'data-toorder-active' : 'data-toorder'}">${toOrder || '-'}</td>
                        <td class="p-3 text-slate-500 text-center">₪${item.price || 0}</td>
                        <td class="p-3 text-slate-400 font-medium max-w-xs truncate">${item.notes || '-'}</td>
                        <td class="p-3 text-center">
                            <div class="flex justify-center gap-1">
                                <button onclick="adjustQuantity('${catName}', ${origIndex}, -0.5)" class="px-2 py-1 bg-slate-100 border rounded font-black">-</button>
                                <button onclick="adjustQuantity('${catName}', ${origIndex}, 0.5)" class="px-2 py-1 bg-slate-100 border rounded font-black">+</button>
                                <button onclick="openProductModal('${catName}', ${origIndex})" class="px-2 py-1 bg-blue-50 text-blue-600 rounded">✏️</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tableWrapper.innerHTML = `
                <table class="w-full text-right border-separate border-spacing-0">
                    <thead>
                        <tr class="text-[11px] font-black text-slate-500 bg-slate-50 border-b">
                            <th class="p-3 border-b">שם המצרך</th>
                            <th class="p-3 border-b text-center bg-blue-100/60 text-blue-900">קיים בדירה</th>
                            <th class="p-3 border-b text-center bg-slate-200/60 text-slate-800">יעד מומלץ</th>
                            <th class="p-3 border-b text-center bg-purple-100/60 text-purple-900">חודש קודם</th>
                            <th class="p-3 border-b text-center bg-amber-100/60 text-amber-900">להזמנה</th>
                            <th class="p-3 border-b text-center">מחיר</th>
                            <th class="p-3 border-b">הערות תפריט</th>
                            <th class="p-3 border-b text-center">פעולות</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            `;
            catSection.appendChild(tableWrapper);
        }

        container.appendChild(catSection);
    }
    
    document.getElementById('dash-missing-val').innerText = criticalCount;
    document.getElementById('dash-total-val').innerText = totalToOrderItems;
    document.getElementById('dash-cost-val').innerText = `₪${totalCost.toFixed(2)}`;
    updateChartData(); 
    if (currentUser) { renderMessages(); renderChatMessages(); }
}

function renderAdminTeamList() {
    const c = document.getElementById('admin-team-list'); if (!c) return; c.innerHTML = '';
    teamMembers.forEach((m, idx) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center p-1.5 bg-white border rounded-lg mb-1 font-bold text-[11px]";
        row.innerHTML = `
            <span>👤 ${m.name} (${m.role === 'admin' ? 'מנהל' : 'מדריך'})</span>
            <button class="text-red-500 hover:text-red-700 px-1 text-xs remove-user-btn">❌ מחק</button>
        `;
        row.querySelector('.remove-user-btn').onclick = () => {
            if (currentUser && currentUser.name === m.name) { alert("אינך יכול למחוק את עצמך!"); return; }
            teamMembers.splice(idx, 1);
            renderAdminTeamList();
            buildUserLoginSelect();
            triggerDebouncedSync(true);
            showToast("איש צוות הוסר", "👤");
        };
        c.appendChild(row);
    });
}

function addNewTeamMember() {
    const nameInp = document.getElementById('new-user-name');
    const pinInp = document.getElementById('new-user-pin');
    const roleSel = document.getElementById('new-user-role');
    
    const name = nameInp.value.trim();
    const pin = pinInp.value.trim();
    const role = roleSel.value;
    
    if (!name || pin.length !== 4) { alert("הזן שם עובד וקוד PIN בן 4 ספרות בדיוק!"); return; }
    if (teamMembers.some(m => m.name === name)) { alert("שם עובד זה כבר קיים במערכת!"); return; }
    
    teamMembers.push({ name, pin, role });
    nameInp.value = '';
    pinInp.value = '';
    
    renderAdminTeamList();
    buildUserLoginSelect();
    triggerDebouncedSync(true);
    showToast("איש צוות חדש נוסף בהצלחה!", "✨");
}

function startWalkthroughMode() {
    if (!currentUser) return; walkthroughItems = []; 
    for (const cat in appData) { appData[cat].forEach((item, idx) => { walkthroughItems.push({ ...item, cat, origIdx: idx }); }); }
    if (walkthroughItems.length === 0) return; walkthroughIndex = 0; showWalkthroughItem();
    const screen = document.getElementById('walkthrough-screen');
    screen.classList.remove('hidden'); screen.classList.add('flex');
}

function closeWalkthroughMode() { 
    document.getElementById('walkthrough-screen').classList.add('hidden'); 
    document.getElementById('walkthrough-screen').classList.remove('flex'); 
    renderApp(); 
}

function showWalkthroughItem() {
    const item = walkthroughItems[walkthroughIndex]; const real = appData[item.cat][item.origIdx];
    document.getElementById('wt-cat-title').innerText = item.cat; document.getElementById('wt-item-emoji').innerText = getEmoji(real.name);
    document.getElementById('wt-item-name').innerText = real.name; document.getElementById('wt-item-qty').innerText = real.existing; document.getElementById('wt-item-target').innerText = real.recommended;
}

function adjustWtQty(amt) {
    const item = walkthroughItems[walkthroughIndex]; const real = appData[item.cat][item.origIdx];
    let v = (parseFloat(real.existing) || 0) + amt; real.existing = v < 0 ? 0 : Math.round(v * 2) / 2; showWalkthroughItem(); triggerDebouncedSync();
}

function walkthroughNext() { if (walkthroughIndex < walkthroughItems.length - 1) { walkthroughIndex++; showWalkthroughItem(); } else { closeWalkthroughMode(); showToast("ספירת המלאי הושלמה!", "🏁"); } }
function walkthroughPrev() { if (walkthroughIndex > 0) { walkthroughIndex--; showWalkthroughItem(); } }

document.addEventListener('keydown', function(e) {
    const wtScreen = document.getElementById('walkthrough-screen');
    if (wtScreen && wtScreen.classList.contains('flex')) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); walkthroughNext(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); walkthroughPrev(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); adjustWtQty(0.5); }
        if (e.key === 'ArrowDown') { e.preventDefault(); adjustWtQty(-0.5); }
    }
});

let isNotificationOpen = false;
function toggleNotificationDropdown() {
    if (!currentUser) return;
    const dropdown = document.getElementById('notification-dropdown'); isNotificationOpen = !isNotificationOpen;
    if (isNotificationOpen) { dropdown.classList.remove('hidden'); renderMessages(); } 
    else { dropdown.classList.add('hidden'); teamMessages.forEach(m => { if (!m.readBy.includes(currentUser.name)) m.readBy.push(currentUser.name); }); renderApp(); triggerDebouncedSync(true); }
}

function renderMessages() {
    const container = document.getElementById('messages-list-container'); if (!container || !currentUser) return; container.innerHTML = '';
    let unreadCount = 0; const visibleMsgs = teamMessages.filter(m => m.to === "כולם" || m.to === currentUser.name || m.from === currentUser.name);
    teamMessages.forEach(m => { if ((m.to === "כולם" || m.to === currentUser.name) && !m.readBy.includes(currentUser.name) && m.from !== currentUser.name) unreadCount++; });
    const badge = document.getElementById('unread-badge'); if (unreadCount > 0) { badge.innerText = unreadCount; badge.classList.remove('hidden'); } else badge.classList.add('hidden');
    if (visibleMsgs.length === 0) { container.innerHTML = `<div class="text-slate-300 italic text-center py-3">אין הודעות</div>`; return; }
    visibleMsgs.slice(0, 10).forEach(m => {
        const isRead = m.readBy.includes(currentUser.name) || m.from === currentUser.name;
        const targetText = m.to !== "כולם" ? ` <span class="text-purple-600 font-bold">(אישי אליך)</span>` : '';
        const item = document.createElement('div');
        item.className = "p-2 border-b text-[11px] hover:bg-slate-50 transition";
        item.innerHTML = `<div class="flex justify-between text-[9px] text-slate-400"><span>מאת: ${m.from}${targetText}</span><span>${m.date}</span></div><p class="${isRead ? 'text-slate-400' : 'text-slate-900 font-bold'}">${m.text}</p><button class="text-blue-500 font-bold text-[10px] mt-1 block reply-btn">↩️ השב בפרטי</button>`;
        item.querySelector('.reply-btn').onclick = () => replyToMessage(m.from);
        container.appendChild(item);
    });
}

function replyToMessage(senderName) {
    document.getElementById('notification-dropdown').classList.add('hidden'); isNotificationOpen = false;
    const select = document.getElementById('chat-target-select'); if(select) select.value = senderName;
    toggleFloatingChat(true);
}

let isChatOpen = false;
function toggleFloatingChat(forceOpen = false) {
    if (!currentUser) return;
    const win = document.getElementById('floating-chat-window'); isChatOpen = forceOpen ? true : !isChatOpen;
    if (isChatOpen) { win.classList.remove('hidden'); renderChatMessages(); } else win.classList.add('hidden');
}

function sendChatMessage() {
    const inp = document.getElementById('chat-text-input'); const text = inp.value.trim(); if (!text || !currentUser) return;
    const target = document.getElementById('chat-target-select').value;
    teamMessages.unshift({ id: "msg_" + Date.now(), from: currentUser.name, to: target, text, date: new Date().toLocaleDateString('he-IL'), readBy: [currentUser.name] });
    inp.value = ''; renderApp(); triggerDebouncedSync(true);
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages-container'); if (!container || !currentUser) return; container.innerHTML = '';
    const visibleMsgs = teamMessages.filter(m => m.to === "כולם" || m.to === currentUser.name || m.from === currentUser.name);
    visibleMsgs.forEach(m => {
        const isPrivate = m.to !== "כולם";
        const badgeLabel = isPrivate ? `<span class="bg-purple-100 text-purple-700 px-1 rounded text-[8px]">אישי אל: ${m.to}</span>` : '<span class="bg-slate-100 text-slate-600 px-1 rounded text-[8px]">לכולם</span>';
        const msgDiv = document.createElement('div');
        msgDiv.className = "p-2 border rounded-xl bg-white mb-1.5 relative shadow-sm text-slate-800";
        msgDiv.innerHTML = `<div class="flex justify-between text-[9px] text-slate-400 mb-0.5"><span><b>${m.from}</b> ${badgeLabel}</span><span>${m.date}</span></div><p class="font-medium pr-3">${m.text}</p><button class="absolute left-1 top-1 text-red-400 opacity-50 hover:opacity-100 delete-msg-btn">✕</button>`;
        msgDiv.querySelector('.delete-msg-btn').onclick = () => deleteMessage(m.id);
        container.appendChild(msgDiv);
    });
}

function deleteMessage(id) { teamMessages = teamMessages.filter(m => m.id !== id); renderApp(); triggerDebouncedSync(true); }

function generateOrderTextShort() {
    let txt = `דוח הזמנת מלאי - עלי שיח\nהרשימה המלאה הועתקה ללוח.\n\nמוצרים חסרים דחופים (כמות 0):\n`;
    for (const [cat, items] of Object.entries(appData)) { items.forEach(i => { if (i.existing === 0) txt += `• ${i.name} (מומלץ: ${i.recommended})\n`; }); }
    return txt;
}
function generateOrderTextFull() {
    let txt = `📦 *דוח מלאי חודשי מלא - עלי שיח* 📦\n\n`;
    for (const [cat, items] of Object.entries(appData)) {
        let has = false; let ct = `*${cat}:*\n`;
        items.forEach(i => { let toOrd = calculateToOrder(i); if (toOrd > 0) { ct += `• ${i.name} - להזמנה: *${toOrd}*\n`; has = true; } });
        if (has) txt += ct + `\n`;
    }
    return txt;
}

function exportData(type) {
    const fullText = generateOrderTextFull(); toggleSharePopover();
    if (type === 'copy') { navigator.clipboard.writeText(fullText); showToast("הרשימה המלאה הועתקה!", "📋"); } 
    else if (type === 'whatsapp') { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank'); } 
    else if (type === 'email') {
        navigator.clipboard.writeText(fullText); const shortText = generateOrderTextShort();
        window.location.href = `mailto:?subject=${encodeURIComponent('הזמנת מלאי - עלי שיח')}&body=${encodeURIComponent(shortText)}`;
    } else if (type === 'csv') {
        let csv = "data:text/csv;charset=utf-8,\uFEFFקטגוריה,מוצר,קיים,מומלץ,להזמנה\n";
        for (const [cat, items] of Object.entries(appData)) { items.forEach(i => { csv += `"${cat}","${i.name}",${i.existing},${i.recommended},${calculateToOrder(i)}\n`; }); }
        const dl = document.createElement("a"); dl.setAttribute("href", encodeURI(csv)); dl.setAttribute("download", "מלאי.csv"); dl.click();
    }
}
function toggleSharePopover() { document.getElementById('share-popover').classList.toggle('hidden'); }

function openProductModal(cat, index) {
    if (currentUser && currentUser.role !== 'admin') { showToast("פעולה למנהלים בלבד", "⚠️"); return; }
    activeEdit = { cat, index }; const item = appData[cat][index];
    document.getElementById('modal-prod-name').value = item.name; document.getElementById('modal-prod-price').value = item.price || 0;
    document.getElementById('modal-prod-recommended').value = item.recommended || 0; document.getElementById('modal-prod-notes').value = item.notes || '';
    document.getElementById('product-modal').classList.remove('hidden');
}
function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); }
function saveProductModalData() {
    if (!activeEdit) return; const item = appData[activeEdit.cat][activeEdit.index];
    item.price = parseFloat(document.getElementById('modal-prod-price').value) || 0; item.recommended = parseFloat(document.getElementById('modal-prod-recommended').value) || 0;
    item.notes = document.getElementById('modal-prod-notes').value.trim(); closeProductModal(); renderApp(); triggerDebouncedSync(true);
}

function toggleSettingsModal() { if (!currentUser) return; const m = document.getElementById('settings-modal'); m.classList.toggle('hidden'); m.classList.toggle('flex'); renderAdminTeamList(); }

function toggleDarkMode() { isDarkMode = !isDarkMode; localStorage.setItem('aliSiachDarkMode', isDarkMode); applyDarkModeStyles(); }
function applyDarkModeStyles() {
    const btn = document.getElementById('dark-mode-toggle-btn');
    if (isDarkMode) { document.body.classList.add('dark-mode'); if(btn) btn.innerText = "פעיל"; } 
    else { document.body.classList.remove('dark-mode'); if(btn) btn.innerText = "כבוי"; }
}

function showToast(msg, icon = "✨") {
    const t = document.getElementById('toast'); document.getElementById('toast-message').innerText = msg; document.getElementById('toast-icon').innerText = icon;
    t.classList.remove('translate-y-20', 'opacity-0'); t.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => { t.classList.remove('translate-y-0', 'opacity-100'); t.classList.add('translate-y-20', 'opacity-0'); }, 3000);
}

window.onload = init;
