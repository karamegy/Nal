import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req, res) {
    // تفعيل السماح بالاتصال من أي نطاق (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // التعامل مع طلب الفحص المسبق (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // السماح فقط بطلبات POST الفعلية
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed. Please use POST.' });
    }

    try {
        // تهيئة Firebase Admin بداخل الدالة حصرياً لمنع انهيار الخادم
        if (!getApps().length) {
            let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';
            rawPrivateKey = rawPrivateKey.trim().replace(/^["']|["']$/g, '');
            const formattedPrivateKey = rawPrivateKey.includes('\\n') 
                ? rawPrivateKey.replace(/\\n/g, '\n') 
                : rawPrivateKey;

            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !formattedPrivateKey) {
                throw new Error('متغيرات بيئة Firebase (Project ID, Client Email, Private Key) غير مُعرفة في لوحة تحكم Vercel!');
            }

            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: formattedPrivateKey
                })
            });
        }

        const db = getFirestore();

        const { invoiceData } = req.body;
        if (!invoiceData) {
            return res.status(400).json({ success: false, error: 'بيانات الفاتورة مفقودة في الطلب' });
        }

        const companyId = invoiceData.companyId || 'default_company';

        // 1. البحث في قاعدة البيانات عن إعدادات الضرائب الخاصة بالشركة
        let CLIENT_ID = process.env.ETA_CLIENT_ID;
        let CLIENT_SECRET = process.env.ETA_CLIENT_SECRET;

        try {
            const settingsSnap = await db.collection('settings').where('companyId', '==', companyId).limit(1).get();
            if (!settingsSnap.empty) {
                const companySettings = settingsSnap.docs[0].data();
                if (companySettings.etaClientId && companySettings.etaClientSecret) {
                    CLIENT_ID = companySettings.etaClientId;
                    CLIENT_SECRET = companySettings.etaClientSecret;
                }
            }
        } catch (dbErr) {
            console.warn('تعذر جلب إعدادات الشركة من قاعدة البيانات:', dbErr.message);
        }

        if (!CLIENT_ID || !CLIENT_SECRET) {
            return res.status(400).json({ success: false, error: 'بيانات الاعتماد الضريبية غير متوفرة لهذا الحساب المعزول' });
        }

        // 2. الحصول على الـ Token من مصلحة الضرائب
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
        console.error('API Execution Error:', error.message);
        return res.status(500).json({ success: false, error: 'خطأ داخلي في الخادم: ' + error.message });
    }
}
