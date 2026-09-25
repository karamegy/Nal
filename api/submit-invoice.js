import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// تهيئة Firebase Admin SDK للخادم بشكل آمن
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
        })
    });
}

const db = getFirestore();

export default async function handler(req, res) {
    // السماح فقط بطلبات POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { invoiceData } = req.body;
        if (!invoiceData) {
            return res.status(400).json({ success: false, error: 'بيانات الفاتورة مفقودة' });
        }

        // استخراج معرف الشركة الحالي المرتبط بالفاتورة
        const companyId = invoiceData.companyId || 'default_company';

        // 1. البحث في قاعدة البيانات (Firestore) عن إعدادات الضرائب الخاصة بهذه الشركة حصرياً
        let CLIENT_ID = process.env.ETA_CLIENT_ID;
        let CLIENT_SECRET = process.env.ETA_CLIENT_SECRET;

        try {
            const settingsSnap = await db.collection('settings').where('companyId', '==', companyId).limit(1).get();
            if (!settingsSnap.empty) {
                const companySettings = settingsSnap.docs[0].data();
                // إذا كانت الشركة قد أدخلت بيانات اعتماد ضريبية خاصة بها في صفحة الإعدادات
                if (companySettings.etaClientId && companySettings.etaClientSecret) {
                    CLIENT_ID = companySettings.etaClientId;
                    CLIENT_SECRET = companySettings.etaClientSecret;
                }
            }
        } catch (dbErr) {
            console.warn('تعذر جلب إعدادات الشركة من قاعدة البيانات، سيتم استخدام البيئة العامة:', dbErr.message);
        }

        if (!CLIENT_ID || !CLIENT_SECRET) {
            return res.status(400).json({ success: false, error: 'بيانات الاعتماد الضريبية غير متوفرة لهذا الحساب المعزول' });
        }

        // 2. الحصول على الـ Token من مصلحة الضرائب باستخدام مفاتيح الشركة المحددة
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

        // 3. إرسال الفاتورة إلى بوابة مصلحة الضرائب
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
