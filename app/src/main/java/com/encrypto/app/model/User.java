package com.encrypto.app.model;

public class User {
    private String id;
    private String email;
    private String name;
    private int userCount;
    private long createdAt;

    public User() {
        // Required empty constructor for Firestore
    }

    public User(String id, String email, String name) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.userCount = 1; // Initialize with 1 user
        this.createdAt = System.currentTimeMillis();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public int getUserCount() { return userCount; }
    public void setUserCount(int userCount) { this.userCount = userCount; }
    
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
