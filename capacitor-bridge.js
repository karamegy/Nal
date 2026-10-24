/**
 * =================================================================
 * EIDCO Business OS - Native Capacitor Bridge (capacitor-bridge.js)
 * جسر التواصل البرمجي بين محرك WebView والأندرويد الأهلي
 * الإصدار: 2.0.0 Native Sync
 * =================================================================
 */

(function () {
    'use strict';

    window.CapacitorBridge = {
        isNative: function () {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform()) || !!window.AndroidBridge;
        },

        // 1. الاهتزاز التلمسي (Haptic Feedback)
        vibrate: function (duration = 35) {
            if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
                window.AndroidBridge.vibrate(duration);
            } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
                window.Capacitor.Plugins.Haptics.vibrate({ duration: duration });
            } else if ("vibrate" in navigator) {
                navigator.vibrate(duration);
            }
        },

        // 2. إشعارات النظام الخفيفة (Toast)
        showToast: function (message) {
            if (window.AndroidBridge && typeof window.AndroidBridge.showToast === 'function') {
                window.AndroidBridge.showToast(message);
            } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Toast) {
                window.Capacitor.Plugins.Toast.show({ text: message, duration: 'short' });
            } else {
                console.log("[EIDCO Toast]: " + message);
            }
        },

        // 3. منع إغلاق الشاشة أثناء العمل
        keepScreenOn: function (enable = true) {
            if (window.AndroidBridge && typeof window.AndroidBridge.keepScreenOn === 'function') {
                window.AndroidBridge.keepScreenOn(enable);
            } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.KeepAwake) {
                if (enable) {
                    window.Capacitor.Plugins.KeepAwake.keepAwake();
                } else {
                    window.Capacitor.Plugins.KeepAwake.allowSleep();
                }
            }
        },

        // 4. مشاركة النصوص والتقارير
        shareText: function (text, title = "مشاركة تقرير EIDCO") {
            if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
                window.AndroidBridge.shareText(text);
            } else if (navigator.share) {
                navigator.share({ title: title, text: text }).catch(() => {});
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

        // 6. استدعاء تسجيل الدخول بـ Google الأهلي
        launchNativeGoogleSignIn: function () {
            if (window.AndroidBridge && typeof window.AndroidBridge.launchNativeGoogleSignIn === 'function') {
                window.AndroidBridge.launchNativeGoogleSignIn();
            } else if (window.signInWithGoogle) {
                window.signInWithGoogle();
            }
        }
    };

    // ربط تلقائي مع واجهة NativeBridge المستخدمة في باقي صفحات المنظومة
    window.NativeBridge = window.CapacitorBridge;

    // تفعيل منع إغلاق الشاشة عند اكتمال تحميل الصفحات
    document.addEventListener('DOMContentLoaded', function () {
        window.CapacitorBridge.keepScreenOn(true);
    });
})();
