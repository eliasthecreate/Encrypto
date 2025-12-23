package com.encrypto.app;

import android.app.Application;
import com.google.firebase.FirebaseApp;

public class EncryptionApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize Firebase
        FirebaseApp.initializeApp(this);
    }
}
