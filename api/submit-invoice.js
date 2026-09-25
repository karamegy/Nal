export default async function handler(req, res) {
    // السماح فقط بطلبات POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { invoiceData } = req.body;

        // بيانات الاعتماد الخاصة بمصلحة الضرائب (يتم حفظها بأمان في إعدادات Vercel كـ Environment Variables)
        const CLIENT_ID = process.env.ETA_CLIENT_ID;
        const CLIENT_SECRET = process.env.ETA_CLIENT_SECRET;

        // 1. الحصول على الـ Token من مصلحة الضرائب (بيئة الاختبار)
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', CLIENT_ID);
        tokenParams.append('client_secret', CLIENT_SECRET);
        tokenParams.append('scope', 'InvoicingAPI');

        const tokenRes = await fetch('https://id.eta.gov.eg/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams
        });
        
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
            throw new Error('فشل المصادقة مع مصلحة الضرائب: ' + JSON.stringify(tokenData));
        }

        const accessToken = tokenData.access_token;

        // 2. إرسال الفاتورة إلى بوابة مصلحة الضرائب
        const etaRes = await fetch('https://api.invoicing.eta.gov.eg/api/v1/documents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invoiceData)
        });

        const etaResult = await etaRes.json();

        if (!etaRes.ok) {
            return res.status(400).json({ success: false, error: etaResult });
        }

        return res.status(200).json({ success: true, response: etaResult });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
