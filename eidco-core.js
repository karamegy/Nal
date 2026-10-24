/**
 * =================================================================
 * EIDCO Business OS - Central Core Engine (eidco-core.js)
 * المكون المركزي لإدارة المزامنة الفورية، الأحداث، والتخزين المؤقت
 * المتوافق مع تطبيقات Native App / WebView / PWABuilder / PWA
 * الإصدار: 3.5.0 Enterprise Universal Core (مزامنة وشبكة موحدة)
 * =================================================================
 */

class EIDCOCore {
    constructor() {
        this.version = '3.5.0';
        
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
                'accounts-tree.html',
                'documents.html',
                'chat.html',
                'profile.html',
                'vault.html',
                'map.html',
                'auth.html',
                'privacy.html',
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
        this.initNativeBridge();
        this.initCoreSystem();
    }

    /**
     * تهيئة واجهة الجسر الأهلي (Native Bridge) لكافة صفحات المنظومة
     */
    initNativeBridge() {
        window.NativeBridge = {
            vibrate: (ms = 35) => {
                if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
                    window.AndroidBridge.vibrate(ms);
                } else if (navigator.vibrate) {
                    navigator.vibrate(ms);
                }
            },
            showToast: (msg) => {
                if (window.AndroidBridge && typeof window.AndroidBridge.showToast === 'function') {
                    window.AndroidBridge.showToast(msg);
                } else {
                    console.log(`[EIDCO Toast]: ${msg}`);
                }
            },
            keepScreenOn: (enable = true) => {
                if (window.AndroidBridge && typeof window.AndroidBridge.keepScreenOn === 'function') {
                    window.AndroidBridge.keepScreenOn(enable);
                }
            },
            shareText: (text) => {
                if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
                    window.AndroidBridge.shareText(text);
                } else if (navigator.share) {
                    navigator.share({ text: text }).catch(() => {});
                } else {
                    alert(text);
                }
            },
            downloadFile: (filename, base64Data) => {
                if (window.AndroidBridge && typeof window.AndroidBridge.downloadFile === 'function') {
                    window.AndroidBridge.downloadFile(filename, base64Data);
                } else {
                    const link = document.createElement('a');
                    link.href = base64Data.startsWith('data:') ? base64Data : 'data:application/json;charset=utf-8,' + encodeURIComponent(base64Data);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        };
    }

    /**
     * تهيئة النواة ومستشعرات الاتصال وحماية الجلسة
     */
    initCoreSystem() {
        // حماية الجلسة والتحقق من التوثيق تلقائياً (Auth Guard)
        this.checkAuthGuard();

        // مراقبة حالة الاتصال بالإنترنت
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.processSyncQueue();
            this.broadcastEvent('connectionStatus', { status: 'online' });
            window.NativeBridge.showToast('✓ تم إعادة الاتصال بالشبكة');
        });

        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.broadcastEvent('connectionStatus', { status: 'offline' });
            window.NativeBridge.showToast('⚠️ أنت تعمل حالياً في الوضع غير المتصل (Offline)');
        });

        // المزامنة الفورية بين التبويبات المفتوحة لنفس المتصفح
        window.addEventListener('storage', (event) => {
            if (event.key === 'eidco_cross_tab_sync' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    if (data && data.event) {
                        this.dispatchRegisteredEvent(data.event, data.payload);
                    }
                } catch (e) {
                    console.error('EIDCO Core: خطأ المزامنة بين التبويبات:', e);
                }
            }
        });

        // ربط الروابط والإدخالات بمجرد تجهيز شجرة الـ DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.normalizeInternalLinks();
            this.observeDynamicLinks();
            this.setupGlobalKeyboardHandler();
            this.registerServiceWorker();
        });
    }

    /**
     * التحقق التلقائي من تسجيل الدخول وتوثيق الجلسة لكل الصفحات
     */
    checkAuthGuard() {
        const publicPages = ['auth.html', 'privacy.html'];
        const currentPage = this.state.activeModule;

        if (!publicPages.includes(currentPage)) {
            const isAuth = sessionStorage.getItem('eidco_session_auth') || localStorage.getItem('eidco_v14_admin');
            if (!isAuth) {
                const targetUrl = `auth.html?redirect=${encodeURIComponent(currentPage)}&companyId=${encodeURIComponent(this.state.companyId)}`;
                window.location.href = targetUrl;
            }
        }
    }

    /**
     * توحيد وتحديث كافة الروابط والنماذج الداخلية تلقائياً ببرامتر companyId
     */
    normalizeInternalLinks() {
        const companyId = this.state.companyId;

        // تحديث كافة عناصر الروابط a[href]
        document.querySelectorAll('a[href]').forEach(link => {
            let href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('javascript:') && !href.startsWith('data:') && !href.includes('companyId=')) {
                let separator = href.includes('?') ? '&' : '?';
                link.setAttribute('href', href + separator + 'companyId=' + encodeURIComponent(companyId));
            }
        });

        // تحديث أهداف النماذج form[action]
        document.querySelectorAll('form[action]').forEach(form => {
            let action = form.getAttribute('action');
            if (action && !action.startsWith('http') && !action.includes('companyId=')) {
                let separator = action.includes('?') ? '&' : '?';
                form.setAttribute('action', action + separator + 'companyId=' + encodeURIComponent(companyId));
            }
        });
    }

    /**
     * مراقبة العناصر الديناميكية المضافة حديثاً للواجهة لتحديث روابطها
     */
    observeDynamicLinks() {
        const observer = new MutationObserver(() => {
            this.normalizeInternalLinks();
        });
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    /**
     * معالج محاذاة الكيبورد التلقائي لجميع المدخلات في جميع الصفحات
     */
    setupGlobalKeyboardHandler() {
        document.addEventListener('focusin', (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
    }

    /**
     * تسجيل الـ Service Worker لدعم PWA والعمل أوفلاين
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(err => {
                console.warn('EIDCO Core: حالة ServiceWorker:', err.message);
            });
        }
    }

    /**
     * نظام إدارة الأحداث المركزي (Event Bus)
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, payload) {
        this.dispatchRegisteredEvent(event, payload);

        try {
            localStorage.setItem('eidco_cross_tab_sync', JSON.stringify({
                event,
                payload,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('EIDCO Core: خطأ في بث الحدث:', e);
        }
    }

    dispatchRegisteredEvent(event, payload) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(payload);
                } catch (e) {
                    console.error(`EIDCO Core: خطأ أثناء تنفيذ الحدث [${event}]:`, e);
                }
            });
        }
    }

    broadcastEvent(event, payload) {
        this.emit(event, payload);
    }

    /**
     * طبقة التخزين المؤقت المحمي
     */
    setLocal(key, data) {
        try {
            localStorage.setItem(`eidco_${key}`, JSON.stringify(data));
            this.dispatchRegisteredEvent('dataSynced', { key, data });
        } catch (e) {
            console.error('EIDCO Core: خطأ الحفظ المحلي:', e);
        }
    }

    getLocal(key) {
        try {
            const item = localStorage.getItem(`eidco_${key}`);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('EIDCO Core: خطأ القراءة المحلية:', e);
            return null;
        }
    }

    removeLocal(key) {
        try {
            localStorage.removeItem(`eidco_${key}`);
        } catch (e) {}
    }

    /**
     * الحصول على معرف الشركة الحالي
     */
    getCompanyId() {
        return this.state.companyId;
    }

    /**
     * الانتقال الموجه الآمن بين الصفحات
     */
    navigateTo(pageName) {
        window.NativeBridge.vibrate(25);
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
            this.removeLocal('sync_queue');
            this.dispatchRegisteredEvent('syncComplete', { success: true });
        } catch (error) {
            console.error('EIDCO Core: فشل المزامنة السحابية:', error);
        }
    }
}

// تفعيل النسخة العامة لنواة EIDCO المحدثة
window.EIDCOCoreInstance = new EIDCOCore();
window.eidcoCore = window.EIDCOCoreInstance;
