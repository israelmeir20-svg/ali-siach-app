export default async function handler(req, res) {
    // הוספת כותרות אבטחה שמאפשרות לאתר שלך לדבר עם השרת
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { cloudUrl, data } = req.body;
        if (!cloudUrl) {
            return res.status(400).json({ error: 'Missing cloudUrl' });
        }

        // השרת של ורסל פונה לגוגל שיטס - גוגל בחיים לא תחסום פנייה של שרת!
        const response = await fetch(cloudUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
