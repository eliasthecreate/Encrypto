import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Send,
  Mic,
  Paperclip,
  Smile,
  ChevronLeft,
  CheckCheck,
  Check,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { useConversations, useMessages } from "@/lib/supabase-hooks";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { formatTimeAgo, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

function MessageBubble({
  content,
  time,
  isOwn,
  read,
  delivered,
}: {
  content: string;
  time: string;
  isOwn: boolean;
  read: boolean;
  delivered: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={cn(
          "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
          isOwn
            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-lg"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-lg border border-gray-100 dark:border-gray-700"
        )}
      >
        <p>{content}</p>
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span
            className={`text-[10px] ${isOwn ? "text-white/70" : "text-gray-400 dark:text-gray-500"}`}
          >
            {new Date(time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isOwn &&
            (read ? (
              <CheckCheck className="h-3 w-3 text-blue-300" />
            ) : delivered ? (
              <CheckCheck className="h-3 w-3 text-white/60" />
            ) : (
              <Check className="h-3 w-3 text-white/60" />
            ))}
        </div>
      </div>
    </div>
  );
}

export function Messages() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { conversations, loading: convsLoading } = useConversations();

  const selectedConv = conversations.find((c) => c.conversation.id === selectedChat);
  const otherUserId = selectedConv?.otherUser.id ?? null;

  const {
    messages,
    getDecryptedContent,
    loading: msgsLoading,
    sendMessage,
  } = useMessages(selectedChat, otherUserId);


  const filteredConversations = conversations.filter((c) =>
    c.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    await sendMessage(messageInput);
    setMessageInput("");
  };

  // Chat view
  if (selectedConv) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedChat(null)}
              className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 dark:text-gray-400" />
            </button>
            <Avatar
              name={selectedConv.otherUser.name}
              size="md"
              status={selectedConv.otherUser.status as any}
              showStatus
            />
            <div>
              <div className="font-semibold text-sm dark:text-white">
                {selectedConv.otherUser.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedConv.otherUser.status === "online" ? "Online" : "Offline"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
              <Phone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
              <Video className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
              <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-purple-50/30 to-transparent dark:from-purple-950/10 dark:to-transparent">
          {msgsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={getDecryptedContent(msg.id)}
                time={msg.created_at}
                isOwn={msg.sender_id === user?.id}
                read={msg.read}
                delivered={true}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No messages yet. Say hello!
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <button className="h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Paperclip className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="w-full h-10 px-4 pr-10 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 text-sm dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-gray-800 transition-all"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center">
                <Smile className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
            <button className="h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Mic className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </button>
            <Button
              size="icon"
              variant="gradient"
              onClick={handleSend}
              disabled={!messageInput.trim()}
              className="h-10 w-10 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold dark:text-white mb-1">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Chat with your campus friends
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
        />
      </div>

      {convsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="space-y-1">
          {filteredConversations.map((conv, i) => (
            <motion.div
              key={conv.conversation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedChat(conv.conversation.id)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white dark:hover:bg-gray-800/50 cursor-pointer transition-all group"
            >
              <div className="relative flex-shrink-0">
                <Avatar
                  name={conv.otherUser.name}
                  size="lg"
                  status={conv.otherUser.status as any}
                  showStatus
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm dark:text-white">
                    {conv.otherUser.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {conv.lastMessage
                      ? formatTimeAgo(new Date(conv.lastMessage.created_at))
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage?.content ?? "Start a conversation"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge
                      variant="default"
                      className="h-5 min-w-[20px] px-1.5 text-[10px]"
                    >
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
