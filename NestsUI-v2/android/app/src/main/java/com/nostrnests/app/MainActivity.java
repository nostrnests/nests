package com.nostrnests.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge: let web content render behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Configure WebView for audio rooms
        WebSettings settings = getBridge().getWebView().getSettings();
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
    }
}
