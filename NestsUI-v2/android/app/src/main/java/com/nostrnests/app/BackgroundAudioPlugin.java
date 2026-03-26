package com.nostrnests.app;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin to start/stop the BackgroundAudioService foreground service.
 * This keeps the app process alive when backgrounded so WebView audio continues.
 */
@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String roomTitle = call.getString("roomTitle", "Audio Room");

        Intent intent = new Intent(getContext(), BackgroundAudioService.class);
        intent.putExtra("roomTitle", roomTitle);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundAudioService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
