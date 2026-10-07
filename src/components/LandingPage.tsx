import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0d0d1a] flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(124,58,237,0.45),rgba(236,72,153,0.22)_45%,rgba(13,13,26,1)_100%)]" />
      <div className="absolute inset-0 bg-grid opacity-60" />

      <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-purple-600/25 blur-3xl" />
      <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />

      <header className="relative z-10 px-6 pt-7">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-900/50">
            <GraduationCap className="h-[1.125rem] w-[1.125rem] text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">Campus</span>
            <span className="text-purple-400">Connect</span>
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="w-full max-w-md mx-auto text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-500/10 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-purple-200">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-pink-400" />
            The Information and Communications University
          </span>

          <h1 className="mt-7 text-4xl sm:text-5xl font-extrabold leading-[1.08] tracking-tight text-white text-balance">
            Your campus,
            <br />
            <span className="text-gradient-warm">all in one place.</span>
          </h1>

          <p className="mt-5 text-[15px] leading-relaxed text-slate-300/90 text-balance">
            Share moments, message friends, go live, and find your people — built
            for ICU students.
          </p>

          <div className="mt-9 flex flex-col gap-3">
            <Link to="/auth?mode=signup" className="block">
              <span className="cc-gradient-btn w-full h-[3.25rem] py-3.5 flex items-center justify-center gap-2 text-[15px]">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link to="/auth?mode=login" className="block">
              <span className="cc-outline-btn w-full h-[3.25rem] py-3.5 flex items-center justify-center text-[15px]">
                Log In
              </span>
            </Link>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 px-6 pb-7">
        <p className="text-center text-[11px] text-slate-500">
          &copy; {new Date().getFullYear()} Campus Connect ICU &middot; Built for
          our campus
        </p>
      </footer>
    </div>
  );
}