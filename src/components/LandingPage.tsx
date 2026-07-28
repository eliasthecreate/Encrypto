import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Users,
  Video,
  Bell,
  Shield,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Globe,
  HeartHandshake,
  ArrowRight,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-warm">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">
                Campus Connect
              </span>
              <span className="text-xs font-semibold text-purple-400 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
                ICU
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth?mode=login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="gradient" size="sm">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/30 dark:bg-purple-800/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200/20 dark:bg-pink-800/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-400/5 to-pink-400/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto">
          <motion.div initial="initial" animate="animate" variants={stagger} className="text-center max-w-4xl mx-auto">
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-full px-4 py-1.5 mb-8"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                The Social Hub for International Christian University
              </span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-gray-900 dark:text-white">Connect. Share.</span>
              <br />
              <span className="text-gradient-warm">Thrive Together.</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Campus Connect ICU brings your campus community together — share posts, message friends, join live streams, and discover fellow students, all in one place.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button variant="gradient" size="xl" className="group shadow-xl shadow-purple-500/20">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/auth?mode=login">
                <Button variant="outline" size="xl">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-0 bg-gradient-to-t from-[#faf8f5] dark:from-gray-950 via-transparent to-transparent z-10 pointer-events-none" />
              <div className="relative bg-gradient-to-b from-gray-50 dark:from-gray-800 to-white dark:to-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="flex h-[500px]">
                  <div className="flex-1 p-6 space-y-4 overflow-hidden">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500" />
                      <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700" />
                          <div>
                            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
                            <div className="h-2 w-16 bg-gray-50 dark:bg-gray-800 rounded mt-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                        </div>
                        <div className="h-32 bg-gray-50 dark:bg-gray-800 rounded-xl mt-3" />
                        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                          {[1, 2, 3].map((j) => (
                            <div key={j} className="h-4 w-16 bg-gray-50 dark:bg-gray-800 rounded" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="w-80 bg-gray-50 dark:bg-gray-800/50 p-4 border-l border-gray-100 dark:border-gray-800 hidden md:block">
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                      <span className="font-semibold text-sm dark:text-white">Messages</span>
                    </div>
                    <div className="space-y-2 mt-4">
                      {["Alex Kim", "Sarah Park", "Campus Events"].map((name, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gray-200 dark:from-gray-600 to-gray-300 dark:to-gray-700" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium dark:text-white truncate">{name}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate">Hey! Are you going to...</div>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-purple-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50" id="features">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold dark:text-white mb-4">Everything your campus needs</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
              Built specifically for ICU students to connect, collaborate, and celebrate campus life.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, title: "Campus Feed", description: "Share updates, campus events, and announcements with the entire ICU community. React, comment, and join conversations.", color: "from-purple-400 to-pink-500" },
              { icon: Users, title: "Friend Connections", description: "Find classmates from your department and year. Send friend requests, build your network, and discover mutual connections.", color: "from-pink-400 to-orange-500" },
              { icon: Video, title: "Live Streaming", description: "Broadcast club events, study sessions, performances, and campus news. Watch and interact with live streams from fellow students.", color: "from-orange-400 to-amber-500" },
              { icon: Bell, title: "Real-time Notifications", description: "Stay updated with instant notifications for friend requests, messages, likes, and live streams starting.", color: "from-amber-400 to-yellow-500" },
              { icon: Shield, title: "Campus-Only Community", description: "A safe, private space exclusively for ICU students. Verify your student status and connect with confidence.", color: "from-rose-400 to-rose-600" },
              { icon: HeartHandshake, title: "Voice & Media Chat", description: "Send voice notes, photos, videos, and files in private messages. Express yourself beyond just text.", color: "from-sky-400 to-sky-600" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl dark:hover:shadow-black/20 transition-all duration-300"
              >
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: "2,500+", label: "Active Students" },
              { number: "500+", label: "Daily Posts" },
              { number: "50+", label: "Student Clubs" },
              { number: "10K+", label: "Messages Sent" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring" }}
              >
                <div className="text-4xl font-bold mb-1">{stat.number}</div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 rounded-full px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Join the campus community today</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold dark:text-white mb-4">Ready to connect with ICU?</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Join your fellow students on Campus Connect ICU. It's free, it's secure, and it's built just for you.
            </p>
            <Link to="/auth?mode=signup">
              <Button variant="gradient" size="xl" className="shadow-xl shadow-purple-500/20">
                Create Your Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-500" />
            <span className="font-semibold dark:text-white">Campus Connect ICU</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span>© 2026 Campus Connect</span>
            <span className="hover:text-purple-500 cursor-pointer">Privacy</span>
            <span className="hover:text-purple-500 cursor-pointer">Terms</span>
            <span className="hover:text-purple-500 cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
