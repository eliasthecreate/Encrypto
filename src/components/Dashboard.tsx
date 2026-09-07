import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useNotifications, useConversations, useMarkIncomingDelivered, useFriendRequests } from "@/lib/supabase-hooks";
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
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { Avatar } from "./ui/avatar";
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
  const [inChat, setInChat] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, markAsRead } =
    useNotifications();
  const { requests: friendRequests } = useFriendRequests("bell");
  const { conversations } = useConversations();

  // Pending connect requests are shown at the top of the bell dropdown
  const regularNotifications = notifications.filter(
    (n: any) => n.type !== "friend_request"
  );
  const unreadRegular = regularNotifications.filter((n: any) => !n.read).length;
  const bellBadgeCount = unreadRegular + friendRequests.length;

  // Marks incoming messages as "delivered" while the app is open (2 grey ticks on sender side)
  useMarkIncomingDelivered();

  // Total unread messages from all conversations
  const totalUnreadMessages = conversations.reduce(
    (sum, c) => sum + c.unreadCount,
    0
  );

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
        return <Messages onChatOpen={setInChat} />;
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
      {/* Top Nav — hidden while inside a chat; the chat header replaces it */}
      {!inChat && (
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
                  {bellBadgeCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {bellBadgeCount > 9 ? "9+" : bellBadgeCount}
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
                      {friendRequests.length > 0 && (
                        <>
                          <div className="px-3 pt-3 pb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                            <UserPlus className="h-3 w-3" />
                            Connect Requests
                          </div>
                          {friendRequests.map((request) => (
                            <div
                              key={request.id}
                              onClick={() => {
                                setActiveTab("friends");
                                setShowNotifications(false);
                              }}
                              className="p-3 flex items-center gap-3 bg-pink-50/50 dark:bg-pink-950/20 border-l-2 border-pink-500 hover:bg-pink-100/60 dark:hover:bg-pink-900/20 cursor-pointer transition-colors"
                            >
                              <Avatar
                                name={request.sender?.name ?? "Unknown"}
                                size="sm"
                                status={request.sender?.status as any}
                                showStatus
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                                  <span className="font-semibold">
                                    {request.sender?.name ?? "Someone"}
                                  </span>{" "}
                                  wants to connect with you
                                </p>
                                <p className="text-xs text-pink-500 font-medium mt-0.5">
                                  Tap to respond
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-pink-400 flex-shrink-0" />
                            </div>
                          ))}
                          <div className="mx-3 my-2 border-t border-gray-100 dark:border-gray-800" />
                        </>
                      )}
                      {regularNotifications.length > 0 ? (
                        regularNotifications.map((notif) => (
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
                      ) : friendRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-6 text-center">
                          No notifications yet
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          No other notifications
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
      )}

      {/* Main Content */}
      <main className={`max-w-6xl mx-auto px-4 ${inChat ? "py-0 pb-0" : "py-4 pb-24"}`}>
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

      {/* Bottom Navigation — hidden while inside a chat for a full-screen chat view */}
      {!inChat && (
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
                  {tab.id === "messages" && totalUnreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {totalUnreadMessages > 9 ? "9+" : totalUnreadMessages}
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
      )}
    </div>
  );
}
