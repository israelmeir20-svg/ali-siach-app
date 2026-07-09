// אפליקציית עלי שיח - ניהול מלאי ומטבח חכם
let appData = {};
let teamMembers = [];
let teamMessages = [];
let currentUser = null;
let cloudUrl = localStorage.getItem('aliSiachCloudUrl') || "";
let saveTimeout = null;
let isDarkMode = localStorage.getItem('aliSiachDarkMode') === 'true';
let activeFilter = 'all';
let activeDayFilter = 'all'; // פילטר ימים חדש
let activeSortMode = localStorage.getItem('aliSiachSortMode') || 'manual'; // manual, alphabetical, frequency
let searchQuery = '';
let walkthroughItems = [];
let walkthroughIndex = 0;
let myChart = null;
let activeEdit = null; 
let viewMode = localStorage.getItem('aliSiachViewMode') || 'grid'; 
let messageCenterTab = 'received'; // received, sent

// משתני עזר למערכת גרירה (Drag and Drop)
let dragSourceCategory = null;
let dragSourceIndex = null;

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

// לוכדי שגיאות גלובליים
window.onerror = function(msg, url, line, col, error) {
    const errBox = document.getElementById('test-diagnostic-error');
    if (errBox) {
        errBox.innerText = `🚨 קריסת מערכת:\n${msg}\nשורה: ${line}`;
        errBox.classList.remove('hidden');
    }
    return false;
};
window.onunhandledrejection = function(event) {
    const errBox = document.getElementById('test-diagnostic-error');
    if (errBox) {
        errBox.innerText = `🚨 קריסת מערכת אסינכרונית:\n${event.reason}`;
        errBox.classList.remove('hidden');
    }
};

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
    
    // מלאי ראשוני המכיל תגיות ימי שימוש כברירת מחדל
    appData = {
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
    populateCategoryDropdowns();
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
            buildUserLoginSelect(); buildChatTargetSelect(); populateCategoryDropdowns(); renderApp();
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

// פונקציית עדכון כמויות עם מעקב תדירות (סעיף ז)
function updateItemValue(category, index, field, value) {
    const item = appData[category][index];
    let num = parseFloat(value);
    if (isNaN(num) || num < 0) num = 0;
    
    if (item[field] !== num) {
        item[field] = num;
        item.changesCount = (item.changesCount || 0) + 1; // העלאת מדד תדירות השינוי
        renderApp();
        triggerDebouncedSync();
    }
}

function filterInventory() { searchQuery = document.getElementById('search-bar').value.toLowerCase(); renderApp(); }
function setFilter(type) {
    activeFilter = type; ['all', 'to-order', 'in-stock'].forEach(t => { document.getElementById(`filter-${t}`).className = t === type ? "px-3 py-1.5 rounded-lg bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"; });
    renderApp();
}

// ניהול פילטר ימים (סעיף ה')
function setDayFilter(day) {
    activeDayFilter = day;
    const buttons = document.querySelectorAll('#day-filter-bar button');
    buttons.forEach(btn => {
        if (btn.id === `day-filter-${day}`) {
            btn.className = "px-2.5 py-1 rounded-lg bg-blue-600 text-white border border-blue-500 shadow-sm";
        } else {
            btn.className = "px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
        }
    });
    renderApp();
}

function setSortMode(mode) {
    activeSortMode = mode;
    localStorage.setItem('aliSiachSortMode', mode);
    renderApp();
}

function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('aliSiachViewMode', mode);
    ['grid', 'table'].forEach(m => {
        document.getElementById(`view-${m}-btn`).className = m === mode ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600";
    });
    renderApp();
}

// פונקציית עזר ליצירת לחצני כמות מרובים וקלטי מקלדת (סעיף ה')
function createQtyControllerHtml(category, origIndex, field, currentValue) {
    return `
        <div class="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border dark:border-slate-700">
            <button onclick="updateItemValue('${category}', ${origIndex}, '${field}', ${currentValue - 1})" class="w-6 h-6 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md font-black shadow-sm hover:bg-red-50">-1</button>
            <button onclick="updateItemValue('${category}', ${origIndex}, '${field}', ${currentValue - 0.5})" class="w-7 h-6 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md font-black shadow-sm hover:bg-red-50">-0.5</button>
            <input type="number" step="0.5" min="0" value="${currentValue}" onchange="updateItemValue('${category}', ${origIndex}, '${field}', this.value)" class="w-12 text-center font-black text-xs bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 focus:outline-none p-0.5 rounded border dark:border-slate-600">
            <button onclick="updateItemValue('${category}', ${origIndex}, '${field}', ${currentValue + 0.5})" class="w-7 h-6 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md font-black shadow-sm hover:bg-green-50">+0.5</button>
            <button onclick="updateItemValue('${category}', ${origIndex}, '${field}', ${currentValue + 1})" class="w-6 h-6 text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md font-black shadow-sm hover:bg-green-50">+1</button>
        </div>
    `;
}

// רינדור אפליקציה מרכזי הכולל מיונים ופילטרי ימים ותצוגות משופרות
function renderApp() {
    const container = document.getElementById('inventory-container'); if (!container) return; container.innerHTML = '';
    let criticalCount = 0, totalToOrderItems = 0, totalCost = 0;

    for (const [catName, items] of Object.entries(appData)) {
        // העתקה לצורך מיון פנימי מבלי לפגוע באינדקס המקורי
        let itemsWithMeta = items.map((item, index) => ({ ...item, originalIndex: index }));
        
        // ביצוע מיונים (סעיף ז')
        if (activeSortMode === 'alphabetical') {
            itemsWithMeta.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        } else if (activeSortMode === 'frequency') {
            itemsWithMeta.sort((a, b) => (b.changesCount || 0) - (a.changesCount || 0));
        }

        const filtered = itemsWithMeta.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery) || (item.notes && item.notes.toLowerCase().includes(searchQuery));
            
            // סינון ימים (סעיף ה')
            let matchesDay = true;
            if (activeDayFilter !== 'all') {
                matchesDay = item.days && (item.days.includes(activeDayFilter) || item.days.includes("כל הימים"));
            }

            const toOrder = calculateToOrder(item);
            if (item.existing === 0) criticalCount++;
            if (toOrder > 0) { totalToOrderItems += toOrder; totalCost += toOrder * (item.price || 0); }
            
            if (activeFilter === 'to-order') return matchesSearch && matchesDay && toOrder > 0;
            if (activeFilter === 'in-stock') return matchesSearch && matchesDay && toOrder === 0;
            return matchesSearch && matchesDay;
        });

        if (filtered.length === 0 && searchQuery !== '') continue;

        const catSection = document.createElement('div');
        catSection.className = "space-y-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-3xl shadow-sm";
        
        // ניהול אזור גרירה לקטגוריה עצמה
        catSection.ondragover = (e) => handleCategoryDragOver(e, catSection);
        catSection.ondragleave = () => catSection.classList.remove('drag-over');
        catSection.ondrop = (e) => handleCategoryDrop(e, catName);

        catSection.innerHTML = `
            <div class="flex justify-between items-center border-b dark:border-slate-700 pb-2 px-1">
                <h2 class="text-sm font-black text-slate-900 dark:text-white border-r-4 border-blue-600 pr-2">${catName}</h2>
                <span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-md">${filtered.length} פריטים</span>
            </div>
        `;

        if (viewMode === 'grid') {
            // תצוגת קוביות גדולות (סעיף א)
            const gridContainer = document.createElement('div');
            gridContainer.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2";

            filtered.forEach(item => {
                const toOrder = calculateToOrder(item);
                const itemCard = document.createElement('div');
                itemCard.className = `draggable-item border-2 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition bg-white dark:bg-slate-800 ${item.existing === 0 ? 'border-red-300 dark:border-red-900 bg-red-50/5' : 'border-slate-200 dark:border-slate-700'}`;
                
                // תמיכה בגרירה והשלכה רק במצב מיון ידני
                if (activeSortMode === 'manual') {
                    itemCard.draggable = true;
                    itemCard.ondragstart = (e) => handleDragStart(e, catName, item.originalIndex);
                    itemCard.ondragover = (e) => e.preventDefault();
                    itemCard.ondrop = (e) => handleDropReorder(e, catName, item.originalIndex);
                }

                itemCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">₪${item.price || 0}</span>
                        <div class="flex gap-2">
                            <button class="text-slate-400 hover:text-blue-600 text-xs edit-btn">✏️</button>
                            <button class="text-slate-300 hover:text-red-500 text-xs delete-item-btn">🗑️</button>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-center justify-center flex-1 my-4 space-y-2">
                        <h3 class="text-xl font-black text-slate-900 dark:text-white text-center leading-tight">${item.name}</h3>
                        <span class="text-6xl select-none block">${getEmoji(item.name)}</span>
                        ${item.days ? `<span class="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-[9px] text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900">📅 ${item.days}</span>` : ''}
                    </div>

                    <div class="space-y-2 border-t dark:border-slate-700 pt-3">
                        <div>
                            <span class="text-[10px] font-black text-slate-400 block mb-1">קיים במזווה:</span>
                            ${createQtyControllerHtml(catName, item.originalIndex, 'existing', item.existing)}
                        </div>
                        <div>
                            <span class="text-[10px] font-black text-slate-400 block mb-1">יעד מומלץ:</span>
                            ${createQtyControllerHtml(catName, item.originalIndex, 'recommended', item.recommended)}
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[11px] text-center font-bold pt-1">
                            <div class="p-1.5 rounded-lg data-lastmonth">חודש קודם: <span class="block text-xs font-black">${item.orderedLastMonth || 0}</span></div>
                            <div class="p-1.5 rounded-lg ${toOrder > 0 ? 'data-toorder-active' : 'data-toorder'}">להזמנה: <span class="block text-xs font-black">${toOrder || '-'}</span></div>
                        </div>
                    </div>
                    
                    ${item.notes ? `<p class="text-[10px] bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 p-1.5 rounded-lg text-slate-500 mt-2 truncate font-medium">💡 ${item.notes}</p>` : ''}
                `;

                itemCard.querySelector('.edit-btn').onclick = () => openProductModal(catName, item.originalIndex);
                itemCard.querySelector('.delete-item-btn').onclick = () => deleteProductComplete(catName, item.originalIndex);
                gridContainer.appendChild(itemCard);
            });
            catSection.appendChild(gridContainer);
        } else {
            // תצוגת טבלה מעוצבת ונקייה ללא אימוג'ים (סעיף ב', ח')
            const tableWrapper = document.createElement('div');
            tableWrapper.className = "overflow-x-auto pt-2";
            let rowsHtml = '';

            filtered.forEach(item => {
                const toOrder = calculateToOrder(item);
                rowsHtml += `
                    <tr class="border-b dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td class="p-3 text-slate-900 dark:text-white text-sm font-black">${item.name}</td>
                        <td class="p-2 w-48 text-center">${createQtyControllerHtml(catName, item.originalIndex, 'existing', item.existing)}</td>
                        <td class="p-2 w-48 text-center">${createQtyControllerHtml(catName, item.originalIndex, 'recommended', item.recommended)}</td>
                        <td class="p-3 data-lastmonth text-center font-black text-sm">${item.orderedLastMonth || 0}</td>
                        <td class="p-3 text-center text-sm font-black ${toOrder > 0 ? 'data-toorder-active' : 'data-toorder'}">${toOrder || '-'}</td>
                        <td class="p-3 text-slate-500 text-center">₪${item.price || 0}</td>
                        <td class="p-3 text-slate-400 font-bold max-w-xs truncate">${item.days || '-'}</td>
                        <td class="p-3 text-slate-400 font-medium max-w-xs truncate">${item.notes || '-'}</td>
                        <td class="p-3 text-center">
                            <div class="flex justify-center gap-2">
                                <button onclick="openProductModal('${catName}', ${item.originalIndex})" class="text-blue-500 hover:underline">✏️</button>
                                <button onclick="deleteProductComplete('${catName}', ${item.originalIndex})" class="text-red-400 hover:text-red-600">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tableWrapper.innerHTML = `
                <table class="w-full text-right border-separate border-spacing-0 custom-table">
                    <thead>
                        <tr class="text-[11px] font-black text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-700/50">
                            <th class="p-3">שם המצרך</th>
                            <th class="p-3 text-center">קיים במזווה (עריכת לחצנים/מקלדת)</th>
                            <th class="p-3 text-center">יעד מומלץ (עריכת לחצנים/מקלדת)</th>
                            <th class="p-3 text-center bg-purple-50 dark:bg-purple-950/20">חודש קודם</th>
                            <th class="p-3 text-center bg-amber-50 dark:bg-amber-950/20">להזמנה</th>
                            <th class="p-3 text-center">מחיר</th>
                            <th class="p-3">ימי תפריט</th>
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
    
    document.getElementById('dash-missing-val').innerText = criticalCount;
    document.getElementById('dash-total-val').innerText = totalToOrderItems;
    document.getElementById('dash-cost-val').innerText = `₪${totalCost.toFixed(2)}`;
    updateChartData(); 
    if (currentUser) { renderMessages(); renderChatMessages(); }
}

// לוגיקת גרירה והשלכה (סעיף ו', ז')
function handleDragStart(e, category, index) {
    dragSourceCategory = category;
    dragSourceIndex = index;
}
function handleCategoryDragOver(e, element) {
    e.preventDefault();
    element.classList.add('drag-over');
}
function handleCategoryDrop(e, targetCategory) {
    e.preventDefault();
    if (dragSourceCategory && dragSourceCategory !== targetCategory) {
        // העברת מוצר מקטגוריה לקטגוריה
        const item = appData[dragSourceCategory].splice(dragSourceIndex, 1)[0];
        if (!appData[targetCategory]) appData[targetCategory] = [];
        appData[targetCategory].push(item);
        renderApp();
        triggerDebouncedSync(true);
        showToast("המוצר הועבר קטגוריה", "📦");
    }
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}
function handleDropReorder(e, targetCategory, targetIndex) {
    e.stopPropagation();
    if (dragSourceCategory === targetCategory && dragSourceIndex !== targetIndex) {
        // סידור פנימי ידני באותה קטגוריה
        const list = appData[targetCategory];
        const movedItem = list.splice(dragSourceIndex, 1)[0];
        list.splice(targetIndex, 0, movedItem);
        renderApp();
        triggerDebouncedSync(true);
    }
}

// ניהול רשת ההודעות המפוצלת ומחיקה (סעיף ג', ד')
function setMessageCenterTab(tab) {
    messageCenterTab = tab;
    document.getElementById('msg-tab-received').className = tab === 'received' ? "px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "px-2 py-1 rounded text-slate-500 dark:text-slate-300";
    document.getElementById('msg-tab-sent').className = tab === 'sent' ? "px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "px-2 py-1 rounded text-slate-500 dark:text-slate-300";
    renderMessages();
}

function renderMessages() {
    const container = document.getElementById('messages-list-container'); if (!container || !currentUser) return; container.innerHTML = '';
    let unreadCount = 0;
    
    // ספירת הודעות שהתקבלו בלבד עבור התג הראשי
    teamMessages.forEach(m => { if ((m.to === "כולם" || m.to === currentUser.name) && !m.readBy.includes(currentUser.name) && m.from !== currentUser.name) unreadCount++; });
    const badge = document.getElementById('unread-badge'); if (unreadCount > 0) { badge.innerText = unreadCount; badge.classList.remove('hidden'); } else badge.classList.add('hidden');

    let displayList = [];
    if (messageCenterTab === 'received') {
        displayList = teamMessages.filter(m => m.to === "כולם" || m.to === currentUser.name);
    } else {
        displayList = teamMessages.filter(m => m.from === currentUser.name);
    }

    if (displayList.length === 0) { container.innerHTML = `<div class="text-slate-400 italic text-center py-3 text-[10px]">אין הודעות בתיקייה זו</div>`; return; }
    
    displayList.forEach(m => {
        const isRead = m.readBy.includes(currentUser.name) || m.from === currentUser.name;
        const item = document.createElement('div');
        item.className = "p-2 border-b dark:border-slate-700 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-start";
        item.innerHTML = `
            <div class="flex-1">
                <div class="flex justify-between text-[9px] text-slate-400"><span>מאת: ${m.from} | אל: ${m.to}</span><span>${m.date}</span></div>
                <p class="${isRead ? 'text-slate-400' : 'text-slate-900 dark:text-white font-bold'}">${m.text}</p>
                ${messageCenterTab === 'received' ? `<button class="text-blue-500 font-bold text-[9px] mt-1 reply-btn">↩️ השב</button>` : ''}
            </div>
            <button class="text-red-400 opacity-60 hover:opacity-100 px-1 delete-msg-btn">✕</button>
        `;
        if (messageCenterTab === 'received') {
            item.querySelector('.reply-btn').onclick = () => replyToMessage(m.from);
        }
        item.querySelector('.delete-msg-btn').onclick = () => deleteMessageComplete(m.id);
        container.appendChild(item);
    });
}

function deleteMessageComplete(id) {
    teamMessages = teamMessages.filter(m => m.id !== id);
    renderMessages();
    triggerDebouncedSync(true);
    showToast("ההודעה נמחקה", "🗑️");
}

// אבטחת מחיקת מנהל באמצעות קוד מאסטר 9876 (סעיף ב')
function renderAdminTeamList() {
    const c = document.getElementById('admin-team-list'); if (!c) return; c.innerHTML = '';
    teamMembers.forEach((m, idx) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center p-1.5 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg mb-1 font-bold text-[11px]";
        row.innerHTML = `<span>👤 ${m.name} (${m.role === 'admin' ? 'מנהל' : 'מדריך'})</span><button class="text-red-500 px-1 text-xs remove-user-btn">❌ מחק</button>`;
        row.querySelector('.remove-user-btn').onclick = () => {
            if (currentUser && currentUser.name === m.name) { alert("אינך יכול למחוק את עצמך!"); return; }
            if (m.role === 'admin') {
                const masterCode = prompt("⚠️ אזהרה: אתה מוחק מנהל מערכת. הזן קוד מאסטר לאישור הפעולה:");
                if (masterCode !== '9876') { alert("קוד מאסטר שגוי! הפעולה בוטלה."); return; }
            }
            teamMembers.splice(idx, 1);
            renderAdminTeamList();
            buildUserLoginSelect();
            triggerDebouncedSync(true);
            showToast("איש צוות הוסר", "👤");
        };
        c.appendChild(row);
    });
}

// הוספה ומחיקה של מוצרים מלאים מהמלאי (סעיף ו')
function openAddProductModal() {
    const select = document.getElementById('add-prod-category'); if (!select) return;
    select.innerHTML = '';
    Object.keys(appData).forEach(cat => { select.innerHTML += `<option value="${cat}">${cat}</option>`; });
    document.getElementById('add-product-modal').classList.remove('hidden');
    document.getElementById('add-product-modal').classList.add('flex');
}
function closeAddProductModal() { document.getElementById('add-product-modal').classList.add('hidden'); document.getElementById('add-product-modal').classList.remove('flex'); }
function submitNewProduct() {
    const name = document.getElementById('add-prod-name').value.trim();
    const cat = document.getElementById('add-prod-category').value;
    const price = parseFloat(document.getElementById('add-prod-price').value) || 0;
    const rec = parseFloat(document.getElementById('add-prod-recommended').value) || 0;
    
    if (!name) { alert("חובה להזין שם מוצר!"); return; }
    appData[cat].push({ name, existing: 0, recommended: rec, price, orderedLastMonth: 0, notes: "", days: "כל הימים", changesCount: 0 });
    closeAddProductModal();
    document.getElementById('add-prod-name').value = '';
    renderApp();
    triggerDebouncedSync(true);
    showToast("המוצר התווסף בהצלחה!", "✨");
}
function deleteProductComplete(category, index) {
    if (confirm(`האם אתה בטוח שברצונך למחוק לחלוטין את המוצר "${appData[category][index].name}" מהמערכת?`)) {
        appData[category].splice(index, 1);
        renderApp();
        triggerDebouncedSync(true);
        showToast("המוצר נמחק מהמערכת", "🗑️");
    }
}
function populateCategoryDropdowns() { /* פונקציית סנכרון פנימית לקטגוריות */ }

// תיקון מקיף למצב לילה (סעיף א)
function toggleDarkMode() { 
    isDarkMode = !isDarkMode; 
    localStorage.setItem('aliSiachDarkMode', isDarkMode); 
    applyDarkModeStyles(); 
}
function applyDarkModeStyles() {
    const btn = document.getElementById('dark-mode-toggle-btn');
    if (isDarkMode) { 
        document.documentElement.classList.add('dark'); 
        document.body.classList.add('dark-mode');
        if(btn) btn.innerText = "פעיל"; 
    } else { 
        document.documentElement.classList.remove('dark'); 
        document.body.classList.remove('dark-mode');
        if(btn) btn.innerText = "כבוי"; 
    }
}

// עריכת מוצר מורחב (סעיף ה')
function openProductModal(cat, index) {
    if (currentUser && currentUser.role !== 'admin') { showToast("פעולה למנהלים בלבד", "⚠️"); return; }
    activeEdit = { cat, index }; const item = appData[cat][index];
    document.getElementById('modal-prod-name').value = item.name; 
    document.getElementById('modal-prod-price').value = item.price || 0;
    document.getElementById('modal-prod-recommended').value = item.recommended || 0; 
    document.getElementById('modal-prod-lastmonth').value = item.orderedLastMonth || 0;
    document.getElementById('modal-prod-notes').value = item.notes || '';
    document.getElementById('modal-prod-days-custom').value = item.days || '';
    
    // סימון צ'קבוקסים
    const chks = document.querySelectorAll('.day-chk');
    chks.forEach(chk => { chk.checked = item.days && item.days.includes(chk.value); });
    
    document.getElementById('product-modal').classList.remove('hidden');
}
function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); }
function saveProductModalData() {
    if (!activeEdit) return; const item = appData[activeEdit.cat][activeEdit.index];
    item.price = parseFloat(document.getElementById('modal-prod-price').value) || 0; 
    item.recommended = parseFloat(document.getElementById('modal-prod-recommended').value) || 0;
    item.orderedLastMonth = parseFloat(document.getElementById('modal-prod-lastmonth').value) || 0;
    item.notes = document.getElementById('modal-prod-notes').value.trim();
    
    let selectedDays = [];
    document.querySelectorAll('.day-chk:checked').forEach(chk => selectedDays.push(chk.value));
    let customDays = document.getElementById('modal-prod-days-custom').value.trim();
    item.days = customDays ? customDays : (selectedDays.length > 0 ? selectedDays.join(', ') : 'כל הימים');

    closeProductModal(); renderApp(); triggerDebouncedSync(true);
    showToast("הנתונים נשמרו עודכנו!", "💾");
}

// שאר פונקציות המעטפת הסטנדרטיות
function walkthroughNext() { if (walkthroughIndex < walkthroughItems.length - 1) { walkthroughIndex++; showWalkthroughItem(); } else { closeWalkthroughMode(); showToast("ספירת המלאי הושלמה!", "🏁"); } }
function walkthroughPrev() { if (walkthroughIndex > 0) { walkthroughIndex--; showWalkthroughItem(); } }
function toggleFloatingChat(forceOpen = false) { if (!currentUser) return; const win = document.getElementById('floating-chat-window'); isChatOpen = forceOpen ? true : !isChatOpen; if (isChatOpen) { win.classList.remove('hidden'); renderChatMessages(); } else win.classList.add('hidden'); }
function replyToMessage(senderName) { document.getElementById('notification-dropdown').classList.add('hidden'); isNotificationOpen = false; const select = document.getElementById('chat-target-select'); if(select) select.value = senderName; toggleFloatingChat(true); }
function toggleNotificationDropdown() { if (!currentUser) return; const dropdown = document.getElementById('notification-dropdown'); isNotificationOpen = !isNotificationOpen; if (isNotificationOpen) { dropdown.classList.remove('hidden'); renderMessages(); } else { dropdown.classList.add('hidden'); teamMessages.forEach(m => { if (!m.readBy.includes(currentUser.name)) m.readBy.push(currentUser.name); }); renderApp(); triggerDebouncedSync(true); } }
function sendChatMessage() { const inp = document.getElementById('chat-text-input'); const text = inp.value.trim(); if (!text || !currentUser) return; const target = document.getElementById('chat-target-select').value; teamMessages.unshift({ id: "msg_" + Date.now(), from: currentUser.name, to: target, text, date: new Date().toLocaleDateString('he-IL'), readBy: [currentUser.name] }); inp.value = ''; renderApp(); triggerDebouncedSync(true); }
function renderChatMessages() { const container = document.getElementById('chat-messages-container'); if (!container || !currentUser) return; container.innerHTML = ''; const visibleMsgs = teamMessages.filter(m => m.to === "כולם" || m.to === currentUser.name || m.from === currentUser.name); visibleMsgs.forEach(m => { const isPrivate = m.to !== "כולם"; const badgeLabel = isPrivate ? `<span class="bg-purple-100 text-purple-700 px-1 rounded text-[8px]">אישי</span>` : '<span class="bg-slate-100 text-slate-600 px-1 rounded text-[8px]">לכולם</span>'; container.innerHTML += `<div class="p-2 border rounded-xl bg-white mb-1.5 relative shadow-sm text-slate-800"><div class="flex justify-between text-[9px] text-slate-400 mb-0.5"><span><b>${m.from}</b> ${badgeLabel}</span><span>${m.date}</span></div><p class="font-medium pr-3">${m.text}</p></div>`; }); }
function exportData(type) { const fullText = generateOrderTextFull(); toggleSharePopover(); if (type === 'copy') { navigator.clipboard.writeText(fullText); showToast("הרשימה המלאה הועתקה!", "📋"); } else if (type === 'whatsapp') { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank'); } }
function toggleSharePopover() { document.getElementById('share-popover').classList.toggle('hidden'); }
window.onload = init;
