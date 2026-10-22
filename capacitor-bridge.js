// ==========================================
// Capacitor Native Bridge Integration
// ==========================================
const isCapacitorNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();

function initCapacitorBridge() {
  if (isCapacitorNative) {
    console.log("Capacitor Native Bridge Connected Successfully.");
    
    // التعامل مع زر الرجوع الخلفي للاندرويد
    if (window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
        const activeModals = document.querySelectorAll('.modal:not(.hidden)');
        if (activeModals.length > 0) {
          activeModals.forEach(modal => modal.classList.add('hidden'));
        } else if (canGoBack) {
          window.history.back();
        } else {
          window.Capacitor.Plugins.App.exitApp();
        }
      });
    }

    // إخفاء شاشة البدء (SplashScreen) عند تجهيز التطبيق
    if (window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
      setTimeout(() => {
        window.Capacitor.Plugins.SplashScreen.hide();
      }, 500);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCapacitorBridge);
} else {
  initCapacitorBridge();
}
