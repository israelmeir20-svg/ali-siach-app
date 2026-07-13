// api.js - שכבת התקשורת של האפליקציה (מתואמת מול הפרוקסי המקומי)

// פונקציה עזר לקבלת ה-URL של גוגל מהזיכרון המקומי של הדפדפן
function getCloudUrl() {
    // שנה את המפתח 'aliSiachCloudUrl' למפתח המדויק שבו האתר שלך משתמש ב-localStorage
    return localStorage.getItem('aliSiachCloudUrl'); 
}

// 1. פונקציה לקריאת כל המידע מהענן (רצה אוטומטית בטעינת האתר דרך main.js)
async function fetchCloudData() {
    const cloudUrl = getCloudUrl();
    if (!cloudUrl) {
        console.warn("אזהרה: לא נמצא URL של חיבור ענן בהגדרות המערכת.");
        return;
    }

    try {
        // גוגל מאפשרת בקשות קריאה (GET) ישירות מהדפדפן ללא חסימת CORS
        const response = await fetch(cloudUrl);
        const data = await response.json();
        
        if (data && data.success) {
            // הזרקת הנתונים לתוך הזיכרון הגלובלי המשותף שהגדרנו ב-main.js
            window.appData = data.appData || {};
            window.teamMembers = data.teamMembers || [];
            window.teamMessages = data.teamMessages || [];
            window.shifts = data.shifts || [];
            
            // פקודה לעדכון מיידי של תצוגת מסך הבית
            if (typeof window.renderDashboardData === "function") {
                window.renderDashboardData();
            }
        } else {
            console.error("השרת של גוגל החזיר תשובה שלילית:", data.error);
        }
    } catch (error) {
        console.error("נכשלה קריאת הנתונים המלאה מהענן:", error);
    }
}
window.fetchCloudData = fetchCloudData;

// 2. פונקציה אטומית לשליחת פעולות ועדכונים (מנצלת את הצינור של הפרוקסי שלך)
async function sendActionToCloud(actionObj) {
    const cloudUrl = getCloudUrl();
    if (!cloudUrl) {
        console.error("שגיאה: לא ניתן לבצע פעולה, חסר URL של חיבור ענן.");
        return false;
    }

    try {
        // פנייה לפרוקסי המקומי שלך בתיקיית api
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cloudUrl: cloudUrl,
                data: actionObj // האקשן שנשלח (למשל UPDATE_STOCK או SET_SHIFT)
            })
        });

        const result = await response.json();
        
        // בדיקה שהפרוקסי הצליח ושתגובת גוגל (googleResponse) תקינה
        if (response.ok && result.success) {
            return true;
        } else {
            console.error("הפעולה נכשלה בפרוקסי או בשרת גוגל:", result.error || result);
            return false;
        }
    } catch (error) {
        console.error("שגיאה קריטית בשליחת הפעולה דרך הפרוקסי:", error);
        return false;
    }
}
window.sendActionToCloud = sendActionToCloud;
