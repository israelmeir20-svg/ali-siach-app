// recipes.js - מודול AI חכם, ניהול מטריצות מטבח ועדכוני צוות (עלי שיח)

window.activeAITab = 'procure';
window.base64ReceiptImage = null;
window.receiptMimeType = null;
window.recipeTimeMode = 0;
window.manualPantrySelections = {};

// אתחול מטריצות ברירת המחדל במידה ולא נטענו מהקאש המקומי
if (!window.vegetableMatrix) {
    window.vegetableMatrix = { "עגבניה": 0, "מלפפון": 0, "גזר": 0, "קולרבי": 0, "תפו\"א": 0, "כרוב": 0, "בצל": 0, "דלורית": 0, "פלפל": 0 };
}
if (!window.toolMatrix) {
    window.toolMatrix = { "מחבת ללא מכסה בשרית": 0, "סיר שטוח עם מכסה בשרי": 0, "סיר קטן גבוה עם מכסה בשרי": 0, "סיר רגיל עם מכסה בשרי": 0, "סכין בשרית": 0, "סכין חלבית": 0, "פומפייה": 0, "תנור בשרי": 0, "טוסטר חלבי": 0, "כיריים": 0, "מיניבר": 0 };
}

// 1. ניהול חלוניות ומצבי פאנל ה-AI
function toggleMatrixPanel(type) {
    const panelId = type === 'veg' ? 'panel-vegetables-content' : 'panel-tools-content';
    const arrowId = type === 'veg' ? 'veg-panel-arrow' : 'tool-panel-arrow';
    const panel = document.getElementById(panelId);
    const arrow = document.getElementById(arrowId);
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        arrow.innerText = "▲";
        buildAILists(); 
    } else {
        panel.classList.add('hidden');
        arrow.innerText = "▼";
    }
}
window.toggleMatrixPanel = toggleMatrixPanel;

function toggleAIChatWindow() {
    if (!window.currentUser) return;
    const win = document.getElementById('ai-chat-window');
    window.isAIChatOpen = !window.isAIChatOpen;
    if (window.isAIChatOpen) {
        win.classList.remove('hidden');
        win.classList.add('flex');
    } else {
        win.classList.add('hidden');
        win.classList.remove('flex');
    }
}
window.toggleAIChatWindow = toggleAIChatWindow;

// 2. בניית רשימות ומטריצות הירקות והכלים על המסך
function buildAILists() {
    const vegContainer = document.getElementById('matrix-vegetables'); if (!vegContainer) return; vegContainer.innerHTML = '';
    for (const [name, state] of Object.entries(window.vegetableMatrix)) {
        let bgStyle = state === 1 ? "background-color: #fef2f2 !important; border: 4px solid #ef4444 !important;" : 
                      state === 2 ? "background-color: #f1f5f9 !important; border: 4px solid #94a3b8 !important; opacity: 0.35;" : 
                                    "background-color: #ecfdf5 !important; border: 4px solid #10b981 !important;";
        
        const buttonNode = document.createElement('button');
        buttonNode.type = "button";
        buttonNode.className = "matrix-circle hover:scale-110 active:scale-95 shadow-md flex items-center justify-center";
        buttonNode.style = `${bgStyle} width: 64px !important; height: 64px !important; font-size: 2rem !important; border-radius: 9999px; display: inline-flex;`;
        buttonNode.innerHTML = typeof window.getEmoji === "function" ? window.getEmoji(name).trim() : "🥗";
        buttonNode.onclick = () => cycleMatrixState('veg', name);
        vegContainer.appendChild(buttonNode);
    }

    const toolContainer = document.getElementById('matrix-tools'); if (!toolContainer) return; toolContainer.innerHTML = '';
    const toolEmojis = {
        "מחבת ללא מכסה בשרית": "🍳", "סיר שטוח עם מכסה בשרי": "🍲", "סיר קטן גבוה עם מכסה בשרי": "🥣", 
        "סיר רגיל עם מכסה בשרי": "🍲", "סכין בשרית": "🔪", "סכין חלבית": "🍴", "פומפייה": "🧀", 
        "תנור בשרי": "♨️", "טוסטר חלבי": "🥪", "כיריים": "🔥", "מיניבר": "🚰"
    };
    for (const [name, state] of Object.entries(window.toolMatrix)) {
        let bgStyle = state === 1 ? "background-color: #fef2f2 !important; border: 4px solid #ef4444 !important;" : 
                      state === 2 ? "background-color: #f1f5f9 !important; border: 4px solid #94a3b8 !important; opacity: 0.35;" : 
                                    "background-color: #ecfdf5 !important; border: 4px solid #10b981 !important;";
        
        const buttonNode = document.createElement('button');
        buttonNode.type = "button";
        buttonNode.className = "matrix-circle hover:scale-110 active:scale-95 shadow-md flex items-center justify-center";
        buttonNode.style = `${bgStyle} width: 64px !important; height: 64px !important; font-size: 2rem !important; border-radius: 9999px; display: inline-flex;`;
        buttonNode.innerHTML = toolEmojis[name] || "🔧";
        buttonNode.onclick = () => cycleMatrixState('tool', name);
        toolContainer.appendChild(buttonNode);
    }
}
window.buildAILists = buildAILists;

function cycleMatrixState(type, name) {
    if (type === 'veg') {
        window.vegetableMatrix[name] = (window.vegetableMatrix[name] + 1) % 3;
    } else {
        window.toolMatrix[name] = (window.toolMatrix[name] + 1) % 3;
    }
    buildAILists();
    saveDataToLocalCache();
}
window.cycleMatrixState = cycleMatrixState;

function addCustomMatrixItem(type) {
    let name = prompt(type === 'veg' ? "הזן שם ירק חדש:" : "הזן שם כלי מטבח חדש:");
    if (name) {
        if (type === 'veg') window.vegetableMatrix[name] = 0; else window.toolMatrix[name] = 0;
        buildAILists(); 
        saveDataToLocalCache();
    }
}
window.addCustomMatrixItem = addCustomMatrixItem;

// 3. בניית תיבות בחירת פריטים ידנית מהמלאי עבור ה-AI
function buildPantryManualSelectionDOM() {
    const container = document.getElementById('pantry-manual-selection-container'); if (!container) return; container.innerHTML = '';
    if (!window.appData) return;

    for (const [cat, items] of Object.entries(window.appData)) {
        if (cat === "טואלטיקה וניקיון") continue; 
        items.forEach(item => {
            if (window.manualPantrySelections[item.name] === undefined) window.manualPantrySelections[item.name] = true;
            const wrapper = document.createElement('label');
            wrapper.className = "flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 text-[10px] font-bold cursor-pointer select-none text-slate-800 dark:text-white";
            const chk = document.createElement('input'); chk.type = "checkbox"; chk.checked = window.manualPantrySelections[item.name];
            chk.onchange = (e) => { window.manualPantrySelections[item.name] = e.target.checked; };
            wrapper.appendChild(chk); 
            let itemEmoji = typeof window.getEmoji === "function" ? window.getEmoji(item.name) : "🥫";
            wrapper.appendChild(document.createTextNode(`${itemEmoji} ${item.name}`));
            container.appendChild(wrapper);
        });
    }
}
window.buildPantryManualSelectionDOM = buildPantryManualSelectionDOM;

function cycleRecipeTime() {
    window.recipeTimeMode = (window.recipeTimeMode + 1) % 3; const btn = document.getElementById('time-cycle-btn');
    if (window.recipeTimeMode === 0) btn.innerText = "⏱️ זמן: מהיר (עד 20 דק')";
    else if (window.recipeTimeMode === 1) btn.innerText = "⏱️ זמן: בינוני (עד 45 דק')";
    else btn.innerText = "⏱️ זמן: איטי (ללא הגבלת זמן)";
}
window.cycleRecipeTime = cycleRecipeTime;

// 4. שכבת החיבור המרכזית למנוע ה-AI של גוגל (Gemini API Client)
async function callGeminiAPI(contents) {
    const key = localStorage.getItem('aliSiach_gemini_key'); 
    if (!key) { 
        window.showToast("חסר מפתח Gemini API בהגדרות!", "⚠️"); 
        return "⚠️ שגיאה: חסר מפתח Gemini API. אנא הזן מפתח בלשונית ההגדרות כדי להפעיל את ה-AI."; 
    }
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: contents })
        });
        const data = await res.json(); 
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מובנית מה-AI. נסה שנית.";
    } catch (err) { 
        return "תקלת תקשורת קריטית מול שרתי Google AI."; 
    }
}

// 5. פונקציות הפעלת הכלים החכמים (מתכונים, קבלות, רכש)
async function generateAdvancedAIRecipe() {
    const out = document.getElementById('ai-recipe-output'); out.classList.remove('hidden'); out.innerText = "🤖 בונה מתכון מותאם אישית לדיירים...";
    const dishInput = document.getElementById('ai-recipe-dish-input').value.trim();
    const timeLabels = ["מהיר (עד 20 דקות)", "בינוני (עד 45 דקות)", "איטי (ללא הגבלת זמן)"];
    
    let chosenPantryItems = []; 
    for (const [name, isIncluded] of Object.entries(window.manualPantrySelections)) { 
        if (isIncluded) chosenPantryItems.push(name); 
    }

    let prompt = `הצע מתכון קל, נגיש וטעים ל-6 דיירים בעלי שיח בהתבסס על המצרכים והמגבלות הבאות:\n`;
    prompt += `מנה מבוקשת: ${dishInput || 'בחירה חופשית של ה-AI לפי חומרי הגלם'}\nזמן הכנה מקסימלי: ${timeLabels[window.recipeTimeMode]}\n`;
    prompt += `הנחיות מטבח קשיחות: רמת בישול מתחילים, כשר, בשרי בלבד, ללא מעבד מזון, חיתוך בסכין בלבד, שימוש בשמן קנולה בלבד, חסום לחלוטין שימוש בסויה, כמון או תבלינים מיוחדים.\n`;
    prompt += `מוצרי מזווה זמינים כעת בדירה: ${JSON.stringify(chosenPantryItems)}\n`;
    prompt += `מטריצת ירקות (0=מותר, 1=חובה לכלול, 2=חסימה - אסור להשתמש): ${JSON.stringify(window.vegetableMatrix)}\n`;
    prompt += `מטריצת כלי מטבח קיימים (0=זמין, 1=חובה להשתמש, 2=אין בדירה - אסור להשתמש בשום אופן): ${JSON.stringify(window.toolMatrix)}\n\n`;
    prompt += `נסח הוראות ברורות ופשוטות צעד-אחר-צעד עבור המדריכים בשטח. בשורה האחרונה בהחלט, תחת הכותרת [Upgrade/Hack], הוסף טיפ פשוט וגאוני לשדרוג הטעם ללא סיבוך טכני.`;
    
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}
window.generateAdvancedAIRecipe = generateAdvancedAIRecipe;

function handleReceiptUpload(e) {
    const file = e.target.files[0]; if (!file) return; window.receiptMimeType = file.type; document.getElementById('receipt-file-name').innerText = file.name;
    const reader = new FileReader(); reader.onload = function(evt) { window.base64ReceiptImage = evt.target.result.split(',')[1]; }; reader.readAsDataURL(file);
}
window.handleReceiptUpload = handleReceiptUpload;

async function analyzeReceiptWithAI() {
    const out = document.getElementById('ai-receipt-output'); out.classList.remove('hidden'); out.innerText = "🤖 סורק ומנתח קבלה מול מלאי הדירה...";
    if (!window.base64ReceiptImage) { alert("אנא בחר קובץ תמונה של קבלה תחילה!"); return; }
    let systemPrompt = `זהו צילום קבלה של מוצרים שנקנו עבור דירת עלי שיח. קרא את פריטי המזון והכמויות בקבלה והשווה אותם בצורה חכמה למלאי הקיים כעת בדירה: ${JSON.stringify(window.appData)}. דווח למדריך אילו פריטים נקנו ואיך זה מעדכן את החוסרים בדירה.`;
    const text = await callGeminiAPI([{ parts: [{ inlineData: { mimeType: window.receiptMimeType, data: window.base64ReceiptImage } }, { text: systemPrompt }] }]);
    out.innerHTML = `<div class="whitespace-pre-line">${text}</div>`;
}
window.analyzeReceiptWithAI = analyzeReceiptWithAI;

async function runAIProcurementAnalysis() {
    const out = document.getElementById('ai-procure-output'); out.classList.remove('hidden'); out.innerText = "🤖 מנתח מגמות מלאי חודשיות...";
    let prompt = `אתה אנליסט רכש חכם עבור רשת דירות עלי שיח. נתח את טבלת המלאי הבאה הכוללת כמויות קיימות, יעדים מומלצים וכמויות שנרכשו בחודש שעבר: \n${JSON.stringify(window.appData)}.\n תן למנהל הדירה המלצות זהב קצרות וממוקדות: אילו מוצרים נצרכים בכמויות חריגות, איפה יש בזבוז, ועל אילו מוצרים כדאי להוריד את יעד המלאי כדי לחסוך כסף החודש. ענה בעברית בצורה פרקטית ותמציתית.`;
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}
window.runAIProcurementAnalysis = runAIProcurementAnalysis;

async function sendFreeTextAIQuery() {
    const inp = document.getElementById('ai-chat-input'); const q = inp.value.trim(); if (!q) return;
    const cb = document.getElementById('ai-chat-box'); cb.innerHTML += `<div class="text-right bg-purple-800 p-2 rounded-xl mb-1 max-w-[80%] mr-auto text-white"><b>אתה:</b> ${q}</div>`; inp.value = '';
    let systemContext = `אתה עוזר ניהול ומטבח חכם בדירת עלי שיח של נערים עם מוגבלות. ענה בקצרנות, ביעילות ובצורה מעשית למדריכי המשמרת. שאלה: ${q}`;
    const reply = await callGeminiAPI([{ parts: [{ text: systemContext }] }]);
    cb.innerHTML += `<div class="text-left bg-purple-950 p-2 rounded-xl mb-2 max-w-[80%] ml-auto text-purple-200"><b>AI:</b> ${reply}</div>`; cb.scrollTop = cb.scrollHeight;
}
window.sendFreeTextAIQuery = sendFreeTextAIQuery;

// 6. מרכז הודעות ועדכוני צוות (קשר רשת אטומי לענן)
async function sendChatMessage() {
    const inp = document.getElementById('chat-text-input');
    const msgText = inp.value.trim();
    if (!msgText || !window.currentUser) return;
    
    const target = "כולם"; // הגדרת יעד ברירת מחדל לכל הצוות
    const newMsg = {
        id: "msg_" + Date.now(),
        from: window.currentUser.name,
        to: target,
        text: msgText,
        date: new Date().toLocaleDateString('he-IL'),
        readBy: [window.currentUser.name],
        isArchived: false
    };
    
    window.teamMessages.push(newMsg);
    inp.value = '';
    
    // רנדור מחדש של ההודעות במסכים
    if (typeof window.renderMessages === "function") window.renderMessages();
    if (typeof window.renderChatMessages === "function") window.renderChatMessages();
    
    saveDataToLocalCache();
    
    if (typeof window.sendActionToCloud === "function") {
        window.sendActionToCloud({ action: "SYNC_MESSAGES", teamMessages: window.teamMessages });
    }
    window.showToast("העדכון נשלח לצוות!", "💬");
}
window.sendChatMessage = sendChatMessage;

// פונקציית עזר פנימית לשמירת שינויי המטריצות בלוקאל סטורג'
function saveDataToLocalCache() {
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix }));
}
