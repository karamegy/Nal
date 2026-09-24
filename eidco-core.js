/**
 * =================================================================
 * EIDCO Business OS - Central Core Engine (eidco-core.js)
 * المكون المركزي لإدارة المزامنة الفورية، الأحداث، والتخزين المؤقت
 * المؤسس / المسؤول الرئيسي: كرم حمدي عبدالعظيم (company_founder_karm)
 * =================================================================
 */

class EIDCOCore {
    constructor() {
        this.version = '3.1.0';
        this.state = {
            companyId: 'company_founder_karm',
            isOnline: navigator.onLine,
            syncQueue: JSON.parse(localStorage.getItem('eidco_sync_queue') || '[]'),
            activeModule: null,
            registeredModules: [
                'dashboard.html',
                'index.html',
                'invoices.html',
                'batch-invoices.html',
                'inventory.html',
                'clients.html',
                'documents.html', // 🟢 تمت الإضافة بنجاح لنواة المنظومة
                'chat.html',
                'profile.html',
                'vault.html',
                'map.html',
                'auth.html',
                'settings.html',
                'remote.html',
                'users.html',
                'admin-accounts.html',
                'admin-reports.html',
                'tv.html',
                'intelligence.html'
            ]
        };
        this.eventListeners = {};
        this.initCoreSystem();
    }

    /**
     * تهيئة النواة ومستشعرات الاتصال بالشبكة
     */
    initCoreSystem() {
        // مراقبة حالة الاتصال بالإنترنت لتفعيل المزامنة التلقائية
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.processSyncQueue();
            this.broadcastEvent('connectionStatus', { status: 'online' });
        });

        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.broadcastEvent('connectionStatus', { status: 'offline' });
        });

        // المزامنة بين التبويبات المفتوحة لنفس المتصفح
        window.addEventListener('storage', (event) => {
            if (event.key === 'eidco_cross_tab_sync') {
                const data = JSON.parse(event.newValue);
                if (data && this.eventListeners[data.event]) {
                    this.eventListeners[data.event].forEach(callback => callback(data.payload));
                }
            }
        });
    }

    /**
     * نظام إدارة الأحداث المركزي (Event Bus) لربط ملفات المنظومة لحظياً
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, payload) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(payload));
        }
        // بث الحدث لباقي الملفات المفتوحة في المتصفح
        localStorage.setItem('eidco_cross_tab_sync', JSON.stringify({
            event,
            payload,
            timestamp: Date.now()
        }));
    }

    broadcastEvent(event, payload) {
        this.emit(event, payload);
    }

    /**
     * طبقة التخزين المؤقت السريع (Local Caching)
     */
    setLocal(key, data) {
        try {
            localStorage.setItem(`eidco_${key}`, JSON.stringify(data));
            this.emit('dataSynced', { key, data });
        } catch (e) {
            console.error('Error saving to local storage:', e);
        }
    }

    getLocal(key) {
        try {
            const item = localStorage.getItem(`eidco_${key}`);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from local storage:', e);
            return null;
        }
    }

    /**
     * طابور العمليات غير المتصلة (Offline Sync Queue)
     */
    enqueueAction(actionType, data) {
        this.state.syncQueue.push({
            actionType,
            data,
            timestamp: Date.now()
        });
        localStorage.setItem('eidco_sync_queue', JSON.stringify(this.state.syncQueue));
        
        if (this.state.isOnline) {
            this.processSyncQueue();
        }
    }

    async processSyncQueue() {
        if (this.state.syncQueue.length === 0 || !this.state.isOnline) return;

        console.log('جاري مزامنة العمليات المعلقة مع السحابة...');
        
        // محاكاة معالجة الطابور ومزامنة البيانات السحابية (Firebase / Realtime Database)
        try {
            // تفريغ الطابور بعد نجاح المزامنة
            this.state.syncQueue = [];
            localStorage.removeItem('eidco_sync_queue');
            this.emit('syncComplete', { success: true });
        } catch (error) {
            console.error('فشل عملية المزامنة السحابية:', error);
        }
    }
}

// تفعيل النسخة العامة للنواة لتكون متاحة في جميع ملفات النظام
window.EIDCOCoreInstance = new EIDCOCore();
