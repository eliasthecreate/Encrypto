import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./components/LandingPage";
import { AuthPage } from "./components/AuthPage";
import { Dashboard } from "./components/Dashboard";
import { RequireAuth } from "./components/RequireAuth";
import { WallpaperProvider, WallpaperBackground } from "./lib/wallpaper-context";

export default function App() {
  return (
    <WallpaperProvider>
      <WallpaperBackground />
      <div className="relative z-10 min-h-screen">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </div>
    </WallpaperProvider>
  );
}
