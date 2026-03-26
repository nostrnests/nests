package com.nostrnests.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the background audio plugin before super.onCreate
        registerPlugin(BackgroundAudioPlugin.class);

        super.onCreate(savedInstanceState);

        // Edge-to-edge: let web content render behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Configure WebView for audio rooms
        WebSettings settings = getBridge().getWebView().getSettings();
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
    }
}
