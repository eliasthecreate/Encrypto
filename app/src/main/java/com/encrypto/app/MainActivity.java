package com.encrypto.app;

import android.animation.LayoutTransition;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

public class MainActivity extends AppCompatActivity {
    private FirebaseAuth mAuth;

    private enum Mode {
        ENCRYPT, DECRYPT, HASH
    }

    private Mode currentMode = Mode.ENCRYPT;
    private boolean isPasswordVisible = false;

    // UI Components
    private TextView tabEncrypt, tabDecrypt, tabHash;
    private TextView tvInputLabel, tvPasswordLabel, tvOutputLabel;
    private EditText etInput, etPassword, etOutput;
    private Button btnProcess, btnClear;
    private ImageView btnCopy, btnPaste, btnTogglePassword;
    private LinearLayout layoutOutput;
    private TextView btnLogout;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mAuth = FirebaseAuth.getInstance();

        initializeViews();
        setupListeners();
        updateUIState(); // Set initial state
    }

    private void initializeViews() {
        tabEncrypt = findViewById(R.id.tabEncrypt);
        tabDecrypt = findViewById(R.id.tabDecrypt);
        tabHash = findViewById(R.id.tabHash);

        tvInputLabel = findViewById(R.id.tvInputLabel);
        tvPasswordLabel = findViewById(R.id.tvPasswordLabel);
        tvOutputLabel = findViewById(R.id.tvOutputLabel);

        etInput = findViewById(R.id.etInput);
        etPassword = findViewById(R.id.etPassword);
        etOutput = findViewById(R.id.etOutput);

        btnProcess = findViewById(R.id.btnProcess);
        btnClear = findViewById(R.id.btnClear);
        btnCopy = findViewById(R.id.btnCopy);
        
        btnPaste = findViewById(R.id.btnPaste);
        btnTogglePassword = findViewById(R.id.btnTogglePassword);

        btnLogout = findViewById(R.id.btnLogout);
        // btnGuide initialization removed as it is handled locally in setupListeners

        layoutOutput = findViewById(R.id.layoutOutput);
        
        // Enable automatic layout animations for smooth appearing/disappearing
        LinearLayout outputParent = (LinearLayout) layoutOutput.getParent();
        if (outputParent.getLayoutTransition() == null) {
            outputParent.setLayoutTransition(new LayoutTransition());
        }
        outputParent.getLayoutTransition().enableTransitionType(LayoutTransition.CHANGING);
    }

    private void setupListeners() {
        // Tab Switching
        tabEncrypt.setOnClickListener(v -> switchMode(Mode.ENCRYPT));
        tabDecrypt.setOnClickListener(v -> switchMode(Mode.DECRYPT));
        tabHash.setOnClickListener(v -> switchMode(Mode.HASH));

        // Process Button
        btnProcess.setOnClickListener(v -> handleProcess());

        // Clear Button
        btnClear.setOnClickListener(v -> {
            etInput.setText("");
            etPassword.setText("");
            etOutput.setText("");
            layoutOutput.setVisibility(View.GONE);
        });

        // Copy Button
        // Using Lock icon as copy button is a placeholder, but functional
        btnCopy.setOnClickListener(v -> {
            String text = etOutput.getText().toString();
            if (!TextUtils.isEmpty(text)) {
                copyToClipboard(text);
            }
        });
        
        // Paste Button
        btnPaste.setOnClickListener(v -> {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard.hasPrimaryClip() && clipboard.getPrimaryClip().getItemCount() > 0) {
                CharSequence pasteData = clipboard.getPrimaryClip().getItemAt(0).getText();
                etInput.setText(pasteData);
                etInput.setSelection(etInput.getText().length()); // Move cursor to end
            } else {
                Toast.makeText(this, "Clipboard is empty", Toast.LENGTH_SHORT).show();
            }
        });

        // Password Toggle
        btnTogglePassword.setOnClickListener(v -> togglePasswordVisibility());

        // Text Watchers to clear stale results
        TextWatcher clearResultWatcher = new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (layoutOutput.getVisibility() == View.VISIBLE) {
                    layoutOutput.setVisibility(View.GONE);
                }
            }
            
            @Override
            public void afterTextChanged(Editable s) {}
        };
        etInput.addTextChangedListener(clearResultWatcher);
        etPassword.addTextChangedListener(clearResultWatcher);

        // Logout
        btnLogout.setOnClickListener(v -> {
            mAuth.signOut();
            startActivity(new Intent(MainActivity.this, LoginActivity.class));
            finish();
        });
        
        // Join Chat Button
        Button btnJoinChat = findViewById(R.id.btnJoinChat);
        btnJoinChat.setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, ChatSetupActivity.class));
        });
        
        // Guide Button
        ImageView btnGuide = findViewById(R.id.btnGuide);
        btnGuide.setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, GuideActivity.class));
        });
    }

    private void togglePasswordVisibility() {
        isPasswordVisible = !isPasswordVisible;
        if (isPasswordVisible) {
            etPassword.setInputType(InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
            btnTogglePassword.setImageResource(R.drawable.ic_eye_off);
        } else {
            etPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            btnTogglePassword.setImageResource(R.drawable.ic_eye);
        }
        // Move cursor to end
        etPassword.setSelection(etPassword.getText().length());
    }

    private void switchMode(Mode mode) {
        if (currentMode == mode) return; // No change
        
        currentMode = mode;
        etOutput.setText("");
        layoutOutput.setVisibility(View.GONE);
        updateUIState();
    }

    private void updateUIState() {
        // Reset Tabs
        resetTabStyle(tabEncrypt);
        resetTabStyle(tabDecrypt);
        resetTabStyle(tabHash);

        // Highlight Active Tab and Update Labels
        switch (currentMode) {
            case ENCRYPT:
                highlightTab(tabEncrypt);
                tvInputLabel.setText("Message to Encrypt");
                etInput.setHint("Enter your message here...");
                tvPasswordLabel.setVisibility(View.VISIBLE);
                etPassword.setVisibility(View.VISIBLE);
                // Also toggle password visibility icon container if we wrapped it? 
                // Currently layout struct is: Label -> RelativeLayout(EditText+Icon).
                // We need to hide the PARENT of the EditText to hide the icon too.
                // Quick fix: View parent = (View) etPassword.getParent(); parent.setVisibility(View.VISIBLE);
                ((View)etPassword.getParent()).setVisibility(View.VISIBLE);
                
                btnProcess.setText("Encrypt");
                tvOutputLabel.setText("Encrypted Result");
                break;

            case DECRYPT:
                highlightTab(tabDecrypt);
                tvInputLabel.setText("Encrypted Message");
                etInput.setHint("Paste encrypted text here...");
                tvPasswordLabel.setVisibility(View.VISIBLE);
                // etPassword.setVisibility(View.VISIBLE);
                ((View)etPassword.getParent()).setVisibility(View.VISIBLE);
                
                btnProcess.setText("Decrypt");
                tvOutputLabel.setText("Decrypted Message");
                break;

            case HASH:
                highlightTab(tabHash);
                tvInputLabel.setText("Text to Hash");
                etInput.setHint("Enter text...");
                tvPasswordLabel.setVisibility(View.GONE);
                // etPassword.setVisibility(View.GONE);
                ((View)etPassword.getParent()).setVisibility(View.GONE);
                
                btnProcess.setText("Generate Hash");
                tvOutputLabel.setText("Hash Result (SHA-256)");
                break;
        }
    }

    private void resetTabStyle(TextView tab) {
        tab.setBackground(null);
        tab.setTextColor(ContextCompat.getColor(this, R.color.purple_200));
    }

    private void highlightTab(TextView tab) {
        tab.setBackgroundResource(R.drawable.bg_tab_selected);
        tab.setTextColor(Color.WHITE);
    }

    private void handleProcess() {
        String input = etInput.getText().toString().trim();
        String password = etPassword.getText().toString();

        if (TextUtils.isEmpty(input)) {
            Toast.makeText(this, "Please enter input text", Toast.LENGTH_SHORT).show();
            return;
        }

        if (currentMode != Mode.HASH && TextUtils.isEmpty(password)) {
            Toast.makeText(this, "Please enter a password", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            String result = "";
            switch (currentMode) {
                case ENCRYPT:
                    result = CryptoUtils.encrypt(input, password);
                    break;
                case DECRYPT:
                    result = CryptoUtils.decrypt(input, password);
                    break;
                case HASH:
                    result = CryptoUtils.hash(input, "SHA-256");
                    break;
            }
            displayResult(result);
        } catch (Exception e) {
            Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            etOutput.setText("");
            layoutOutput.setVisibility(View.GONE);
        }
    }

    private void displayResult(String result) {
        etOutput.setText(result);
        
        // Simple fade in animation if not visible
        if (layoutOutput.getVisibility() != View.VISIBLE) {
            layoutOutput.setAlpha(0f);
            layoutOutput.setVisibility(View.VISIBLE);
            layoutOutput.animate().alpha(1f).setDuration(300).start();
        }
    }

    private void copyToClipboard(String text) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newPlainText("Copied Text", text);
        clipboard.setPrimaryClip(clip);
        Toast.makeText(this, "Copied to clipboard", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onStart() {
        super.onStart();
        FirebaseUser currentUser = mAuth.getCurrentUser();
        if (currentUser == null) {
            startActivity(new Intent(MainActivity.this, LoginActivity.class));
            finish();
        }
    }
}
