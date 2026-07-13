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

async function callGeminiAPI(contents) {
    const key = localStorage.getItem('aliSiach_gemini_key'); 
    if (!key) { 
        window.showToast("חסר מפתח Gemini API בהגדרות!", "⚠️"); 
        return "⚠️ שגיאה: חסר מפתח Gemini API."; 
    }
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: contents })
        });
        const data = await res.json(); 
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מה-AI.";
    } catch (err) { 
        return "תקלת תקשורת מול שרתי Google AI."; 
    }
}
window.callGeminiAPI = callGeminiAPI; // חשיפה גלובלית קריטית למניעת קפיאה במתכונים!

async function generateAdvancedAIRecipe() {
    const out = document.getElementById('ai-recipe-output'); out.classList.remove('hidden'); out.innerText = "🤖 בונה מתכון מותאם אישית לדיירים...";
    const dishInput = document.getElementById('ai-recipe-dish-input').value.trim();
    const timeLabels = ["מהיר (עד 20 דקות)", "בינוני (עד 45 דקות)", "איטי (ללא הגבלת זמן)"];
    
    let chosenPantryItems = []; 
    for (const [name, isIncluded] of Object.entries(window.manualPantrySelections)) { 
        if (isIncluded) chosenPantryItems.push(name); 
    }

    let prompt = `הצע מתכון קל ל-6 דיירים בעלי שיח בהתבסס על המצרכים הבאים:\n`;
    prompt += `מנה مבוקשת: ${dishInput || 'בחירה חופשית'}\nזמן הכנה: ${timeLabels[window.recipeTimeMode]}\n`;
    prompt += `חוקים: כשר, בשרי, ללא מעבד מזון, חיתוך בסכין בלבד, שמן קנולה בלבד, ללא סויה או כמון.\n`;
    prompt += `מוצרי מזווה זמינים: ${JSON.stringify(chosenPantryItems)}\n`;
    prompt += `מטריצת ירקות (0=אפשר, 1=חובה, 2=אסור): ${JSON.stringify(window.vegetableMatrix)}\n`;
    prompt += `מטריצת כלים (0=זמין, 1=חובה, 2=אסור): ${JSON.stringify(window.toolMatrix)}\n\n`;
    prompt += `הצג הוראות פשוטות ובשורה האחרונה תן שדרוג מהיר למנה תחת הכותרת [Upgrade/Hack].`;
    
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}
window.generateAdvancedAIRecipe = generateAdvancedAIRecipe;

function handleReceiptUpload(e) {
    const file = e.target.files[0]; if (!file) return; window.receiptMimeType = file.type; document.getElementById('receipt-file-name').innerText = file.name;
    const reader = new FileReader(); reader.onload = function(evt) { window.base64ReceiptImage = evt.target.result.split(',')[1]; }; reader.readAsDataURL(file);
}
window.handleReceiptUpload = handleReceiptUpload;

async function analyzeReceiptWithAI() {
    const out = document.getElementById('ai-receipt-output'); out.classList.remove('hidden'); out.innerText = "🤖 סורק קבלה...";
    if (!window.base64ReceiptImage) { alert("אנא בחר קובץ תמונה!"); return; }
    let systemPrompt = `זהו צילום קבלה לדירת עלי שיח. קרא פריטים והשווה למלאי: ${JSON.stringify(window.appData)}.`;
    const text = await callGeminiAPI([{ parts: [{ inlineData: { mimeType: window.receiptMimeType, data: window.base64ReceiptImage } }, { text: systemPrompt }] }]);
    out.innerHTML = `<div class="whitespace-pre-line">${text}</div>`;
}
window.analyzeReceiptWithAI = analyzeReceiptWithAI;

async function runAIProcurementAnalysis() {
    const out = document.getElementById('ai-procure-output'); out.classList.remove('hidden'); out.innerText = "🤖 מנתח מגמות מלאי...";
    let prompt = `נתח את טבלת המלאי הבאה של דירת עלי שיח ותן המלצות רכש וחיסכון קצרות בעברית: \n${JSON.stringify(window.appData)}.`;
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}
window.runAIProcurementAnalysis = runAIProcurementAnalysis;

async function sendViewFreeTextAIQuery() {
    const inp = document.getElementById('view-ai-chat-input'); const q = inp.value.trim(); if (!q) return;
    const cb = document.getElementById('view-ai-chat-box'); 
    cb.innerHTML += `<div class="text-right bg-purple-100 dark:bg-purple-950 p-2.5 rounded-xl mb-1 max-w-[85%] mr-auto font-bold text-slate-800 dark:text-white"><b>מדריך:</b> ${q}</div>`; 
    inp.value = ''; cb.scrollTop = cb.scrollHeight;
    
    let systemContext = `עוזר ניהול ומטבח חכם בדירת עלי שיח של נערים עם מוגבלות. ענה בקצרה וביעילות. שאלה: ${q}`;
    const reply = await callGeminiAPI([{ parts: [{ text: systemContext }] }]);
    
    cb.innerHTML += `<div class="text-left bg-purple-900 text-white p-2.5 rounded-xl mb-2 max-w-[85%] ml-auto shadow-sm"><b>עוזר AI:</b> ${reply}</div>`; 
    cb.scrollTop = cb.scrollHeight;
}
window.sendViewFreeTextAIQuery = sendViewFreeTextAIQuery;

function saveDataToLocalCache() {
    localStorage.setItem('aliSiachLocalCache', JSON.stringify({ appData: window.appData, teamMembers: window.teamMembers, teamMessages: window.teamMessages, vegetableMatrix: window.vegetableMatrix, toolMatrix: window.toolMatrix }));
}
