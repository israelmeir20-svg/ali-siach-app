let activeAITab = 'procure';
let base64ReceiptImage = null;
let receiptMimeType = null;
let recipeTimeMode = 0; 

// מערכת ניהול מטריצות במבנה מצבים: 0=אפשר (ירוק), 1=חובה (אדום), 2=אסור (אפור)
let vegetableMatrix = { "עגבניה": 0, "מלפפון": 0, "גזר": 0, "קולרבי": 0, "תפו\"א": 0, "כרוב": 0, "בצל": 0, "דלורית": 0, "פלפל": 0 };
let toolMatrix = { "מחבת ללא מכסה בשרית": 0, "סיר שטוח עם מכסה בשרי": 0, "סיר קטן גבוה עם מכסה בשרי": 0, "סיר רגיל עם מכסה בשרי": 0, "סכין בשרית": 0, "סכין חלבית": 0, "פומפייה": 0, "תנור בשרי": 0, "טוסטר חלבי": 0, "כיריים": 0, "מיניבר": 0 };

// אובייקט זיכרון למצרכי מזווה שנבחרו ידנית למתכון
let manualPantrySelections = {};

function openAICenter() { 
    if (!currentUser) return; 
    document.getElementById('ai-center-modal').classList.remove('hidden'); 
    document.getElementById('ai-center-modal').classList.add('flex'); 
    buildAILists(); 
    buildPantryManualSelectionDOM(); // בניה דינמית של רכיב המזווה
}

function closeAICenter() { 
    document.getElementById('ai-center-modal').classList.add('hidden'); 
    document.getElementById('ai-center-modal').classList.remove('flex'); 
}

function setAITab(tab) {
    activeAITab = tab; 
    ['procure', 'recipes', 'receipt', 'chat'].forEach(t => {
        document.getElementById(`tab-ai-${t}`).className = t === tab ? "px-4 py-2 rounded-lg bg-white text-purple-900 shadow-sm" : "px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200";
        document.getElementById(`panel-ai-${t}`).classList.toggle('hidden', t !== tab);
    });
}

// בניית רכיב אימוג'ים מעגליים צבעוניים מחזוריים (באג ה')
function buildAILists() {
    const vegContainer = document.getElementById('matrix-vegetables'); if (!vegContainer) return; vegContainer.innerHTML = '';
    for (const [name, state] of Object.entries(vegetableMatrix)) {
        let stateClass = state === 1 ? "matrix-circle-must" : state === 2 ? "matrix-circle-forbidden" : "matrix-circle-available";
        let titleTip = state === 1 ? "חובה להשתמש (אדום)" : state === 2 ? "אסור להשתמש (אפור)" : "אפשר להשתמש (ירוק)";
        
        const circle = document.createElement('div');
        circle.className = `matrix-circle ${stateClass}`;
        circle.title = `${name}: ${titleTip}`;
        circle.innerHTML = getEmoji(name).trim();
        circle.onclick = () => cycleMatrixState('veg', name);
        vegContainer.appendChild(circle);
    }

    const toolContainer = document.getElementById('matrix-tools'); if (!toolContainer) return; toolContainer.innerHTML = '';
    const toolEmojis = {
        "מחבת ללא מכסה בשרית": "🍳", "סיר שטוח עם מכסה בשרי": "🍲", "סיר קטן גבוה עם מכסה בשרי": "🥣", 
        "סיר רגיל עם מכסה בשרי": "🍲", "סכין בשרית": "🔪", "סכין חלבית": "🍴", "פומפייה": "🧀", 
        "תנור בשרי": "♨️", "טוסטר חלבי": "🥪", "כיריים": "🔥", "מיניבר": "🚰"
    };
    for (const [name, state] of Object.entries(toolMatrix)) {
        let stateClass = state === 1 ? "matrix-circle-must" : state === 2 ? "matrix-circle-forbidden" : "matrix-circle-available";
        let titleTip = state === 1 ? "חובה להשתמש (אדום)" : state === 2 ? "אסור להשתמש (אפור)" : "אפשר להשתמש (ירוק)";
        
        const circle = document.createElement('div');
        circle.className = `matrix-circle ${stateClass}`;
        circle.title = `${name}: ${titleTip}`;
        circle.innerHTML = toolEmojis[name] || "🔧";
        circle.onclick = () => cycleMatrixState('tool', name);
        toolContainer.appendChild(circle);
    }
}

// בנית רכיב בחירה ידנית מהמזווה תוך חסימת מוצרי טואלטיקה וניקיון (באג ו')
function buildPantryManualSelectionDOM() {
    const container = document.getElementById('pantry-manual-selection-container');
    if (!container) return;
    container.innerHTML = '';
    
    for (const [cat, items] of Object.entries(appData)) {
        // חסימת קטגוריית טואלטיקה וניקיון באופן מוחלט
        if (cat === "טואלטיקה וניקיון") continue;
        
        items.forEach(item => {
            if (manualPantrySelections[item.name] === undefined) {
                manualPantrySelections[item.name] = true; 
            }
            const wrapper = document.createElement('label');
            wrapper.className = "flex items-center gap-2 p-1.5 bg-white rounded-lg border text-[10px] font-bold cursor-pointer hover:bg-slate-50 select-none";
            
            const chk = document.createElement('input');
            chk.type = "checkbox";
            chk.className = "rounded border-slate-300 text-purple-600 focus:ring-purple-500";
            chk.checked = manualPantrySelections[item.name];
            chk.onchange = (e) => { manualPantrySelections[item.name] = e.target.checked; };
            
            wrapper.appendChild(chk);
            wrapper.appendChild(document.createTextNode(`${getEmoji(item.name)} ${item.name}`));
            container.appendChild(wrapper);
        });
    }
}
function cycleRecipeTime() {
    recipeTimeMode = (recipeTimeMode + 1) % 3; const btn = document.getElementById('time-cycle-btn');
    if (recipeTimeMode === 0) btn.innerText = "⏱️ זמן: מהיר (עד 20 דק')";
    else if (recipeTimeMode === 1) btn.innerText = "⏱️ זמן: בינוני (עד 45 דק')";
    else btn.innerText = "⏱️ זמן: איטי (ללא הגבלת זמן)";
}

function getCurrentlyVisibleProducts() {
    let products = [];
    for (const [cat, items] of Object.entries(appData)) {
        items.forEach(i => {
            const matchesSearch = i.name.toLowerCase().includes(searchQuery) || (i.notes && i.notes.toLowerCase().includes(searchQuery));
            const toOrder = calculateToOrder(i); let visible = true;
            if (activeFilter === 'to-order' && toOrder === 0) visible = false;
            if (activeFilter === 'in-stock' && toOrder > 0) visible = false;
            if (matchesSearch && visible) products.push({ name: i.name, existing: i.existing, recommended: i.recommended, notes: i.notes });
        });
    }
    return products;
}

async function callGeminiAPI(contents) {
    const key = localStorage.getItem('aliSiach_gemini_key'); if (!key) { alert("⚠️ חסר מפתח Gemini API בהגדרות!"); return null; }
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: contents })
        });
        const data = await res.json(); return data.candidates?.[0]?.content?.parts?.[0]?.text || "שגיאה בניתוח.";
    } catch (err) { return "תקלת תקשורת מול שרתי AI."; }
}

async function runAIProcurementAnalysis() {
    const out = document.getElementById('ai-procure-output'); out.classList.remove('hidden'); out.innerText = "🤖 מנתח מגמות רכש חודשיות...";
    let prompt = `השווה בין כמויות חודש קודם למצב הקיים בדירה כרגע וזהה מוצרים בחריגת קצב שימוש מוגבר או פריטים ששוכבים במלאי סתם. תן המלצות קצרות ויעילות לחיסכון ברכש החודשי.\n\nנתונים:\n${JSON.stringify(appData)}`;
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}

// מחולל מתכונים מתקדם ומבוסס הגבלות קשיחות ובחירה ידנית
async function generateAdvancedAIRecipe() {
    const out = document.getElementById('ai-recipe-output'); out.classList.remove('hidden'); out.innerText = "🤖 בונה מתכון מותאם אישית...";
    
    const visibleProducts = getCurrentlyVisibleProducts(); 
    const dishInput = document.getElementById('ai-recipe-dish-input').value.trim();
    const timeLabels = ["מהיר (עד 20 דקות)", "בינוני (עד 45 דקות)", "איטי (ללא הגבלת זמן)"];

    // יצירת רשימה ידנית מוגדרת לפי בחירת המשתמש במזווה
    let chosenPantryItems = [];
    for (const [name, isIncluded] of Object.entries(manualPantrySelections)) {
        if (isIncluded) chosenPantryItems.push(name);
    }

    let prompt = `הצע מתכון קל וטעים ל-6 דיירים בעלי שיח בהתבסס על ההגבלות הבאות:\n`;
    prompt += `סוג פנייה: ${dishInput ? `המצרך המבוקש המפורש הוא ${dishInput}` : 'בחירה חופשית ורעיונות שלך לפי המלאי'}\n`;
    prompt += `זמן הכנה נדרש קשיח: ${timeLabels[recipeTimeMode]}\n\n`;
    prompt += `חוקי מטבח קשיחים של הדירה: בישול בשרי, ללא שימוש במעבד מזון, חיתוך בסכין בלבד, שימוש בשמן קנולה בלבד, חסור שימוש מוחלט בסויה או כמון. כשרות מהודרת.\n\n`;
    prompt += `מוצרים פתוחים כעת על המסך (סינון נוכחי): ${JSON.stringify(visibleProducts)}\n`;
    prompt += `מוצרי מזווה שנבחרו ידנית מתוך המלאי לשימוש: ${JSON.stringify(chosenPantryItems)}\n\n`;
    prompt += `מטריצת ירקות (0=אפשר, 1=חייב להשתמש, 2=אסור לחלוטין): ${JSON.stringify(vegetableMatrix)}\n`;
    prompt += `מטריצת כלי מטבח זמינים (0=אפשר, 1=חייב להשתמש, 2=אסור לחלוטין): ${JSON.stringify(toolMatrix)}\n\n`;
    prompt += `הצג את הוראות ההכנה בצורה פשוטה וברורה למדריכים, ובשורה האחרונה בהחלט תיתן שדרוג/האק מהיר למנה [Upgrade/Hack].`;
    
    out.innerText = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
}

function handleReceiptUpload(e) {
    const file = e.target.files[0]; if (!file) return; receiptMimeType = file.type; document.getElementById('receipt-file-name').innerText = file.name;
    const reader = new FileReader(); reader.onload = function(evt) { base64ReceiptImage = evt.target.result.split(',')[1]; }; reader.readAsDataURL(file);
}

// מניעת באג שבירת ה-HTML (נפתר הנתק הלוגי באמצעות אובייקט זיכרון מבודד)
async function analyzeReceiptWithAI() {
    const out = document.getElementById('ai-receipt-output'); out.classList.remove('hidden'); out.innerText = "🤖 סורק ומפענח את צילום הקבלה...";
    if (!base64ReceiptImage) { out.innerText = "⚠️ יש לבחור קובץ תמונה של קבלה."; return; }
    
    let systemPrompt = `אתה סורק קבלות חכם של עלי שיח. קרא את פריטי המזון בקבלה, השווה אותם מול דוח המלאי: ${JSON.stringify(appData)}\n`;
    systemPrompt += `החזר פלט קצר המפרט מה תואם, ובסוף הפלט החזר בצורה נקייה קוד JSON המכיל את רשימת השינויים המומלצת לעדכון המלאי בצורה הבאה: {"UPDATE_QTY": {"שם הקטגוריה": [{"itemName": "שם המוצר המדויק מהדוח", "addQty": 5}]}}`;

    const text = await callGeminiAPI([{ parts: [{ inlineData: { mimeType: receiptMimeType, data: base64ReceiptImage } }, { text: systemPrompt }] }]);
    out.innerHTML = `<div class="whitespace-pre-line">${text}</div>`;
    
    try {
        const match = text.match(/\{"UPDATE_QTY":[\s\S]*?\}/);
        if (match) {
            lastAnalyzedReceiptData = JSON.parse(match[0]); // שמירה גלובלית בטוחה ללא quote clashing
            
            const actionContainer = document.createElement('div');
            actionContainer.className = "p-3 bg-emerald-50 border rounded-xl mt-2 flex justify-between items-center";
            actionContainer.innerHTML = `<span class="font-bold text-emerald-950">📦 זוהו כמויות חדשות בקבלה. לעדכן את הטבלה אוטומטית?</span>`;
            
            const applyBtn = document.createElement('button');
            applyBtn.className = "px-3 py-1.5 bg-emerald-600 text-white font-black rounded-lg";
            applyBtn.innerText = "אשר ועדכן מלאי";
            applyBtn.onclick = () => {
                if (lastAnalyzedReceiptData) {
                    applyReceiptQuantities(lastAnalyzedReceiptData.UPDATE_QTY);
                }
            };
            
            actionContainer.appendChild(applyBtn);
            out.appendChild(actionContainer);
        }
    } catch(e) { console.error("שגיאה בפענוח JSON מקבלה", e); }
}

function applyReceiptQuantities(updateData) {
    for (const [cat, items] of Object.entries(updateData)) { 
        if (appData[cat]) { 
            items.forEach(uItem => { 
                let match = appData[cat].find(i => i.name === uItem.itemName); 
                if (match) { match.existing = (parseFloat(match.existing) || 0) + (parseFloat(uItem.addQty) || 0); } 
            }); 
        } 
    }
    renderApp(); triggerDebouncedSync(true); showToast("המלאי עודכן בהצלחה!", "💾"); document.getElementById('ai-receipt-output').classList.add('hidden');
}

async function sendFreeTextAIQuery() {
    const inp = document.getElementById('ai-chat-input'); const q = inp.value.trim(); if (!q) return;
    const cb = document.getElementById('ai-chat-box'); cb.innerHTML += `<div class="text-left bg-blue-100 p-2 rounded-xl mb-1 max-w-[80%] ml-auto"><b>אתה:</b> ${q}</div>`; inp.value = '';
    let systemContext = `אתה עוזר הניהול והמטבח הרשמי של דירת המדריכים בעלי שיח. ענה על השאלה הבאה בצורה קצרה ופרקטית לצוות השטח:\nQuestion: ${q}`;
    const reply = await callGeminiAPI([{ parts: [{ text: systemContext }] }]);
    cb.innerHTML += `<div class="text-right bg-purple-100 p-2 rounded-xl mb-2 max-w-[80%] mr-auto"><b>AI:</b> ${reply}</div>`; cb.scrollTop = cb.scrollHeight;
}
