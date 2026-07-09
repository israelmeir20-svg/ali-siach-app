// אפליקציית עלי שיח - מודול AI חכם ומחולל מתכונים
window.activeAITab = 'procure';
window.base64ReceiptImage = null;
window.receiptMimeType = null;
window.recipeTimeMode = 0;

if (!window.vegetableMatrix) {
    window.vegetableMatrix = { "עגבניה": 0, "מלפפון": 0, "גזר": 0, "קולרבי": 0, "תפו\"א": 0, "כרוב": 0, "בצל": 0, "דלורית": 0, "פלפל": 0 };
}
if (!window.toolMatrix) {
    window.toolMatrix = { "מחבת ללא מכסה בשרית": 0, "סיר שטוח עם מכסה בשרי": 0, "סיר קטן גבוה עם מכסה בשרי": 0, "סיר רגיל עם מכסה בשרי": 0, "סכין בשרית": 0, "סכין חלבית": 0, "פומפייה": 0, "תנור בשרי": 0, "טוסטר חלבי": 0, "כיריים": 0, "מיניבר": 0 };
}
window.manualPantrySelections = {};

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

// בניית לחצנים אינטראקטיביים אמיתיים עם אימוג'ים מוגדרים (סעיף א)
function buildAILists() {
    const vegContainer = document.getElementById('matrix-vegetables'); if (!vegContainer) return; vegContainer.innerHTML = '';
    for (const [name, state] of Object.entries(window.vegetableMatrix)) {
        let stateClass = state === 1 ? "matrix-circle-must" : state === 2 ? "matrix-circle-forbidden" : "matrix-circle-available";
        
        const buttonNode = document.createElement('button');
        buttonNode.type = "button";
        buttonNode.className = `matrix-circle ${stateClass} cursor-pointer hover:scale-105 active:scale-95 transition-transform`;
        buttonNode.innerHTML = window.getEmoji(name).trim();
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
        let stateClass = state === 1 ? "matrix-circle-must" : state === 2 ? "matrix-circle-forbidden" : "matrix-circle-available";
        
        const buttonNode = document.createElement('button');
        buttonNode.type = "button";
        buttonNode.className = `matrix-circle ${stateClass} cursor-pointer hover:scale-105 active:scale-95 transition-transform`;
        buttonNode.innerHTML = toolEmojis[name] || "🔧";
        buttonNode.onclick = () => cycleMatrixState('tool', name);
        toolContainer.appendChild(buttonNode);
    }
}

function cycleMatrixState(type, name) {
    if (type === 'veg') {
        window.vegetableMatrix[name] = (window.vegetableMatrix[name] + 1) % 3;
    } else {
        window.toolMatrix[name] = (window.toolMatrix[name] + 1) % 3;
    }
    buildAILists();
    window.triggerDebouncedSync();
}
window.cycleMatrixState = cycleMatrixState;

function addCustomMatrixItem(type) {
    let name = prompt(type === 'veg' ? "הזן שם ירק חדש:" : "הזן שם כלי מטבח חדש:");
    if (name) {
        if (type === 'veg') window.vegetableMatrix[name] = 0; else window.toolMatrix[name] = 0;
        buildAILists(); window.triggerDebouncedSync();
    }
}
window.addCustomMatrixItem = addCustomMatrixItem;

function buildPantryManualSelectionDOM() {
    const container = document.getElementById('pantry-manual-selection-container'); if (!container) return; container.innerHTML = '';
    for (const [cat, items] of Object.entries(window.appData)) {
        if (cat === "טואלטיקה וניקיון") continue; 
        items.forEach(item => {
            if (window.manualPantrySelections[item.name] === undefined) window.manualPantrySelections[item.name] = true;
            const wrapper = document.createElement('label');
            wrapper.className = "flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 text-[10px] font-bold cursor-pointer select-none";
            const chk = document.createElement('input'); chk.type = "checkbox"; chk.checked = window.manualPantrySelections[item.name];
            chk.onchange = (e) => { window.manualPantrySelections[item.name] = e.target.checked; };
            wrapper.appendChild(chk); wrapper.appendChild(document.createTextNode(`${window.getEmoji(item.name)} ${item.name}`));
            container.appendChild(wrapper);
        });
    }
}

function openAICenter() { 
    if (!window.currentUser) return; 
    document.getElementById('ai-center-modal').classList.remove('hidden'); 
    document.getElementById('ai-center-modal').classList.add('flex'); 
    buildAILists(); 
    buildPantryManualSelectionDOM(); 
}
window.openAICenter = openAICenter;

function closeAICenter() { document.getElementById('ai-center-modal').classList.add('hidden'); document.getElementById('ai-center-modal').classList.remove('flex'); }
window.closeAICenter = closeAICenter;

function setAITab(tab) {
    window.activeAITab = tab;
    ['procure', 'recipes', 'receipt', 'chat'].forEach(t => {
        document.getElementById(`tab-ai-${t}`).className = t === tab ? "px-4 py-2 rounded-lg bg-white text-purple-900 shadow-sm" : "px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600";
        document.getElementById(`panel-ai-${t}`).classList.toggle('hidden', t !== tab);
    });
}
window.setAITab = setAITab;

function cycleRecipeTime() {
    window.recipeTimeMode = (window.recipeTimeMode + 1) % 3; const btn = document.getElementById('time-cycle-btn');
    if (window.recipeTimeMode === 0) btn.innerText = "⏱️ זמן: מהיר (עד 20 דק')";
    else if (window.recipeTimeMode === 1) btn.innerText = "⏱️ זמן: בינוני (עד 45 דק')";
    else btn.innerText = "⏱️ זמן: איטי (ללא הגבלת זמן)";
}
window.cycleRecipeTime = cycleRecipeTime;

function getCurrentlyVisibleProducts() {
    let products = [];
    for (const [cat, items] of Object.entries(window.appData)) {
        items.forEach(i => {
            const matchesSearch = i.name.toLowerCase().includes(window.searchQuery) || (i.notes && i.notes.toLowerCase().includes(window.searchQuery));
            let matchesDay = window.activeDayFilter === 'all' || (i.days && (i.days.includes(window.activeDayFilter) || i.days.includes("כל הימים")));
            const toOrder = window.calculateToOrder(i); let visible = true;
            if (window.activeFilter === 'to-order' && toOrder === 0) visible = false;
            if (window.activeFilter === 'in-stock' && toOrder > 0) visible = false;
            if (matchesSearch && matchesDay && visible) products.push({ name: i.name, existing: i.existing, recommended: i.recommended, notes: i.notes });
        });
    }
    return products;
}

async function callGeminiAPI(contents) {
    const key = localStorage.getItem('aliSiach_gemini_key'); if (!key) { alert("⚠️ חסר מפתח Gemini API!"); return null; }
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: contents })
        });
        const data = await res.json(); return data.candidates?.[0]?.content?.parts?.[0]?.text || "שגיאה בניתוח.";
    } catch (err) { return "תקלת תקשורת מול שרתי AI."; }
}

async function runAIProcurementAnalysis() {
    const out = document.getElementById('ai-procure-output'); out.classList.remove('hidden'); out.innerText = "🤖 מנתח מלאי מגמתי...";
    let prompt = `השווה כמויות חודש קודם למלאי קיים. נתונים:\n${JSON.stringify(window.appData)}`;
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}
window.runAIProcurementAnalysis = runAIProcurementAnalysis;

async function generateAdvancedAIRecipe() {
    const out = document.getElementById('ai-recipe-output'); out.classList.remove('hidden'); out.innerText = "🤖 בונה מתכון מותאם אישית...";
    const visibleProducts = getCurrentlyVisibleProducts(); const dishInput = document.getElementById('ai-recipe-dish-input').value.trim();
    const timeLabels = ["מהיר (עד 20 דקות)", "בינוני (עד 45 דקות)", "איטי (ללא הגבלת זמן)"];
    let chosenPantryItems = []; for (const [name, isIncluded] of Object.entries(window.manualPantrySelections)) { if (isIncluded) chosenPantryItems.push(name); }

    let prompt = `הצע מתכון קל וטעים ל-6 דיירים בעלי שיח בהתבסס על ההגבלות הבאות:\n`;
    prompt += `מנה מבוקשת: ${dishInput || 'בחירה חופשית'}\nזמן הכנה: ${timeLabels[window.recipeTimeMode]}\n`;
    prompt += `חוקי מטבח: בישול בשרי, ללא מעבד מזון, חיתוך בסכין בלבד, שמן קנולה בלבד, ללא סויה או כמון. כשר.\n`;
    prompt += `מוצרים פתוחים כעת: ${JSON.stringify(visibleProducts)}\nמוצרי מזווה שנבחרו ידנית: ${JSON.stringify(chosenPantryItems)}\n`;
    prompt += `מטריצת ירקות (0=אפשר, 1=חייב, 2=אסור): ${JSON.stringify(window.vegetableMatrix)}\n`;
    prompt += `מטריצת כלי מטבח (0=אפשר, 1=חייב, 2=אסור): ${JSON.stringify(window.toolMatrix)}\n\n`;
    prompt += `הצג הוראות ברורות למדריכים ובשורה האחרונה בהחלט תיתן שדרוג/האק מהיר למנה [Upgrade/Hack].`;
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
    if (!window.base64ReceiptImage) return;
    let systemPrompt = `קרא את פריטי המזון בקבלה והשווה למלאי: ${JSON.stringify(window.appData)}`;
    const text = await callGeminiAPI([{ parts: [{ inlineData: { mimeType: window.receiptMimeType, data: window.base64ReceiptImage } }, { text: systemPrompt }] }]);
    out.innerHTML = `<div class="whitespace-pre-line">${text}</div>`;
}
window.analyzeReceiptWithAI = analyzeReceiptWithAI;

async function sendFreeTextAIQuery() {
    const inp = document.getElementById('ai-chat-input'); const q = inp.value.trim(); if (!q) return;
    const cb = document.getElementById('ai-chat-box'); cb.innerHTML += `<div class="text-left bg-blue-100 p-2 rounded-xl mb-1 max-w-[80%] ml-auto"><b>אתה:</b> ${q}</div>`; inp.value = '';
    let systemContext = `עוזר ניהול ומטבח בדירת עלי שיח. שאלה: ${q}`;
    const reply = await callGeminiAPI([{ parts: [{ text: systemContext }] }]);
    cb.innerHTML += `<div class="text-right bg-purple-100 p-2 rounded-xl mb-2 max-w-[80%] mr-auto"><b>AI:</b> ${reply}</div>`; cb.scrollTop = cb.scrollHeight;
}
window.sendFreeTextAIQuery = sendFreeTextAIQuery;
