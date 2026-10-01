import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import {
  X,
  LogOut,
  Shield,
  Bell,
  Moon,
  Sun,
  HelpCircle,
  Palette,
  Image as ImageIcon,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useWallpaper } from "@/lib/wallpaper-context";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/** Resize an image file to max 1200px wide so localStorage doesn't blow up */
function resizeImage(file: File, maxDim = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h / w) * maxDim);
            w = maxDim;
          } else {
            w = Math.round((w / h) * maxDim);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { wallpaperUrl, brightness, setWallpaper, setBrightness, resetWallpaper } =
    useWallpaper();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setPicking(true);
      try {
        const dataUrl = await resizeImage(file);
        setWallpaper(dataUrl);
        toast.success("Wallpaper applied!");
      } catch {
        toast.error("Failed to process image");
      } finally {
        setPicking(false);
        // Reset so re-selecting the same file still triggers onChange
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [setWallpaper]
  );

  const handleRemove = () => {
    resetWallpaper();
    toast.success("Wallpaper removed");
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    onClose();
    navigate("/");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-50 w-full max-w-sm mx-4 bg-[#13132a] rounded-2xl shadow-2xl border border-white/[0.07] overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/[0.07]">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-white/[0.07] flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {/* ─── App Appearance / Custom Wallpaper ─── */}
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Palette className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-white">App Appearance</span>
                </div>

                {/* Preview thumbnail */}
                <div className="mx-3 mb-3">
                  <div className="relative rounded-xl overflow-hidden h-28 bg-white/[0.05] border border-white/[0.1]">
                    {wallpaperUrl ? (
                      <img
                        src={wallpaperUrl}
                        alt="Current wallpaper"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                        <span className="text-xs text-muted-foreground">No wallpaper set</span>
                      </div>
                    )}
                    {/* Dim overlay preview */}
                    {wallpaperUrl && (
                      <div
                        className="absolute inset-0 bg-black"
                        style={{ opacity: ((100 - brightness) / 100) * 0.7 }}
                      />
                    )}
                    {wallpaperUrl && (
                      <div className="absolute bottom-1.5 right-1.5 text-[10px] text-white/80 font-medium bg-black/30 rounded px-1.5 py-0.5">
                        {brightness}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Pick image button */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={picking}
                  className="mx-3 mb-2 w-[calc(100%-1.5rem)] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {picking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {wallpaperUrl ? "Change Wallpaper" : "Set Background Wallpaper"}
                </button>

                {/* Remove wallpaper button */}
                {wallpaperUrl && (
                  <button
                    onClick={handleRemove}
                    className="mx-3 mb-3 w-[calc(100%-1.5rem)] flex items-center justify-center gap-2 py-2 rounded-xl border border-rose-500/25 hover:bg-rose-500/12 hover:bg-rose-500/15 text-rose-400 text-sm font-medium transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Wallpaper
                  </button>
                )}

                {/* Brightness slider */}
                {wallpaperUrl && (
                  <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-400">
                        Wallpaper Brightness
                      </span>
                      <span className="text-xs font-bold text-purple-500">{brightness}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-medium">
                        DIM
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none bg-[#26264a] accent-purple-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 font-medium">
                        BRIGHT
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Other Settings */}
              {[
                { icon: Bell, label: "Notifications", desc: "Push notifications, sounds" },
                { icon: Shield, label: "Privacy", desc: "Manage your privacy settings" },
              ].map((item, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </button>
              ))}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Appearance</div>
                  <div className="text-xs text-muted-foreground">
                    {theme === "dark" ? "Dark mode active" : "Light mode active"}
                  </div>
                </div>
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    theme === "dark" ? "bg-campus-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      theme === "dark" ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              {[
                { icon: HelpCircle, label: "Help & Support", desc: "FAQ, contact us" },
              ].map((item, i) => (
                <button
                  key={i + 100}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-white/[0.07]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/12 hover:bg-rose-500/15 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-rose-500/12 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-rose-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-rose-400">Sign Out</div>
                  <div className="text-xs text-muted-foreground">Log out of your account</div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
