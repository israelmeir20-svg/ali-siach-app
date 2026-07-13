// shifts.js - מודול ניהול סידור עבודה, החלפות peer-to-peer וחישוב שכר (עלי שיח)

window.currentCalendarDate = new Date(); // התאריך שמוצג כרגע בלוח
window.calendarViewMode = 'weekly';     // מצב תצוגה: weekly / monthly
const BASE_MINIMUM_WAGE = 33;            // שכר מינימום בסיסי לשעה (ש"ח)

// 1. אתחול והפעלת המודול
function initShiftsModule() {
    calculateSalaryStats();
    if (window.calendarViewMode === 'weekly') {
        renderWeeklyCalendar();
    } else {
        renderMonthlyCalendar();
    }
}
window.initShiftsModule = initShiftsModule;

// 2. פונקציית המרת תאריך לועזי לתאריך עברי רשמי (ניצול מנוע הדפדפן המובנה)
function getHebrewDateString(date) {
    try {
        return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long' }).format(date);
    } catch (e) {
        return "";
    }
}

// בדיקה האם תאריך נמצא בטווח שעון קיץ (אפריל עד סוף אוקטובר בקירוב)
function isSummerTime(date) {
    const month = date.getMonth(); // 0 = ינואר, 11 = דצמבר
    return month >= 3 && month <= 9;
}

// 3. בקרת ניווט וטוגלים של לוח השנה
function toggleCalendarView(mode) {
    window.calendarViewMode = mode;
    document.getElementById('btn-shift-view-weekly').className = mode === 'weekly' ? "px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-sm font-bold" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold";
    document.getElementById('btn-shift-view-monthly').className = mode === 'monthly' ? "px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-sm font-bold" : "px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold";
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

// 4. פונקציית עזר להוצאת משמרת ספציפית או יצירת משמרת פנויה כברירת מחדל
function getShiftObject(dateStr, shiftType) {
    let found = window.shifts.find(s => s.date === dateStr && s.shiftType === shiftType);
    if (found) return found;
    
    // אם המשמרת לא קיימת בבסיס הנתונים, מייצרים אובייקט פנוי (Virtual Shift)
    return {
        date: dateStr,
        shiftType: shiftType,
        assignedUser: "",
        tradeTargetUser: "",
        status: "Available",
        dayAttribute: "רגיל"
    };
}

// 5. רנדור סידור עבודה שבועי (ימים א' - ש')
function renderWeeklyCalendar() {
    const container = document.getElementById('calendar-container'); if (!container) return;
    
    // חישוב תאריך יום ראשון של השבוע המוצג כעת
    const currentDay = window.currentCalendarDate.getDay();
    const sundayDate = new Date(window.currentCalendarDate);
    sundayDate.setDate(window.currentCalendarDate.getDate() - currentDay);
    
    // עדכון כותרת החודש
    const options = { month: 'long', year: 'numeric' };
    document.getElementById('current-calendar-month-label').innerText = `שבוע של: ${sundayDate.toLocaleDateString('he-IL', options)}`;

    let html = `<div class="grid grid-cols-1 md:grid-cols-7 gap-4">`;
    const daysName = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(sundayDate);
        loopDate.setDate(sundayDate.getDate() + i);
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        
        html += `
            <div class="border dark:border-slate-700 rounded-2xl p-3 flex flex-col space-y-3 ${isToday ? 'bg-indigo-50/30 border-indigo-300 dark:bg-indigo-950/20' : 'bg-slate-50/50 dark:bg-slate-900/20'}">
                <div class="text-right border-b dark:border-slate-700 pb-1">
                    <span class="font-black text-xs block text-slate-800 dark:text-white">יום ${daysName[i]}</span>
                    <span class="text-[10px] text-slate-400 font-bold">${loopDate.toLocaleDateString('he-IL')} | ${getHebrewDateString(loopDate)}</span>
                </div>
                <div class="space-y-2 flex-1 flex flex-col justify-start">
        `;

        // חלוקת משמרות לפי סוג היום
        let dayShifts = [];
        if (i >= 0 && i <= 4) { // א' - ה'
            dayShifts = ["בוקר", "צהריים", "לילה"];
        } else if (i === 5) { // שישי
            dayShifts = ["שישי בוקר", "שבת"];
        } else if (i === 6) { // שבת (מכוסה ע"י משמרת הרצף של יום שישי)
            dayShifts = [];
        }

        dayShifts.forEach(type => {
            html += renderShiftCardHtml(dateStr, type, loopDate);
        });

        if (dayShifts.length === 0 && i === 6) {
            html += `<p class="text-[10px] text-slate-400 italic text-center py-6">מכוסה תחת משמרת רצף שבת</p>`;
        }

        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}
window.renderWeeklyCalendar = renderWeeklyCalendar;

// 6. רנדור סידור עבודה חודשי מלא (מבנה קוביות יומן)
function renderMonthlyCalendar() {
    const container = document.getElementById('calendar-container'); if (!container) return;
    const year = window.currentCalendarDate.getFullYear();
    const month = window.currentCalendarDate.getMonth();
    
    const firstDayInstance = new Date(year, month, 1);
    const startDayOfWeek = firstDayInstance.getDay(); // באיזה יום בשבוע החודש מתחיל
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    document.getElementById('current-calendar-month-label').innerText = firstDayInstance.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

    let html = `
        <div class="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 mb-2 border-b pb-1 dark:border-slate-700">
            <div>א'</div><div>ב'</div><div>ג'</div><div>ד'</div><div>ה'</div><div>ו'</div><div>ש'</div>
        </div>
        <div class="grid grid-cols-7 gap-2">
    `;

    // ריבועים ריקים לתחילת החודש
    for (let b = 0; b < startDayOfWeek; b++) {
        html += `<div class="bg-slate-100/40 dark:bg-slate-900/10 rounded-xl min-h-[80px]"></div>`;
    }

    // ריבועי הימים האמיתיים
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const loopDate = new Date(year, month, day);
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const dayOfWeek = loopDate.getDay();

        html += `
            <button onclick="window.currentCalendarDate = new Date('${dateStr}'); window.toggleCalendarView('weekly');" class="text-right border dark:border-slate-700/60 p-1.5 rounded-xl flex flex-col justify-between min-h-[85px] transition hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isToday ? 'bg-indigo-50/40 border-indigo-400' : 'bg-white dark:bg-slate-800'}">
                <div class="flex justify-between items-center w-full">
                    <span class="font-black text-xs text-slate-800 dark:text-white">${day}</span>
                    <span class="text-[8px] text-slate-400 font-bold">${getHebrewDateString(loopDate).split(' ')[0]}</span>
                </div>
                <div class="w-full space-y-1 pt-1">
        `;

        // תצוגת תמצית מנהלים בתוך קוביית החודש
        let checkTypes = (dayOfWeek >= 0 && dayOfWeek <= 4) ? ["צהריים", "לילה"] : (dayOfWeek === 5 ? ["שישי בוקר", "שבת"] : []);
        checkTypes.forEach(t => {
            let s = getShiftObject(dateStr, t);
            if (s.status === 'Closed') {
                html += `<div class="text-[7px] bg-blue-100 text-blue-800 rounded px-1 font-black truncate">🔒 דירה סגורה</div>`;
            } else if (s.assignedUser) {
                let isMe = window.currentUser && s.assignedUser === window.currentUser.name;
                html += `<div class="text-[8px] rounded px-1 font-black truncate text-right ${isMe ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">${t.replace("שישי ", "")}: ${s.assignedUser}</div>`;
            }
        });

        html += `</div></button>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}
window.renderMonthlyCalendar = renderMonthlyCalendar;

// 7. מחולל ה-HTML עבור כרטיסיית משמרת בודדת בלוח השבועי (יישום חוקי הצבעים וההחלפות)
function renderShiftCardHtml(dateStr, shiftType, dateObj) {
    let s = getShiftObject(dateStr, shiftType);
    let isSummer = isSummerTime(dateObj);
    
    // איתור שעות המשמרת הרלוונטיות
    let hoursStr = "15:30 - 22:00";
    if (shiftType === 'בוקר') hoursStr = "08:00 - 15:30";
    else if (shiftType === 'לילה') hoursStr = "22:00 - 08:00";
    else if (shiftType === 'שישי בוקר') hoursStr = isSummer ? "08:00 - 14:00" : "08:00 - 13:00";
    else if (shiftType === 'שבת') hoursStr = isSummer ? "שישי 14:00 עד שבת 22:00" : "שישי 13:00 עד שבת 22:00";

    // הגנת "דירה סגורה" (שבת חופשית או חג)
    if (s.status === "Closed") {
        return `
            <div class="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-center text-blue-600 dark:text-blue-400 text-[10px] font-black">
                🔒 הדירה סגורה (${s.dayAttribute})
            </div>
        `;
    }

    // הגדרת מצב המשמרת חבויה/חריגה (עבור בוקר א'-ה')
    if (shiftType === 'בוקר' && s.dayAttribute !== 'חופש_בוקר' && !s.assignedUser) {
        return ''; // מוסתרת כברירת מחדל אלא אם הרכז פתח אותה
    }

    let isMe = window.currentUser && s.assignedUser === window.currentUser.name;
    
    // מטריצת צבעים קשיחה
    let cardClass = "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300"; // אפור ניטרלי (אחרים)
    if (s.assignedUser === "") cardClass = "bg-white dark:bg-slate-800/40 border-dashed border-slate-300 text-slate-400"; // פנוי
    if (isMe) cardClass = "bg-purple-600 text-white border-purple-700 shadow-md"; // סגול שלי

    let badgeHtml = `<span class="text-[9px] px-1 py-0.5 rounded font-black bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">${shiftType}</span>`;
    if (isMe) badgeHtml = `<span class="text-[9px] px-1 py-0.5 rounded font-black bg-purple-800 text-purple-100">👤 משמרת שלך</span>`;
    
    // הוספת באדג'ים של בורסה והחלפות לפי הלוגיקה המבוקשת
    if (s.status === "Pending_Pool") badgeHtml += ` <span class="text-[8px] bg-amber-500 text-white font-bold p-0.5 rounded animate-pulse">📢 בבורסה פתוחה</span>`;
    if (s.status === "Pending_Direct") badgeHtml += ` <span class="text-[8px] bg-blue-500 text-white font-bold p-0.5 rounded">⌛ ממתין לאישורה של ${s.tradeTargetUser}</span>`;
    if (s.status === "Declined" && isMe) badgeHtml += ` <span class="text-[8px] bg-red-500 text-white font-bold p-0.5 rounded">❌ נדחתה - באחריותך!</span>`;

    let userLabel = s.assignedUser ? `🧑‍🤝‍🧑 ${s.assignedUser}` : "➕ [לחץ לשיבוץ מדריך]";
    
    // בניית פאנל פעולות (Actions Panel) בתחתית הכרטיסייה
    let actionsHtml = '';
    if (!s.assignedUser) {
        // משמרת ריקה - כל מדריך יכול להשתבץ
        actionsHtml = `<button onclick="window.executeShiftAction('TAKE', '${dateStr}', '${shiftType}')" class="text-[9px] font-black text-indigo-600 dark:text-indigo-400 underline block text-left w-full pt-1">השתבץ כאן</button>`;
    } else if (isMe) {
        // משמרת שלי - פתיחת אפשרויות החלפה ובורסה
        actionsHtml = `
            <div class="flex justify-between items-center border-t border-purple-500/50 pt-1.5 mt-1 text-[9px] font-bold">
                <button onclick="window.openTradeFlow('${dateStr}', '${shiftType}', 'DIRECT')" class="hover:underline text-purple-200">החלפה ישירה 👥</button>
                <button onclick="window.executeShiftAction('POOL', '${dateStr}', '${shiftType}')" class="hover:underline text-amber-200">לבורסה 📢</button>
            </div>
        `;
    } else {
        // משמרת של אחרים - בדיקה אם אני צריך לאשר החלפה או לקחת מהבורסה
        if (s.status === "Pending_Pool") {
            actionsHtml = `<button onclick="window.executeShiftAction('CONFIRM_POOL', '${dateStr}', '${shiftType}')" class="text-[9px] font-black text-emerald-600 underline block text-left w-full pt-1">📦 קח משמרת מהבורסה</button>`;
        } else if (s.status === "Pending_Direct" && window.currentUser && s.tradeTargetUser === window.currentUser.name) {
            actionsHtml = `
                <div class="flex justify-end gap-2 pt-1 font-black text-[9px]">
                    <button onclick="window.executeShiftAction('RESPOND', '${dateStr}', '${shiftType}', true)" class="text-emerald-600 underline">אשר החלפה ✓</button>
                    <button onclick="window.executeShiftAction('RESPOND', '${dateStr}', '${shiftType}', false)" class="text-red-500 underline">סרב ✕</button>
                </div>
            `;
        }
    }

    // פקדי מנהל למחיקה מהירה
    if (window.currentUser && window.currentUser.role === 'admin' && s.assignedUser) {
        actionsHtml += `<button onclick="window.executeShiftAction('CLEAR', '${dateStr}', '${shiftType}')" class="text-[8px] text-red-400 hover:underline block text-right pt-1 w-full font-normal">מחק שיבוץ (מנהל) 🗑️</button>`;
    }

    return `
        <div class="border rounded-xl p-2 flex flex-col justify-between text-right text-[10px] font-bold transition shadow-sm ${cardClass}">
            <div class="flex justify-between items-start w-full">
                ${badgeHtml}
                <span class="text-[9px] opacity-60 font-mono">${hoursStr}</span>
            </div>
            <p class="pt-1.5 pb-0.5 text-xs font-black truncate">${userLabel}</p>
            ${actionsHtml}
        </div>
    `;
}

// 8. מנוע פקודות רשת ואירועים אטומיים מול שרת גוגל שיטס
async function executeShiftAction(actionType, dateStr, shiftType, extraParam = null) {
    if (!window.currentUser) return;
    
    if (actionType === 'TAKE') {
        // שיבוץ עצמי רגיל
        if (window.currentUser.role !== 'admin') {
            // מדריך רגיל משבץ רק את עצמו
            window.setShiftInState(dateStr, shiftType, window.currentUser.name);
            await window.sendActionToCloud({ action: "SET_SHIFT", date: dateStr, shiftType: shiftType, user: window.currentUser.name });
        } else {
            // מנהל יכול לבחור את מי לשבץ
            let targetName = prompt("הזן שם מדריך לשיבוץ משמרת זו:");
            if (!targetName) return;
            window.setShiftInState(dateStr, shiftType, targetName);
            await window.sendActionToCloud({ action: "SET_SHIFT", date: dateStr, shiftType: shiftType, user: targetName });
        }
    }
    else if (actionType === 'CLEAR') {
        window.setShiftInState(dateStr, shiftType, "");
        await window.sendActionToCloud({ action: "SET_SHIFT", date: dateStr, shiftType: shiftType, user: "" });
    }
    else if (actionType === 'POOL') {
        let s = getShiftObject(dateStr, shiftType);
        s.status = "Pending_Pool";
        s.tradeTargetUser = "כולם";
        await window.sendActionToCloud({ action: "TRADE_REQUEST", date: dateStr, shiftType: shiftType, targetUser: "כולם", status: "Pending_Pool" });
    }
    else if (actionType === 'CONFIRM_POOL') {
        // מישהו הרים את הכפפה מהבורסה הפתוחה
        window.setShiftInState(dateStr, shiftType, window.currentUser.name);
        await window.sendActionToCloud({ action: "TRADE_RESPONSE", date: dateStr, shiftType: shiftType, user: window.currentUser.name, approved: true });
    }
    else if (actionType === 'RESPOND') {
        // מענה להחלפה ישירה (אקסטרה פארם = true/false)
        if (extraParam === true) {
            window.setShiftInState(dateStr, shiftType, window.currentUser.name);
        } else {
            let s = getShiftObject(dateStr, shiftType);
            s.status = "Declined"; // נדחתה - חוזר למקורי עם התראה
        }
        await window.sendActionToCloud({ action: "TRADE_RESPONSE", date: dateStr, shiftType: shiftType, user: window.currentUser.name, approved: extraParam });
    }

    // ריענון ויזואלי ומערכתי
    initShiftsModule();
    window.showToast("סידור העבודה עודכן ומסונכרן לענן!", "💾");
}
window.executeShiftAction = executeShiftAction;

function openTradeFlow(dateStr, shiftType, mode) {
    let target = prompt("הזן במדויק את שם המדריך שאתה מבקש להחליף איתו משמרת:");
    if (!target) return;
    
    let s = getShiftObject(dateStr, shiftType);
    s.status = "Pending_Direct";
    s.tradeTargetUser = target;
    
    if (typeof window.sendActionToCloud === "function") {
        window.sendActionToCloud({ action: "TRADE_REQUEST", date: dateStr, shiftType: shiftType, targetUser: target, status: "Pending_Direct" });
    }
    initShiftsModule();
    window.showToast("בקשת ההחלפה נשלחה ישירות למדריך!", "⌛");
}
window.openTradeFlow = openTradeFlow;

function setShiftInState(dateStr, shiftType, userName) {
    let found = window.shifts.find(s => s.date === dateStr && s.shiftType === shiftType);
    if (found) {
        found.assignedUser = userName;
        found.status = "Assigned";
        found.tradeTargetUser = "";
    } else {
        window.shifts.push({
            date: dateStr, shiftType: shiftType, assignedUser: userName, tradeTargetUser: "", status: "Assigned", dayAttribute: "רגיל"
        });
    }
}
window.setShiftInState = setShiftInState;

// 9. מנוע חישוב שעות וסטטיסטיקות שכר קלנדריות למדריכים
function calculateSalaryStats() {
    if (!window.currentUser) return;
    
    document.getElementById('salary-staff-name-label').innerText = `(${window.currentUser.name})`;
    const currentMonth = window.currentCalendarDate.getMonth();
    const currentYear = window.currentCalendarDate.getFullYear();
    
    let regularCount = 0;
    let nightCount = 0;
    let weekendCount = 0;
    let moneyEarned = 0;

    window.shifts.forEach(s => {
        let sDate = new Date(s.date);
        if (sDate.getMonth() !== currentMonth || sDate.getFullYear() !== currentYear || s.assignedUser !== window.currentUser.name || s.status === 'Closed') return;

        if (s.shiftType === "צהריים" || s.shiftType === "בוקר") {
            regularCount++;
            let hours = s.shiftType === "בוקר" ? 7.5 : 6.5;
            moneyEarned += hours * BASE_MINIMUM_WAGE;
        } else if (s.shiftType === "לילה") {
            nightCount++;
            moneyEarned += 10 * (BASE_MINIMUM_WAGE * 1.5); // 10 שעות ב-150%
        } else if (s.shiftType === "שישי בוקר") {
            regularCount++;
            let hours = isSummerTime(sDate) ? 6 : 5;
            moneyEarned += hours * BASE_MINIMUM_WAGE;
        } else if (s.shiftType === "שבת") {
            weekendCount++;
            moneyEarned += 1400; // תעריף גלובלי קבוע לשבת בעלי שיח
        }
    });

    document.getElementById('stats-regular-shifts').innerText = regularCount;
    document.getElementById('stats-night-shifts').innerText = nightCount;
    document.getElementById('stats-weekend-shifts').innerText = weekendCount;
    document.getElementById('stats-total-salary').innerText = `₪${moneyEarned.toFixed(0)}`;
}
window.calculateSalaryStats = calculateSalaryStats;

// 10. פקדי האובר-רייד המהירים של רכז הדירה (Admin Day Overrides)
async function activateAdminDayOverride(type) {
    if (!window.currentUser || window.currentUser.role !== 'admin') return;
    
    const dateStr = window.currentCalendarDate.toISOString().split('T')[0];
    
    if (type === 'שבת חופשית') {
        if (!confirm(`לסגור את הדירה לחלוטין ולסמן את יום ${window.currentCalendarDate.toLocaleDateString('he-IL')} כשבת חופשית?`)) return;
        
        // יצירת הגדרה ברמת הסטייט המקומי
        let types = ["בוקר", "צהריים", "לילה", "שישי בוקר", "שבת"];
        types.forEach(t => {
            let s = getShiftObject(dateStr, t);
            s.status = "Closed";
            s.assignedUser = "";
            s.dayAttribute = "שבת חופשית";
        });
        
        if (typeof window.sendActionToCloud === "function") {
            await window.sendActionToCloud({ action: "SET_DAY_ATTRIBUTE", date: dateStr, attribute: "שבת חופשית" });
        }
    } 
    else if (type === 'חופש_בוקר') {
        let daysStr = prompt("לכמה ימים רצופים תרצה לפתוח את משמרת הבוקר (החל מהתאריך הנבחר)?", "21");
        let duration = parseInt(daysStr);
        if (isNaN(duration) || duration <= 0) return;
        
        for (let d = 0; d < duration; d++) {
            let nextDate = new Date(window.currentCalendarDate);
            nextDate.setDate(window.currentCalendarDate.getDate() + d);
            let nextDateStr = nextDate.toISOString().split('T')[0];
            
            let s = getShiftObject(nextDateStr, "בוקר");
            s.dayAttribute = "חופש_בוקר";
            
            if (typeof window.sendActionToCloud === "function") {
                await window.sendActionToCloud({ action: "SET_SHIFT", date: nextDateStr, shiftType: "בוקר", user: s.assignedUser, dayAttribute: "חופש_בוקר" });
            }
        }
    }
    
    initShiftsModule();
    window.showToast("הגדרות הרכז הוחלו וסונכרנו בענן!", "🛠️");
}
window.activateAdminDayOverride = activateAdminDayOverride;

// 11. ווידג'ט חיבור מהיר עבור מסך הבית (Dashboard Component Launcher)
function renderTodayShiftsWidget() {
    const c = document.getElementById('dashboard-today-shifts'); if (!c) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const isSummer = isSummerTime(new Date());
    
    let html = '';
    let currentDayOfWeek = new Date().getDay();
    let checkTypes = [];
    
    if (currentDayOfWeek >= 0 && currentDayOfWeek <= 4) checkTypes = ["בוקר", "צהריים", "לילה"];
    else if (currentDayOfWeek === 5) checkTypes = ["שישי בוקר", "שבת"];
    else if (currentDayOfWeek === 6) checkTypes = ["שבת"];

    let badgeStaffName = "אין משמרת פעילה";
    
    checkTypes.forEach(t => {
        let s = getShiftObject(todayStr, t);
        if (s.status === 'Closed') {
            html += `<div class="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl">🔒 <b>משמרת ${t}:</b> הדירה סגורה חופשית</div>`;
        } else {
            let name = s.assignedUser || `<span class="text-red-400 font-normal">טרם שובץ מדריך ➕</span>`;
            html += `<div class="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-700/60">⏰ <b>משמרת ${t}:</b> ${name}</div>`;
            
            // זיהוי המדריך התורן הנוכחי לצורך הצגתו בבר הניווט העליון
            let hr = new Date().getHours();
            if (t === "בוקר" && hr >= 8 && hr < 15.5) badgeStaffName = s.assignedUser || badgeStaffName;
            if (t === "צהריים" && hr >= 15.5 && hr < 22) badgeStaffName = s.assignedUser || badgeStaffName;
            if (t === "לילה" && (hr >= 22 || hr < 8)) badgeStaffName = s.assignedUser || badgeStaffName;
            if (t === "שישי בוקר" && currentDayOfWeek === 5 && hr < (isSummer ? 14 : 13)) badgeStaffName = s.assignedUser || badgeStaffName;
            if (t === "שבת" && ((currentDayOfWeek === 5 && hr >= (isSummer ? 14 : 13)) || currentDayOfWeek === 6)) badgeStaffName = s.assignedUser || badgeStaffName;
        }
    });

    c.innerHTML = html || `<p class="text-slate-400 italic text-center">אין משמרות מוגדרות להיום</p>`;
    document.getElementById('top-badge-staff-name').innerHTML = badgeStaffName;
}
window.renderTodayShiftsWidget = renderTodayShiftsWidget;
