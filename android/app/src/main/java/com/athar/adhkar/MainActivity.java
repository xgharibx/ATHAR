package com.athar.adhkar;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 11C: Install AndroidX SplashScreen compat — required for Android 12+ splash
        //      to transition correctly (prevents black flash and respects postSplashScreenTheme)
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
