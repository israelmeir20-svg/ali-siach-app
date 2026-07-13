// אפליקציית עלי שיח - מודול AI חכם ותפעול מופרד (גרסה סופית, מופרדת ומאובטחת)
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

function openAIRecipesModal() { 
    if (!window.currentUser) return; 
    document.getElementById('ai-recipes-modal').classList.remove('hidden'); 
    document.getElementById('ai-recipes-modal').classList.add('flex'); 
    buildAILists(); 
    buildPantryManualSelectionDOM(); 
}
window.openAIRecipesModal = openAIRecipesModal;

function openAIReceiptModal() { 
    if (!window.currentUser) return; 
    document.getElementById('ai-receipt-modal').classList.remove('hidden'); 
    document.getElementById('ai-receipt-modal').classList.add('flex'); 
}
window.openAIReceiptModal = openAIReceiptModal;

function openAIProcureModal() { 
    if (!window.currentUser) return; 
    document.getElementById('ai-procure-modal').classList.remove('hidden'); 
    document.getElementById('ai-procure-modal').classList.add('flex'); 
}
window.openAIProcureModal = openAIProcureModal;

function toggleAIChatWindow() {
    if (!window.currentUser) return;
    const win = document.getElementById('ai-chat-window');
    window.isAIChatOpen = !window.isAIChatOpen;
    if (window.isAIChatOpen) { win.classList.remove('hidden'); win.classList.add('flex'); } 
    else { win.classList.add('hidden'); win.classList.remove('flex'); }
}
window.toggleAIChatWindow = toggleAIChatWindow;

function toggleMatrixPanel(type) {
    const panelId = type === 'veg' ? 'panel-vegetables-content' : 'panel-tools-content';
    const arrowId = type === 'veg' ? 'veg-panel-arrow' : 'tool-panel-arrow';
    const panel = document.getElementById(panelId);
    const arrow = document.getElementById(arrowId);
    if (panel.classList.contains('hidden')) { panel.classList.remove('hidden'); arrow.innerText = "▲"; buildAILists(); } 
    else { panel.classList.add('hidden'); arrow.innerText = "▼"; }
}
window.toggleMatrixPanel = toggleMatrixPanel;

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
        buttonNode.innerHTML = window.getEmoji(name).trim();
        buttonNode.onclick = () => window.cycleMatrixState('veg', name);
        vegContainer.appendChild(buttonNode);
    }

    const toolContainer = document.getElementById('matrix-tools'); if (!toolContainer) return; toolContainer.innerHTML = '';
    const toolEmojis = { "מחבת ללא מכסה בשרית": "🍳", "סיר שטוח עם מכסה בשרי": "🍲", "סיר קטן גבוה עם מכסה בשרי": "🥣", "סיר רגיל עם מכסה בשרי": "🍲", "סכין בשרית": "🔪", "סכין חלבית": "🍴", "פומפייה": "🧀", "תנור בשרי": "♨️", "טוסטר חלבי": "🥪", "כיריים": "🔥", "מיניבר": "🚰" };
    for (const [name, state] of Object.entries(window.toolMatrix)) {
        let bgStyle = state === 1 ? "background-color: #fef2f2 !important; border: 4px solid #ef4444 !important;" : 
                      state === 2 ? "background-color: #f1f5f9 !important; border: 4px solid #94a3b8 !important; opacity: 0.35;" : 
                                    "background-color: #ecfdf5 !important; border: 4px solid #10b981 !important;";
        const buttonNode = document.createElement('button');
        buttonNode.type = "button";
        buttonNode.className = "matrix-circle hover:scale-110 active:scale-95 shadow-md flex items-center justify-center";
        buttonNode.style = `${bgStyle} width: 64px !important; height: 64px !important; font-size: 2rem !important; border-radius: 9999px; display: inline-flex;`;
        buttonNode.innerHTML = toolEmojis[name] || "🔧";
        buttonNode.onclick = () => window.cycleMatrixState('tool', name);
        toolContainer.appendChild(buttonNode);
    }
}
window.buildAILists = buildAILists;

function cycleMatrixState(type, name) {
    if (type === 'veg') { window.vegetableMatrix[name] = (window.vegetableMatrix[name] + 1) % 3; } 
    else { window.toolMatrix[name] = (window.toolMatrix[name] + 1) % 3; }
    buildAILists(); window.triggerDebouncedSync();
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
            wrapper.className = "flex items-center gap-2 p-1.5 bg-white rounded-lg border dark:border-slate-700 text-[10px] font-bold cursor-pointer select-none dark:bg-slate-800 text-slate-800 dark:text-white";
            const chk = document.createElement('input'); chk.type = "checkbox"; chk.checked = window.manualPantrySelections[item.name];
            chk.onchange = (e) => { window.manualPantrySelections[item.name] = e.target.checked; };
            wrapper.appendChild(chk); wrapper.appendChild(document.createTextNode(`${window.getEmoji(item.name)} ${item.name}`));
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
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: contents }) });
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
    let prompt = `הצע מתכון קל וטעים ל-6 דיירים בעלי שיח בהתבסס על ההגבלות הבאות:\nמנה מבוקשת: ${dishInput || 'בחירה חופשית'}\nזמן הכנה: ${timeLabels[window.recipeTimeMode]}\nחוקי מטבח: בישול בשרי, ללא מעבד מזון, חיתוך בסכין בלבד, שמן קנולה בלבד, ללא סויה או כמון. כשר.\nמוצרים פתוחים כעת: ${JSON.stringify(visibleProducts)}\nמוצרי מזווה שנבחרו ידנית: ${JSON.stringify(chosenPantryItems)}\nמטריצת ירקות (0=אפשר, 1=חייב, 2=אסור): ${JSON.stringify(window.vegetableMatrix)}\nמטריצת כלי מטבח (0=אפשר, 1=חייב, 2=אסור): ${JSON.stringify(window.toolMatrix)}\n\nהצג הוראות ברורות למדריכים ובשורה האחרונה בהחלט תיתן שדרוג/האק מהיר למנה [Upgrade/Hack].`;
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
    const cb = document.getElementById('ai-chat-box'); cb.innerHTML += `<div class="text-right bg-purple-800 p-2 rounded-xl mb-1 max-w-[80%] mr-auto text-white"><b>אתה:</b> ${q}</div>`; inp.value = '';
    let systemContext = `עוזר ניהול ומטבח בדירת עלי שיח. ענה בקצרה ובצורה פרקטית למדריכים. שאלה: ${q}`;
    const reply = await callGeminiAPI([{ parts: [{ text: systemContext }] }]);
    cb.innerHTML += `<div class="text-left bg-purple-950 p-2 rounded-xl mb-2 max-w-[80%] ml-auto text-purple-200"><b>AI:</b> ${reply}</div>`; cb.scrollTop = cb.scrollHeight;
}
window.sendFreeTextAIQuery = sendFreeTextAIQuery;
