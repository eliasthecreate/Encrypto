# CampusConnectICU Hybrid App Setup

This guide shows how to run CampusConnectICU as both a web app and an Android app using a single React codebase.

## Architecture

The app uses a hybrid architecture:
- **React Web App**: Frontend built with React, Vite, and TailwindCSS
- **Android App**: Native Android app that loads the React web app using WebView
- **Shared Codebase**: The React app serves both the web and Android interfaces

## Running as Web App

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Steps

1. **Navigate to the web directory:**
```bash
cd web
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open in browser:**
- The app will be available at `http://localhost:5173`
- Open this URL in your browser to use the web app

## Running as Android App

### Prerequisites
- Android Studio
- Android SDK (API 24+)
- Node.js (v16 or higher)
- npm or yarn

### Steps

1. **Start the React development server:**
```bash
cd web
npm install
npm run dev
```

2. **Open the project in Android Studio:**
- Open Android Studio
- Select "Open an Existing Project"
- Navigate to `c:\Users\Elias\AndroidStudioProjects\CampusConnectICU`
- Click "OK"

3. **Configure the emulator or device:**
- Create an Android emulator (API 24+) or connect a physical device
- Enable developer mode on your device if using physical device

4. **Run the app:**
- In Android Studio, click the "Run" button (green triangle)
- Select your emulator or device
- The app will launch and load the React web app

### Important Notes

- The Android app loads the React app from `http://10.0.2.2:5173` (emulator's localhost)
- The React dev server must be running before launching the Android app
- The Vite server is configured to accept network connections (`host: '0.0.0.0'`)

## Production Deployment

### Web App

1. **Build the React app:**
```bash
cd web
npm run build
```

2. **Deploy the `dist` folder** to your web server (Netlify, Vercel, AWS, etc.)

### Android App

For production, you have two options:

#### Option 1: Load from Hosted URL
1. Build and deploy the React web app to a server
2. Update `MainActivity.kt`:
```kotlin
webView.loadUrl("https://your-domain.com") // Your hosted URL
```
3. Build the Android APK in Android Studio

#### Option 2: Bundle React App in Android
1. Build the React app:
```bash
cd web
npm run build
```

2. Copy the `dist` folder contents to Android assets:
```bash
mkdir -p app/src/main/assets/web
cp -r web/dist/* app/src/main/assets/web/
```

3. Update `MainActivity.kt`:
```kotlin
webView.loadUrl("file:///android_asset/web/index.html")
```

4. Build the Android APK in Android Studio

## Development Workflow

### Web Development
1. Make changes to React code in `web/src/`
2. Changes hot-reload automatically in the browser
3. Test at `http://localhost:5173`

### Android Development
1. Make changes to React code in `web/src/`
2. Changes hot-reload automatically
3. Test in Android app (reload the WebView if needed)
4. For Android-specific changes, modify `app/src/main/`

## Project Structure

```
CampusConnectICU/
├── web/                          # React web app
│   ├── src/
│   │   ├── pages/               # React pages (Login, Home, etc.)
│   │   ├── App.jsx              # Main React app
│   │   └── main.jsx             # Entry point
│   ├── package.json             # React dependencies
│   └── vite.config.js           # Vite configuration
├── app/                          # Android app
│   ├── src/main/
│   │   ├── java/.../MainActivity.kt  # WebView integration
│   │   └── AndroidManifest.xml       # App permissions
│   └── build.gradle.kts         # Android dependencies
└── HYBRID_SETUP.md              # This file
```

## Troubleshooting

### Android app shows blank screen
- Ensure the React dev server is running (`npm run dev`)
- Check that the server is accessible at `http://10.0.2.2:5173`
- Verify internet permission is in AndroidManifest.xml

### React changes not reflecting in Android app
- The WebView may need to be refreshed
- Try clearing the app cache in Android settings
- Ensure the dev server is running with `host: '0.0.0.0'`

### Network errors in Android app
- Check that your firewall allows connections to port 5173
- Verify the emulator can access your machine's network
- Try using your machine's IP address instead of `10.0.2.2`

## Features

Both the web and Android versions include:
- User authentication (login/signup)
- User profiles with editing
- Search for friends
- Real-time messaging
- Posts and feed
- Media sharing (photos, videos)

## Next Steps

- Set up backend API integration
- Implement real-time messaging with WebSocket
- Add push notifications for Android
- Implement image upload and storage
- Add offline support with service workers
