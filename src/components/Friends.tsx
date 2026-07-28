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
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

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
    student: { id: string; name: string; department?: string | null; year?: string | null; status: string },
    showAddButton = false,
    showMessageButton = false
  ) => (
    <motion.div
      key={student.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white dark:hover:bg-gray-800/50 cursor-pointer transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 hover:shadow-sm"
    >
      <Avatar name={student.name} size="lg" status={student.status as any} showStatus />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm dark:text-white">{student.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{student.department ?? ""}</span>
          {student.department && <span>·</span>}
          <span>{student.year ?? ""}</span>
        </div>
      </div>
      {showAddButton && (
        pendingSends.has(student.id) ? (
          <Button size="sm" variant="outline" className="text-purple-500 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 cursor-default h-8">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Pending
          </Button>
        ) : (
          <Button size="sm" variant="gradient" onClick={() => handleAddFriend(student.id)} className="h-8">
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )
      )}
      {showMessageButton && (
        <Button size="sm" variant="outline" className="h-8">
          <MessageCircle className="h-3.5 w-3.5 mr-1" />
          Message
        </Button>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold dark:text-white mb-1">Friends</h1>
        <p className="text-sm text-muted-foreground">Connect with your campus community</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
        />
      </div>

      {reqsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
        </div>
      ) : requests.length > 0 ? (
        <Card className="mb-4 border-pink-200 dark:border-pink-900 bg-pink-50/30 dark:bg-pink-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              <span className="font-semibold text-sm text-pink-800 dark:text-pink-300">
                Friend Requests
              </span>
              <Badge variant="warning" className="ml-auto">{requests.length} new</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-900">
                  <Avatar name={request.sender?.name ?? "Unknown"} size="md" status={request.sender?.status ?? "offline" as any} showStatus />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm dark:text-white">{request.sender?.name ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{request.sender?.department ?? ""}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="gradient" onClick={() => acceptRequest(request.id)} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectRequest(request.id)} className="h-8 w-8 p-0 text-red-500 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-gray-100/50 dark:bg-gray-800/50 mb-4">
          <TabsTrigger value="suggestions" className="flex-1">Suggestions</TabsTrigger>
          <TabsTrigger value="friends" className="flex-1">Friends ({friends.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions">
          {suggestionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((s) => renderStudentCard(s, true))
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="text-sm text-muted-foreground">No suggestions found</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends">
          {friendsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFriends.length > 0 ? (
                filteredFriends.map((f) => renderStudentCard(f, false, true))
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="text-sm text-muted-foreground">
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
