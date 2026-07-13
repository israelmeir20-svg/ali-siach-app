// shifts.js - מודול משמרות כפולות, שבת חופשית מובנית ומעקב שכר (עלי שיח)

window.currentCalendarDate = new Date();
window.calendarViewMode = 'weekly';
const BASE_MINIMUM_WAGE = 33; 
let activeModalDateStr = ""; // מחזיק את התאריך שנפתח כרגע במודל לעריכה

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

// 1. פתיחת חלון הניהול והעריכה המרוכזת ליום שנבחר (חיקוי המבנה של image_53e7c3.png)
function openDayEditModal(dateStr) {
    activeModalDateStr = dateStr;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const daysName = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    
    document.getElementById('day-modal-title').innerText = `ניהול ושיבוץ יום ${daysName[dayOfWeek]} (${dateObj.toLocaleDateString('he-IL')})`;
    document.getElementById('day-modal-hebrew-date').innerText = `תאריך עברי: ${getHebrewDateString(dateObj)}`;
    
    // בקרת כפתור טוגל שבת חופשית/נעילה
    const isClosed = getShiftObject(dateStr, "שישי בוקר").status === "Closed" || getShiftObject(dateStr, "צהריים א").status === "Closed";
    const toggleBtn = document.getElementById('day-modal-shabbat-toggle-btn');
    if (isClosed) {
        toggleBtn.innerText = "🔓 פתח דירה כרגיל";
        toggleBtn.className = "px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] shadow";
    } else {
        toggleBtn.innerText = "🔒 סגור דירה (חופש)";
        toggleBtn.className = "px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] shadow";
    }
    toggleBtn.onclick = () => window.toggleShabbatFreeViaModal();

    // בניית הטופס להקלדת השמות (תואם במדויק לסוגי הימים)
    let shiftsToEdit = [];
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        shiftsToEdit = ["בוקר", "צהריים א", "צהריים b", "לילה"]; // b פנימי לצורך תאימות ענן חלקס
    } else if (dayOfWeek === 5) {
        shiftsToEdit = ["שישי בוקר", "שבת א", "שבת b"];
    } else if (dayOfWeek === 6) {
        shiftsToEdit = []; // נשלט במלואו דרך כרטיסיית יום שישי
    }

    const formContainer = document.getElementById('day-modal-shifts-form');
    formContainer.innerHTML = '';

    if (shiftsToEdit.length === 0) {
        formContainer.innerHTML = `<p class="text-slate-400 font-bold italic text-center py-4">משמרות השבת מנוהלות מתוך כרטיסיית יום שישי (משמרות רצף שבת).</p>`;
    } else {
        shiftsToEdit.forEach(type => {
            // התאמת תוויות תצוגה
            let displayLabel = type.replace(" b", " ב'").replace(" א", " א'");
            let databaseType = type === "צהריים b" ? "צהריים ב" : (type === "שבת b" ? "שבת ב" : type);
            let sObj = getShiftObject(dateStr, databaseType);
            
            formContainer.innerHTML += `
                <div class="flex flex-col space-y-1 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border dark:border-slate-700/60">
                    <label class="font-black text-slate-600 dark:text-slate-400 block">${displayLabel}:</label>
                    <input type="text" id="modal-input-shift-${type}" value="${sObj.assignedUser || ''}" placeholder="הקלד שם מדריך..." class="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 font-bold text-slate-800 dark:text-white focus:outline-none">
                </div>
            `;
        });
    }

    // הצגת המודל
    const modal = document.getElementById('day-edit-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
window.openDayEditModal = openDayEditModal;

// 2. שמירת הנתונים מחלון הניהול ישירות למערך ולשרת גוגל
async function saveDayEditModalData() {
    const dateStr = activeModalDateStr;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    
    let shiftsToSave = [];
    if (dayOfWeek >= 0 && dayOfWeek <= 4) shiftsToSave = ["בוקר", "צהריים א", "צהריים b", "לילה"];
    else if (dayOfWeek === 5) shiftsToSave = ["שישי בוקר", "שבת א", "שבת b"];

    for (let type of shiftsToSave) {
        let databaseType = type === "צהריים b" ? "צהריים ב" : (type === "שבת b" ? "שבת ב" : type);
        let inputEl = document.getElementById(`modal-input-shift-${type}`);
        if (inputEl) {
            let assignedName = inputEl.value.trim();
            window.setShiftInState(dateStr, databaseType, assignedName);
            if (typeof window.sendActionToCloud === "function") {
                await window.sendActionToCloud({ action: "SET_SHIFT", date: dateStr, shiftType: databaseType, user: assignedName });
            }
        }
    }

    document.getElementById('day-edit-modal').classList.add('hidden');
    initShiftsModule();
    window.showToast("סידור העבודה עודכן וסונכרן לענן!", "💾");
}
window.saveDayEditModalData = saveDayEditModalData;

// טוגל מהיר לנעילת יום מתוך חלון הניהול
async function toggleShabbatFreeViaModal() {
    document.getElementById('day-edit-modal').classList.add('hidden');
    await window.toggleShabbatFree(activeModalDateStr);
}
window.toggleShabbatFreeViaModal = toggleShabbatFreeViaModal;

async function toggleShabbatFree(dateStr) {
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    let currentShift = getShiftObject(dateStr, dayOfWeek === 5 ? "שישי בוקר" : "צהריים א");
    let targetAttribute = currentShift.status === "Closed" ? "רגיל" : "שבת חופשית";
    
    if (typeof window.sendActionToCloud === "function") {
        await window.sendActionToCloud({ action: "SET_DAY_ATTRIBUTE", date: dateStr, attribute: targetAttribute });
    }
    
    let types = dayOfWeek === 5 ? ["שישי בוקר", "שבת א", "שבת ב"] : ["בוקר", "צהריים א", "צהריים ב", "לילה"];
    types.forEach(t => {
        let s = window.shifts.find(sh => sh.date === dateStr && sh.shiftType === t);
        if (!s) { s = { date: dateStr, shiftType: t }; window.shifts.push(s); }
        s.status = targetAttribute === "שבת חופשית" ? "Closed" : "Available";
        s.dayAttribute = targetAttribute;
        if (targetAttribute === "שבת חופשית") s.assignedUser = "";
    });
    
    initShiftsModule();
    window.showToast(targetAttribute === "שבת חופשית" ? "היום סומן כיום חופש/סגור!" : "היום הוחזר לפעילות שוטפת!", "🛠️");
}
window.toggleShabbatFree = toggleShabbatFree;

// 3. רנדור הלוח השבועי הרחב המלא (כל הריבוע לחיץ ופותח את מודל העריכה)
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
        
        // קליק על כל הריבוע היומי פותח את המודל המרוכז
        html += `
            <div onclick="window.openDayEditModal('${dateStr}')" class="border dark:border-slate-700 rounded-2xl p-3 flex flex-col space-y-3 cursor-pointer transition-all duration-200 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isToday ? 'bg-indigo-50/30 border-indigo-300 dark:bg-indigo-950/20' : 'bg-slate-50/50 dark:bg-slate-900/20'}">
                <div class="text-right border-b dark:border-slate-700 pb-1">
                    <span class="font-black text-xs block text-slate-800 dark:text-white">יום ${daysName[i]}</span>
                    <span class="text-[10px] text-slate-400 font-bold block">${loopDate.getDate()}/${loopDate.getMonth()+1} | ${getHebrewDateString(loopDate).split(' ')[0]}</span>
                </div>
                <div class="space-y-1.5 flex-1 flex flex-col justify-start">
        `;

        let dayShifts = [];
        if (i >= 0 && i <= 4) dayShifts = ["בוקר", "צהריים א", "צהריים ב", "לילה"];
        else if (i === 5) dayShifts = ["שישי בוקר", "שבת א", "שבת ב"];

        dayShifts.forEach(type => {
            html += renderShiftRowInlineHtml(dateStr, type, loopDate);
        });

        if (dayShifts.length === 0 && i === 6) {
            html += `<p class="text-[9px] text-slate-400 italic text-center py-8">מכוסה תחת משמרות שבת</p>`;
        }

        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}
window.renderWeeklyCalendar = renderWeeklyCalendar;

// 4. רנדור הלוח החודשי (חיקוי מלא של image_53e7c3.png)
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

    for (let b = 0; b < startDayOfWeek; b++) html += `<div class="bg-slate-100/40 dark:bg-slate-900/10 rounded-xl min-h-[90px]"></div>`;

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const loopDate = new Date(year, month, day);
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const dayOfWeek = loopDate.getDay();

        html += `
            <div onclick="window.openDayEditModal('${dateStr}')" class="text-right border dark:border-slate-700/60 p-2 rounded-xl flex flex-col justify-between min-h-[105px] bg-white dark:bg-slate-800 hover:border-indigo-400 cursor-pointer transition ${isToday ? 'border-indigo-400 bg-indigo-50/20' : ''}">
                <div class="flex justify-between items-center w-full border-b pb-0.5 mb-1 dark:border-slate-700">
                    <span class="font-black text-xs text-slate-800 dark:text-white">${day}</span>
                    <span class="text-[9px] text-slate-400 font-bold">${getHebrewDateString(loopDate).split(' ')[0]}</span>
                </div>
                <div class="w-full space-y-1 flex-1 flex flex-col justify-start">
        `;

        let checkTypes = (dayOfWeek >= 0 && dayOfWeek <= 4) ? ["בוקר", "צהריים א", "צהריים ב", "לילה"] : (dayOfWeek === 5 ? ["שישי בוקר", "שבת א", "שבת ב"] : []);
        checkTypes.forEach(t => {
            let s = getShiftObject(dateStr, t);
            if (s.status === 'Closed') {
                if(t === "בוקר" || t === "שישי בוקר") html += `<div class="text-[8px] bg-blue-100 text-blue-800 rounded px-1 font-black text-center">🔒 סגור</div>`;
            } else if (s.assignedUser) {
                let isMe = window.currentUser && s.assignedUser === window.currentUser.name;
                let shortType = t.replace("צהריים ", "צ'").replace("שבת ", "ש'").replace("שישי ", "ש'");
                html += `<div class="text-[8px] rounded px-1 font-black truncate text-right ${isMe ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">${shortType}: ${s.assignedUser}</div>`;
            }
        });

        html += `</div></div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}
window.renderMonthlyCalendar = renderMonthlyCalendar;

// רנדור שורות המשמרת התמציתיות בתוך קוביות הימים (חיקוי הטבלה ב-image_53e7c3.png)
function renderShiftRowInlineHtml(dateStr, shiftType, dateObj) {
    let s = getShiftObject(dateStr, shiftType);
    if (s.status === "Closed") return '';

    if (shiftType === 'בוקר' && s.dayAttribute !== 'חופש_בוקר' && !s.assignedUser) return '';

    let isMe = window.currentUser && s.assignedUser === window.currentUser.name;
    let textClass = isMe ? "text-purple-700 dark:text-purple-400 font-black" : (s.assignedUser ? "text-slate-800 dark:text-slate-200" : "text-slate-400 font-normal italic");
    let displayType = shiftType.replace("צהריים ", "צ'").replace("שבת ", "ש'").replace("שישי ", "ש'");
    let displayUser = s.assignedUser || "[פנוי]";

    return `
        <div class="text-[10px] flex justify-between items-center w-full border-b border-slate-100 dark:border-slate-800 pb-0.5">
            <span class="text-slate-400 font-bold">${displayType}:</span>
            <span class="truncate max-w-[70px] ${textClass}">${displayUser}</span>
        </div>
    `;
}

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
            regularCount++; moneyEarned += (s.shiftType === "בוקר" ? 7.5 : 6.5) * BASE_MINIMUM_WAGE;
        } else if (s.shiftType === "לילה") {
            nightCount++; moneyEarned += 10 * (BASE_MINIMUM_WAGE * 1.5);
        } else if (s.shiftType === "שישי בוקר") {
            regularCount++; moneyEarned += (isSummerTime(sDate) ? 6 : 5) * BASE_MINIMUM_WAGE;
        } else if (s.shiftType.includes("שבת")) {
            weekendCount++; moneyEarned += 1400; 
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
    let currentDayOfWeek = new Date().getDay();
    
    let checkTypes = (currentDayOfWeek >= 0 && currentDayOfWeek <= 4) ? ["בוקר", "צהריים א", "צהריים ב", "לילה"] : ["שישי בוקר", "שבת א", "שבת ב"];
    let html = '', badgeStaffName = "אין משמרת פעילה";
    
    checkTypes.forEach(t => {
        let s = getShiftObject(todayStr, t);
        if (s.status === 'Closed') html += `<div class="p-1.5 bg-blue-50 dark:bg-blue-950/40 border rounded-xl text-[10px]">🔒 <b>${t}:</b> שבת חופשית</div>`;
        else {
            let name = s.assignedUser || `<span class="text-red-400 font-normal">טרם שובץ</span>`;
            html += `<div class="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border text-[10px]">⏰ <b>${t}:</b> ${name}</div>`;
            
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
