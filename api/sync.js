export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { cloudUrl, data } = req.body;
        if (!cloudUrl) return res.status(400).json({ error: 'Missing cloudUrl' });

        const googleResponse = await fetch(cloudUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const resText = await googleResponse.text();
        
        // תיקון קריטי: אם גוגל מחזירה שגיאה או חסימה, השרת ידווח על כך ישירות לדפדפן
        if (!googleResponse.ok) {
            return res.status(googleResponse.status).json({ success: false, error: resText });
        }

        return res.status(200).json({ success: true, googleResponse: resText });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
