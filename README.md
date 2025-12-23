# Encrypto - Secure Communication & Privacy

Encrypto is a modern Android application designed for users who prioritize privacy and data security. Built with industry-standard encryption algorithms and a robust cloud backend, it offers a secure environment for messaging and data protection.

## ✨ Features

- **🛡️ Secure Chat Rooms**: Create or join password-protected chat rooms. 
    - **End-to-End Encryption**: Messages are encrypted using the room password before being sent to the server.
    - **Privacy First**: Even the server cannot read your messages without the specific room password.
- **🔐 Advanced Crypto Tools**:
    - **Encryption/Decryption**: Secure your sensitive text using **Argon2id** (for key derivation) and **AES-256-GCM** (for authenticated encryption).
    - **Hashing**: Generate cryptographically secure hashes using **SHA-256**.
- **👥 User Authentication**: Secure login and sign-up powered by **Firebase Authentication**.
- **🛰️ Real-time Synchronization**: Instant message delivery and participant presence monitoring using **Firebase Firestore**.
- **🎨 Modern UI/UX**: Professional, dark-themed interface with smooth transitions and intuitive navigation.

## 🛠️ Tech Stack

- **Platform**: Android (Min SDK 23, Target SDK 35)
- **Language**: Java
- **Backend & Database**: Firebase (Auth, Firestore, Realtime Database)
- **Security Library**: [Bouncy Castle](https://www.bouncycastle.org/) (Argon2id implementation)
- **Architecture**: Activity-based with standardized `CryptoUtils` for security logic.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

- **Android Studio** (Koala or newer recommended)
- **JDK 17** or higher
- A **Firebase Project** (Free tier/Spark plan is sufficient)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/Encrypto.git
   cd Encrypto
   ```

2. **Firebase Configuration**:
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Add a new Android Project with package name `com.encrypto.app`.
   - Download the `google-services.json` file.
   - Place `google-services.json` inside the `app/` directory.

3. **Enable Firebase Services**:
   - Enable **Email/Password** authentication in the Firebase Auth tab.
   - Initialize **Cloud Firestore** in test mode (or setup rules for production).
   - Create a Firestore collection named `rooms`.

4. **Build the Project**:
   - Open the project in Android Studio.
   - Sync the project with Gradle files.
   - Run the application on an emulator or a physical device.

## 🔒 Security Implementation Details

Encrypto uses a high-security standard for data protection:
- **Key Derivation**: We use **Argon2id** (v13) with 4 iterations, 64MB memory, and a 128-bit random salt. This makes brute-force attacks extremely difficult even on powerful hardware.
- **Encryption**: Data is encrypted using **AES-256 in GCM (Galois/Counter Mode)**. This provides both confidentiality and authenticity, ensuring that encrypted data hasn't been tampered with.
- **Hashing**: **SHA-256** is used for generating message digests and fingerprints.

## 📖 How to Use

1. **Sign Up/Login**: Create an account to access the main features.
2. **Crypto Tabs**:
   - **Encrypt**: Enter text and a password. This generates a Base64 string containing the salt, nonce, and ciphertext.
   - **Decrypt**: Paste the Base64 string and enter the correct password to retrieve the original message.
   - **Hash**: Quickly generate SHA-256 hashes of any input.
3. **Secure Chat**:
   - Click "Join Chat" on the dashboard.
   - Enter a Room Name, an Alias, and a Room Password.
   - Only people with the exact Room Password can decrypt your messages in that room.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
