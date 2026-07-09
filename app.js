// ==========================================
// 1. פונקציות עזר גלובליות ומערכי תצורה
// ==========================================

function calculateToOrder(item) { 
    let req = (parseFloat(item.recommended) || 0) - (parseFloat(item.existing) || 0); 
    return req > 0 ? req : 0; 
}

// לוכדי שגיאות גלובליים להצגת חיוויים על גבי מסך הדיאגנוסטיקה
window.onerror = function(msg, url, line, col, error) {
    const errBox = document.getElementById('test-diagnostic-error');
    if (errBox) {
        errBox.innerText = `🚨 שגיאה סינכרונית בריצת הקוד:\nהודעה: ${msg}\nשורה: ${line}`;
        errBox.classList.remove('hidden');
    }
    return false;
};

window.onunhandledrejection = function(event) {
    const errBox = document.getElementById('test-diagnostic-error');
    if (errBox) {
        errBox.innerText = `🚨 שגיאה אסינכרונית (הבטחה שנדחתה):\nהודעה: ${event.reason}`;
        errBox.classList.remove('hidden');
    }
};

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

const freshVegetables = ["בצל", "תפו\"א", "עגבניות", "מלפפונים", "גזרים", "פלפלים וגמבות", "דלורית", "כרוב", "שום טרי"];

// ניהול משתני מערכת גלובליים
let appData = {}, teamMembers = [], teamMessages = [], currentUser = null;
let cloudUrl = localStorage.getItem('aliSiachCloudUrl') || "";
let saveTimeout = null;
let isDarkMode = localStorage.getItem('aliSiachDarkMode') === 'true';
let activeFilter = 'all', searchQuery = '', walkthroughItems = [], walkthroughIndex = 0, activeAITab = 'procure';
let base64ReceiptImage = null, receiptMimeType = null, myChart = null;
let recipeTimeMode = 0; 

let vegetableMatrix = { "עגבניה": 0, "מלפפון": 0, "גזר": 0, "קולרבי": 0, "תפו\"א": 0, "כרוב": 0, "בצל": 0, "דלורית": 0, "פלפל": 0 };
let toolMatrix = { "מחבת ללא מכסה בשרית": 0, "סיר שטוח עם מכסה בשרי": 0, "סיר קטן גבוה עם מכסה בשרי": 0, "סיר רגיל עם מכסה בשרי": 0, "סכין בשרית": 0, "סכין חלבית": 0, "פומפייה": 0, "תנור בשרי": 0, "טוסטר חלבי": 0, "כיריים": 0, "מיניבר": 0 };

// ==========================================
// 2. פונקציות אתחול וסנכרון נתונים
// ==========================================

function loadLocalBackupData() {
    try {
        const cached = localStorage.getItem('aliSiachLocalCache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.appData && Array.isArray(parsed.teamMembers) && parsed.teamMembers.length > 0) {
                appData = parsed.appData; teamMembers = parsed.teamMembers; teamMessages = parsed.teamMessages || []; return;
            }
        }
    } catch (e) { console.error(e); }
    
    localStorage.removeItem('aliSiachLocalCache');
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
        { name: "בצלאל", pin: "1234", role: "admin" }, { name: "אסתי", pin: "5678", role: "admin" }, { name: "אבריימי", pin: "1111", role: "staff" }, { name: "יהודה", pin: "2222", role: "staff" }
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
    
    const cloudInput = document.getElementById('cloud-url-input');
    if (cloudInput) cloudInput.value = cloudUrl;
    const geminiInput = document.getElementById('gemini-key-input');
    if (geminiInput) geminiInput.value = localStorage.getItem('aliSiach_gemini_key') || "";

    if (cloudUrl) { await fetchCloudData(); }
}

async function fetchCloudData() {
    if (!cloudUrl || !navigator.onLine) return;
    try {
        const res = await fetch(cloudUrl); const data = await res.json();
        if (data.success) {
            if (data.appData && Object.keys(data.appData).length > 0) appData = data.appData; 
            if (data.teamMembers && data.teamMembers.length > 0) teamMembers = data.teamMembers; 
            if (data.teamMessages) teamMessages = data.teamMessages;
            localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData, teamMembers, teamMessages })); 
            buildUserLoginSelect(); buildChatTargetSelect(); renderApp();
        }
    } catch (e) { console.error(e); }
}

function triggerDebouncedSync(immediate = false) {
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData, teamMembers, teamMessages }));
    if (saveTimeout) clearTimeout(saveTimeout); if (immediate) syncWithCloud(); else saveTimeout = setTimeout(syncWithCloud, 1500);
}

async function syncWithCloud() {
    if (!cloudUrl || !navigator.onLine) return;
    try { await fetch(cloudUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ appData, teamMembers, teamMessages }) }); } catch (e) { console.error(e); }
}

function saveCloudUrl() { 
    const input = document.getElementById('cloud-url-input');
    if (input) { cloudUrl = input.value.trim(); localStorage.setItem('aliSiachCloudUrl', cloudUrl); fetchCloudData(); showToast("הוגדר ענן!", "💾"); }
}
function saveGeminiKey() { 
    const input = document.getElementById('gemini-key-input');
    if (input) { localStorage.setItem('aliSiach_gemini_key', input.value.trim()); showToast("הוגדר מפתח AI!", "🤖"); }
}

// ==========================================
// 3. לוגיקת ממשק משתמש ורנדור מלאי
// ==========================================

function handleLogin() {
    const select = document.getElementById('login-user-select'); if (!select) return;
    const selectedName = select.value; const inputPin = document.getElementById('login-pin-input').value;
    const user = teamMembers.find(m => m.name === selectedName && m.pin === inputPin);
    if (user) { 
        currentUser = user; document.getElementById('login-screen').classList.add('hidden'); 
        document.getElementById('current-user-display').innerText = user.name; 
        const adminSection = document.getElementById('admin-management-section');
        if (user.role === 'admin' && adminSection) adminSection.classList.remove('hidden'); 
        renderApp(); 
    } else { alert("PIN שגוי!"); }
}

function handleLogout() { currentUser = null; document.getElementById('login-pin-input').value = ''; document.getElementById('login-screen').classList.remove('hidden'); renderApp(); }

function adjustQuantity(category, index, change) {
    const item = appData[category][index]; let val = (parseFloat(item.existing) || 0) + change; item.existing = val < 0 ? 0 : Math.round(val * 2) / 2;
    renderApp(); triggerDebouncedSync();
}

function filterInventory() { searchQuery = document.getElementById('search-bar').value.toLowerCase(); renderApp(); }
function setFilter(type) {
    activeFilter = type; ['all', 'to-order', 'in-stock'].forEach(t => { 
        const el = document.getElementById(`filter-${t}`);
        if (el) el.className = t === type ? "px-3 py-1.5 rounded-lg bg-white text-blue-600 shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200"; 
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
        catSection.className = "bg-white border rounded-3xl p-4 shadow-sm space-y-2 overflow-hidden";
        let tableRows = '';
        filtered.forEach(item => {
            const toOrder = calculateToOrder(item); const origIndex = items.findIndex(i => i.name === item.name); const isMissing = item.existing === 0;
            let rowBg = isMissing ? "bg-red-50/30" : toOrder > 0 ? "bg-amber-50/10" : "even:bg-slate-50/40";
            tableRows += `
                <tr class="border-b text-xs text-right font-medium ${rowBg} hover:bg-slate-50/80 transition">
                    <td class="p-3 text-slate-900 font-bold max-w-xs">${getEmoji(item.name)} ${item.name}</td>
                    <td class="p-3 bg-blue-50/30 dark:bg-blue-900/10 w-32">
                        <div class="flex items-center gap-1">
                            <button onclick="adjustQuantity('${catName}', ${origIndex}, -0.5)" class="w-5 h-5 rounded-md bg-white border flex items-center justify-center font-black shadow-sm">-</button>
                            <span class="w-8 text-center font-black text-blue-700 dark:text-blue-400 text-sm">${item.existing}</span>
                            <button onclick="adjustQuantity('${catName}', ${origIndex}, 0.5)" class="w-5 h-5 rounded-md bg-white border flex items-center justify-center font-black shadow-sm">+</button>
                        </div>
                    </td>
                    <td class="p-3 bg-slate-100/50 dark:bg-slate-800/10 font-bold text-slate-600">${item.recommended}</td>
                    <td class="p-3 bg-purple-50/30 dark:bg-purple-900/10 italic text-purple-700 dark:text-purple-400 font-bold">${item.orderedLastMonth || 0}</td>
                    <td class="p-3 bg-amber-50/40 dark:bg-amber-900/10 font-black text-sm ${toOrder > 0 ? 'text-amber-600' : 'text-slate-300'}">${toOrder || '-'}</td>
                    <td class="p-3 text-slate-500">₪${item.price || 0}</td>
                    <td class="p-3 text-slate-400 font-bold max-w-xs truncate">${item.notes || '-'}</td>
                    <td class="p-3 text-center"><button onclick="openProductModal('${catName}', ${origIndex})" class="text-blue-500 hover:underline font-bold">✏️</button></td>
                </tr>
            `;
        });

        catSection.innerHTML = `
            <div class="flex justify-between items-center border-b pb-2 px-1">
                <h2 class="text-xs font-black text-slate-900 border-r-4 border-blue-600 pr-2">${catName}</h2>
                <span class="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md">${filtered.length} פריטים</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-right border-separate border-spacing-0">
                    <thead>
                        <tr class="text-[11px] font-black text-slate-400 border-b bg-slate-50">
                            <th class="p-3 sticky-th">שם המצרך</th>
                            <th class="p-3 sticky-th bg-blue-50/50 text-blue-800">קיים בדירה</th>
                            <th class="p-3 sticky-th bg-slate-100 text-slate-700">יעד מומלץ</th>
                            <th class="p-3 sticky-th bg-purple-50 text-purple-800">חודש קודם</th>
                            <th class="p-3 sticky-th bg-amber-50 text-amber-800">להזמנה</th>
                            <th class="p-3 sticky-th">מחיר</th>
                            <th class="p-3 sticky-th">הערות תפריט</th>
                            <th class="p-3 sticky-th text-center">פעולות</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `; container.appendChild(catSection);
    }
    const missingEl = document.getElementById('dash-missing-val'); if(missingEl) missingEl.innerText = criticalCount;
    const totalEl = document.getElementById('dash-total-val'); if(totalEl) totalEl.innerText = totalToOrderItems;
    const costEl = document.getElementById('dash-cost-val'); if(costEl) costEl.innerText = `₪${totalCost.toFixed(2)}`;
    updateChartData(); if (currentUser) { renderMessages(); renderChatMessages(); }
}

// ==========================================
// 4. מערכת צ'אט והודעות צוות
// ==========================================

function toggleNotificationDropdown() {
    if (!currentUser) return; const dropdown = document.getElementById('notification-dropdown'); isNotificationOpen = !isNotificationOpen;
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
        container.innerHTML += `
            <div class="p-2 border-b text-[11px] hover:bg-slate-50 transition">
                <div class="flex justify-between text-[9px] text-slate-400"><span>מאת: ${m.from}${m.to !== "כולם" ? ' <b class="text-purple-600">(אישי)</b>':''}</span><span>${m.date}</span></div>
                <p class="${isRead ? 'text-slate-400' : 'text-slate-900 font-bold'}">${m.text}</p>
                <button onclick="replyToMessage('${m.from}')" class="text-blue-500 font-bold text-[10px] mt-1 block">↩️ השב בפרטי</button>
            </div>
        `;
    });
}

function replyToMessage(senderName) { document.getElementById('notification-dropdown').classList.add('hidden'); isNotificationOpen = false; const select = document.getElementById('chat-target-select'); if(select) select.value = senderName; toggleFloatingChat(true); }
function toggleFloatingChat(forceOpen = false) { if (!currentUser) return; const win = document.getElementById('floating-chat-window'); isChatOpen = forceOpen ? true : !isChatOpen; if (isChatOpen) { win.classList.remove('hidden'); renderChatMessages(); } else win.classList.add('hidden'); }
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
        container.innerHTML += `
            <div class="p-2 border rounded-xl bg-white mb-1.5 relative shadow-sm text-slate-800">
                <div class="flex justify-between text-[9px] text-slate-400 mb-0.5"><span><b>${m.from}</b> <span class="text-slate-400">${m.to === 'כולם' ? 'לכולם' : 'פרטי אל: ' + m.to}</span></span><span>${m.date}</span></div>
                <p class="font-medium pr-3">${m.text}</p>
                <button onclick="deleteMessage('${m.id}')" class="absolute left-1 top-1 text-red-400 opacity-50 hover:opacity-100">✕</button>
            </div>
        `;
    });
}

// ==========================================
// 5. מרכז הפקת דוחות ושיתוף קומפקטי
// ==========================================

function toggleSharePopover() { document.getElementById('share-popover').classList.toggle('hidden'); }
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
    } return txt;
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

// ==========================================
// 6. פאנלים חכמים (ספירה מהירה, עריכה, בינה מלאכותית)
// ==========================================

function startWalkthroughMode() {
    if (!currentUser) return; walkthroughItems = []; for (const cat in appData) { appData[cat].forEach((item, idx) => { walkthroughItems.push({ ...item, cat, origIdx: idx }); }); }
    if (walkthroughItems.length === 0) return; walkthroughIndex = 0; showWalkthroughItem();
    document.getElementById('walkthrough-screen').classList.remove('hidden'); document.getElementById('walkthrough-screen').classList.add('flex');
}
function closeWalkthroughMode() { document.getElementById('walkthrough-screen').classList.add('hidden'); document.getElementById('walkthrough-screen').classList.remove('flex'); renderApp(); }
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

function openAICenter() { if (!currentUser) return; document.getElementById('ai-center-modal').classList.remove('hidden'); document.getElementById('ai-center-modal').classList.add('flex'); buildAILists(); }
// הגדרת פונקציית סגירת המרכז שהייתה חסרה
function closeAICenter() { document.getElementById('ai-center-modal').classList.add('hidden'); document.getElementById('ai-center-modal').classList.remove('flex'); }
function setAITab(tab) { activeAITab = tab; ['procure', 'recipes', 'receipt', 'chat'].forEach(t => { document.getElementById(`tab-ai-${t}`).className = t === tab ? "px-4 py-2 rounded-lg bg-white text-purple-900 shadow-sm" : "px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200"; document.getElementById(`panel-ai-${t}`).classList.toggle('hidden', t !== tab); }); }

function buildAILists() {
    const vegContainer = document.getElementById('matrix-vegetables'); if (!vegContainer) return; vegContainer.innerHTML = '';
    for (const [name, state] of Object.entries(vegetableMatrix)) {
        let cls = state === 1 ? "bg-blue-600 text-white font-bold shadow-sm" : "bg-white text-slate-700 border-slate-200";
        vegContainer.innerHTML += `<button onclick="toggleMatrixItem('veg', '${name}')" class="w-full text-right p-1.5 rounded-lg border text-[10px] mb-1 flex justify-between items-center ${cls}"><span>${name}</span><span>${state===1?'🔵 חובה':'🔘 אפשר'}</span></button>`;
    }
    const toolContainer = document.getElementById('matrix-tools'); if (!toolContainer) return; toolContainer.innerHTML = '';
    for (const [name, state] of Object.entries(toolMatrix)) {
        let cls = state === 1 ? "bg-purple-600 text-white font-bold shadow-sm" : "bg-white text-slate-700 border-slate-200";
        toolContainer.innerHTML += `<button onclick="toggleMatrixItem('tool', '${name}')" class="w-full text-right p-1.5 rounded-lg border text-[10px] mb-1 flex justify-between items-center ${cls}"><span>${name}</span><span>${state===1?'🟣 חובה':'🔘 אפשר'}</span></button>`;
    }
}
function toggleMatrixItem(type, name) { if (type === 'veg') vegetableMatrix[name] = vegetableMatrix[name] === 1 ? 0 : 1; else toolMatrix[name] = toolMatrix[name] === 1 ? 0 : 1; buildAILists(); }
function addCustomVegetable() { let name = prompt("הזן שם ירק:"); if (name) { vegetableMatrix[name] = 0; buildAILists(); } }
function cycleRecipeTime() {
    recipeTimeMode = (recipeTimeMode + 1) % 3; const btn = document.getElementById('time-cycle-btn');
    if (recipeTimeMode === 0) btn.innerText = "⏱️ זמן: מהיר (עד 20 דק')";
    else if (recipeTimeMode === 1) btn.innerText = "⏱️ זמן: בינוני (עד 45 דק')";
    else btn.innerText = "⏱️ זמן: איטי (ללא הגבלת זמן)";
}

function handleReceiptUpload(e) { const file = e.target.files[0]; if (!file) return; receiptMimeType = file.type; document.getElementById('receipt-file-name').innerText = file.name; const reader = new FileReader(); reader.onload = function(evt) { base64ReceiptImage = evt.target.result.split(',')[1]; }; reader.readAsDataURL(file); }

async function runAIProcurementAnalysis() {
    const out = document.getElementById('ai-procure-output'); out.classList.remove('hidden'); out.innerText = "🤖 מנתח מגמות רכש חודשיות...";
    let prompt = `השווה בין כמויות חודש קודם למצב הקיים וזהה חריגות צריכה. תן המלצות לחיסכון ברכש.\nנתונים:\n${JSON.stringify(appData)}`;
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}
async function generateAdvancedAIRecipe() {
    const out = document.getElementById('ai-recipe-output'); out.classList.remove('hidden'); out.innerText = "🤖 בונה מתכון מותאם אישית...";
    const visibleProducts = getCurrentlyVisibleProducts(); const dishInput = document.getElementById('ai-recipe-dish-input').value.trim();
    const timeLabels = ["מהיר (עד 20 דקות)", "בינוני (עד 45 דקות)", "איטי (ללא הגבלת זמן)"];
    let prompt = `הצע מתכון ל-6 דיירים בעלי שיח. תוצר מבוקש: ${dishInput || 'חופשי'}. זמן: ${timeLabels[recipeTimeMode]}. חוקים: בשרי, סכין בלבד, שמן קנולה בלבד, ללא סויה/כמון. מוצרים גלויים: ${JSON.stringify(visibleProducts)}. ירקות: ${JSON.stringify(vegetableMatrix)}. כלים: ${JSON.stringify(toolMatrix)}. בסוף תן שדרוג מהיר בשורה אחת [Upgrade/Hack].`;
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}
async function analyzeReceiptWithAI() {
    const out = document.getElementById('ai-receipt-output'); out.classList.remove('hidden'); out.innerText = "🤖 סורק ומפענח את צילום הקבלה...";
    if (!base64ReceiptImage) { out.innerText = "⚠️ יש לבחור קובץ תמונה של קבלה."; return; }
    let systemPrompt = `קרא את פריטי המזון בקבלה והשווה לחסרי המלאי: ${JSON.stringify(appData)}. החזר פלט קצר וקוד JSON לעדכון בצורה הבאה: {"UPDATE_QTY": {"שם הקטגוריה": [{"itemName": "שם המוצר", "addQty": 5}]}}`;
    const text = await callGeminiAPI([{ parts: [{ inlineData: { mimeType: receiptMimeType, data: base64ReceiptImage } }, { text: systemPrompt }] }]); out.innerHTML = `<div class="whitespace-pre-line">${text}</div>`;
    try { const match = text.match(/\{"UPDATE_QTY":[\s\S]*?\}/); if (match) { const jsonUpdate = JSON.parse(match[0]); out.innerHTML += `<div class="p-3 bg-emerald-50 border rounded-xl mt-2 flex justify-between items-center"><span class="font-bold text-emerald-950">📦 לעדכן כמויות אוטומטית?</span><button onclick='applyReceiptQuantities(${JSON.stringify(jsonUpdate.UPDATE_QTY)})' class="px-3 py-1.5 bg-emerald-600 text-white font-black rounded-lg">אשר ועדכן מלאי</button></div>`; } } catch(e) {}
}
function applyReceiptQuantities(updateData) { for (const [cat, items] of Object.entries(updateData)) { if (appData[cat]) { items.forEach(uItem => { let match = appData[cat].find(i => i.name === uItem.itemName); if (match) { match.existing = (parseFloat(match.existing) || 0) + (parseFloat(uItem.addQty) || 0); } }); } } renderApp(); triggerDebouncedSync(true); showToast("המלאי עודכן בהצלחה!", "💾"); document.getElementById('ai-receipt-output').classList.add('hidden'); }
async function sendFreeTextAIQuery() { const inp = document.getElementById('ai-chat-input'); const q = inp.value.trim(); if (!q) return; const cb = document.getElementById('ai-chat-box'); cb.innerHTML += `<div class="text-left bg-blue-100 p-2 rounded-xl mb-1 max-w-[80%] ml-auto"><b>אתה:</b> ${q}</div>`; inp.value = ''; let systemContext = `ענה בקצר ופרקטי למדריך בדירת עלי שיח: ${q}`; const reply = await callGeminiAPI([{ parts: [{ text: systemContext }] }]); cb.innerHTML += `<div class="text-right bg-purple-100 p-2 rounded-xl mb-2 max-w-[80%] mr-auto"><b>AI:</b> ${reply}</div>`; cb.scrollTop = cb.scrollHeight; }

function toggleSettingsModal() { if (!currentUser) return; const m = document.getElementById('settings-modal'); if(m) m.classList.toggle('hidden'); renderAdminTeamList(); }
function renderAdminTeamList() { const c = document.getElementById('admin-team-list'); if (c) c.innerHTML = ''; teamMembers.forEach(m => { if(c) c.innerHTML += `<div class="p-1 bg-white border rounded-lg mb-1 font-bold">👤 ${m.name} (${m.role})</div>`; }); }

function showToast(msg, icon = "✨") {
    const t = document.getElementById('toast'); if(!t) return;
    document.getElementById('toast-message').innerText = msg; document.getElementById('toast-icon').innerText = icon;
    t.classList.remove('translate-y-20', 'opacity-0'); t.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => { t.classList.remove('translate-y-0', 'opacity-100'); t.classList.add('translate-y-20', 'opacity-0'); }, 3000);
}

window.onload = init;
