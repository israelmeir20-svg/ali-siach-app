// ניהול המצב הגלובלי של האפליקציה (Shared State)
window.appData = null;
window.teamMembers = [];
window.teamMessages = [];
window.shifts = [];

// פונקציית האתחול הרשמית של האתר - רצה מיד עם טעינת הדף
document.addEventListener("DOMContentLoaded", function() {
    // טעינת הנתונים מהענן (הפונקציה יושבת בתוך api.js)
    if (typeof window.fetchCloudData === "function") {
        window.fetchCloudData();
    } else {
        console.error("שגיאה: קובץ api.js לא נטען כראוי או חסר.");
    }
});

// פונקציית הניווט המרכזית בין מסכי ה-SPA
function switchView(viewId) {
    // 1. הסתרת כל מכולות התוכן על הבמה
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // 2. הצגת המכולה שנבחרה בלבד
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.remove('hidden');
    }
    
    // 3. ניקוי עיצוב פעיל מכל הכפתורים בסרגל הצד
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-700', 'text-white');
        btn.classList.add('hover:bg-slate-800', 'text-slate-300');
    });
    
    // 4. הגדרת עיצוב פעיל (אינדיקטור סגול) לכפתור שנלחץ כעת
    let targetBtnId = "btn-" + viewId.replace("view-", "");
    const activeBtn = document.getElementById(targetBtnId);
    if (activeBtn) {
        activeBtn.classList.remove('hover:bg-slate-800', 'text-slate-300');
        activeBtn.classList.add('bg-indigo-700', 'text-white');
    }
    
    // 5. הרצת פונקציות עדכון ספציפיות למסך שנפתח
    if (viewId === 'view-dashboard') {
        renderDashboardData();
    } else if (viewId === 'view-shifts') {
        if (typeof window.initShiftsModule === "function") {
            window.initShiftsModule();
        }
    } else if (viewId === 'view-inventory') {
        if (typeof window.renderInventoryTable === "function") {
            window.renderInventoryTable();
        }
    }
}
window.switchView = switchView;

// רנדור נתוני מסך הבית (דאשבורד "מבט על")
function renderDashboardData() {
    const lowStockContainer = document.getElementById('dashboard-low-stock');
    if (!lowStockContainer) return;
    
    if (!window.appData) {
        lowStockContainer.innerHTML = `<p class="text-sm text-slate-400">טוען נתונים מהענן...</p>`;
        return;
    }
    
    let lowStockItems = [];
    for (let category in window.appData) {
        window.appData[category].forEach(item => {
            if (item.existing < item.recommended) {
                lowStockItems.push({ ...item, category: category });
            }
        });
    }
    
    if (lowStockItems.length === 0) {
        lowStockContainer.innerHTML = `
            <div class="text-center p-6 bg-green-50 rounded-xl border border-green-100">
                <p class="text-sm text-green-700 font-bold">🎉 כל המלאי בדירה מלא ותקין! אין חוסרים.</p>
            </div>`;
        return;
    }
    
    let html = `
        <table class="w-full text-right text-sm text-slate-600">
            <thead class="bg-slate-50 text-slate-700 text-xs font-bold uppercase">
                <tr>
                    <th class="p-2">מוצר</th>
                    <th class="p-2">קטגוריה</th>
                    <th class="p-2 text-center">קיים</th>
                    <th class="p-2 text-center">יעד</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
    `;
    
    lowStockItems.slice(0, 6).forEach(item => {
        html += `
            <tr class="hover:bg-slate-50/80">
                <td class="p-2 font-medium text-slate-900">${item.name}</td>
                <td class="p-2 text-xs text-slate-400">${item.category}</td>
                <td class="p-2 text-center text-red-600 font-bold bg-red-50/50 rounded">${item.existing}</td>
                <td class="p-2 text-center text-slate-500">${item.recommended}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    if (lowStockItems.length > 6) {
        html += `<p class="text-xs text-indigo-600 pt-2 cursor-pointer font-medium" onclick="switchView('view-inventory')">+ ועוד ${lowStockItems.length - 6} מוצרים חסרים במלאי. לחץ לצפייה במלאי המלא...</p>`;
    }
    
    lowStockContainer.innerHTML = html;
    
    // רנדור מהיר של תורנות היום בדאשבורד
    const shiftsContainer = document.getElementById('dashboard-today-shifts');
    if (shiftsContainer && typeof window.renderTodayShiftsWidget === "function") {
        window.renderTodayShiftsWidget();
    }
}
window.renderDashboardData = renderDashboardData;
