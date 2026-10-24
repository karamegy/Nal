/**
 * =================================================================
 * EIDCO Business OS - Native Capacitor Bridge (capacitor-bridge.js)
 * جسر التواصل البرمجي بين محرك WebView والأندرويد الأهلي
 * الإصدار: 2.1.0 Safe Sync
 * =================================================================
 */

(function () {
    'use strict';

    window.CapacitorBridge = {
        // التحقق من التشغيل داخل البيئة المدمجة
        isNative: function () {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform()) || !!window.AndroidBridge;
        },

        // 1. الاهتزاز التلمسي (Haptic Feedback)
        vibrate: function (duration) {
            duration = duration || 35;
            if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
                window.AndroidBridge.vibrate(duration);
            } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
                try {
                    window.Capacitor.Plugins.Haptics.vibrate({ duration: duration });
                } catch (e) {
                    if ("vibrate" in navigator) navigator.vibrate(duration);
                }
            } else if ("vibrate" in navigator) {
                navigator.vibrate(duration);
            }
        },

        // 2. إشعارات النظام الخفيفة (Toast)
        showToast: function (message) {
            if (window.AndroidBridge && typeof window.AndroidBridge.showToast === 'function') {
                window.AndroidBridge.showToast(message);
            } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Toast) {
                try {
                    window.Capacitor.Plugins.Toast.show({ text: message, duration: 'short' });
                } catch (e) {
                    console.log("[EIDCO Toast]: " + message);
                }
            } else {
                console.log("[EIDCO Toast]: " + message);
            }
        },

        // 3. منع إغلاق الشاشة أثناء العمل
        keepScreenOn: function (enable) {
            if (typeof enable === 'undefined') enable = true;
            if (window.AndroidBridge && typeof window.AndroidBridge.keepScreenOn === 'function') {
                window.AndroidBridge.keepScreenOn(enable);
            } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.KeepAwake) {
                try {
                    if (enable) {
                        window.Capacitor.Plugins.KeepAwake.keepAwake();
                    } else {
                        window.Capacitor.Plugins.KeepAwake.allowSleep();
                    }
                } catch (e) {
                    console.warn("KeepAwake plugin not ready");
                }
            }
        },

        // 4. مشاركة النصوص والتقارير
        shareText: function (text, title) {
            title = title || "مشاركة تقرير EIDCO";
            if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
                window.AndroidBridge.shareText(text);
            } else if (navigator.share) {
                navigator.share({ title: title, text: text }).catch(function () {});
            } else {
                alert(text);
            }
        },

        // 5. تنزيل التقارير والملفات
        downloadFile: function (filename, base64Data) {
            if (window.AndroidBridge && typeof window.AndroidBridge.downloadFile === 'function') {
                window.AndroidBridge.downloadFile(filename, base64Data);
            } else {
                const link = document.createElement('a');
                link.href = base64Data.startsWith('data:') ? base64Data : 'data:application/octet-stream;base64,' + base64Data;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        },

        // 6. استدعاء تسجيل الدخول الآمن بـ Google دون حلقات مفرغة
        launchNativeGoogleSignIn: function () {
            if (window.AndroidBridge && typeof window.AndroidBridge.launchNativeGoogleSignIn === 'function') {
                window.AndroidBridge.launchNativeGoogleSignIn();
            } else if (window.google && window.google.accounts && window.google.accounts.id) {
                // استدعاء نافذة Google One-Tap المنسدلة المباشرة
                window.google.accounts.id.prompt();
            } else {
                console.warn("Google Identity Services SDK غير محمل بعد.");
            }
        }
    };

    // توحيد اسم الواجهة مع NativeBridge
    window.NativeBridge = window.CapacitorBridge;

    // تفعيل منع إغلاق الشاشة فور جاهزية المستند تلقائياً
    function initBridge() {
        window.CapacitorBridge.keepScreenOn(true);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initBridge();
    } else {
        document.addEventListener('DOMContentLoaded', initBridge);
    }
})();
