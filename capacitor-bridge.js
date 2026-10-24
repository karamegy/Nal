/**
 * =================================================================
 * EIDCO Business OS - Native Capacitor & Web Bridge (capacitor-bridge.js)
 * جسر التواصل البرمجي الموحد بين محرك WebView، أندرويد الأهلي، والمتصفح
 * الإصدار: 2.2.0 Ultra Safe Sync
 * =================================================================
 */

(function () {
    'use strict';

    // متغير خفي للحفاظ على قفل الشاشة في المتصفحات الحديثة (Wake Lock API)
    let wakeLockSentinel = null;

    const BridgeCore = {
        // 1. التحقق من البيئة الأهلية (Android / Capacitor)
        isNative: function () {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform()) || 
                   !!window.AndroidBridge || 
                   !!window.webkit?.messageHandlers;
        },

        // 2. الاهتزاز التلمسي (Haptic Feedback)
        vibrate: function (duration) {
            duration = duration || 35;
            try {
                if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
                    window.AndroidBridge.vibrate(duration);
                } else if (window.Capacitor?.Plugins?.Haptics) {
                    window.Capacitor.Plugins.Haptics.vibrate({ duration: duration });
                } else if ("vibrate" in navigator) {
                    navigator.vibrate(duration);
                }
            } catch (e) {
                console.warn("[EIDCO Bridge] Vibrate not supported:", e);
            }
        },

        // 3. إشعارات النظام الخفيفة (Toast) مع دعم العرض المرئي على الويب
        showToast: function (message) {
            if (!message) return;

            if (window.AndroidBridge && typeof window.AndroidBridge.showToast === 'function') {
                window.AndroidBridge.showToast(message);
            } else if (window.Capacitor?.Plugins?.Toast) {
                try {
                    window.Capacitor.Plugins.Toast.show({ text: String(message), duration: 'short' });
                } catch (e) {
                    this._renderWebToast(message);
                }
            } else {
                this._renderWebToast(message);
            }
        },

        // عنصر توست افتراضي للويب عند عدم وجود تطبيق أهلي
        _renderWebToast: function (message) {
            let toastEl = document.getElementById('eidco-web-toast');
            if (!toastEl) {
                toastEl = document.createElement('div');
                toastEl.id = 'eidco-web-toast';
                toastEl.style.cssText = `
                    position: fixed;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(15, 23, 42, 0.9);
                    color: #ffffff;
                    padding: 10px 20px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-family: 'Cairo', sans-serif;
                    font-weight: 700;
                    z-index: 99999;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
                    backdrop-filter: blur(8px);
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    pointer-events: none;
                    text-align: center;
                    direction: rtl;
                    max-width: 90vw;
                `;
                document.body.appendChild(toastEl);
            }
            toastEl.innerText = message;
            toastEl.style.opacity = '1';
            toastEl.style.transform = 'translateX(-50%) translateY(0)';

            clearTimeout(window._eidcoToastTimeout);
            window._eidcoToastTimeout = setTimeout(() => {
                toastEl.style.opacity = '0';
                toastEl.style.transform = 'translateX(-50%) translateY(10px)';
            }, 2500);
        },

        // 4. منع إغلاق الشاشة أثناء العمل (Keep Awake / Wake Lock)
        keepScreenOn: async function (enable) {
            if (typeof enable === 'undefined') enable = true;

            // أندرويد أهلي
            if (window.AndroidBridge && typeof window.AndroidBridge.keepScreenOn === 'function') {
                window.AndroidBridge.keepScreenOn(enable);
                return;
            }

            // إضافة Capacitor Plugin
            if (window.Capacitor?.Plugins?.KeepAwake) {
                try {
                    if (enable) await window.Capacitor.Plugins.KeepAwake.keepAwake();
                    else await window.Capacitor.Plugins.KeepAwake.allowSleep();
                    return;
                } catch (e) {
                    console.warn("[EIDCO Bridge] Capacitor KeepAwake fallback to Web API");
                }
            }

            // تقنية HTML5 Web Screen Wake Lock API للمتصفحات
            if ('wakeLock' in navigator) {
                try {
                    if (enable && !wakeLockSentinel) {
                        wakeLockSentinel = await navigator.wakeLock.request('screen');
                    } else if (!enable && wakeLockSentinel) {
                        await wakeLockSentinel.release();
                        wakeLockSentinel = null;
                    }
                } catch (err) {
                    console.warn("[EIDCO Bridge] Web Wake Lock Error:", err.message);
                }
            }
        },

        // 5. مشاركة النصوص والتقارير
        shareText: async function (text, title) {
            title = title || "مشاركة تقرير EIDCO";
            if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
                window.AndroidBridge.shareText(text);
            } else if (navigator.share) {
                try {
                    await navigator.share({ title: title, text: text });
                } catch (e) {
                    console.log("[EIDCO Bridge] Share canceled or failed");
                }
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                this.showToast("✓ تم نسخ النص إلى الحافظة بنجاح");
            } else {
                alert(text);
            }
        },

        // 6. تنزيل التقارير والملفات
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
                this.showToast(`✓ جاري تحميل الملف: ${filename}`);
            }
        },

        // 7. تسجيل الدخول الآمن عبر Google Identity Services
        launchNativeGoogleSignIn: function () {
            if (window.AndroidBridge && typeof window.AndroidBridge.launchNativeGoogleSignIn === 'function') {
                window.AndroidBridge.launchNativeGoogleSignIn();
            } else if (window.google?.accounts?.id) {
                window.google.accounts.id.prompt();
            } else {
                this.showToast("⚠️ خدمة Google Identity غير جاهزة حالياً");
            }
        }
    };

    // توحيد المسميات عبر كافة الواجهات والملفات
    window.CapacitorBridge = BridgeCore;
    window.NativeBridge = BridgeCore;

    // إعادة تفعيل منع النوم عند العودة للصحفة في المتصفح
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            BridgeCore.keepScreenOn(true);
        }
    });

    // التهيئة التلقائية
    function initBridge() {
        BridgeCore.keepScreenOn(true);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initBridge();
    } else {
        document.addEventListener('DOMContentLoaded', initBridge);
    }
})();
