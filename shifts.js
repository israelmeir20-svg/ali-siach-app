// shifts.js - מודול משמרות כפולות, שבת חופשית מובנית ומעקב שכר (עלי שיח)

window.currentCalendarDate = new Date();
window.calendarViewMode = 'weekly';
const BASE_MINIMUM_WAGE = 33; 

function initShiftsModule() {
    calculateSalaryStats();
    if (window.calendarViewMode === 'weekly') {
        renderWeeklyCalendar();
    } else {
        renderMonthlyCalendar();
    }
}
window.initShiftsModule = initShiftsModule;

function getHebrewDateString(date) {
    try { return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long' }).format(date); } catch (e) { return ""; }
}
function isSummerTime(date) { return date.getMonth() >= 3 && date.getMonth() <= 9; }

function toggleCalendarView(mode) {
    window.calendarViewMode = mode;
    initShiftsModule();
}
window.toggleCalendarView = toggleCalendarView;

function navigateCalendar(direction) {
    if (window.calendarViewMode === 'weekly') {
        window.currentCalendarDate.setDate(window.currentCalendarDate.getDate() + (direction * 7));
    } else {
        window.currentCalendarDate.setMonth(window.currentCalendarDate.getMonth() + direction);
    }
    initShiftsModule();
}
window.navigateCalendar = navigateCalendar;

// פונקציית טוגל פתיחה/סגירה של מגירת השכר הצפה
function toggleSalaryDrawer() {
    const drawer = document.getElementById('salary-summary-drawer');
    if (drawer) {
        drawer.classList.toggle('hidden');
        drawer.classList.toggle('flex');
    }
}
window.toggleSalaryDrawer = toggleSalaryDrawer;

function getShiftObject(dateStr, shiftType) {
    let found = window.shifts.find(s => s.date === dateStr && s.shiftType === shiftType);
    return found || { date: dateStr, shiftType: shiftType, assignedUser: "", tradeTargetUser: "", status: "Available", dayAttribute: "רגיל" };
}

// פונקציית טוגל מהירה עבור הרכז לסימון שבת חופשית ישירות מתוך הלוח
async function toggleShabbatFree(dateStr) {
    if (!window.currentUser || window.currentUser.role !== 'admin') return;
    
    // בדיקה מה המצב הנוכחי של סוף השבוע לפי משמרת יום שישי בוקר
    let currentShift = getShiftObject(dateStr, "שישי בוקר");
    let targetAttribute = currentShift.status === "Closed" ? "רגיל" : "שבת חופשית";
    
    if (typeof window.sendActionToCloud === "function") {
        await window.sendActionToCloud({ action: "SET_DAY_ATTRIBUTE", date: dateStr, attribute: targetAttribute });
    }
    
    // עדכון הסטייט המקומי מיידית
    let types = ["שישי בוקר", "שבת א", "שבת ב"];
    types.forEach(t => {
        let s = window.shifts.find(sh => sh.date === dateStr && sh.shiftType === t);
        if (!s) {
            s = { date: dateStr, shiftType: t };
            window.shifts.push(s);
        }
        s.status = targetAttribute === "שבת חופשית" ? "Closed" : "Available";
        s.dayAttribute = targetAttribute;
        if (targetAttribute === "שבת חופשית") s.assignedUser = "";
    });
    
    initShiftsModule();
    window.showToast(targetAttribute === "שבת חופשית" ? "סוף השבוע הוגדר כשבת חופשית והדירה נסגרה!" : "סוף השבוע הוחזר למצב עבודה רגיל!", "🛠️");
}
window.toggleShabbatFree = toggleShabbatFree;

// רנדור סידור שבועי רחב מסך עם משמרות כפולות
function renderWeeklyCalendar() {
    const container = document.getElementById('calendar-container'); if (!container) return;
    const currentDay = window.currentCalendarDate.getDay();
    const sundayDate = new Date(window.currentCalendarDate);
    sundayDate.setDate(window.currentCalendarDate.getDate() - currentDay);
    
    const options = { month: 'long', year: 'numeric' };
    document.getElementById('current-calendar-month-label').innerText = `שבוע של: ${sundayDate.toLocaleDateString('he-IL', options)}`;

    let html = `<div class="grid grid-cols-1 md:grid-cols-7 gap-4">`;
    const daysName = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(sundayDate);
        loopDate.setDate(sundayDate.getDate() + i);
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        
        // יצירת כפתור נעילת שבת ייעודי לרכז ליד יום שישי
        let shabbatLockToggleBtn = "";
        if (i === 5 && window.currentUser && window.currentUser.role === 'admin') {
            let isClosed = getShiftObject(dateStr, "שישי בוקר").status === "Closed";
            shabbatLockToggleBtn = `<button onclick="window.toggleShabbatFree('${dateStr}')" class="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 font-black">${isClosed ? '🔓 פתח שבת' : '🔒 שבת חופשית'}</button>`;
        }

        html += `
            <div class="border dark:border-slate-700 rounded-2xl p-3 flex flex-col space-y-3 ${isToday ? 'bg-indigo-50/30 border-indigo-300 dark:bg-indigo-950/20' : 'bg-slate-50/50 dark:bg-slate-900/20'}">
                <div class="flex justify-between items-start border-b dark:border-slate-700 pb-1 w-full">
                    <div class="text-right">
                        <span class="font-black text-xs block text-slate-800 dark:text-white">יום ${daysName[i]}</span>
                        <span class="text-[9px] text-slate-400 font-bold block">${loopDate.getDate()}/${loopDate.getMonth()+1} | ${getHebrewDateString(loopDate).split(' ')[0]}</span>
                    </div>
                    ${shabbatLockToggleBtn}
                </div>
                <div class="space-y-2 flex-1 flex flex-col justify-start">
        `;

        // יישום הפיצול של משמרות צהריים ושבת לשני מדריכים במקביל (א' ו-ב')
        let dayShifts = [];
        if (i >= 0 && i <= 4) { 
            dayShifts = ["בוקר", "צהריים א", "צהריים ב", "לילה"]; // פיצול צהריים
        } else if (i === 5) { 
            dayShifts = ["שישי בוקר", "שבת א", "שבת ב"]; // פיצול שבת
        }

        dayShifts.forEach(type => {
            html += renderShiftCardHtml(dateStr, type, loopDate);
        });

        if (dayShifts.length === 0 && i === 6) {
            html += `<p class="text-[9px] text-slate-400 italic text-center py-6">מכוסה תחת משמרות שבת א'+ב'</p>`;
        }

        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}
window.renderWeeklyCalendar = renderWeeklyCalendar;

function renderMonthlyCalendar() {
    const container = document.getElementById('calendar-container'); if (!container) return;
    const year = window.currentCalendarDate.getFullYear();
    const month = window.currentCalendarDate.getMonth();
    const startDayOfWeek = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    document.getElementById('current-calendar-month-label').innerText = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

    let html = `
        <div class="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 mb-2 border-b pb-1 dark:border-slate-700">
            <div>א'</div><div>ב'</div><div>ג'</div><div>ד'</div><div>ה'</div><div>ו'</div><div>ש'</div>
        </div>
        <div class="grid grid-cols-7 gap-2">
    `;

    for (let b = 0; b < startDayOfWeek; b++) html += `<div class="bg-slate-100/40 dark:bg-slate-900/10 rounded-xl min-h-[80px]"></div>`;

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const loopDate = new Date(year, month, day);
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const dayOfWeek = loopDate.getDay();

        html += `
            <button onclick="window.currentCalendarDate = new Date('${dateStr}'); window.toggleCalendarView('weekly');" class="text-right border dark:border-slate-700/60 p-1.5 rounded-xl flex flex-col justify-between min-h-[85px] bg-white dark:bg-slate-800 hover:border-indigo-400 transition ${isToday ? 'border-indigo-400 bg-indigo-50/20' : ''}">
                <span class="font-black text-xs text-slate-800 dark:text-white">${day}</span>
                <div class="w-full space-y-0.5 pt-1">
        `;

        let checkTypes = (dayOfWeek >= 0 && dayOfWeek <= 4) ? ["צהריים א", "צהריים ב"] : (dayOfWeek === 5 ? ["שישי בוקר", "שבת א"] : []);
        checkTypes.forEach(t => {
            let s = getShiftObject(dateStr, t);
            if (s.status === 'Closed') html += `<div class="text-[7px] bg-blue-100 text-blue-800 rounded px-0.5 truncate font-black">🔒 סגור</div>`;
            else if (s.assignedUser) html += `<div class="text-[7px] bg-slate-100 rounded px-0.5 text-slate-600 truncate text-right font-black">${t.replace("צהריים ", "צ'").replace("שבת ", "ש'")}: ${s.assignedUser}</div>`;
        });

        html += `</div></button>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}
window.renderMonthlyCalendar = renderMonthlyCalendar;

function renderShiftCardHtml(dateStr, shiftType, dateObj) {
    let s = getShiftObject(dateStr, shiftType);
    let isSummer = isSummerTime(dateObj);
    
    let hoursStr = "15:30 - 22:00";
    if (shiftType === 'בוקר') hoursStr = "08:00 - 15:30";
    else if (shiftType === 'לילה') hoursStr = "22:00 - 08:00";
    else if (shiftType === 'שישי בוקר') hoursStr = isSummer ? "08:00 - 14:00" : "08:00 - 13:00";
    else if (shiftType.includes('שבת')) hoursStr = isSummer ? "14:00 עד מוצש 22:00" : "13:00 עד מוצש 22:00";

    if (s.status === "Closed") {
        return `<div class="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-center text-blue-600 font-black text-[9px]">🔒 שבת חופשית</div>`;
    }

    if (shiftType === 'בוקר' && s.dayAttribute !== 'חופש_בוקר' && !s.assignedUser) return '';

    let isMe = window.currentUser && s.assignedUser === window.currentUser.name;
    let cardClass = isMe ? "bg-purple-600 text-white border-purple-700 shadow" : (s.assignedUser ? "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300" : "bg-white dark:bg-slate-800/40 border-dashed border-slate-300 text-slate-400");

    let cleanTypeLabel = shiftType.replace(" א", " א'").replace(" ב", " ב'");
    let badgeHtml = `<span class="text-[8px] px-1 py-0.5 rounded font-black ${isMe ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">${cleanTypeLabel}</span>`;
    
    if (s.status === "Pending_Pool") badgeHtml += ` <span class="text-[7px] bg-amber-500 text-white font-bold p-0.5 rounded">בורסה</span>`;
    if (s.status === "Pending_Direct") badgeHtml += ` <span class="text-[7px] bg-blue-50 text-blue-700 font-bold p-0.5 rounded">החלפה</span>`;

    let userLabel = s.assignedUser ? `👤 ${s.assignedUser}` : "➕ פנוי לשיבוץ";
    let actionsHtml = '';

    if (!s.assignedUser) {
        actionsHtml = `<button onclick="window.executeShiftAction('TAKE', '${dateStr}', '${shiftType}')" class="text-[8px] font-black text-indigo-600 dark:text-indigo-400 underline block text-left w-full pt-1">השתבץ</button>`;
    } else if (isMe) {
        actionsHtml = `
            <div class="flex justify-between items-center border-t border-purple-500/50 pt-1 mt-1 text-[8px] font-black text-purple-100">
                <button onclick="window.openTradeFlow('${dateStr}', '${shiftType}')" class="hover:underline">החלפה 👥</button>
                <button onclick="window.executeShiftAction('POOL', '${dateStr}', '${shiftType}')" class="hover:underline text-amber-200">לבורסה 📢</button>
            </div>
        `;
    } else {
        if (s.status === "Pending_Pool") {
            actionsHtml = `<button onclick="window.executeShiftAction('CONFIRM_POOL', '${dateStr}', '${shiftType}')" class="text-[8px] font-black text-emerald-600 underline block text-left w-full pt-1">קח משמרת</button>`;
        } else if (s.status === "Pending_Direct" && window.currentUser && s.tradeTargetUser === window.currentUser.name) {
            actionsHtml = `
                <div class="flex justify-end gap-1.5 pt-1 font-black text-[8px]">
                    <button onclick="window.executeShiftAction('RESPOND', '${dateStr}', '${shiftType}', true)" class="text-emerald-600">קבל ✓</button>
                    <button onclick="window.executeShiftAction('RESPOND', '${dateStr}', '${shiftType}', false)" class="text-red-500">סרב ✕</button>
                </div>
            `;
        }
    }

    if (window.currentUser && window.currentUser.role === 'admin' && s.assignedUser) {
        actionsHtml += `<button onclick="window.executeShiftAction('CLEAR', '${dateStr}', '${shiftType}')" class="text-[7px] text-red-400 hover:underline block text-right pt-0.5 w-full font-normal">מחק 🗑️</button>`;
    }

    return `
        <div class="border rounded-xl p-1.5 flex flex-col justify-between text-right text-[9px] font-bold ${cardClass}">
            <div class="flex justify-between items-center w-full">${badgeHtml}<span class="text-[8px] opacity-60 font-mono">${hoursStr.split(' ')[0]}</span></div>
            <p class="pt-1 text-xs font-black truncate">${userLabel}</p>
            ${actionsHtml}
        </div>
    `;
}

async function executeShiftAction(actionType, dateStr, shiftType, extraParam = null) {
    if (!window.currentUser) return;
    
    if (actionType === 'TAKE') {
        if (window.currentUser.role !== 'admin') {
            window.setShiftInState(dateStr, shiftType, window.currentUser.name);
            await window.sendActionToCloud({ action: "SET_SHIFT", date: dateStr, shiftType: shiftType, user: window.currentUser.name });
        } else {
            let targetName = prompt("שם המדריך לשיבוץ:"); if (!targetName) return;
            window.setShiftInState(dateStr, shiftType, targetName);
            await window.sendActionToCloud({ action: "SET_SHIFT", date: dateStr, shiftType: shiftType, user: targetName });
        }
    }
    else if (actionType === 'CLEAR') {
        window.setShiftInState(dateStr, shiftType, "");
        await window.sendActionToCloud({ action: "SET_SHIFT", date: dateStr, shiftType: shiftType, user: "" });
    }
    else if (actionType === 'POOL') {
        let s = getShiftObject(dateStr, shiftType); s.status = "Pending_Pool"; s.tradeTargetUser = "כולם";
        await window.sendActionToCloud({ action: "TRADE_REQUEST", date: dateStr, shiftType: shiftType, targetUser: "כולם", status: "Pending_Pool" });
    }
    else if (actionType === 'CONFIRM_POOL') {
        window.setShiftInState(dateStr, shiftType, window.currentUser.name);
        await window.sendActionToCloud({ action: "TRADE_RESPONSE", date: dateStr, shiftType: shiftType, user: window.currentUser.name, approved: true });
    }
    else if (actionType === 'RESPOND') {
        if (extraParam === true) window.setShiftInState(dateStr, shiftType, window.currentUser.name);
        else { let s = getShiftObject(dateStr, shiftType); s.status = "Declined"; }
        await window.sendActionToCloud({ action: "TRADE_RESPONSE", date: dateStr, shiftType: shiftType, user: window.currentUser.name, approved: extraParam });
    }

    initShiftsModule();
    window.showToast("השיבוץ עודכן ומסונכרן לענן!", "💾");
}
window.executeShiftAction = executeShiftAction;

function openTradeFlow(dateStr, shiftType) {
    let target = prompt("שם המדריך להחלפה ישירה:"); if (!target) return;
    let s = getShiftObject(dateStr, shiftType); s.status = "Pending_Direct"; s.tradeTargetUser = target;
    if (typeof window.sendActionToCloud === "function") window.sendActionToCloud({ action: "TRADE_REQUEST", date: dateStr, shiftType: shiftType, targetUser: target, status: "Pending_Direct" });
    initShiftsModule();
}
window.openTradeFlow = openTradeFlow;

function setShiftInState(dateStr, shiftType, userName) {
    let found = window.shifts.find(s => s.date === dateStr && s.shiftType === shiftType);
    if (found) { found.assignedUser = userName; found.status = "Assigned"; found.tradeTargetUser = ""; }
    else window.shifts.push({ date: dateStr, shiftType: shiftType, assignedUser: userName, tradeTargetUser: "", status: "Assigned", dayAttribute: "רגיל" });
}
window.setShiftInState = setShiftInState;

function calculateSalaryStats() {
    if (!window.currentUser) return;
    document.getElementById('salary-staff-name-label').innerText = `(${window.currentUser.name})`;
    const currentMonth = window.currentCalendarDate.getMonth();
    const currentYear = window.currentCalendarDate.getFullYear();
    
    let regularCount = 0, nightCount = 0, weekendCount = 0, moneyEarned = 0;

    window.shifts.forEach(s => {
        let sDate = new Date(s.date);
        if (sDate.getMonth() !== currentMonth || sDate.getFullYear() !== currentYear || s.assignedUser !== window.currentUser.name || s.status === 'Closed') return;

        if (s.shiftType.includes("צהריים") || s.shiftType === "בוקר") {
            regularCount++;
            moneyEarned += (s.shiftType === "בוקר" ? 7.5 : 6.5) * BASE_MINIMUM_WAGE;
        } else if (s.shiftType === "לילה") {
            nightCount++; moneyEarned += 10 * (BASE_MINIMUM_WAGE * 1.5);
        } else if (s.shiftType === "שישי בוקר") {
            regularCount++; moneyEarned += (isSummerTime(sDate) ? 6 : 5) * BASE_MINIMUM_WAGE;
        } else if (s.shiftType.includes("שבת")) {
            weekendCount++; moneyEarned += 1400; // 1,400 ש"ח פיקס לשבת
        }
    });

    document.getElementById('stats-regular-shifts').innerText = regularCount;
    document.getElementById('stats-night-shifts').innerText = nightCount;
    document.getElementById('stats-weekend-shifts').innerText = weekendCount;
    document.getElementById('stats-total-salary').innerText = `₪${moneyEarned.toFixed(0)}`;
}
window.calculateSalaryStats = calculateSalaryStats;

function renderTodayShiftsWidget() {
    const c = document.getElementById('dashboard-today-shifts'); if (!c) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const isSummer = isSummerTime(new Date());
    let currentDayOfWeek = new Date().getDay();
    
    let checkTypes = (currentDayOfWeek >= 0 && currentDayOfWeek <= 4) ? ["בוקר", "צהריים א", "צהריים ב", "לילה"] : ["שישי בוקר", "שבת א", "שבת ב"];
    let html = '', badgeStaffName = "אין משמרת פעילה";
    
    checkTypes.forEach(t => {
        let s = getShiftObject(todayStr, t);
        if (s.status === 'Closed') html += `<div class="p-1.5 bg-blue-50 dark:bg-blue-950/40 border rounded-xl">🔒 <b>${t}:</b> שבת חופשית</div>`;
        else {
            let name = s.assignedUser || `<span class="text-red-400 font-normal">טרם שובץ</span>`;
            html += `<div class="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border">⏰ <b>${t}:</b> ${name}</div>`;
            
            let hr = new Date().getHours();
            if (t === "בוקר" && hr >= 8 && hr < 15.5) badgeStaffName = s.assignedUser || badgeStaffName;
            if (t.includes("צהריים") && hr >= 15.5 && hr < 22) badgeStaffName = s.assignedUser ? (badgeStaffName.includes("אין") ? s.assignedUser : badgeStaffName + " + " + s.assignedUser) : badgeStaffName;
            if (t === "לילה" && (hr >= 22 || hr < 8)) badgeStaffName = s.assignedUser || badgeStaffName;
        }
    });
    c.innerHTML = html;
    document.getElementById('top-badge-staff-name').innerHTML = badgeStaffName;
}
window.renderTodayShiftsWidget = renderTodayShiftsWidget;
