package com.encrypto.app;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class ChatSetupActivity extends AppCompatActivity {

    private EditText etRoomName, etAlias, etRoomPassword;
    private Button btnJoinRoom;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat_setup);

        etRoomName = findViewById(R.id.etRoomName);
        etAlias = findViewById(R.id.etAlias);
        etRoomPassword = findViewById(R.id.etRoomPassword);
        btnJoinRoom = findViewById(R.id.btnJoinRoom);
        
        android.widget.ImageView btnSuggestAlias = findViewById(R.id.btnSuggestAlias);
        btnSuggestAlias.setOnClickListener(v -> suggestAlias());
        
        android.widget.ImageView btnBack = findViewById(R.id.btnBack);
        btnBack.setOnClickListener(v -> finish());

        btnJoinRoom.setOnClickListener(v -> joinRoom());
    }
    
    private void suggestAlias() {
        String[] adjectives = {"Silent", "Shadow", "Rapid", "Golden", "Iron", "Phantom", "Cyber", "Night", "Rogue", "Neon"};
        String[] nouns = {"Wolf", "Eagle", "Ghost", "Viper", "Falcon", "Hawk", "Dragon", "Fox", "Tiger", "Raven"};
        
        int randAdj = (int) (Math.random() * adjectives.length);
        int randNoun = (int) (Math.random() * nouns.length);
        
        String randomAlias = adjectives[randAdj] + nouns[randNoun] + ((int)(Math.random() * 99));
        etAlias.setText(randomAlias);
        etAlias.setSelection(randomAlias.length());
    }

    private void joinRoom() {
        String roomNameRaw = etRoomName.getText().toString().trim();
        // Sanitize room name for Firestore path (no forward slashes)
        String roomName = roomNameRaw.replaceAll("/", "_");
        
        String alias = etAlias.getText().toString().trim();
        String password = etRoomPassword.getText().toString();

        if (TextUtils.isEmpty(roomName) || TextUtils.isEmpty(alias) || TextUtils.isEmpty(password)) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // In a real production app, checking user count synchronously before joining might be better,
        // but for now we proceed and let ChatRoomActivity handle the enforcing or just checking.
        // We will pass the credentials to the next Activity.

        Intent intent = new Intent(ChatSetupActivity.this, ChatRoomActivity.class);
        intent.putExtra("ROOM_NAME", roomName);
        intent.putExtra("ALIAS", alias);
        intent.putExtra("PASSWORD", password);
        startActivity(intent);
    }
}
