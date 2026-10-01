import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import {
  useNotifications,
  useConversations,
  useMarkIncomingDelivered,
  useFriendRequests,
} from "@/lib/supabase-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageCircle,
  Compass,
  Video,
  User,
  Bell,
  Search,
  LogOut,
  GraduationCap,
  Settings as SettingsIcon,
} from "lucide-react";
import { Avatar } from "./ui/avatar";
import { Feed } from "./Feed";
import { Messages } from "./Messages";
import { Friends } from "./Friends";
import { Live } from "./Live";
import { Profile } from "./Profile";
import { NotificationsPanel } from "./NotificationsPanel";
import { toast } from "sonner";

const tabs = [
  { id: "feed", label: "Home", icon: Home },
  { id: "friends", label: "Explore", icon: Compass },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "live", label: "Live", icon: Video },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("feed");
  const [showSearch, setShowSearch] = useState(false);
  const [inChat, setInChat] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  const { requests: friendRequests } = useFriendRequests("bell");
  const { conversations } = useConversations();

  useMarkIncomingDelivered();

  const regularNotifications = notifications.filter((n: any) => n.type !== "friend_request");
  const unreadRegular = regularNotifications.filter((n: any) => !n.read).length;
  const bellBadgeCount = unreadRegular + friendRequests.length;

  const totalUnreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const goToNotifications = () => {
    setShowSearch(false);
    setActiveTab("notifications");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return <Feed />;
      case "messages":
        return <Messages onChatOpen={setInChat} />;
      case "friends":
        return <Friends />;
      case "live":
        return <Live />;
      case "notifications":
        return (
          <NotificationsPanel
            onOpenConnections={() => setActiveTab("friends")}
          />
        );
      case "profile":
        return <Profile />;
      default:
        return <Feed />;
    }
  };

  return (
    <div className="min-h-screen bg-warm">
      {!inChat && (
        <header className="sticky top-0 z-40 cc-topbar">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => setActiveTab("feed")}
                className="flex items-center gap-2.5 min-w-0"
              >
                <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-900/40 flex-shrink-0">
                  <GraduationCap className="h-[1.125rem] w-[1.125rem] text-white" />
                </span>
                <span className="font-bold text-[17px] tracking-tight truncate">
                  <span className="text-white">Campus</span>
                  <span className="text-purple-400">Connect</span>
                </span>
              </button>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setShowSearch((v) => !v)}
                  aria-label="Search"
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>

                <button
                  onClick={goToNotifications}
                  aria-label="Notifications"
                  className="relative h-9 w-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {bellBadgeCount > 0 && (
                    <span className="cc-badge -top-0.5 -right-0.5">
                      {bellBadgeCount > 9 ? "9+" : bellBadgeCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("profile")}
                  aria-label="Settings"
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <SettingsIcon className="h-5 w-5" />
                </button>

                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-[1.125rem] w-[1.125rem]" />
                </button>

                <Avatar
                  name={user?.profile?.name ?? user?.email ?? "?"}
                  src={user?.profile?.avatar_url ?? undefined}
                  size="sm"
                  className="ml-1"
                />
              </div>
            </div>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pb-3">
                    <input
                      type="text"
                      placeholder="Search students, posts, and more..."
                      className="cc-input w-full h-11 px-4 text-sm"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
      )}

      <main className={`max-w-3xl mx-auto px-4 ${inChat ? "py-0 pb-0" : "py-4 pb-32"}`}>
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

      {!inChat && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 cc-bottom-nav pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-3xl mx-auto flex items-stretch px-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const badge =
                tab.id === "messages"
                  ? totalUnreadMessages
                  : tab.id === "notifications"
                    ? bellBadgeCount
                    : 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-0.5 min-w-0 cc-nav-item ${
                    isActive ? "cc-nav-item-active" : ""
                  }`}
                >
                  <span
                    className={`relative flex items-center justify-center h-8 w-11 rounded-xl transition-all duration-200 ${
                      isActive ? "cc-nav-glow bg-purple-500/15" : ""
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 transition-transform duration-200 ${
                        isActive ? "scale-110" : ""
                      }`}
                      strokeWidth={isActive ? 2.4 : 2}
                    />
                    {badge > 0 && (
                      <span className="cc-badge -top-0.5 -right-0.5">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[9.5px] leading-none tracking-tight truncate max-w-full ${
                      isActive ? "font-semibold text-purple-300" : "font-medium"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}