import { useState } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Eye,
  Calendar,
  Play,
  Radio,
  Music,
  BookOpen,
  Newspaper,
  Trophy,
  Sparkles,
  MessageCircle,
  Heart,
  Share2,
  Loader2,
} from "lucide-react";
import { useLiveStreams } from "@/lib/supabase-hooks";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ReactNode> = {
  club_event: <Calendar className="h-4 w-4" />,
  class_help: <BookOpen className="h-4 w-4" />,
  performance: <Music className="h-4 w-4" />,
  campus_news: <Newspaper className="h-4 w-4" />,
  sports: <Trophy className="h-4 w-4" />,
  other: <Sparkles className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  club_event: "Club Event",
  class_help: "Study Help",
  performance: "Performance",
  campus_news: "Campus News",
  sports: "Sports",
  other: "Other",
};

export function Live() {
  const [showGoLive, setShowGoLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDesc, setStreamDesc] = useState("");
  const [streamCategory, setStreamCategory] = useState("club_event");

  const { liveStreams, loading, startStream } = useLiveStreams();

  const handleStartStream = async () => {
    if (!streamTitle.trim()) {
      toast.error("Please enter a stream title");
      return;
    }
    await startStream(streamTitle, streamDesc, streamCategory);
    toast.success("You're live! 🎥");
    setShowGoLive(false);
    setStreamTitle("");
    setStreamDesc("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold dark:text-white mb-1">Live</h1>
          <p className="text-sm text-muted-foreground">
            Watch and broadcast campus events live
          </p>
        </div>
        <Button
          variant="gradient"
          size="sm"
          onClick={() => setShowGoLive(!showGoLive)}
          className="animate-pulse-slow"
        >
          <Radio className="h-4 w-4 mr-1.5" />
          Go Live
        </Button>
      </div>

      {showGoLive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm dark:text-white">Start Broadcasting</h3>
                  <p className="text-xs text-muted-foreground">Share your campus moment live</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Stream title..."
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className="w-full h-10 px-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-200 mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <textarea
                placeholder="Description (optional)..."
                value={streamDesc}
                onChange={(e) => setStreamDesc(e.target.value)}
                className="w-full h-20 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-200 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <div className="flex gap-2 mb-3 flex-wrap">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setStreamCategory(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      streamCategory === key
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400"
                    }`}
                  >
                    {categoryIcons[key]}
                    <span className="ml-1">{label}</span>
                  </button>
                ))}
              </div>
              <Button variant="gradient" className="w-full" onClick={handleStartStream}>
                <Radio className="h-4 w-4 mr-2" />
                Start Live Stream
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 live-dot" />
          <h2 className="font-semibold text-sm dark:text-white">Live Now</h2>
          <span className="text-xs text-muted-foreground">
            ({loading ? "..." : liveStreams.length} streams)
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : liveStreams.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 glass-card">
            <CardContent className="p-8 text-center">
              <Radio className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No live streams right now. Be the first to go live!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {liveStreams.map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="overflow-hidden glass-card hover:shadow-lg transition-all cursor-pointer group">
                  <div className="relative">
                    <div className="h-48 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <Play className="h-8 w-8 text-white ml-1" />
                        </div>
                        <p className="text-white/60 text-xs">{stream.viewer_count} watching</p>
                      </div>
                      <Badge variant="secondary" className="absolute top-3 left-3 bg-black/40 text-white border-0">
                        {categoryIcons[stream.category]}
                        <span className="ml-1">{categoryLabels[stream.category] ?? stream.category}</span>
                      </Badge>
                      <Badge variant="live" className="absolute top-3 right-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5 live-dot" />
                        LIVE
                      </Badge>
                      <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-white" />
                        <span className="text-white text-xs font-medium">{stream.viewer_count.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={stream.host?.name ?? "Unknown"} size="md" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm dark:text-white line-clamp-1">{stream.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {stream.host?.name ?? "Unknown"} · {stream.host?.department ?? ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{stream.description ?? ""}</p>
                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-500 transition-colors">
                            <Heart className="h-3.5 w-3.5" />
                            React
                          </button>
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-purple-500 transition-colors">
                            <MessageCircle className="h-3.5 w-3.5" />
                            Chat
                          </button>
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors">
                            <Share2 className="h-3.5 w-3.5" />
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
