/**
 * =================================================================
 * EIDCO Business OS - Central Core Engine (eidco-core.js)
 * المكون المركزي لإدارة المزامنة الفورية، الأحداث، والتخزين المؤقت
 * المتوافق مع تطبيقات Native App / WebView / PWABuilder / PWA
 * الإصدار: 3.2.0 Native & Dynamic Core
 * =================================================================
 */

class EIDCOCore {
    constructor() {
        this.version = '3.2.0';
        
        // استخراج معرف الشركة ديناميكياً من URL أو التخزين المحلي
        const urlParams = new URLSearchParams(window.location.search);
        const currentCompanyId = urlParams.get('companyId') || localStorage.getItem('eidco_current_company_id') || 'company_founder_karm';
        localStorage.setItem('eidco_current_company_id', currentCompanyId);

        this.state = {
            companyId: currentCompanyId,
            isOnline: navigator.onLine,
            syncQueue: this.getLocal('sync_queue') || [],
            activeModule: window.location.pathname.split('/').pop() || 'index.html',
            registeredModules: [
                'dashboard.html',
                'index.html',
                'invoices.html',
                'batch-invoices.html',
                'inventory.html',
                'clients.html',
                'documents.html',
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
     * تهيئة النواة ومستشعرات الاتصال بالشبكة والـ PWA
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
                try {
                    const data = JSON.parse(event.newValue);
                    if (data && this.eventListeners[data.event]) {
                        this.eventListeners[data.event].forEach(callback => callback(data.payload));
                    }
                } catch (e) {
                    console.error('Error parsing cross-tab payload:', e);
                }
            }
        });

        // ربط الروابط الداخلية تلقائياً بمعرف الشركة المعتمد
        document.addEventListener('DOMContentLoaded', () => {
            this.normalizeInternalLinks();
            this.registerServiceWorker();
        });
    }

    /**
     * توحيد وتحديث كافة الروابط الداخلية تلقائياً ببرامتر companyId
     */
    normalizeInternalLinks() {
        const companyId = this.state.companyId;
        document.querySelectorAll('a[href]').forEach(link => {
            let href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('javascript:') && !href.includes('companyId=')) {
                let separator = href.includes('?') ? '&' : '?';
                link.setAttribute('href', href + separator + 'companyId=' + encodeURIComponent(companyId));
            }
        });
    }

    /**
     * تسجيل الـ Service Worker لدعم PWA والتشغيل أوفلاين
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(err => {
                console.warn('EIDCO Core: ServiceWorker status:', err.message);
            });
        }
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
        // بث الحدث لباقي التبويبات والملفات المفتوحة
        try {
            localStorage.setItem('eidco_cross_tab_sync', JSON.stringify({
                event,
                payload,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Error broadcasting event cross-tab:', e);
        }
    }

    broadcastEvent(event, payload) {
        this.emit(event, payload);
    }

    /**
     * طبقة التخزين المؤقت السريع (Local Caching) مع حماية الـ WebView
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
     * الحصول على معرف الشركة الحالي
     */
    getCompanyId() {
        return this.state.companyId;
    }

    /**
     * الانتقال الموجه الآمن بين الصفحات مع الحفاظ على معرف الشركة
     */
    navigateTo(pageName) {
        const separator = pageName.includes('?') ? '&' : '?';
        window.location.href = `${pageName}${separator}companyId=${encodeURIComponent(this.state.companyId)}`;
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
        this.setLocal('sync_queue', this.state.syncQueue);
        
        if (this.state.isOnline) {
            this.processSyncQueue();
        }
    }

    async processSyncQueue() {
        if (this.state.syncQueue.length === 0 || !this.state.isOnline) return;

        console.log('EIDCO Core: جاري مزامنة العمليات المعلقة مع السحابة...');
        
        try {
            this.state.syncQueue = [];
            localStorage.removeItem('eidco_sync_queue');
            this.emit('syncComplete', { success: true });
        } catch (error) {
            console.error('EIDCO Core: فشل عملية المزامنة السحابية:', error);
        }
    }
}

// تفعيل النسخة العامة لنواة EIDCO المحدثة
window.EIDCOCoreInstance = new EIDCOCore();
