# Firebase Setup Guide for CampusConnectICU

This guide will help you set up Firebase Firestore as the backend for CampusConnectICU.

## Prerequisites

- A Google account
- Firebase project created in the Firebase Console

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "campus-connect-icu")
4. Follow the setup wizard (you can disable Google Analytics for now)
5. Click "Create project"

## Step 2: Enable Authentication

1. In the Firebase Console, go to your project
2. Click "Build" → "Authentication" in the left sidebar
3. Click "Get Started"
4. Select "Email/Password" sign-in method
5. Enable it and click "Save"

## Step 3: Set up Firestore Database

1. In the Firebase Console, click "Build" → "Firestore Database"
2. Click "Create database"
3. Select a location (choose closest to your users)
4. Choose "Start in Test Mode" for development
5. Click "Create"

## Step 4: Get Firebase Configuration

1. In the Firebase Console, click the gear icon (Project Settings)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register the app (name it "CampusConnect Web")
5. Copy the firebaseConfig object

## Step 5: Update Firebase Configuration

1. Open `web/src/firebase/firebaseConfig.js`
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

## Step 6: Install Dependencies

Run the following command in the `web` directory:

```bash
npm install
```

This will install the Firebase SDK.

## Step 7: Configure Firestore Security Rules

For development, you can use test mode rules. For production, update the rules in Firebase Console → Firestore Database → Rules.

**Development Rules (Test Mode):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Production Rules (Recommended):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read posts, only authenticated users can write
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Conversations: participants can read/write
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // Messages within conversations
      match /messages/{messageId} {
        allow read, write: if request.auth != null && 
          request.auth.uid in resource.parent.data.participants;
      }
    }
  }
}
```

## Firestore Database Structure

The app uses the following collections:

### users
- Document ID: User UID
- Fields:
  - `uid`: string (User's Firebase UID)
  - `email`: string
  - `fullName`: string
  - `studentNumber`: string
  - `phoneNumber`: string
  - `department`: string
  - `yearOfStudy`: string
  - `age`: string
  - `bio`: string
  - `skills`: array of strings
  - `avatar`: string (initials or image URL)
  - `createdAt`: timestamp
  - `updatedAt`: timestamp

### posts
- Document ID: Auto-generated
- Fields:
  - `userId`: string (Author's UID)
  - `userName`: string
  - `userAvatar`: string
  - `content`: string
  - `media`: string (URL to image/video, optional)
  - `likes`: array of strings (user UIDs who liked)
  - `comments`: number
  - `createdAt`: timestamp

### conversations
- Document ID: Auto-generated
- Fields:
  - `participants`: array of strings (user UIDs)
  - `lastMessage`: string
  - `lastMessageTime`: timestamp
  - `createdAt`: timestamp
  - `updatedAt`: timestamp

### conversations/{conversationId}/messages
- Document ID: Auto-generated
- Fields:
  - `senderId`: string
  - `text`: string
  - `media`: string (URL to image/video, optional)
  - `createdAt`: timestamp

## Firebase Functions Available

### Authentication (`src/firebase/auth.js`)
- `registerUser(email, password, userData)` - Register new user
- `loginUser(email, password)` - Login user
- `logoutUser()` - Logout user
- `getCurrentUser()` - Get current authenticated user
- `onAuthStateChange(callback)` - Listen to auth state changes
- `getUserData(uid)` - Get user data from Firestore

### Firestore (`src/firebase/firestore.js`)
- `updateUserProfile(uid, profileData)` - Update user profile
- `searchUsers(searchTerm)` - Search users by name
- `getAllUsers()` - Get all users
- `createPost(postData)` - Create a new post
- `getPosts()` - Get all posts
- `likePost(postId, userId)` - Like a post
- `unlikePost(postId, userId)` - Unlike a post
- `sendMessage(conversationId, messageData)` - Send a message
- `getMessages(conversationId, callback)` - Get messages (real-time)
- `getConversations(userId, callback)` - Get user conversations (real-time)
- `createConversation(participantIds)` - Create a new conversation
- `subscribeToPosts(callback)` - Real-time post updates
- `subscribeToUser(uid, callback)` - Real-time user updates

## Testing the Setup

1. Start the development server:
```bash
cd web
npm run dev
```

2. Try registering a new user in the app
3. Check the Firebase Console → Authentication to see the user
4. Check the Firebase Console → Firestore Database to see the user document

## Next Steps

After setting up Firebase, the pages need to be updated to use Firebase instead of mock data:

1. Update Login page to use `loginUser()`
2. Update Signup page to use `registerUser()`
3. Update Home page to use `createPost()` and `getPosts()`
4. Update Profile page to use `updateUserProfile()` and `getUserData()`
5. Update Search page to use `searchUsers()`
6. Update Messages page to use `sendMessage()` and `getMessages()`

## Troubleshooting

**"Firebase: Error (auth/invalid-api-key)"**
- Make sure you've replaced the placeholder values in `firebaseConfig.js`

**"Firebase: Error (auth/email-already-in-use)"**
- This email is already registered. Try logging in instead.

**"Missing or insufficient permissions"**
- Check your Firestore security rules in the Firebase Console

**Network errors**
- Make sure your firewall allows connections to Firebase services
- Check that you have an internet connection

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
