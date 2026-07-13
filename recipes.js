// פונקציית ניהול שאילתות חופשיות עבור תצוגת ה-AI המלאה (view-aichat)
async function sendViewFreeTextAIQuery() {
    const inp = document.getElementById('view-ai-chat-input'); 
    const q = inp.value.trim(); 
    if (!q) return;
    
    const cb = document.getElementById('view-ai-chat-box'); 
    cb.innerHTML += `
        <div class="text-right bg-purple-100 dark:bg-purple-950 p-2.5 rounded-xl mb-1 max-w-[85%] mr-auto font-bold text-slate-800 dark:text-white">
            <b>מדריך:</b> ${q}
        </div>`; 
    inp.value = '';
    cb.scrollTop = cb.scrollHeight;
    
    let systemContext = `אתה עוזר ניהול ומטבח חכם בדירת עלי שיח של נערים עם מוגבלות. ענה למדריכים בצורה פרקטית, בגובה העיניים ובקצרה. שאלה: ${q}`;
    const reply = await window.callGeminiAPI([{ parts: [{ text: systemContext }] }]);
    
    cb.innerHTML += `
        <div class="text-left bg-purple-900 text-white p-2.5 rounded-xl mb-2 max-w-[85%] ml-auto shadow-sm">
            <b>עוזר AI:</b> ${reply}
        </div>`; 
    cb.scrollTop = cb.scrollHeight;
}
window.sendViewFreeTextAIQuery = sendViewFreeTextAIQuery;
