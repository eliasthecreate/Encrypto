// ============================================================
// Interests, courses & programs catalog
// ------------------------------------------------------------
// Shared by the "For You" onboarding, the For You feed ranking and
// the profile editor. Interests are stored on profiles as a
// comma-separated list of ids (e.g. "movies,anime,sports").
// ============================================================

export interface InterestDef {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind gradient classes used for the selected chip. */
  color: string;
  /** Lowercase terms matched against post text / profiles. */
  keywords: string[];
}

export interface CourseDef {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
}

export interface ProgramDef {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
}

// ─── Interests ──────────────────────────────────────────────
// Started from the request (movies, anime, sports, fashion) and
// extended with the categories the big social apps use to tune
// a "For You" feed (music, gaming, food, tech, …).
export const INTERESTS: InterestDef[] = [
  { id: "movies", label: "Movies & TV", emoji: "🎬", color: "from-violet-500 to-purple-600", keywords: ["movie", "movies", "film", "cinema", "series", "netflix", "trailer", "actor", "actress"] },
  { id: "anime", label: "Anime & Manga", emoji: "🌸", color: "from-pink-500 to-rose-600", keywords: ["anime", "manga", "otaku", "naruto", "one piece", "jujutsu", "demon slayer", "attack on titan", "cosplay"] },
  { id: "sports", label: "Sports", emoji: "⚽", color: "from-emerald-500 to-green-600", keywords: ["sport", "sports", "football", "soccer", "basketball", "netball", "volleyball", "rugby", "athletics", "match", "league", "tournament"] },
  { id: "fashion", label: "Fashion", emoji: "👗", color: "from-fuchsia-500 to-pink-600", keywords: ["fashion", "outfit", "ootd", "style", "clothes", "designer", "runway", "thrift", "sneakers"] },
  { id: "music", label: "Music", emoji: "🎵", color: "from-indigo-500 to-blue-600", keywords: ["music", "song", "album", "concert", "spotify", "band", "dj", "playlist", "beat", "guitar"] },
  { id: "gaming", label: "Gaming", emoji: "🎮", color: "from-cyan-500 to-teal-600", keywords: ["game", "gaming", "gamer", "esports", "fifa", "valorant", "minecraft", "playstation", "xbox", "fortnite"] },
  { id: "food", label: "Food", emoji: "🍔", color: "from-orange-500 to-amber-600", keywords: ["food", "eat", "recipe", "cafe", "restaurant", "pizza", "cooking", "lunch", "dinner", "braai", "snack"] },
  { id: "travel", label: "Travel", emoji: "✈️", color: "from-sky-500 to-cyan-600", keywords: ["travel", "trip", "journey", "vacation", "adventure", "road trip", "explore", "wanderlust"] },
  { id: "tech", label: "Tech & Coding", emoji: "💻", color: "from-blue-500 to-indigo-600", keywords: ["tech", "coding", "code", "programming", "software", "developer", "ai", "hackathon", "react", "python", "javascript"] },
  { id: "art", label: "Art & Design", emoji: "🎨", color: "from-rose-500 to-orange-500", keywords: ["art", "artist", "drawing", "painting", "sketch", "design", "illustration", "animation"] },
  { id: "photography", label: "Photography", emoji: "📷", color: "from-slate-500 to-slate-700", keywords: ["photo", "photos", "photography", "camera", "shoot", "portrait", "photoshoot"] },
  { id: "fitness", label: "Fitness", emoji: "🏋️", color: "from-lime-500 to-emerald-600", keywords: ["gym", "workout", "fitness", "running", "training", "yoga", "exercise", "marathon"] },
  { id: "reading", label: "Books & Reading", emoji: "📚", color: "from-amber-500 to-yellow-600", keywords: ["book", "books", "reading", "novel", "author", "library", "literature", "poetry"] },
  { id: "business", label: "Business", emoji: "💼", color: "from-teal-500 to-emerald-600", keywords: ["business", "startup", "entrepreneur", "marketing", "finance", "investing", "brand", "sales"] },
  { id: "dance", label: "Dance", emoji: "💃", color: "from-pink-500 to-fuchsia-600", keywords: ["dance", "dancing", "choreography", "performance", "ballet", "hiphop"] },
  { id: "memes", label: "Memes & Comedy", emoji: "😂", color: "from-yellow-500 to-orange-600", keywords: ["meme", "memes", "funny", "joke", "comedy", "laugh", "humour", "humor"] },
  { id: "volunteering", label: "Volunteering", emoji: "🤝", color: "from-green-500 to-teal-600", keywords: ["volunteer", "volunteering", "community", "charity", "outreach", "giving"] },
  { id: "pets", label: "Pets & Animals", emoji: "🐶", color: "from-amber-500 to-orange-600", keywords: ["dog", "dogs", "cat", "cats", "pet", "pets", "puppy", "kitten", "animal"] },
  { id: "science", label: "Science", emoji: "🔬", color: "from-cyan-500 to-blue-600", keywords: ["science", "research", "physics", "chemistry", "biology", "lab", "experiment"] },
  { id: "faith", label: "Faith & Purpose", emoji: "🙏", color: "from-violet-500 to-indigo-600", keywords: ["faith", "church", "worship", "prayer", "bible", "god", "christian", "fellowship"] },
];

// ─── Courses (common to a comms / tech campus) ───────────────
export const COURSES: CourseDef[] = [
  { id: "programming", label: "Programming", emoji: "⌨️", keywords: ["programming", "coding", "python", "java", "c++", "algorithms"] },
  { id: "data-structures", label: "Data Structures", emoji: "🧱", keywords: ["data structures", "algorithms", "linked list", "tree", "graph"] },
  { id: "web-dev", label: "Web Development", emoji: "🌐", keywords: ["web", "html", "css", "react", "frontend", "backend", "website"] },
  { id: "databases", label: "Databases", emoji: "🗄️", keywords: ["database", "sql", "postgres", "mysql", "mongodb", "query"] },
  { id: "networking", label: "Networking", emoji: "🛰️", keywords: ["networking", "network", "router", "tcp", "ip", "protocol", "cisco"] },
  { id: "cybersecurity", label: "Cybersecurity", emoji: "🔐", keywords: ["security", "cyber", "hacking", "encryption", "privacy", "firewall"] },
  { id: "ai-ml", label: "AI & Machine Learning", emoji: "🤖", keywords: ["ai", "machine learning", "ml", "neural", "model", "deep learning", "chatbot"] },
  { id: "mobile-dev", label: "Mobile Development", emoji: "📱", keywords: ["mobile", "android", "ios", "app", "kotlin", "swift", "flutter"] },
  { id: "graphic-design", label: "Graphic Design", emoji: "🖌️", keywords: ["design", "graphic", "photoshop", "illustrator", "figma", "branding", "logo"] },
  { id: "digital-marketing", label: "Digital Marketing", emoji: "📈", keywords: ["marketing", "social media", "seo", "ads", "campaign", "influencer"] },
  { id: "journalism", label: "Journalism", emoji: "📰", keywords: ["journalism", "news", "reporter", "article", "editorial", "press"] },
  { id: "media-production", label: "Media Production", emoji: "🎥", keywords: ["media", "film", "video", "production", "editing", "podcast", "broadcast"] },
  { id: "business-mgmt", label: "Business Management", emoji: "🏢", keywords: ["business", "management", "strategy", "operations", "leadership"] },
  { id: "accounting", label: "Accounting", emoji: "🧾", keywords: ["accounting", "audit", "ledger", "bookkeeping", "tax"] },
  { id: "economics", label: "Economics", emoji: "📊", keywords: ["economics", "economy", "market", "macro", "micro", "trade"] },
  { id: "mathematics", label: "Mathematics", emoji: "➗", keywords: ["math", "mathematics", "calculus", "algebra", "geometry", "statistics"] },
  { id: "electronics", label: "Electronics", emoji: "🔌", keywords: ["electronics", "circuit", "embedded", "arduino", "microcontroller", "sensors"] },
  { id: "communication", label: "Communication Systems", emoji: "📡", keywords: ["communication", "telecom", "signal", "wireless", "5g", "antenna"] },
];

// ─── Programs / degrees ──────────────────────────────────────
export const PROGRAMS: ProgramDef[] = [
  { id: "computer-science", label: "Computer Science", emoji: "💾", keywords: ["computer science", "cs", "computing"] },
  { id: "information-technology", label: "Information Technology", emoji: "🖥️", keywords: ["information technology", "it", "ict"] },
  { id: "software-engineering", label: "Software Engineering", emoji: "🧑‍💻", keywords: ["software engineering", "software", "engineering"] },
  { id: "cybersecurity", label: "Cybersecurity", emoji: "🛡️", keywords: ["cybersecurity", "security", "cyber"] },
  { id: "data-science", label: "Data Science", emoji: "📉", keywords: ["data science", "analytics", "data"] },
  { id: "mass-communication", label: "Mass Communication", emoji: "📢", keywords: ["mass communication", "communication", "media"] },
  { id: "journalism", label: "Journalism", emoji: "🗞️", keywords: ["journalism", "journalist", "news"] },
  { id: "digital-media", label: "Digital Media", emoji: "🎞️", keywords: ["digital media", "media", "content creation"] },
  { id: "business-administration", label: "Business Administration", emoji: "📁", keywords: ["business administration", "business", "management"] },
  { id: "accounting", label: "Accounting & Finance", emoji: "💰", keywords: ["accounting", "finance", "audit"] },
  { id: "economics", label: "Economics", emoji: "🏦", keywords: ["economics", "economy"] },
  { id: "graphic-design", label: "Graphic Design", emoji: "🖼️", keywords: ["graphic design", "design", "visual"] },
  { id: "electrical-engineering", label: "Electrical Engineering", emoji: "⚡", keywords: ["electrical engineering", "electronics", "electrical"] },
  { id: "telecommunications", label: "Telecommunications", emoji: "📶", keywords: ["telecommunications", "telecom", "network"] },
];

// ─── Helpers ────────────────────────────────────────────────

export function splitList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinList(values: string[]): string {
  return values.join(",");
}

export function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function interestById(id: string): InterestDef | undefined {
  return INTERESTS.find((i) => i.id === id);
}

export function courseById(id: string): CourseDef | undefined {
  return COURSES.find((c) => c.id === id);
}

export function programById(id: string): ProgramDef | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

/**
 * Word-aware substring match, so short terms like "art" don't match
 * "start" or "party", but phrases like "road trip" still work.
 */
export function textMatchesTerm(text: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t || !text) return false;
  if (t.includes(" ")) return text.includes(t);
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

/** How many of the given terms appear in the text. */
export function countMatches(text: string, terms: string[]): number {
  return terms.reduce((n, t) => (textMatchesTerm(text, t) ? n + 1 : n), 0);
}
