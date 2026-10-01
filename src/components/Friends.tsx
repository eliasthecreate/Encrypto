import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  Users,
  Search,
  Clock,
  X,
  Check,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { useFriendRequests, useFriends, useStudentSuggestions } from "@/lib/supabase-hooks";
import { Avatar } from "./ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

import { VerifiedBadge } from "./VerifiedBadge";

export function Friends() {
  const [activeTab, setActiveTab] = useState("suggestions");
  const [searchQuery, setSearchQuery] = useState("");

  const { requests, loading: reqsLoading, acceptRequest, rejectRequest, sendRequest } = useFriendRequests();
  const { friends, loading: friendsLoading } = useFriends();
  const { suggestions, loading: suggestionsLoading } = useStudentSuggestions();

  const [pendingSends, setPendingSends] = useState<Set<string>>(new Set());

  const handleAddFriend = async (id: string) => {
    setPendingSends((prev) => new Set(prev).add(id));
    await sendRequest(id);
  };

  const filteredSuggestions = suggestions.filter((s) =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFriends = friends.filter((f) =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStudentCard = (
    student: { id: string; name: string; department?: string | null; year?: string | null; status: string; is_verified?: boolean; university_domain?: string | null },
    showAddButton = false,
    showMessageButton = false
  ) => (
    <motion.div
      key={student.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-all border border-transparent hover:border-white/[0.07]"
    >
      <Avatar name={student.name} size="lg" status={student.status as any} showStatus />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-white flex items-center gap-1.5">
          <span>{student.name}</span>
          {student.is_verified && <VerifiedBadge domain={student.university_domain} size="sm" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
          <span>{student.department ?? ""}</span>
          {student.department && <span>·</span>}
          <span>{student.year ?? ""}</span>
        </div>
      </div>
      {showAddButton && (
        pendingSends.has(student.id) ? (
          <span className="h-8 px-3 rounded-md border border-purple-500/25 bg-purple-500/12 text-purple-300 text-xs font-medium flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Pending
          </span>
        ) : (
          <button
            onClick={() => handleAddFriend(student.id)}
            className="cc-gradient-btn h-8 px-3.5 text-xs flex items-center gap-1"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add
          </button>
        )
      )}
      {showMessageButton && (
        <span className="h-8 px-3.5 rounded-md border border-white/10 bg-white/5 text-slate-300 text-xs font-medium flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          Message
        </span>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Explore</h1>
        <p className="text-sm text-slate-400">Find and connect with ICU students</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="cc-input w-full h-11 pl-10 pr-4"
        />
      </div>

      {reqsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      ) : requests.length > 0 ? (
        <div className="cc-card mb-4 border-pink-500/25 bg-pink-500/[0.07] p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4 text-pink-400" />
            <span className="font-semibold text-sm text-pink-200">
              Friend Requests
            </span>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200">
              {requests.length} new
            </span>
          </div>
          <div className="space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <Avatar name={request.sender?.name ?? "Unknown"} size="md" status={request.sender?.status ?? "offline" as any} showStatus />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white">{request.sender?.name ?? "Unknown"}</div>
                  <div className="text-xs text-slate-400">{request.sender?.department ?? ""}</div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => acceptRequest(request.id)}
                    aria-label="Accept request"
                    className="cc-gradient-btn h-8 w-8 p-0 flex items-center justify-center"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => rejectRequest(request.id)}
                    aria-label="Decline request"
                    className="h-8 w-8 p-0 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/12 transition-colors flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-white/[0.04] mb-4 text-slate-400">
          <TabsTrigger value="suggestions" className="flex-1">Suggestions</TabsTrigger>
          <TabsTrigger value="friends" className="flex-1">Friends ({friends.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions">
          {suggestionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((s) => renderStudentCard(s, true))
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">No suggestions found</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends">
          {friendsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFriends.length > 0 ? (
                filteredFriends.map((f) => renderStudentCard(f, false, true))
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">
                    {searchQuery ? "No friends match your search" : "No friends yet. Start connecting!"}
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
