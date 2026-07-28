import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useNotifications } from "@/lib/supabase-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageCircle,
  Users,
  Video,
  User,
  Bell,
  Search,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { Feed } from "./Feed";
import { Messages } from "./Messages";
import { Friends } from "./Friends";
import { Live } from "./Live";
import { Profile } from "./Profile";
import { toast } from "sonner";

const tabs = [
  { id: "feed", label: "Home", icon: Home },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "friends", label: "Friends", icon: Users },
  { id: "live", label: "Live", icon: Video },
  { id: "profile", label: "Profile", icon: User },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("feed");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, markAsRead } =
    useNotifications();

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return <Feed />;
      case "messages":
        return <Messages />;
      case "friends":
        return <Friends />;
      case "live":
        return <Live />;
      case "profile":
        return <Profile />;
      default:
        return <Feed />;
    }
  };

  return (
    <div className="min-h-screen bg-warm">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gradient">
                Campus Connect
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
              >
                <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors relative"
                >
                  <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="font-semibold text-sm dark:text-white">
                        Notifications
                      </span>
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-purple-500 hover:text-purple-600 font-medium"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id)}
                            className={`p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                              !notif.read ? "bg-purple-50/30 dark:bg-purple-900/10" : ""
                            }`}
                          >
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {notif.title[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                                {notif.body}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {new Date(
                                  notif.created_at
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="h-2 w-2 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground p-6 text-center">
                          No notifications yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSignOut}
                className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pb-3"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students, posts, and more..."
                  className="w-full h-10 pl-4 pr-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-gray-800 transition-all dark:text-gray-200 dark:placeholder:text-gray-500"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center py-2 px-4 min-w-0 transition-all duration-200 ${
                  isActive
                    ? "text-purple-500"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <div
                  className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                    isActive ? "bg-purple-50 dark:bg-purple-900/30" : ""
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-all duration-200 ${
                      isActive ? "scale-110" : ""
                    }`}
                  />
                  {tab.id === "messages" && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      3
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
