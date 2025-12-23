package com.encrypto.app.models;

public class ChatMessage {
    public String senderAlias;
    public String encryptedContent;
    public long timestamp;

    public ChatMessage() {
        // Required for Firebase
    }

    public ChatMessage(String senderAlias, String encryptedContent, long timestamp) {
        this.senderAlias = senderAlias;
        this.encryptedContent = encryptedContent;
        this.timestamp = timestamp;
    }
}
