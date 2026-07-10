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
        if (filtered.length === 0 && window.searchQuery !== '') continue;

        const catSection = document.createElement('div');
        catSection.className = "space-y-2";

        if (window.viewMode === 'grid') {
            // (קוד הרינדור של הקוביות נשאר ללא שינוי מהגרסה הקודמת)
        } else {
            // תצוגת טבלה צפה ויוקרתית המועתקת ישירות מהגרפיקה החדשה שלך
            const tableWrapper = document.createElement('div');
            tableWrapper.className = "overflow-x-auto rounded-3xl border border-slate-200/60 shadow-sm bg-white dark:bg-slate-800 p-2";
            let rowsHtml = '';

            filtered.forEach(item => {
                const toOrder = calculateToOrder(item);
                rowsHtml += `
                    <tr class="table-row-floating border-b border-slate-100 dark:border-slate-700/50 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <td class="p-3 text-slate-900 dark:text-white text-sm font-black flex items-center gap-2">
                            <span class="text-xl">${window.getEmoji(item.name)}</span>
                            <span>${item.name}</span>
                        </td>
                        <td class="p-2 text-center">
                            <div class="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-700 max-w-[130px] mx-auto">
                                <button onclick="window.updateItemValue('${catName}', ${item.originalIndex}, 'existing', ${item.existing - 0.5})" class="w-5 h-5 text-[10px] bg-white border rounded shadow-sm font-black">-</button>
                                <input type="number" step="0.5" value="${item.existing}" onchange="window.updateItemValue('${catName}', ${item.originalIndex}, 'existing', this.value)" class="w-10 text-center font-black text-xs bg-white dark:bg-slate-800 rounded border p-0.5 data-existing">
                                <button onclick="window.updateItemValue('${catName}', ${item.originalIndex}, 'existing', ${item.existing + 0.5})" class="w-5 h-5 text-[10px] bg-white border rounded shadow-sm font-black">+</button>
                            </div>
                        </td>
                        <td class="p-2 text-center">
                            <div class="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-700 max-w-[130px] mx-auto">
                                <button onclick="window.updateItemValue('${catName}', ${item.originalIndex}, 'recommended', ${item.recommended - 0.5})" class="w-5 h-5 text-[10px] bg-white border rounded shadow-sm font-black">-</button>
                                <input type="number" step="0.5" value="${item.recommended}" onchange="window.updateItemValue('${catName}', ${item.originalIndex}, 'recommended', this.value)" class="w-10 text-center font-bold text-xs bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border p-0.5">
                                <button onclick="window.updateItemValue('${catName}', ${item.originalIndex}, 'recommended', ${item.recommended + 0.5})" class="w-5 h-5 text-[10px] bg-white border rounded shadow-sm font-black">+</button>
                            </div>
                        </td>
                        <td class="p-3 text-center text-slate-500 font-bold">${item.orderedLastMonth || '-'}</td>
                        <td class="p-3 text-center text-slate-400 font-medium">-</td>
                        <td class="p-3 text-center text-sm font-black ${toOrder > 0 ? 'data-toorder-active' : 'text-slate-300'}">${toOrder ? `₪${(toOrder * item.price).toFixed(0)}` : '-'}</td>
                        <td class="p-3 text-center text-slate-500 font-bold">${item.days || 'כל הימים'}</td>
                        <td class="p-3 text-slate-400 font-medium max-w-xs truncate">${item.notes || '-'}</td>
                        <td class="p-3 text-center">
                            <div class="flex justify-center gap-2 text-[10px] font-black">
                                <button onclick="window.openProductModal('${catName}', ${item.originalIndex})" class="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">ערוך</button>
                                <button onclick="window.deleteProductComplete('${catName}', ${item.originalIndex})" class="text-red-500 bg-red-50 px-2 py-1 rounded-lg">מחק</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tableWrapper.innerHTML = `
                <table class="w-full text-right border-separate border-spacing-0 custom-table">
                    <thead>
                        <tr class="text-[11px] font-black text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/20">
                            <th class="p-3 border-b dark:border-slate-700">שם המוצר</th>
                            <th class="p-3 border-b dark:border-slate-700 text-center">קיים במלאי</th>
                            <th class="p-3 border-b dark:border-slate-700 text-center">יעד מומלץ</th>
                            <th class="p-3 border-b dark:border-slate-700 text-center">חודש קודם</th>
                            <th class="p-3 border-b dark:border-slate-700 text-center">לחתונה</th>
                            <th class="p-3 border-b dark:border-slate-700 text-center">מחיר</th>
                            <th class="p-3 border-b dark:border-slate-700 text-center">ימי שימוש</th>
                            <th class="p-3 border-b dark:border-slate-700">הערות</th>
                            <th class="p-3 border-b dark:border-slate-700 text-center">פעולות</th>
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
