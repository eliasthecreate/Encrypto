import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";

interface WallpaperContextType {
  /** Data-URL or HTTP URL of the current wallpaper image (null = default) */
  wallpaperUrl: string | null;
  /** 0 = full dim overlay, 100 = no overlay (bright) */
  brightness: number;
  setWallpaper: (url: string | null) => void;
  setBrightness: (b: number) => void;
  resetWallpaper: () => void;
}

const WallpaperContext = createContext<WallpaperContextType | null>(null);

/** Per-user localStorage keys — namespaced so each account gets its own wallpaper */
function getUserKeys(userId: string | null) {
  const prefix = userId
    ? `campus-connect-wallpaper-${userId}`
    : "campus-connect-wallpaper-guest";
  return {
    URL_KEY: `${prefix}-url`,
    BRIGHT_KEY: `${prefix}-brightness`,
  };
}

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Read initial value from user-scoped keys
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const keys = getUserKeys(null); // guest keys on first render
    return localStorage.getItem(keys.URL_KEY);
  });

  const [brightness, setBrightnessState] = useState<number>(() => {
    if (typeof window === "undefined") return 70;
    const keys = getUserKeys(null);
    const stored = localStorage.getItem(keys.BRIGHT_KEY);
    return stored !== null ? Number(stored) : 70;
  });

  // When userId changes (login/logout/switch account), reload wallpaper for that user
  useEffect(() => {
    const keys = getUserKeys(userId);
    let storedUrl = localStorage.getItem(keys.URL_KEY);
    let storedBrightness = localStorage.getItem(keys.BRIGHT_KEY);

    // One-time migration: if user has no user-specific wallpaper yet,
    // inherit from the old global shared key
    if (userId && storedUrl === null) {
      const oldUrl = localStorage.getItem("campus-connect-wallpaper-url");
      const oldBrightness = localStorage.getItem("campus-connect-wallpaper-brightness");
      if (oldUrl) {
        localStorage.setItem(keys.URL_KEY, oldUrl);
        storedUrl = oldUrl;
      }
      if (oldBrightness) {
        localStorage.setItem(keys.BRIGHT_KEY, oldBrightness);
        storedBrightness = oldBrightness;
      }
    }

    setWallpaperUrl(storedUrl);
    setBrightnessState(storedBrightness !== null ? Number(storedBrightness) : 70);
  }, [userId]);

  // Persist to user-scoped keys whenever values change
  useEffect(() => {
    const keys = getUserKeys(userId);
    if (wallpaperUrl) {
      localStorage.setItem(keys.URL_KEY, wallpaperUrl);
    } else {
      localStorage.removeItem(keys.URL_KEY);
    }
  }, [wallpaperUrl, userId]);

  useEffect(() => {
    const keys = getUserKeys(userId);
    localStorage.setItem(keys.BRIGHT_KEY, String(brightness));
  }, [brightness, userId]);

  const setWallpaper = useCallback((url: string | null) => {
    setWallpaperUrl(url);
  }, []);

  const setBrightness = useCallback((b: number) => {
    setBrightnessState(b);
  }, []);

  const resetWallpaper = useCallback(() => {
    setWallpaperUrl(null);
    setBrightnessState(70);
    const keys = getUserKeys(userId);
    localStorage.removeItem(keys.URL_KEY);
    localStorage.removeItem(keys.BRIGHT_KEY);
  }, [userId]);

  return (
    <WallpaperContext.Provider
      value={{ wallpaperUrl, brightness, setWallpaper, setBrightness, resetWallpaper }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper(): WallpaperContextType {
  const ctx = useContext(WallpaperContext);
  if (!ctx) {
    throw new Error("useWallpaper must be used within a WallpaperProvider");
  }
  return ctx;
}

/* ─── Global background layer ─────────────────────────────────────────── */

export function WallpaperBackground() {
  const { wallpaperUrl, brightness } = useWallpaper();

  if (!wallpaperUrl) return null;

  // dim-overlay opacity: 100 brightness = 0% overlay, 0 brightness = 70% overlay
  const overlayOpacity = ((100 - brightness) / 100) * 0.7;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ contain: "layout" }}
    >
      {/* The image — center-crop to fill the screen */}
      <img
        src={wallpaperUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* Dim overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />
    </div>
  );
}
