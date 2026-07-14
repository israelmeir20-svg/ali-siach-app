// inventory.js - מודול ניהול מלאי, ספירה מהירה, פילטרים וגרפים (עלי שיח)

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

// 1. ניהול ואתחול הגרפים (Chart.js)
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
window.initChart = initChart;

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
window.updateChartData = updateChartData;

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

// 2. פונקציית עדכון ערך פריט אטומית מול הענן
async function updateItemValue(category, index, field, value) {
    const item = window.appData[category][index];
    let num = parseFloat(value);
    if (isNaN(num) || num < 0) num = 0;
    
    if (item[field] !== num) {
        item[field] = num;
        item.changesCount = (item.changesCount || 0) + 1;
        renderApp();
        
        localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix }));
        
        if (typeof window.sendActionToCloud === "function") {
            window.sendActionToCloud({
                action: "UPDATE_STOCK",
                category: category,
                itemName: item.name,
                field: field,
                value: num
            });
        }
    }
}
window.updateItemValue = updateItemValue;

// 3. ניהול פילטרים ובוררי תצוגה
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

function setViewMode(mode) { 
    window.viewMode = mode; 
    localStorage.setItem('aliSiachViewMode', mode); 
    document.getElementById('view-grid-btn').className = mode === 'grid' ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200";
    document.getElementById('view-table-btn').className = mode === 'table' ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200";
    renderApp(); 
}
window.setViewMode = setViewMode;

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

// 4. פונקציית רנדור המלאי הראשית (רשת וטבלאות)
function renderApp() {
    const container = document.getElementById('inventory-container'); if (!container) return; container.innerHTML = '';
    let criticalCount = 0, totalToOrderItems = 0, totalCost = 0;

    for (const [catName, items] of Object.entries(window.appData)) {
        let itemsWithMeta = items.map((item, index) => ({ ...item, originalIndex: index }));
        
        if (window.activeSortMode === 'alphabetical') itemsWithMeta.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        else if (window.activeSortMode === 'frequency') itemsWithMeta.sort((a, b) => (b.changesCount || 0) - (a.changesCount || 0));

        const filtered = itemsWithMeta.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(window.searchQuery) || (item.notes && item.notes.toLowerCase().includes(window.searchQuery));
            let matchesDay = window.activeDayFilter === 'all' || (item.days && (item.days.includes(window.activeDayFilter) || item.days.includes("כל הימים") || item.days.includes("הכל")));
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
                        <span class="text-6xl select-none block flex items-center justify-center text-slate-700 dark:text-slate-200" title="${item.name}">${window.getIconHtml(item.name)}</span>
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
                        <td class="p-3 text-slate-900 dark:text-white text-sm font-black flex items-center gap-2"><span class="text-xl text-slate-500 dark:text-slate-400" title="${item.name}">${window.getIconHtml(item.name)}</span><span>${item.name}</span></td>
                        <td class="p-2 text-center">
                            <input type="number" step="0.5" min="0" value="${item.existing}" onchange="window.updateItemValue('${catName}', ${item.originalIndex}, 'existing', this.value)" class="w-16 text-center font-black text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border p-1 focus:outline-none">
                        </td>
                        <td class="p-2 text-center">
                            <input type="number" value="${item.recommended}" onchange="window.updateItemValue('${catName}', ${item.originalIndex}, 'recommended', this.value)" class="w-16 text-center font-bold text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border p-1 focus:outline-none">
                        </td>
                        <td class="p-3 data-lastmonth text-center text-sm font-black">${item.orderedLastMonth || '-'}</td>
                        <td class="p-3 text-center text-sm font-black ${toOrder > 0 ? 'data-toorder-active' : 'text-slate-300'}">${toOrder ? `₪${(toOrder * (item.price || 0)).toFixed(0)}` : '-'}</td>
                        <td class="p-3 text-slate-500 text-center font-black min-w-[150px]">${item.days || 'כל הימים'}</td>
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
    if (window.currentUser) {
        if (typeof window.renderMessages === "function") window.renderMessages();
        if (typeof window.renderChatMessages === "function") window.renderChatMessages();
    }
}

// 5. ניהול ספירת מלאי מהירה (Walkthrough Mode)
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
    let v = (parseFloat(real.existing) || 0) + amt; 
    real.existing = v < 0 ? 0 : Math.round(v * 2) / 2; 
    showWalkthroughItem(); 
    
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix }));
    
    if (typeof window.sendActionToCloud === "function") {
        window.sendActionToCloud({
            action: "UPDATE_STOCK",
            category: item.cat,
            itemName: real.name,
            field: "existing",
            value: real.existing
        });
    }
}
window.adjustWtQty = adjustWtQty;

function walkthroughNext() { if (window.walkthroughIndex < window.walkthroughItems.length - 1) { window.walkthroughIndex++; showWalkthroughItem(); } else { closeWalkthroughMode(); window.showToast("ספירת המלאי הושלמה!", "🏁"); } }
window.walkthroughNext = walkthroughNext;
function walkthroughPrev() { if (window.walkthroughIndex > 0) { window.walkthroughIndex--; showWalkthroughItem(); } }
window.walkthroughPrev = walkthroughPrev;

// האזנה למקלדת עבור ספירה מהירה
document.addEventListener('keydown', function(e) {
    const wtScreen = document.getElementById('walkthrough-screen');
    if (wtScreen && wtScreen.classList.contains('flex')) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); window.walkthroughNext(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); window.walkthroughPrev(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); window.adjustWtQty(0.5); }
        if (e.key === 'ArrowDown') { e.preventDefault(); window.adjustWtQty(-0.5); }
    }
});

// 6. ניהול דראג אנד דרופ ידני
function handleDragStart(e, category, index) { dragSourceCategory = category; dragSourceIndex = index; }
function handleCategoryDrop(e, targetCategory) {
    if (dragSourceCategory && dragSourceCategory !== targetCategory) {
        const item = window.appData[dragSourceCategory].splice(dragSourceIndex, 1)[0];
        window.appData[targetCategory].push(item);
        renderApp();
        localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages }));
    }
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}
function handleDropReorder(e, targetCategory, targetIndex) {
    e.stopPropagation();
    if (dragSourceCategory === targetCategory && dragSourceIndex !== targetIndex) {
        const movedItem = window.appData[targetCategory].splice(dragSourceIndex, 1)[0];
        window.appData[targetCategory].splice(targetIndex, 0, movedItem);
        renderApp();
        localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages }));
    }
}

// 7. חלוניות עריכה והוספת מוצרים (Modals)
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
    if (!window.activeEdit) return; 
    const cat = window.activeEdit.cat;
    const idx = window.activeEdit.index;
    const item = window.appData[cat][idx];
    
    const newPrice = parseFloat(document.getElementById('modal-prod-price').value) || 0;
    const newRec = parseFloat(document.getElementById('modal-prod-recommended').value) || 0;
    const newLastMonth = parseFloat(document.getElementById('modal-prod-lastmonth').value) || 0;
    const newNotes = document.getElementById('modal-prod-notes').value.trim();
    
    let selectedDays = []; 
    document.querySelectorAll('.day-chk:checked').forEach(chk => selectedDays.push(chk.value));
    let customDays = document.getElementById('modal-prod-days-custom').value.trim();
    const newDays = customDays ? customDays : (selectedDays.length > 0 ? selectedDays.join(', ') : 'כל הימים');
    
    item.price = newPrice;
    item.recommended = newRec;
    item.orderedLastMonth = newLastMonth;
    item.notes = newNotes;
    item.days = newDays;
    
    document.getElementById('product-modal').classList.add('hidden'); renderApp(); 
    
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix }));
    
    if (typeof window.sendActionToCloud === "function") {
        window.sendActionToCloud({ action: "UPDATE_STOCK", category: cat, itemName: item.name, field: "price", value: newPrice });
        window.sendActionToCloud({ action: "UPDATE_STOCK", category: cat, itemName: item.name, field: "recommended", value: newRec });
        window.sendActionToCloud({ action: "UPDATE_STOCK", category: cat, itemName: item.name, field: "orderedLastMonth", value: newLastMonth });
        window.sendActionToCloud({ action: "UPDATE_STOCK", category: cat, itemName: item.name, field: "notes", value: newNotes });
        window.sendActionToCloud({ action: "UPDATE_STOCK", category: cat, itemName: item.name, field: "days", value: newDays });
    }
}
window.saveProductModalData = saveProductModalData;

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
    if (!name) return; 
    
    const newProd = { name, existing: 0, recommended: rec, price, orderedLastMonth: 0, notes: "", days: "כל הימים", changesCount: 0 };
    window.appData[cat].push(newProd);
    closeAddProductModal(); document.getElementById('add-prod-name').value = ''; renderApp(); 
    
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages }));
    if (typeof window.sendActionToCloud === "function") {
        window.sendActionToCloud({ action: "ADD_PRODUCT", category: cat, product: newProd });
    }
}
window.submitNewProduct = submitNewProduct;

function deleteProductComplete(category, index) {
    if (confirm("למחוק פריט זה לצמיתות מהמערכת?")) { 
        const item = window.appData[category][index];
        window.appData[category].splice(index, 1); 
        renderApp(); 
        
        localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages }));
        if (typeof window.sendActionToCloud === "function") {
            window.sendActionToCloud({ action: "DELETE_PRODUCT", category: category, itemName: item.name });
        }
    }
}
window.deleteProductComplete = deleteProductComplete;

// 8. ייצוא, שיתוף וטעינת קבצי גיבוי (JSON/WhatsApp)
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
    const fullText = generateOrderTextFull();
    if (type === 'download') {
        toggleSharePopover();
        const backupObj = { appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "ali_siach_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        window.showToast("קובץ הגיבוי הורד בהצלחה!", "💾");
        return;
    }
    toggleSharePopover();
    if (type === 'copy') { navigator.clipboard.writeText(fullText); window.showToast("הרשימה הועתקה!", "📋"); } 
    else if (type === 'whatsapp') { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank'); } 
}
window.exportData = exportData;

function importBackupFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed && parsed.appData) {
                window.appData = parsed.appData;
                if (parsed.teamMembers) window.teamMembers = parsed.teamMembers;
                if (parsed.teamMessages) window.teamMessages = parsed.teamMessages;
                if (parsed.vegetableMatrix) window.vegetableMatrix = parsed.vegetableMatrix;
                if (parsed.toolMatrix) window.toolMatrix = parsed.toolMatrix;

                renderApp();
                if (typeof window.buildUserLoginSelect === "function") window.buildUserLoginSelect();
                if (typeof window.buildChatTargetSelect === "function") window.buildChatTargetSelect();
                
                if (typeof window.sendActionToCloud === "function") {
                    await window.sendActionToCloud({ action: "SYNC_MESSAGES", teamMessages: window.teamMessages });
                    await window.sendActionToCloud({ action: "SYNC_MEMBERS", teamMembers: window.teamMembers });
                    const inventorySynced = await window.sendActionToCloud({ action: "SYNC_INVENTORY", appData: window.appData });
                    
                    if (inventorySynced) {
                        alert("נתוני המערכת שוחזרו בהצלחה מתוך קובץ הגיבוי ישירות לתוך גוגל שיטס!");
                    } else {
                        alert("הנתונים נטענו מקומית אך נכשלו בסנכרון מול גוגל שיטס. בדוק את חיבור הענן.");
                    }
                }
                if (typeof window.toggleSettingsModal === "function") window.toggleSettingsModal();
            } else { alert("שגיאה: מבנה קובץ הגיבוי אינו תקין."); }
        } catch(err) { alert("שגיאה בקריאת או פענוח קובץ הגיבוי."); }
    };
    reader.readAsText(file);
}
window.importBackupFile = importBackupFile;
