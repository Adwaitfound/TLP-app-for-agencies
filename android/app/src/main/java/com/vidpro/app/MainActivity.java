package com.vidpro.app;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Prevent WebView from drawing under the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        // Match status bar to app background to avoid visual overlap tint
        int statusColor = Color.parseColor("#050506");
        getWindow().setStatusBarColor(statusColor);
        // Add top padding equal to status bar height so WebView content starts below it
        int statusBarHeight = 0;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            statusBarHeight = getResources().getDimensionPixelSize(resourceId);
        }
        getWindow().getDecorView().setPadding(0, statusBarHeight, 0, 0);
    }
}
