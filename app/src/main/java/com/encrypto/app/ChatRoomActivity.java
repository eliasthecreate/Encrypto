package com.encrypto.app;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.encrypto.app.models.ChatMessage;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.EventListener;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FirebaseFirestoreException;
import com.google.firebase.firestore.QuerySnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.DocumentReference;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class ChatRoomActivity extends AppCompatActivity {

    private String roomName, alias, roomPassword;
    private FirebaseFirestore db;
    private String myParticipantId; // To remove self on destroy
    
    private TextView tvRoomName, tvConnectionStatus, tvUserCount;
    private EditText etMessage;
    private ImageView btnSend, btnBack;
    private RecyclerView rvChatMessages;
    
    private ChatAdapter chatAdapter;
    private List<ChatMessage> messageList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat_room);

        // Get Intent Data
        roomName = getIntent().getStringExtra("ROOM_NAME");
        alias = getIntent().getStringExtra("ALIAS");
        roomPassword = getIntent().getStringExtra("PASSWORD");

        // Firestore Setup
        db = FirebaseFirestore.getInstance();

        initializeViews();
        setupRecycler();
        setupListeners();
        checkUserCountAndJoin();
    }

    private void initializeViews() {
        tvRoomName = findViewById(R.id.tvRoomName);
        tvConnectionStatus = findViewById(R.id.tvConnectionStatus);
        tvUserCount = findViewById(R.id.tvUserCount);
        etMessage = findViewById(R.id.etMessage);
        btnSend = findViewById(R.id.btnSend);
        btnBack = findViewById(R.id.btnBack);
        rvChatMessages = findViewById(R.id.rvChatMessages);

        tvRoomName.setText("Room: " + roomName);
    }

    private void setupRecycler() {
        messageList = new ArrayList<>();
        chatAdapter = new ChatAdapter(messageList);
        rvChatMessages.setLayoutManager(new LinearLayoutManager(this));
        rvChatMessages.setAdapter(chatAdapter);
    }

    private void setupListeners() {
        btnBack.setOnClickListener(v -> finish());

        btnSend.setOnClickListener(v -> sendMessage());
    }

    private void checkUserCountAndJoin() {
        // Check "participants" subcollection count
        db.collection("rooms").document(roomName).collection("participants")
            .get()
            .addOnSuccessListener(queryDocumentSnapshots -> {
                int count = queryDocumentSnapshots.size();
                if (count >= 10) {
                    Toast.makeText(ChatRoomActivity.this, "Room is full (Max 10)", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    joinPresence();
                    listenForMessages();
                    listenForPresence();
                    tvConnectionStatus.setText("Connected as " + alias);
                }
            })
            .addOnFailureListener(e -> {
                String errorMsg = e.getMessage();
                if (e instanceof com.google.firebase.firestore.FirebaseFirestoreException) {
                    com.google.firebase.firestore.FirebaseFirestoreException fe = (com.google.firebase.firestore.FirebaseFirestoreException) e;
                    if (fe.getCode() == com.google.firebase.firestore.FirebaseFirestoreException.Code.PERMISSION_DENIED) {
                        errorMsg = "Access Denied: Check Firebase Console Rules";
                    }
                }
                Toast.makeText(ChatRoomActivity.this, "Connection failed: " + errorMsg, Toast.LENGTH_LONG).show();
                finish();
            });
    }

    private void joinPresence() {
        Map<String, Object> participant = new HashMap<>();
        participant.put("alias", alias);
        participant.put("timestamp", System.currentTimeMillis());

        db.collection("rooms").document(roomName).collection("participants")
            .add(participant)
            .addOnSuccessListener(documentReference -> {
                myParticipantId = documentReference.getId();
            })
            .addOnFailureListener(e -> {
                Toast.makeText(ChatRoomActivity.this, "Failed to join room presence: " + e.getMessage(), Toast.LENGTH_LONG).show();
            });
    }
    
    private void listenForPresence() {
        db.collection("rooms").document(roomName).collection("participants")
            .addSnapshotListener((value, error) -> {
                if (error != null) return;
                if (value != null) {
                    tvUserCount.setText(value.size() + "/10");
                }
            });
    }

    private void listenForMessages() {
        db.collection("rooms").document(roomName).collection("messages")
            .orderBy("timestamp", Query.Direction.ASCENDING)
            .addSnapshotListener(new EventListener<QuerySnapshot>() {
                @Override
                public void onEvent(@Nullable QuerySnapshot value, @Nullable FirebaseFirestoreException error) {
                    if (error != null) {
                        Toast.makeText(ChatRoomActivity.this, "Error loading messages", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    
                    if (value != null) {
                        messageList.clear();
                        for (DocumentSnapshot doc : value.getDocuments()) {
                            ChatMessage msg = doc.toObject(ChatMessage.class);
                            if (msg != null) {
                                messageList.add(msg);
                            }
                        }
                        chatAdapter.notifyDataSetChanged();
                        if (!messageList.isEmpty()) {
                            rvChatMessages.scrollToPosition(messageList.size() - 1);
                        }
                    }
                }
            });
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (TextUtils.isEmpty(text)) return;

        try {
            // ENCRYPT THE MESSAGE WITH ROOM PASSWORD
            String encryptedText = CryptoUtils.encrypt(text, roomPassword);
            
            ChatMessage message = new ChatMessage(alias, encryptedText, System.currentTimeMillis());
            
            db.collection("rooms").document(roomName).collection("messages")
                .add(message)
                .addOnSuccessListener(documentReference -> {
                     // Only clear input if successful
                     etMessage.setText(""); 
                })
                .addOnFailureListener(e -> Toast.makeText(this, "Failed to send: " + e.getMessage(), Toast.LENGTH_LONG).show());
            
        } catch (Exception e) {
            Toast.makeText(this, "Encryption Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Remove self from presence if we have an ID
        if (myParticipantId != null) {
            db.collection("rooms").document(roomName).collection("participants")
                .document(myParticipantId)
                .delete();
        }
    }

    // --- Inner Adapter Class ---
    private class ChatAdapter extends RecyclerView.Adapter<ChatAdapter.ChatViewHolder> {

        private List<ChatMessage> messages;

        public ChatAdapter(List<ChatMessage> messages) {
            this.messages = messages;
        }

        @NonNull
        @Override
        public ChatViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_message, parent, false);
            return new ChatViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull ChatViewHolder holder, int position) {
            ChatMessage msg = messages.get(position);
            holder.tvSender.setText(msg.senderAlias);
            
            SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
            holder.tvTimestamp.setText(sdf.format(new Date(msg.timestamp)));

            // DEFAULT: Show Encrypted Content
            holder.tvMessage.setText(msg.encryptedContent);
            holder.btnDecrypt.setVisibility(View.VISIBLE);
            holder.btnDecrypt.setText("Tap to Decrypt");

            // ON CLICK: Decrypt
            holder.btnDecrypt.setOnClickListener(v -> {
                try {
                    String decryptedText = CryptoUtils.decrypt(msg.encryptedContent, roomPassword);
                    holder.tvMessage.setText(decryptedText);
                    holder.btnDecrypt.setVisibility(View.GONE); // Hide button after decrypting
                } catch (Exception e) {
                    Toast.makeText(ChatRoomActivity.this, "Decryption Failed", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @Override
        public int getItemCount() {
            return messages.size();
        }

        class ChatViewHolder extends RecyclerView.ViewHolder {
            TextView tvSender, tvMessage, tvTimestamp, btnDecrypt;

            public ChatViewHolder(@NonNull View itemView) {
                super(itemView);
                tvSender = itemView.findViewById(R.id.tvSender);
                tvMessage = itemView.findViewById(R.id.tvMessage);
                tvTimestamp = itemView.findViewById(R.id.tvTimestamp);
                btnDecrypt = itemView.findViewById(R.id.btnDecrypt);
            }
        }
    }
}
