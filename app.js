// אפליקציית עלי שיח - ניהול מלאי מרכזי (גרסה מלאה, יציבה ומסונכרנת)
window.appData = {};
window.teamMembers = [];
window.teamMessages = [];
window.currentUser = null;
window.cloudUrl = localStorage.getItem('aliSiachCloudUrl') || "";
window.saveTimeout = null;
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

// אתחול משתני מצב גלובליים למניעת ReferenceError בפתיחת תפריטים
window.isNotificationOpen = false;
window.isChatOpen = false;
window.isAIChatOpen = false;

let dragSourceCategory = null;
let dragSourceIndex = null;

const emojiMap = {
    "אבקת כביסה": "🧺", "אמה": "🧽", "ברזלית": "🧽", "דאורדורנט": "🧴", "כרית ניקוי": "🧽", "מבשם אוויר": "💨",
    "מסיר אבנית": "🧪", "מסיר כתמים": "🧪", "מסיר שומנים": "🔥", "מרכך כביסה": "🧼", "משחת שיניים": "🪥", "משמיד חרקים": "🪰",
    "משמיד עובש": "🧪", "נוזל לניקוי רצפות": "🧼", "נייר טואלט": "🧻", "שמפו": "🧴", "שקיות אשפה": "🗑️", "תרסיס אקונומיקה": "🧴",
    "אורז פרסי": "🍛", "פסטה": "🍝", "קוסקוס": "🍛", "פירורי לחם": "🍞", "רסק עגבניות": "🥫", "טונה": "🐟", "מלפפונים בחומץ": "🥒",
    "חומוס": "🥫", "פטריות": "🍄", "גפילטע פיש": "🐟", "קטשופ": "🍅", "טחינה": "🍯", "שמן קנולה": "🍾", "מיץ ענבים": "🍇",
    "קפה טסטר צ'ויס": "☕", "קפה נמס": "☕", "קורנפלקס": "🥣", "ופלים": "🍫", "עוגיות אוריאו": "🍪", "ערגליות": "🍪", "קולה": "🥤", "סודה": "🍾",
    "עגבניה": "🍅", "מלפפון": "🥒", "גזר": "🥕", "קולרבי": "🥦", "תפו\"א": "🥔", "כרוב": "🥬", "בצל": "🧅", "דלורית": "🎃", "פלפל": "🫑", "שום": "🧄"
};

function getEmoji(name) { 
    for (const [key, value] of Object.entries(emojiMap)) { if (name.includes(key)) return value; } 
    return "📦"; 
}
window.getEmoji = getEmoji;

function calculateToOrder(item) { 
    let req = (parseFloat(item.recommended) || 0) - (parseFloat(item.existing) || 0); 
    return req > 0 ? req : 0; 
}
window.calculateToOrder = calculateToOrder;

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
    } catch (e) { console.error(e); }
    
    window.appData = {
        "טואלטיקה וניקיון": [
            { name: "אבקת כביסה", existing: 1, recommended: 3, price: 39, orderedLastMonth: 2, notes: "לכביסת דיירים", days: "שני, חמישי", changesCount: 4 },
            { name: "אמה (נוזל כלים)", existing: 3, recommended: 3, price: 7.2, orderedLastMonth: 3, notes: "מטבח בשרי", days: "כל הימים", changesCount: 1 },
            { name: "ברזלית", existing: 0, recommended: 2, price: 4.5, orderedLastMonth: 2, notes: "ניקוי סירים", days: "שני", changesCount: 12 }
        ],
        "מוצרים יבשים ושימורים": [
            { name: "אורז פרסי", existing: 4, recommended: 5, price: 13, orderedLastMonth: 5, notes: "לארוחת שבת", days: "שישי, שבת", changesCount: 2 },
            { name: "פסטה", existing: 2, recommended: 4, price: 6, orderedLastMonth: 4, notes: "ארוחת צהריים", days: "ראשון, שלישי", changesCount: 8 },
            { name: "טונה", existing: 12, recommended: 12, price: 5, orderedLastMonth: 12, notes: "סעודה שלישית", days: "שבת", changesCount: 0 }
        ]
    };
    window.teamMembers = [
        { name: "בצלאל", pin: "1234", role: "admin" }, 
        { name: "אסתי", pin: "5678", role: "admin" }, 
        { name: "אבריימי", pin: "1111", role: "staff" }, 
        { name: "יהודה", pin: "2222", role: "staff" }
    ];
    window.teamMessages = [{ id: "msg_1", from: "מערכת", to: "כולם", text: "ברוכים הבאים למערכת המשותפת!", date: "8.7.2026", readBy: [] }];
}

async function init() {
    loadLocalBackupData(); 
    applyDarkModeStyles(); 
    buildUserLoginSelect(); 
    buildChatTargetSelect();
    initChart(); 
    renderApp(); 
    
    if (window.cloudUrl) { 
        const cloudInp = document.getElementById('cloud-url-input');
        if (cloudInp) cloudInp.value = window.cloudUrl; 
        await fetchCloudData(); 
    }
}

function initChart() {
    try {
        const ctx = document.getElementById('categoryChart'); if (!ctx) return;
        if (window.myChart) window.myChart.destroy();
        window.myChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['חסר', 'להזמנה', 'מלאי תקין'], datasets: [{ data: [0, 0, 100], backgroundColor: ['#ef4444', '#3b82f6', '#10b981'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutOut: '72%' }
        });
        updateChartData();
    } catch(e) { console.error(e); }
}

function updateChartData() {
    if (!window.myChart) return;
    let missing = 0, toOrder = 0, ok = 0;
    for (const [cat, items] of Object.entries(window.appData)) {
        items.forEach(i => {
            let req = calculateToOrder(i);
            if (i.existing === 0) missing++;
            else if (req > 0) toOrder++;
            else ok++;
        });
    }
    window.myChart.data.datasets[0].data = [missing, toOrder, ok];
    window.myChart.update();
    renderCategoryProgressBars();
}

function renderCategoryProgressBars() {
    const container = document.getElementById('category-progress-container'); if (!container) return;
    container.innerHTML = '';
    for (const [catName, items] of Object.entries(window.appData)) {
        let total = items.length;
        let missing = items.filter(i => calculateToOrder(i) > 0).length;
        let pct = total > 0 ? Math.round((missing / total) * 100) : 0;
        container.innerHTML += `
            <div class="space-y-1">
                <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>${catName}</span><span>${missing} פריטים</span></div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden"><div class="bg-purple-600 h-full rounded-full" style="width: ${pct}%"></div></div>
            </div>
        `;
    }
}

function buildChatTargetSelect() {
    const s = document.getElementById('chat-target-select'); if (!s) return; s.innerHTML = '<option value="כולם">📢 כולם (כל הצוות)</option>';
    window.teamMembers.forEach(m => { s.innerHTML += `<option value="${m.name}">👤 ${m.name}</option>`; });
}

function buildUserLoginSelect() {
    const select = document.getElementById('login-user-select'); if (!select) return; select.innerHTML = '';
    window.teamMembers.forEach(m => { select.innerHTML += `<option value="${m.name}">${m.name} (${m.role === 'admin' ? 'מנהל' : 'מדריך'})</option>`; });
}

function handleLogin() {
    const selectedName = document.getElementById('login-user-select').value; 
    const inputPin = document.getElementById('login-pin-input').value;
    const user = window.teamMembers.find(m => m.name === selectedName && m.pin === inputPin);
    if (user) { 
        window.currentUser = user; 
        document.getElementById('login-screen').classList.add('hidden'); 
        document.getElementById('current-user-display').innerText = user.name; 
        if (user.role === 'admin') document.getElementById('admin-management-section').classList.remove('hidden'); 
        renderApp(); 
    } else { alert("PIN שגוי!"); }
}
window.handleLogin = handleLogin;

function handleLogout() { 
    window.currentUser = null; 
    document.getElementById('login-pin-input').value = ''; 
    document.getElementById('login-screen').classList.remove('hidden'); 
    document.getElementById('admin-management-section').classList.add('hidden'); 
    renderApp(); 
}
window.handleLogout = handleLogout;

async function fetchCloudData() {
    if (!window.cloudUrl || !navigator.onLine) return;
    try {
        const res = await fetch(window.cloudUrl); const data = await res.json();
        if (data.success) {
            if (data.appData && Object.keys(data.appData).length > 0) window.appData = data.appData; 
            if (data.teamMembers && data.teamMembers.length > 0) window.teamMembers = data.teamMembers; 
            if (data.teamMessages) window.teamMessages = data.teamMessages;
            localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix })); 
            buildUserLoginSelect(); buildChatTargetSelect(); renderApp();
        }
    } catch (e) { console.error(e); }
}

function triggerDebouncedSync(immediate = false) {
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix }));
    if (window.saveTimeout) clearTimeout(window.saveTimeout); 
    if (immediate) syncWithCloud(); else window.saveTimeout = setTimeout(syncWithCloud, 1500);
}
window.triggerDebouncedSync = triggerDebouncedSync;

async function syncWithCloud() {
    if (!window.cloudUrl || !navigator.onLine) return;
    try { await fetch(window.cloudUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages }) }); } catch (e) { console.error(e); }
}

function saveCloudUrl() { window.cloudUrl = document.getElementById('cloud-url-input').value.trim(); localStorage.setItem('aliSiachCloudUrl', window.cloudUrl); fetchCloudData(); showToast("הוגדר ענן!", "💾"); }
window.saveCloudUrl = saveCloudUrl;
function saveGeminiKey() { localStorage.setItem('aliSiach_gemini_key', document.getElementById('gemini-key-input').value.trim()); showToast("הוגדר מפתח AI!", "🤖"); }
window.saveGeminiKey = saveGeminiKey;

function updateItemValue(category, index, field, value) {
    const item = window.appData[category][index];
    let num = parseFloat(value);
    if (isNaN(num) || num < 0) num = 0;
    
    if (item[field] !== num) {
        item[field] = num;
        item.changesCount = (item.changesCount || 0) + 1;
        renderApp();
        triggerDebouncedSync();
    }
}
window.updateItemValue = updateItemValue;

function filterInventory() { window.searchQuery = document.getElementById('search-bar').value.toLowerCase(); renderApp(); }
window.filterInventory = filterInventory;

function setFilter(type) { window.activeFilter = type; renderApp(); }
window.setFilter = setFilter;

function setDayFilter(day) {
    window.activeDayFilter = day;
    document.querySelectorAll('#day-filter-bar button').forEach(btn => {
        btn.className = btn.id === `day-filter-${day}` ? "px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-black shadow-sm" : "px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold";
    });
    renderApp();
}
window.setDayFilter = setDayFilter;

function setSortMode(mode) { window.activeSortMode = mode; localStorage.setItem('aliSiachSortMode', mode); renderApp(); }
window.setSortMode = setSortMode;

function setViewMode(mode) { 
    window.viewMode = mode; 
    localStorage.setItem('aliSiachViewMode', mode); 
    document.getElementById('view-grid-btn').className = mode === 'grid' ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200";
    document.getElementById('view-table-btn').className = mode === 'table' ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200";
    renderApp(); 
}
window.setViewMode = setViewMode;

// בנאי כמויות נקי ללא סמלי חצים למטה התואם במדויק לעיצוב [▲][+][input][-] (סעיף ה')
function createQtyControllerHtml(category, origIndex, field, currentValue) {
    return `
        <div class="flex flex-row items-center justify-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border dark:border-slate-700 mx-auto max-w-[150px]">
            <button onclick="window.updateItemValue('${category}', ${origIndex}, '${field}', ${currentValue + 1})" class="w-6 h-6 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 rounded font-black shadow-sm text-slate-700 dark:text-white">▲</button>
            <button onclick="window.updateItemValue('${category}', ${origIndex}, '${field}', ${currentValue + 0.5})" class="w-6 h-6 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 rounded font-black shadow-sm text-slate-700 dark:text-white">+</button>
            <input type="number" step="0.5" min="0" value="${currentValue}" onchange="window.updateItemValue('${category}', ${origIndex}, '${field}', this.value)" class="w-11 text-center font-black text-xs bg-white dark:bg-slate-800 rounded border dark:border-slate-600 p-0.5 data-existing">
            <button onclick="window.updateItemValue('${category}', ${origIndex}, '${field}', ${currentValue - 0.5})" class="w-6 h-6 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 rounded font-black shadow-sm text-slate-700 dark:text-white">-</button>
        </div>
    `;
}

function renderApp() {
    const container = document.getElementById('inventory-container'); if (!container) return; container.innerHTML = '';
    let criticalCount = 0, totalToOrderItems = 0, totalCost = 0;

    for (const [catName, items] of Object.entries(window.appData)) {
        let itemsWithMeta = items.map((item, index) => ({ ...item, originalIndex: index }));
        
        if (window.activeSortMode === 'alphabetical') itemsWithMeta.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        else if (window.activeSortMode === 'frequency') itemsWithMeta.sort((a, b) => (b.changesCount || 0) - (a.changesCount || 0));

        const filtered = itemsWithMeta.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(window.searchQuery) || (item.notes && item.notes.toLowerCase().includes(window.searchQuery));
            let matchesDay = window.activeDayFilter === 'all' || (item.days && (item.days.includes(window.activeDayFilter) || item.days.includes("כל הימים")));
            const toOrder = calculateToOrder(item);
            if (item.existing === 0) criticalCount++;
            if (toOrder > 0) { totalToOrderItems += toOrder; totalCost += toOrder * (item.price || 0); }
            if (window.activeFilter === 'to-order') return matchesSearch && matchesDay && toOrder > 0;
            if (window.activeFilter === 'in-stock') return matchesSearch && matchesDay && toOrder === 0;
            return matchesSearch && matchesDay;
        });

        const catSection = document.createElement('div');
        catSection.className = "space-y-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-3xl shadow-sm";
        
        if (window.activeSortMode === 'manual') {
            catSection.ondragover = (e) => { e.preventDefault(); catSection.classList.add('drag-over'); };
            catSection.ondragleave = () => catSection.classList.remove('drag-over');
            catSection.ondrop = (e) => { e.preventDefault(); handleCategoryDrop(e, catName); };
        }

        catSection.innerHTML = `
            <div class="flex justify-between items-center border-b dark:border-slate-700 pb-2 px-1">
                <h2 class="text-sm font-black text-slate-900 dark:text-white border-r-4 border-blue-600 pr-2">${catName}</h2>
                <span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-md">${filtered.length} פריטים</span>
            </div>
        `;

        if (window.viewMode === 'grid') {
            const gridContainer = document.createElement('div');
            gridContainer.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2";
            filtered.forEach(item => {
                const toOrder = calculateToOrder(item);
                const itemCard = document.createElement('div');
                itemCard.className = `draggable-item border-2 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition bg-white dark:bg-slate-800 ${item.existing === 0 ? 'border-red-300 bg-red-50/5' : 'border-slate-200 dark:border-slate-700'}`;
                
                if (window.activeSortMode === 'manual') {
                    itemCard.draggable = true;
                    itemCard.ondragstart = (e) => handleDragStart(e, catName, item.originalIndex);
                    itemCard.ondragover = (e) => e.preventDefault();
                    itemCard.ondrop = (e) => handleDropReorder(e, catName, item.originalIndex);
                }

                itemCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">₪${item.price || 0}</span>
                        <div class="flex gap-2"><button class="text-slate-400 hover:text-blue-600 text-xs edit-btn">✏️</button><button class="text-slate-300 hover:text-red-500 text-xs del-btn">🗑️</button></div>
                    </div>
                    <div class="flex flex-col items-center justify-center flex-1 my-4 space-y-2">
                        <h3 class="text-xl font-black text-slate-900 dark:text-white text-center">${item.name}</h3>
                        <span class="text-6xl select-none block">${getEmoji(item.name)}</span>
                    </div>
                    <div class="space-y-2 border-t pt-3">
                        <div><span class="text-[10px] font-black text-slate-400 block mb-1">קיים במלאי:</span>${createQtyControllerHtml(catName, item.originalIndex, 'existing', item.existing)}</div>
                        <div class="text-center pt-1"><span class="text-[10px] font-black text-slate-400 block mb-1">יעד מומלץ:</span><input type="number" value="${item.recommended}" onchange="window.updateItemValue('${catName}', ${item.originalIndex}, 'recommended', this.value)" class="w-16 text-center font-bold text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border p-1"></div>
                    </div>
                `;
                itemCard.querySelector('.edit-btn').onclick = () => openProductModal(catName, item.originalIndex);
                itemCard.querySelector('.del-btn').onclick = () => deleteProductComplete(catName, item.originalIndex);
                gridContainer.appendChild(itemCard);
            });
            catSection.appendChild(gridContainer);
        } else {
            const tableWrapper = document.createElement('div');
            tableWrapper.className = "overflow-x-auto pt-2";
            let rowsHtml = '';

            filtered.forEach(item => {
                const toOrder = calculateToOrder(item);
                rowsHtml += `
                    <tr class="table-row-floating border-b dark:border-slate-700 text-xs font-bold hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td class="p-3 text-slate-900 dark:text-white text-sm font-black flex items-center gap-2"><span class="text-xl">${getEmoji(item.name)}</span><span>${item.name}</span></td>
                        <td class="p-2">${createQtyControllerHtml(catName, item.originalIndex, 'existing', item.existing)}</td>
                        
                        <!-- הסרת כפתורי הפלוס והמינוס מעמודת יעד מומלץ לפי דרישת העיצוב (סעיף ה') -->
                        <td class="p-2 text-center">
                            <input type="number" value="${item.recommended}" onchange="window.updateItemValue('${catName}', ${item.originalIndex}, 'recommended', this.value)" class="w-16 text-center font-bold text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border p-1 focus:outline-none">
                        </td>
                        
                        <td class="p-3 data-lastmonth text-center text-sm font-black">${item.orderedLastMonth || '-'}</td>
                        <td class="p-3 text-center text-slate-400 font-bold">-</td>
                        <td class="p-3 text-center text-sm font-black ${toOrder > 0 ? 'data-toorder-active' : 'text-slate-300'}">${toOrder ? `₪${(toOrder * (item.price || 0)).toFixed(0)}` : '-'}</td>
                        <td class="p-3 text-slate-500 text-center font-black">${item.days || 'כל הימים'}</td>
                        <td class="p-3 text-slate-400 font-medium max-w-xs truncate">${item.notes || '-'}</td>
                        <td class="p-3 text-center"><div class="flex justify-center gap-2"><button onclick="window.openProductModal('${catName}', ${item.originalIndex})" class="text-blue-500 hover:underline">ערוך</button><button onclick="window.deleteProductComplete('${catName}', ${item.originalIndex})" class="text-red-400 hover:underline">מחק</button></div></td>
                    </tr>
                `;
            });

            tableWrapper.innerHTML = `
                <table class="w-full text-right border-separate border-spacing-0 custom-table">
                    <thead>
                        <tr class="text-[11px] font-black text-slate-400 bg-slate-50/80 dark:bg-slate-700/50">
                            <th class="p-3">שם המוצר</th>
                            <th class="p-3 text-center">קיים במלאי</th>
                            <th class="p-3 text-center">יעד מומלץ</th>
                            <th class="p-3 text-center">חודש קודם</th>
                            <th class="p-3 text-center">לחתונה</th>
                            <th class="p-3 text-center">מחיר</th>
                            <th class="p-3 text-center">ימי שימוש</th>
                            <th class="p-3">הערות</th>
                            <th class="p-3 text-center">פעולות</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            `;
            catSection.appendChild(tableWrapper);
        }
        container.appendChild(catSection);
    }
    renderAppStats(criticalCount, totalToOrderItems, totalCost);
}
window.renderApp = renderApp;

function renderAppStats(criticalCount, totalToOrderItems, totalCost) {
    document.getElementById('dash-missing-val').innerText = criticalCount;
    document.getElementById('dash-total-val').innerText = totalToOrderItems;
    document.getElementById('dash-cost-val').innerText = `₪${totalCost.toFixed(0)}`;
    updateChartData(); 
    if (window.currentUser) { renderMessages(); renderChatMessages(); }
}

function handleDragStart(e, category, index) { dragSourceCategory = category; dragSourceIndex = index; }
function handleCategoryDrop(e, targetCategory) {
    if (dragSourceCategory && dragSourceCategory !== targetCategory) {
        const item = window.appData[dragSourceCategory].splice(dragSourceIndex, 1)[0];
        window.appData[targetCategory].push(item);
        renderApp(); triggerDebouncedSync(true);
    }
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}
function handleDropReorder(e, targetCategory, targetIndex) {
    e.stopPropagation();
    if (dragSourceCategory === targetCategory && dragSourceIndex !== targetIndex) {
        const movedItem = window.appData[targetCategory].splice(dragSourceIndex, 1)[0];
        window.appData[targetCategory].splice(targetIndex, 0, movedItem);
        renderApp(); triggerDebouncedSync(true);
    }
}

function setMessageCenterTab(tab) { window.messageCenterTab = tab; setMessageCenterTabUI(); renderMessages(); }
window.setMessageCenterTab = setMessageCenterTab;

function setMessageCenterTabUI() {
    let tab = window.messageCenterTab;
    document.getElementById('msg-tab-received').className = tab === 'received' ? "px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "px-2 py-1 rounded text-slate-500 dark:text-slate-300";
    document.getElementById('msg-tab-sent').className = tab === 'sent' ? "px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "px-2 py-1 rounded text-slate-500 dark:text-slate-300";
}

function renderMessages() {
    const container = document.getElementById('messages-list-container'); if (!container || !window.currentUser) return; container.innerHTML = '';
    let displayList = window.messageCenterTab === 'received' ? window.teamMessages.filter(m => m.to === "כולם" || m.to === window.currentUser.name) : window.teamMessages.filter(m => m.from === window.currentUser.name);
    if (displayList.length === 0) { container.innerHTML = `<div class="text-slate-400 italic text-center py-2 text-[10px]">אין הודעות בתיקייה</div>`; return; }
    
    displayList.forEach(m => {
        const isRead = m.readBy.includes(window.currentUser.name) || m.from === window.currentUser.name;
        const item = document.createElement('div');
        item.className = "p-2 border-b dark:border-slate-700 text-[11px] hover:bg-slate-50 flex justify-between items-start";
        item.innerHTML = `
            <div class="flex-1">
                <div class="flex justify-between text-[9px] text-slate-400"><span>מאת: ${m.from}</span><span>${m.date}</span></div>
                <p class="${isRead ? 'text-slate-400' : 'text-slate-900 dark:text-white font-bold'}">${m.text}</p>
            </div>
            <button class="text-red-400 px-1 msg-del-btn">✕</button>
        `;
        item.querySelector('.msg-del-btn').onclick = () => deleteMessageComplete(m.id);
        container.appendChild(item);
    });
}
window.renderMessages = renderMessages;

function deleteMessageComplete(id) { window.teamMessages = window.teamMessages.filter(m => m.id !== id); renderMessages(); triggerDebouncedSync(true); }

function renderAdminTeamList() {
    const c = document.getElementById('admin-team-list'); if (!c) return; c.innerHTML = '';
    window.teamMembers.forEach((m, idx) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center p-1.5 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg mb-1 font-bold text-[11px]";
        row.innerHTML = `<span>👤 ${m.name} (${m.role})</span><button class="text-red-500 text-xs remove-user-btn">❌</button>`;
        row.querySelector('.remove-user-btn').onclick = () => {
            if (window.currentUser && window.currentUser.name === m.name) { alert("אינך יכול למחוק את עצמך!"); return; }
            if (m.role === 'admin') {
                if (prompt("הזן קוד מאסטר 9876 למחיקת מנהל:") !== '9876') { alert("קוד שגוי!"); return; }
            }
            window.teamMembers.splice(idx, 1); renderAdminTeamList(); buildUserLoginSelect(); triggerDebouncedSync(true);
        };
        c.appendChild(row);
    });
}

function addNewTeamMember() {
    const nameInp = document.getElementById('new-user-name'); const pinInp = document.getElementById('new-user-pin');
    const name = nameInp.value.trim(); const pin = pinInp.value.trim(); const role = document.getElementById('new-user-role').value;
    if (!name || pin.length !== 4) { alert("מלא פרטים תקינים!"); return; }
    window.teamMembers.push({ name, pin, role }); nameInp.value = ''; pinInp.value = '';
    renderAdminTeamList(); buildUserLoginSelect(); triggerDebouncedSync(true); showToast("איש צוות נוסף!");
}
window.addNewTeamMember = addNewTeamMember;

function openAddProductModal() {
    const select = document.getElementById('add-prod-category'); if (!select) return; select.innerHTML = '';
    Object.keys(window.appData).forEach(cat => { select.innerHTML += `<option value="${cat}">${cat}</option>`; });
    document.getElementById('add-product-modal').classList.remove('hidden'); document.getElementById('add-product-modal').classList.add('flex');
}
window.openAddProductModal = openAddProductModal;
function closeAddProductModal() { document.getElementById('add-product-modal').classList.add('hidden'); document.getElementById('add-product-modal').classList.remove('flex'); }
window.closeAddProductModal = closeAddProductModal;

function submitNewProduct() {
    const name = document.getElementById('add-prod-name').value.trim(); const cat = document.getElementById('add-prod-category').value;
    const price = parseFloat(document.getElementById('add-prod-price').value) || 0; const rec = parseFloat(document.getElementById('add-prod-recommended').value) || 0;
    if (!name) return; window.appData[cat].push({ name, existing: 0, recommended: rec, price, orderedLastMonth: 0, notes: "", days: "כל הימים", changesCount: 0 });
    closeAddProductModal(); document.getElementById('add-prod-name').value = ''; renderApp(); triggerDebouncedSync(true);
}
window.submitNewProduct = submitNewProduct;

function deleteProductComplete(category, index) {
    if (confirm("למחוק פריט זה?")) { window.appData[category].splice(index, 1); renderApp(); triggerDebouncedSync(true); }
}
window.deleteProductComplete = deleteProductComplete;

function startWalkthroughMode() {
    if (!window.currentUser) return; window.walkthroughItems = []; 
    for (const cat in window.appData) { window.appData[cat].forEach((item, idx) => { window.walkthroughItems.push({ ...item, cat, origIdx: idx }); }); }
    if (window.walkthroughItems.length === 0) return; window.walkthroughIndex = 0; showWalkthroughItem();
    document.getElementById('walkthrough-screen').classList.remove('hidden'); document.getElementById('walkthrough-screen').classList.add('flex');
}
window.startWalkthroughMode = startWalkthroughMode;

function closeWalkthroughMode() { document.getElementById('walkthrough-screen').classList.add('hidden'); document.getElementById('walkthrough-screen').classList.remove('flex'); renderApp(); }
window.closeWalkthroughMode = closeWalkthroughMode;

function showWalkthroughItem() {
    const item = window.walkthroughItems[window.walkthroughIndex]; const real = window.appData[item.cat][item.origIdx];
    document.getElementById('wt-cat-title').innerText = item.cat; document.getElementById('wt-item-emoji').innerText = getEmoji(real.name);
    document.getElementById('wt-item-name').innerText = real.name; document.getElementById('wt-item-qty').innerText = real.existing; document.getElementById('wt-item-target').innerText = real.recommended;
}

function adjustWtQty(amt) {
    const item = window.walkthroughItems[window.walkthroughIndex]; const real = window.appData[item.cat][item.origIdx];
    let v = (parseFloat(real.existing) || 0) + amt; real.existing = v < 0 ? 0 : Math.round(v * 2) / 2; showWalkthroughItem(); triggerDebouncedSync();
}
window.adjustWtQty = adjustWtQty;

function walkthroughNext() { if (window.walkthroughIndex < window.walkthroughItems.length - 1) { window.walkthroughIndex++; showWalkthroughItem(); } else { closeWalkthroughMode(); showToast("ספירת המלאי הושלמה!", "🏁"); } }
window.walkthroughNext = walkthroughNext;
function walkthroughPrev() { if (window.walkthroughIndex > 0) { window.walkthroughIndex--; showWalkthroughItem(); } }
window.walkthroughPrev = walkthroughPrev;

document.addEventListener('keydown', function(e) {
    const wtScreen = document.getElementById('walkthrough-screen');
    if (wtScreen && wtScreen.classList.contains('flex')) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); window.walkthroughNext(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); window.walkthroughPrev(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); window.adjustWtQty(0.5); }
        if (e.key === 'ArrowDown') { e.preventDefault(); window.adjustWtQty(-0.5); }
    }
});

function toggleDarkMode() { window.isDarkMode = !window.isDarkMode; localStorage.setItem('aliSiachDarkMode', window.isDarkMode); applyDarkModeStyles(); }
window.toggleDarkMode = toggleDarkMode;
function applyDarkModeStyles() {
    const btn = document.getElementById('dark-mode-toggle-btn');
    if (window.isDarkMode) { document.documentElement.classList.add('dark'); document.body.classList.add('dark-mode'); if(btn) btn.innerText = "פעיל"; } 
    else { document.documentElement.classList.remove('dark'); document.body.classList.remove('dark-mode'); if(btn) btn.innerText = "כבוי"; }
}

function openProductModal(cat, index) {
    if (window.currentUser && window.currentUser.role !== 'admin') return; window.activeEdit = { cat, index }; const item = window.appData[cat][index];
    document.getElementById('modal-prod-name').value = item.name; document.getElementById('modal-prod-price').value = item.price || 0;
    document.getElementById('modal-prod-recommended').value = item.recommended || 0; document.getElementById('modal-prod-lastmonth').value = item.orderedLastMonth || 0;
    document.getElementById('modal-prod-notes').value = item.notes || ''; document.getElementById('modal-prod-days-custom').value = item.days || '';
    document.querySelectorAll('.day-chk').forEach(chk => { chk.checked = item.days && item.days.includes(chk.value); });
    document.getElementById('product-modal').classList.remove('hidden');
}
window.openProductModal = openProductModal;

function saveProductModalData() {
    if (!window.activeEdit) return; const item = window.appData[window.activeEdit.cat][window.activeEdit.index];
    item.price = parseFloat(document.getElementById('modal-prod-price').value) || 0; item.recommended = parseFloat(document.getElementById('modal-prod-recommended').value) || 0;
    item.orderedLastMonth = parseFloat(document.getElementById('modal-prod-lastmonth').value) || 0; item.notes = document.getElementById('modal-prod-notes').value.trim();
    let selectedDays = []; document.querySelectorAll('.day-chk:checked').forEach(chk => selectedDays.push(chk.value));
    let customDays = document.getElementById('modal-prod-days-custom').value.trim();
    item.days = customDays ? customDays : (selectedDays.length > 0 ? selectedDays.join(', ') : 'כל הימים');
    document.getElementById('product-modal').classList.add('hidden'); renderApp(); triggerDebouncedSync(true);
}
window.saveProductModalData = saveProductModalData;

function toggleSettingsModal() { if (!window.currentUser) return; const m = document.getElementById('settings-modal'); m.classList.toggle('hidden'); m.classList.toggle('flex'); renderAdminTeamList(); }
window.toggleSettingsModal = toggleSettingsModal;

// פתרון הפעלת כפתור הודעות הצוות הכחול הצף (ד')
function toggleFloatingChat() { 
    if (!window.currentUser) return; 
    const win = document.getElementById('floating-chat-window'); 
    window.isChatOpen = !window.isChatOpen; 
    if (window.isChatOpen) { 
        win.classList.remove('hidden'); 
        renderChatMessages(); 
    } else { 
        win.classList.add('hidden'); 
    } 
}
window.toggleFloatingChat = toggleFloatingChat;

function sendChatMessage() { const inp = document.getElementById('chat-text-input'); const text = inp.value.trim(); if (!text || !window.currentUser) return; const target = "כולם"; window.teamMessages.unshift({ id: "msg_" + Date.now(), from: window.currentUser.name, to: target, text, date: new Date().toLocaleDateString('he-IL'), readBy: [window.currentUser.name] }); inp.value = ''; renderApp(); triggerDebouncedSync(true); }
window.sendChatMessage = sendChatMessage;

function renderChatMessages() { const container = document.getElementById('chat-messages-container'); if (!container || !window.currentUser) return; container.innerHTML = ''; window.teamMessages.forEach(m => { container.innerHTML += `<div class="p-2 border rounded-xl bg-white mb-1 shadow-sm text-slate-800 dark:bg-slate-700 dark:text-white dark:border-slate-600"><div class="text-[9px] text-slate-400"><b>${m.from}</b></div><p>${m.text}</p></div>`; }); }

function toggleNotificationDropdown() { 
    if (!window.currentUser) return; 
    const dropdown = document.getElementById('notification-dropdown'); 
    window.isNotificationOpen = !window.isNotificationOpen; 
    if (window.isNotificationOpen) { dropdown.classList.remove('hidden'); renderMessages(); } 
    else { dropdown.classList.add('hidden'); window.teamMessages.forEach(m => { if (!m.readBy.includes(window.currentUser.name)) m.readBy.push(window.currentUser.name); }); renderApp(); triggerDebouncedSync(true); } 
}
window.toggleNotificationDropdown = toggleNotificationDropdown;

function generateOrderTextFull() {
    let txt = `📦 *דוח מלאי חודשי מלא - עלי שיח* 📦\n\n`;
    for (const [cat, items] of Object.entries(window.appData)) {
        let has = false; let ct = `*${cat}:*\n`;
        items.forEach(i => { let toOrd = calculateToOrder(i); if (toOrd > 0) { ct += `• ${i.name} - להזמנה: *${toOrd}*\n`; has = true; } });
        if (has) txt += ct + `\n`;
    }
    return txt;
}
function toggleSharePopover() { document.getElementById('share-popover').classList.toggle('hidden'); }
window.toggleSharePopover = toggleSharePopover;

function exportData(type) {
    const fullText = generateOrderTextFull(); toggleSharePopover();
    if (type === 'copy') { navigator.clipboard.writeText(fullText); showToast("הרשימה המלאה הועתקה!", "📋"); } 
    else if (type === 'whatsapp') { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank'); } 
}
window.exportData = exportData;

function showToast(msg, icon = "✨") { const t = document.getElementById('toast'); document.getElementById('toast-message').innerText = msg; document.getElementById('toast-icon').innerText = icon; t.classList.remove('translate-y-20', 'opacity-0'); t.classList.add('translate-y-0', 'opacity-100'); setTimeout(() => { t.classList.remove('translate-y-0', 'opacity-100'); t.classList.add('translate-y-20', 'opacity-0'); }, 3000); }
window.showToast = showToast;

window.onload = init;
