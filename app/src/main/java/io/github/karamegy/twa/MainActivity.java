package io.github.karamegy.twa;

import android.Manifest;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "GoogleSignIn_MainActivity";
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final int PERMISSION_REQUEST_CODE = 2002;
    private static final int RC_SIGN_IN = 9001;

    private GoogleSignInClient mGoogleSignInClient;
    
    // تم تصحيح المعرف هنا ليصبح Web Client ID الصحيح بدلاً من معرف الأندرويد
    private static final String GOOGLE_WEB_CLIENT_ID = "515898424721-86pclcejrec62gn34st41qdp6rj5j9vt.apps.googleusercontent.com";

    private String pendingGeolocationOrigin;
    private GeolocationPermissions.Callback pendingGeolocationCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // تهيئة إعدادات Google Sign In باستخدام الـ Web Client ID الصحيح
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(GOOGLE_WEB_CLIENT_ID)
                .requestEmail()
                .build();
        mGoogleSignInClient = GoogleSignIn.getClient(this, gso);

        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setDatabaseEnabled(true);
            settings.setGeolocationEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            webView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                    if (hasLocationPermission()) {
                        callback.invoke(origin, true, false);
                    } else {
                        pendingGeolocationOrigin = origin;
                        pendingGeolocationCallback = callback;
                        ActivityCompat.requestPermissions(
                                MainActivity.this,
                                new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                                PERMISSION_REQUEST_CODE
                        );
                    }
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (MainActivity.this.filePathCallback != null) {
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                    }
                    MainActivity.this.filePathCallback = filePathCallback;

                    Intent intent = fileChooserParams.createIntent();
                    try {
                        startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                    } catch (Exception e) {
                        MainActivity.this.filePathCallback = null;
                        Toast.makeText(MainActivity.this, "تعذر فتح مستعرض الملفات", Toast.LENGTH_SHORT).show();
                        return false;
                    }
                    return true;
                }
            });
        }

        requestAppPermissions();
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> permissions = new ArrayList<>();
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
            permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            permissions.add(Manifest.permission.CAMERA);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
                permissions.add(Manifest.permission.READ_MEDIA_VIDEO);
            } else {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                    permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
                }
            }

            List<String> listPermissionsNeeded = new ArrayList<>();
            for (String perm : permissions) {
                if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                    listPermissionsNeeded.add(perm);
                }
            }

            if (!listPermissionsNeeded.isEmpty()) {
                ActivityCompat.requestPermissions(this, listPermissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (pendingGeolocationCallback != null && pendingGeolocationOrigin != null) {
                boolean granted = hasLocationPermission();
                pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
                pendingGeolocationCallback = null;
                pendingGeolocationOrigin = null;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;

            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                } else if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }

            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }

        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null && account.getIdToken() != null) {
                    final String idToken = account.getIdToken();
                    Log.d(TAG, "Google Sign-In Success. Token length: " + idToken.length());

                    runOnUiThread(() -> {
                        WebView webView = bridge.getWebView();
                        if (webView != null) {
                            String jsCode = "if (typeof window.onNativeGoogleSignInSuccess === 'function') { " +
                                            "   window.onNativeGoogleSignInSuccess('" + idToken + "'); " +
                                            "} else if (typeof window.handleGoogleIdToken === 'function') { " +
                                            "   window.handleGoogleIdToken('" + idToken + "'); " +
                                            "} else { " +
                                            "   console.error('No Google ID token handler function defined on window object.'); " +
                                            "}";
                            webView.evaluateJavascript(jsCode, null);
                        } else {
                            Log.e(TAG, "WebView is null, cannot evaluate Javascript");
                        }
                    });
                } else {
                    Log.e(TAG, "Account or ID Token is null");
                }
            } catch (ApiException e) {
                Log.e(TAG, "Google Sign-In Failed. Status Code: " + e.getStatusCode() + " - Message: " + e.getMessage());
                Toast.makeText(this, "فشل تسجيل الدخول بواسطة جوجل (رمز: " + e.getStatusCode() + ")", Toast.LENGTH_SHORT).show();
            }
        }
    }

    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void showToast(String message) {
            Toast.makeText(mContext, message, Toast.LENGTH_SHORT).show();
        }

        @JavascriptInterface
        public void vibrate(long milliseconds) {
            Vibrator v = (Vibrator) mContext.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(milliseconds);
                }
            }
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean keepOn) {
div:
            runOnUiThread(() -> {
                if (keepOn) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        @JavascriptInterface
        public void shareText(String text) {
            Intent sendIntent = new Intent();
            sendIntent.setAction(Intent.ACTION_SEND);
            sendIntent.putExtra(Intent.EXTRA_TEXT, text);
            sendIntent.setType("text/plain");
            Intent shareIntent = Intent.createChooser(sendIntent, "مشاركة تقرير EIDCO");
            mContext.startActivity(shareIntent);
        }

        @JavascriptInterface
        public void launchNativeGoogleSignIn() {
            runOnUiThread(() -> {
                if (mGoogleSignInClient != null) {
                    mGoogleSignInClient.signOut().addOnCompleteListener(MainActivity.this, task -> {
                        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
                        startActivityForResult(signInIntent, RC_SIGN_IN);
                    });
                } else {
                    Log.e(TAG, "mGoogleSignInClient is null during launchNativeGoogleSignIn");
                }
            });
        }

        @JavascriptInterface
        public void downloadFile(String filename, String base64Data) {
            try {
                String cleanBase64 = base64Data;
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                }
                byte[] fileBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                    Uri uri = mContext.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream os = mContext.getContentResolver().openOutputStream(uri)) {
                            if (os != null) {
                                os.write(fileBytes);
                                os.flush();
                            }
                        }
                    }
                } else {
                    File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File file = new File(path, filename);
                    try (FileOutputStream os = new FileOutputStream(file, false)) {
                        os.write(fileBytes);
                        os.flush();
                    }
                }

                Toast.makeText(mContext, "تم حفظ الملف بنجاح في التنزيلات: " + filename, Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                Toast.makeText(mContext, "خطأ أثناء حفظ الملف: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        }
    }
}
