// Campus AI Service - Meta AI-style assistant engine

export interface AIMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isError?: boolean;
}

// Quick prompt suggestions for students
export const AI_SUGGESTION_CHIPS = [
  { label: "📚 Study schedule tips", prompt: "Can you help me create an effective study schedule for exam week?" },
  { label: "📝 Summarize lecture notes", prompt: "Explain how to effectively structure and summarize complex lecture notes." },
  { label: "💡 Explain a concept", prompt: "Can you explain a complex concept (like data structures or calculus) in simple terms?" },
  { label: "🎓 Campus life advice", prompt: "What are the best habits and tips for balancing academics and student campus life?" },
  { label: "⚡ Exam preparation quiz", prompt: "Give me 3 practice multiple-choice questions on general computer science or math to test my knowledge." },
  { label: "✉️ Email to professor", prompt: "Draft a polite professional email requesting an extension on an assignment due to illness." },
  { label: "🧠 Beat procrastination", prompt: "How do I stop procrastinating and actually start my assignments?" },
  { label: "💼 Resume & career", prompt: "How do I build a strong student resume and prepare for my first internship interview?" },
];

const SYSTEM_PROMPT = `You are Campus AI, the built-in assistant of the CampusConnectICU university app (similar to Meta AI inside WhatsApp).
You assist university students with: academic learning, study planning, exam preparation, note summarization, coding and math problems, career/interview prep, campus life, wellbeing, and using CampusConnectICU itself.

Who you are:
- Name: Campus AI. Warm, sharp, encouraging, never robotic.
- You are knowledgeable across many subjects and you reason step by step before answering.

How to answer:
- Lead with the direct answer, then support it. No filler openings like "Great question!".
- Use clean Markdown: short paragraphs, "- " bullet lists, "**bold**" for key terms, fenced code blocks for code, and \`inline code\` for identifiers.
- Keep it mobile-friendly: typically under 250 words unless the user explicitly asks for depth.
- Use a few helpful emojis, but do not overload every line.
- Ask ONE clarifying question when the request is ambiguous instead of guessing.
- For math or code, show your working briefly so the student can learn from it.
- If a request is against academic integrity rules (e.g. "write my whole essay for me"), don't just comply: offer an outline, examples, or a study approach instead.
- If you are unsure, say so plainly and suggest how the student can verify.

CampusConnectICU features you can mention when relevant:
- Feed & Stories: posts, photos, likes, comments, campus updates.
- Live: real-time campus activity feed.
- Friends: find students by department/year, send friend requests, see similarity-ranked suggestions.
- Messaging: 1-on-1 and group chats, polls, voice notes, calls, and this AI chat.
- Profiles: skills, bio, verified student badges.
- Explore & Search: discover students, posts, and events.

Always stay helpful, respectful, and student-focused.`;

const GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"];

export function isLiveAIEnabled(): boolean {
  const key = (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
  return key.trim() !== "";
}

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

function buildGeminiContents(userPrompt: string, history: AIMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  const push = (role: GeminiContent["role"], text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${trimmed}`;
    } else {
      contents.push({ role, parts: [{ text: trimmed }] });
    }
  };

  const recent = history
    .filter((m) => !m.isError && m.id !== "ai_welcome")
    .slice(-12);
  for (const msg of recent) {
    push(msg.sender === "user" ? "user" : "model", msg.text);
  }

  const lastMsg = history[history.length - 1];
  if (!(lastMsg && lastMsg.sender === "user" && lastMsg.text.trim() === userPrompt.trim())) {
    push("user", userPrompt);
  }

  // Gemini requires the conversation to start with a user turn
  while (contents.length > 0 && contents[0].role !== "user") contents.shift();
  return contents;
}

/**
 * Generate AI response using Google Gemini API or Smart Campus Fallback
 */
export async function generateAIResponse(
  userPrompt: string,
  history: AIMessage[] = []
): Promise<string> {
  const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || "";

  if (geminiApiKey && geminiApiKey.trim() !== "") {
    const contents = buildGeminiContents(userPrompt, history);
    if (contents.length > 0) {
      for (const model of GEMINI_MODELS) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents,
                generationConfig: {
                  temperature: 0.7,
                  topP: 0.95,
                  topK: 40,
                  maxOutputTokens: 1024,
                },
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`Gemini ${model} error response:`, errorData);
            continue;
          }

          const data = await response.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText && generatedText.trim()) {
            return generatedText.trim();
          }
        } catch (err) {
          console.warn(`Gemini ${model} call failed, trying next model:`, err);
        }
      }
    }
  }

  // Fallback engine if no API key or network request fails
  return getSmartFallbackResponse(userPrompt, history);
}

// ─── LOCAL KNOWLEDGE ENGINE ───

interface KnowledgeEntry {
  id: string;
  keywords: string[];
  build: (prompt: string) => string;
}

const QUIZ_BANK: Array<{ q: string; options: string[]; answer: number; why: string }> = [
  {
    q: "What is the time complexity of binary search on a sorted array?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    answer: 1,
    why: "Each comparison halves the search space, so the number of steps grows logarithmically.",
  },
  {
    q: "Which data structure uses FIFO (first-in, first-out) ordering?",
    options: ["Stack", "Queue", "Binary tree", "Hash map"],
    answer: 1,
    why: "A queue enqueues at the tail and dequeues from the head, giving FIFO behaviour.",
  },
  {
    q: "What does the CPU primarily use for fast, temporary storage while executing instructions?",
    options: ["Hard disk", "Registers & cache", "SSD", "Virtual memory"],
    answer: 1,
    why: "Registers and caches sit closest to the CPU cores, making them the fastest storage tier.",
  },
  {
    q: "In SQL, which clause filters rows *before* aggregation?",
    options: ["HAVING", "ORDER BY", "WHERE", "GROUP BY"],
    answer: 2,
    why: "WHERE filters individual rows first; HAVING filters the grouped results afterwards.",
  },
  {
    q: "Derivative of x³ with respect to x is:",
    options: ["x²", "3x²", "3x", "x⁴/4"],
    answer: 1,
    why: "Power rule: d/dx xⁿ = n·xⁿ⁻¹, so 3·x².",
  },
  {
    q: "Which of these is NOT a valid JavaScript primitive type?",
    options: ["Symbol", "Undefined", "Object", "BigInt"],
    answer: 2,
    why: "Objects are reference types; everything else listed is a primitive.",
  },
  {
    q: "A process that is waiting for I/O but not ready to run is in which state?",
    options: ["Ready", "Running", "Blocked/Waiting", "Terminated"],
    answer: 2,
    why: "Blocked means the process cannot proceed until an external event (like I/O) completes.",
  },
  {
    q: "What is 2¹⁰?",
    options: ["512", "1024", "2048", "1000"],
    answer: 1,
    why: "Powers of 2: 2¹⁰ = 1024 (about 1 thousand in computing terms).",
  },
  {
    q: "Which protocol secures web traffic with encryption?",
    options: ["FTP", "HTTP", "HTTPS/TLS", "SMTP"],
    answer: 2,
    why: "HTTPS wraps HTTP in TLS, encrypting data between browser and server.",
  },
  {
    q: "In Python, what does list comprehension [x*2 for x in range(3)] produce?",
    options: ["[0, 2, 4]", "[2, 4, 6]", "[1, 2, 3]", "[0, 1, 2]"],
    answer: 0,
    why: "range(3) yields 0,1,2 and each value is doubled → [0, 2, 4].",
  },
  {
    q: "Which gas do plants absorb during photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    answer: 2,
    why: "Plants take in CO₂ and release O₂ as a by-product.",
  },
  {
    q: "The base of the natural logarithm is:",
    options: ["10", "π", "e", "i"],
    answer: 2,
    why: "ln uses base e ≈ 2.71828.",
  },
];

function pickQuiz(count: number) {
  const pool = [...QUIZ_BANK];
  const picked: typeof QUIZ_BANK = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function buildQuizResponse(): string {
  const questions = pickQuiz(3);
  const letters = ["A", "B", "C", "D"];
  const body = questions
    .map((q, i) => {
      const options = q.options.map((o, oi) => `${letters[oi]}. ${o}`).join("\n");
      return `**Q${i + 1}.** ${q.q}\n${options}`;
    })
    .join("\n\n");
  const answers = questions
    .map((q, i) => `**Q${i + 1}:** ${letters[q.answer]}. ${q.options[q.answer]} — ${q.why}`)
    .join("\n");
  return `⚡ **Practice Quiz — 3 questions**\n\n${body}\n\n---\n\n✅ **Answer key**\n${answers}\n\nWant a harder set, or a quiz on a specific subject (math, programming, networking)?`;
}

function safeMathEval(expr: string): number | null {
  let pos = 0;
  const src = expr.replace(/\s+/g, "");

  const peek = () => src[pos];
  const eat = (ch: string) => {
    if (src[pos] === ch) {
      pos++;
      return true;
    }
    return false;
  };

  function parseExpression(): number {
    let value = parseTerm();
    for (;;) {
      if (eat("+")) value += parseTerm();
      else if (eat("-")) value -= parseTerm();
      else return value;
    }
  }

  function parseTerm(): number {
    let value = parsePower();
    for (;;) {
      if (eat("*")) value *= parsePower();
      else if (eat("/")) value /= parsePower();
      else if (eat("%")) value %= parsePower();
      else return value;
    }
  }

  function parsePower(): number {
    const base = parseUnary();
    if (eat("^")) return Math.pow(base, parsePower());
    return base;
  }

  function parseUnary(): number {
    if (eat("-")) return -parseUnary();
    if (eat("+")) return parseUnary();
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (eat("(")) {
      const value = parseExpression();
      eat(")");
      return value;
    }
    const start = pos;
    while (pos < src.length && /[0-9.]/.test(src[pos])) pos++;
    if (start === pos) throw new Error("unexpected token");
    const n = parseFloat(src.slice(start, pos));
    if (Number.isNaN(n)) throw new Error("bad number");
    return n;
  }

  try {
    const result = parseExpression();
    if (pos !== src.length || !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

function tryMathResponse(prompt: string): string | null {
  const lower = prompt.toLowerCase();

  const percentOf = lower.match(/(-?\d+(?:\.\d+)?)\s*%\s*(?:of\s|out of\s)*(-?\d+(?:\.\d+)?)/);
  if (percentOf && (lower.includes("%") || lower.includes("percent"))) {
    const pct = parseFloat(percentOf[1]);
    const base = parseFloat(percentOf[2]);
    const result = (pct / 100) * base;
    return `🧮 **${pct}% of ${base} = ${round(result)}**\n\nCalculation: \`${pct}/100 × ${base} = ${round(result)}\`\n\nNeed the reverse (what percent is X of Y)? Just ask!`;
  }

  const cleaned = prompt
    .replace(/what\s+is|whats|calculate|compute|solve|how much is|evaluate|equals?/gi, " ")
    .replace(/[?=]/g, " ")
    .trim();

  if (!/\d/.test(cleaned) || !/[+\-*/^%]/.test(cleaned)) return null;
  if (!/^[\d\s+\-*/^%().]+$/.test(cleaned)) return null;

  const value = safeMathEval(cleaned);
  if (value === null) return null;

  const rounded = round(value);
  return `🧮 **Result: ${rounded}**\n\nStep-by-step: \`${cleaned.trim()} = ${rounded}\`\n\nI can also show you the order of operations used, or generate similar practice problems — just say the word!`;
}

function round(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 10000) / 10000);
}

function tryGpaResponse(prompt: string): string | null {
  if (!/\bgpa\b|grade point|grades?\b/i.test(prompt)) return null;

  const numbers = (prompt.match(/\b\d(?:\.\d+)?\b/g) || [])
    .map(Number)
    .filter((n) => n >= 0 && n <= 4.5);

  if (numbers.length >= 2) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    const gpa = sum / numbers.length;
    const band =
      gpa >= 3.7 ? "Excellent — first-class distinction territory 🏆"
      : gpa >= 3.3 ? "Very strong — aim to keep this up!"
      : gpa >= 3.0 ? "Solid — good standing for internships and scholarships."
      : gpa >= 2.5 ? "Passing, with room to climb. Focus on your highest-credit courses."
      : "This term needs a recovery plan — let's build one together.";
    const list = numbers.join(", ");
    return `📊 **GPA estimate: ${gpa.toFixed(2)}**\n\n- Grades entered: ${list}\n- Formula: total quality points ÷ number of courses = ${sum} ÷ ${numbers.length}\n- Standing: ${band}\n\n💡 *Tip:* courses with more credit hours move your GPA the most. Share credit hours per course and I can compute a weighted GPA instead.`;
  }

  return `📊 **How GPA works**

- **Scale (4.0):** A = 4.0, B = 3.0, C = 2.0, D = 1.0, F = 0.0 (with +/- modifiers like B+ = 3.3).
- **Formula:** \`GPA = total quality points ÷ total credit hours\`
  - Quality point = grade point × credit hours for that course.
- **Weighted vs unweighted:** credit hours decide how much each course counts.

Example: *A (4) in a 3-credit course + B (3) in a 2-credit course* → (12 + 6) ÷ 5 = **3.60**.

Send me your grades (and credit hours if you have them) and I'll calculate it for you!`;
}

function tryEmailResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  let scenario = "an extension on an assignment";
  let body = `I am writing to respectfully request a short extension on **[Assignment Name]**, originally due on **[Date]**.

Unfortunately, [brief reason — e.g., unexpected illness / a family emergency], which has temporarily affected my ability to submit work of my usual standard.

Would it be possible to submit by **[Proposed New Date]**? I am happy to share supporting documentation if needed.`;

  if (lower.includes("grade") || lower.includes("mark") || lower.includes("recheck") || lower.includes("remark")) {
    scenario = "a re-check of an assessment grade";
    body = `I hope this message finds you well. I recently received my grade for **[Assessment/Course]** and I would like to respectfully request a re-check of the marking.

I have reviewed the rubric and believe there may be an area worth double-checking: **[specific question/section]**.

Would you be open to taking another look when convenient? I would greatly appreciate any feedback that could help me improve.`;
  } else if (lower.includes("meet") || lower.includes("meeting") || lower.includes("office hour") || lower.includes("advice") || lower.includes("guidance")) {
    scenario = "a short meeting during office hours";
    body = `I am a student in your **[Course Code]** class and I would appreciate the chance to discuss **[topic — e.g., my project direction / a concept I'm struggling with]**.

Would you have 15–20 minutes available during office hours this week? I am flexible and happy to work around your schedule. I will come prepared with specific questions so we can use the time efficiently.`;
  } else if (lower.includes("recommend") || lower.includes("reference")) {
    scenario = "a letter of recommendation";
    body = `I am applying for **[program / internship / scholarship]** and, having been a student in your **[Course]** class, I would be honoured if you could write a letter of recommendation on my behalf.

I have attached my CV, transcript, and a short summary of the work I did in your course for your convenience. The deadline is **[Date]**, and I would be glad to provide anything else you need.`;
  }

  return `✉️ **Draft email — ${scenario}**

**Subject:** [Course Code] – ${scenario.charAt(0).toUpperCase() + scenario.slice(1)}: [Your Name]

Dear Professor [Name],

${body}

Thank you very much for your time and consideration.

Best regards,
**[Your Name]**
Student ID: [Your ID]
[Your Program / Year]`;
}

function tryCodeResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  const language = lower.includes("python") ? "Python"
    : lower.includes("java") && !lower.includes("javascript") ? "Java"
    : lower.includes("javascript") || lower.includes("js") ? "JavaScript"
    : lower.includes("react") ? "React/TypeScript"
    : lower.includes("c++") || lower.includes("cpp") ? "C++"
    : lower.includes("sql") ? "SQL"
    : "your language";

  return `💻 **Debugging playbook (${language})**

Work through these in order — most bugs die here:

1. **Reproduce reliably.** Note the exact input and the exact error message.
2. **Read the error out loud.** File, line number, and the *type* of error tell you 80% of the story.
3. **Print your assumptions.** Log inputs, shapes, and lengths right before the failure:
\`\`\`${language === "SQL" ? "sql" : "ts"}
// inspect what actually arrives, not what you expect
console.log("input:", JSON.stringify(data, null, 2));
\`\`\`
4. **Halve the search space.** Comment out half the flow; if the bug persists, look at what remains.
5. **Check the edges.** Empty arrays, \`null\`/undefined, 0, duplicate keys, and off-by-one loops.

Paste the error message (or the smallest failing snippet) here and I'll walk through it with you line by line.`;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "study-plan",
    keywords: ["study schedule", "study plan", "exam week", "revision plan", "timetable", "how to study", "study routine", "study tips"],
    build: () => `📚 **A study plan that actually sticks**

**1. Block your week first**
- Map fixed commitments (classes, work), then place 2–3 focused study blocks per day around them.
- Hardest subject when your energy is highest — usually morning.

**2. Use active methods, not re-reading**
- **Pomodoro:** 25 min focus + 5 min break; longer break after 4 rounds.
- **Active recall:** close the notes, write everything you remember, then fill gaps.
- **Spaced repetition:** revisit material after 1 day → 3 days → 1 week.

**3. Sample exam-week day**
| Block | Time | Task |
|---|---|---|
| 1 | 9:00–10:30 | Hardest topic (practice problems) |
| 2 | 11:00–12:00 | Flashcard review (spaced repetition) |
| 3 | 14:00–15:30 | Second subject (past paper questions) |
| 4 | 16:00–16:45 | Weak areas only |
| 5 | 20:00–20:30 | Light recap + plan tomorrow |

Study groups make great use of CampusConnectICU — message classmates to schedule one!

Want me to turn this into a day-by-day plan? Tell me your exam dates and subjects.`,
  },
  {
    id: "notes",
    keywords: ["summarize", "summarise", "lecture notes", "note taking", "note-taking", "cornell", "condense notes", "rewrite notes"],
    build: () => `📝 **How to summarize lecture notes so they stick**

**The Cornell method (5 minutes per lecture):**
1. **Split the page:** narrow cue column (left), notes column (right), summary bar (bottom).
2. **During class:** jot only ideas and evidence in the notes column — no full sentences.
3. **After class:** write questions/keywords in the cue column (this is your recall test).
4. **Bottom bar:** 2–3 sentence summary in your own words.

**When condensing a dense chapter:**
- Keep: definitions, formulas, cause→effect links, examples you'd forget.
- Cut: repetitions, hedging, anything you could re-derive.
- Test: cover the notes and explain the topic aloud in 60 seconds.

**Digital tip:** keep one note per topic, title it as a question ("Why does TCP handshake take 3 steps?"), and answer it in the first line.

Paste a chunk of your notes here and I'll summarize it into clean bullet points for you.`,
  },
  {
    id: "concept",
    keywords: ["explain", "what is", "concept", "in simple terms", "understand", "difference between", "vs", "meaning of"],
    build: (prompt) => `💡 **Let's break it down: "${prompt.replace(/\s+/g, " ").trim().slice(0, 80)}"**

A reliable way to understand any new concept — the **4-layer method**:

1. **Definition** — one sentence, no jargon. If you can't say it simply, you don't have it yet.
2. **Analogy** — map it onto something you already know (*"A cache is like a desk: keep what you use often within reach"*).
3. **Mechanism** — how it works step by step, and what problem it solves.
4. **Example & non-example** — one case where it applies, one where it doesn't.

**Self-test:** explain it to an imaginary 12-year-old, then find the one sentence where your explanation got fuzzy — that's your gap.

Tell me the exact concept (e.g. *"database indexing"*, *"eigenvectors"*, *"HTTP vs HTTPS"*) and I'll walk you through all four layers.`,
  },
  {
    id: "procrastination",
    keywords: ["procrastinate", "procrastination", "can't start", "cant start", "motivation", "no motivation", "lazy", "distracted", "focus", "concentrate"],
    build: () => `🔥 **Beat procrastination — start in 60 seconds**

It's usually not laziness — it's **ambiguity or fear of a bad first attempt**. Fix the input, not the willpower:

1. **Shrink the first step.** Not "write the essay" → *"open the doc and write one bad sentence."* Momentum beats motivation.
2. **2-minute rule.** If it takes under 2 minutes, do it now. For bigger tasks, commit to just 2 minutes — you'll usually continue.
3. **Remove the friction.** Phone in another room, one tab, one document. Willpower is a bad filter; environment is a good one.
4. **Body double.** Study "together" with classmates in a CampusConnectICU group call or share a daily goal in chat — being watched helps.
5. **Reward completion, not effort.** Finish a block → then the treat.

**If it still feels huge:** write every subtask on its own line and do only the first one. Report back — I'll help you plan the rest.`,
  },
  {
    id: "email",
    keywords: ["email", "professor", "lecturer", "extension", "ask for an extension", "write to", "draft a message", "recommendation", "reference letter"],
    build: (p) => tryEmailResponse(p),
  },
  {
    id: "coding",
    keywords: ["code", "debug", "bug", "error", "python", "java", "javascript", "react", "typescript", "sql", "c++", "programming", "function", "compiler", "stack trace"],
    build: (p) => tryCodeResponse(p),
  },
  {
    id: "quiz",
    keywords: ["quiz", "practice questions", "multiple-choice", "mcq", "test my knowledge", "questions on", "past paper", "mock test"],
    build: () => buildQuizResponse(),
  },
  {
    id: "gpa",
    keywords: ["gpa", "grade point", "calculate my grades", "my grades", "cgpa", "class grade"],
    build: (p) => tryGpaResponse(p) || "",
  },
  {
    id: "career",
    keywords: ["resume", "cv", "interview", "internship", "job", "career", "first job", "hiring", "linkedin", "portfolio"],
    build: () => `💼 **From student to hired — a practical checklist**

**Resume (keep it 1 page):**
- **Impact over duties:** *"Built a campus event app used by 200 students"* beats *"Responsible for app development."*
- Use **Action verb + what + measurable result** for every bullet.
- Include: projects, course work, societies, volunteering — all count early on.
- Export as **PDF**, name it \`Firstname-Lastname-Resume.pdf\`.

**Standing out without experience:**
1. Ship 2–3 real projects (put them on GitHub with a clear README).
2. Contribute to one open-source issue or campus system.
3. Join a team/competition — hackathons, case competitions.

**Interview prep (the 70% method):**
- Prepare 6 stories using **STAR** (Situation, Task, Action, Result): a challenge, a failure, a team conflict, a win, something you learned, why this role.
- Practice saying them out loud — 3 times each.
- Always end with a thoughtful question: *"What does success look like in the first 90 days?"*

Share your target role and I'll tailor a resume outline and 5 likely interview questions.`,
  },
  {
    id: "wellbeing",
    keywords: ["stress", "anxious", "anxiety", "overwhelmed", "burnout", "tired", "sleep", "mental health", "homesick", "depressed", "worried", "panic"],
    build: () => `🌱 **You're not behind — let's steady the ship**

Feeling overwhelmed usually means too many open loops, not too little ability.

**Right now (5 minutes):**
1. Box breathing: inhale 4s → hold 4s → exhale 4s → hold 4s. Repeat ×4.
2. Write down *everything* on your mind — uncensored. Get it out of your head.
3. Circle the ONE thing that matters most today. Only that one.

**This week:**
- **Sleep is non-negotiable:** consistent wake time fixes more than willpower ever will.
- **Move 20 minutes a day** — a walk beats another hour of guilty scrolling.
- **Protect one blank hour** with no study and no guilt.
- **Talk to someone:** a friend on CampusConnectICU, a classmate, or your university's counseling service — that's what they're there for.

If low mood persists for weeks, please reach out to a professional or your campus wellbeing office. Studying matters; you matter more.

Which part is weighing on you most — exams, workload, or something else?`,
  },
  {
    id: "group-work",
    keywords: ["group project", "group work", "teamwork", "teammate", "collaboration", "presentation", "public speaking", "slides", "oral exam"],
    build: () => `👥 **Group projects & presentations that don't fall apart**

**Set these up in the first 24 hours:**
1. **One deliverable owner** — who submits the final file (avoids "I thought you were uploading it").
2. **Split by output, not by topic** — research / build / write / slides, so gaps are visible.
3. **Deadline = 2 days before the real one** — buffers save friendships.
4. **One shared doc + one check-in** (15 min, twice a week). CampusConnectICU group chat works perfectly for this.

**If someone isn't pulling their weight:**
- Assume good intent, message privately with a *specific* ask and date.
- If it continues, escalate politely with facts (what's missing, when you asked) — most rubrics reward documented contribution anyway.

**Presentation day:**
- First 30 seconds = your entire thesis. Say it, then prove it.
- One idea per slide, giant fonts, no paragraphs.
- Practice the opening and closing **out loud 3×** — nerves hit hardest at the start and end.

Want me to outline your slides or draft the group contract message?`,
  },
  {
    id: "integrity",
    keywords: ["write my essay", "do my homework", "do my assignment", "take my exam", "cheat", "plagiarism", "plagiarize", "assignment for me"],
    build: () => `🎓 **I'll help you learn it — not submit it for you**

Doing your whole assignment for you would backfire: you'd lose the skill *and* risk academic misconduct, which can cost credits or worse.

Here's how I can help instead — and you'll still finish faster:

1. **Outline** — I'll structure the essay/assignment with a thesis and section plan.
2. **Examples** — I'll show a strong sample paragraph you can model your style on.
3. **Explain & quiz** — I'll explain the tricky parts and test you until it clicks.
4. **Review** — paste your draft and I'll give direct feedback like a marker would.

For citations and paraphrasing, your university library's writing guide is the authority — when in doubt, cite.

Which subject and what's the question? Let's get started on option 1.`,
  },
  {
    id: "campus-app",
    keywords: ["campusconnect", "campus connect", "this app", "app features", "how do i use", "verified badge", "friend request", "live feed", "stories", "explore"],
    build: () => `🎓 **Getting the most out of CampusConnectICU**

- **Feed & Stories** — post updates, photos, and campus news; like and comment on others'.
- **Live** — see what's happening on campus in real time.
- **Friends** — find students by department and year; check similarity-ranked suggestions to find your people.
- **Messaging** — 1-on-1 and group chats with polls, voice notes, and calls. Type **@ai** in any chat to summon me there too.
- **Campus AI (this chat)** — study help, drafts, quizzes, explanations.
- **Profiles & Verification** — add skills and bio; get your verified student badge.

**Pro tips:** reset my memory anytime from the menu, tap **Listen** on any answer to hear it read aloud, and use the quick chips below for one-tap prompts.

Is there a specific feature you want to set up?`,
  },
  {
    id: "social",
    keywords: ["make friends", "making friends", "lonely", "networking", "meet people", "social", "introvert", "belong"],
    build: () => `🤝 **Finding your people on campus**

1. **Repeated proximity beats forced socializing.** Join 1–2 clubs/societies and show up consistently — belonging comes from *repeat* contact, not perfect conversations.
2. **Use what you already share.** Same course, same department, same year — CampusConnectICU's Explore and similarity-ranked friend suggestions are built for exactly this.
3. **Have a reason to talk.** "Hey, did you get question 3?" works better than "wanna be friends?"
4. **Invite, don't wait.** Suggest something small and specific: coffee after the 9am lecture, study in the library Thursday.
5. **Quality over quantity.** Two reliable friends beat twenty contacts.

**For introverts:** one deep conversation per week is a win. You don't need to be the loudest person in the room.

Want ideas for clubs or a conversation starter for someone in your class?`,
  },
  {
    id: "money",
    keywords: ["scholarship", "funding", "bursary", "tuition", "fees", "student budget", "save money", "part-time job", "financial"],
    build: () => `💰 **Scholarships & student money moves**

**Scholarship hunting (do this monthly):**
- Check your faculty/department board first — smaller awards have far less competition.
- Set an alert on the university financial aid page + national education portals.
- Track deadlines in one spreadsheet: name, amount, deadline, status, link.

**Application edge:**
- Lead with impact, not need alone: results, leadership, community service.
- Reuse a strong core essay, tailored in 3 sentences per scholarship.
- Ask for recommendation letters **3 weeks** early — always.

**Day-to-day budget:**
- Pay yourself first: even a tiny weekly savings habit beats tracking every coffee.
- Student discounts on software (GitHub Student pack, JetBrains, AWS Educate, Figma) are often worth more than any coupon.

Tell me your department and year — I can suggest categories of scholarships worth targeting (merit, need, women-in-STEM, sports, local community).`,
  },
  {
    id: "time",
    keywords: ["time management", "too much time", "busy", "balancing", "balance", "work-life", "schedule", "planner", "too many", "behind schedule"],
    build: () => `⏰ **Balancing academics and campus life**

**The 3-list method (10 minutes, today):**
1. **Must-do** — deadlines, shifts, fixed commitments. Put them in the calendar first.
2. **Should-do** — gym, clubs, side projects. Schedule 3–4 slots; protect them like classes.
3. **Nice-to-do** — everything else. Explicitly decide "not now" so it stops nagging you.

**Rules that make it work:**
- **Sunday planning, 15 minutes.** Week planned > week survived.
- **Batch similar tasks** — all readings together, all errands together.
- **Say no strategically.** Every yes is a no to something else.
- **Buffer blocks.** Leave 30 minutes free between big commitments; life will use it.

**Energy > time:** match hard tasks to your best hours, and never schedule back-to-back deep work — rotation restores focus.

What does your typical week look like? I'll help you rebuild it on one screen.`,
  },
];

const GREETING_KEYWORDS = ["hello", "hi ", "hey", "yo ", "good morning", "good afternoon", "good evening", "who are you", "what are you", "your name"];
const THANKS_KEYWORDS = ["thanks", "thank you", "appreciate", "cheers", "bye", "goodbye", "see you"];

function scoreEntry(entry: KnowledgeEntry, lower: string): number {
  let score = 0;
  for (const kw of entry.keywords) {
    if (lower.includes(kw)) {
      score += kw.includes(" ") ? 3 : 1;
      if (entry.keywords.length > 0 && kw === entry.keywords[0]) score += 1;
    }
  }
  return score;
}

/**
 * Intelligent local fallback response generator tailored for students.
 * Uses a scored knowledge base so overlapping topics pick the best match
 * instead of whatever check happens to run first.
 */
function getSmartFallbackResponse(prompt: string, history: AIMessage[] = []): string {
  const lower = prompt.toLowerCase().trim();

  if (!lower) {
    return `👋 Ask me anything — study plans, code, concepts, emails, or CampusConnectICU features.`;
  }

  // Follow-up nudges when the message is just "more" / "why" / "example"
  const isFollowUp = lower.split(/\s+/).length <= 3 && /^(more|continue|why|how so|example|really|tell me more|go on|details|explain)\b/.test(lower);
  if (isFollowUp && history.length > 1) {
    return `🔍 **Here's more depth on that**

- **The core idea:** break it into definitions → mechanism → example, then test yourself without looking.
- **Why it matters:** understanding the *why* makes recall far more reliable in exams.
- **Try this:** explain it back to me in 2–3 sentences and I'll tell you what's missing or sharpen it.

Which part should I expand — the theory, a worked example, or a practice question?`;
  }

  const math = tryMathResponse(prompt);
  if (math) return math;

  let best: KnowledgeEntry | null = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const score = scoreEntry(entry, lower);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (best && bestScore >= 1) {
    const built = best.build(prompt);
    if (built) return built;
  }

  if (GREETING_KEYWORDS.some((k) => lower === k.trim() || lower.startsWith(k) || lower.includes(k))) {
    return `👋 **Hey! I'm Campus AI.**

I'm the built-in assistant on **CampusConnectICU** — here for:

- 📚 **Study plans, exam prep & note summarizing**
- 🧠 **Explaining any concept, step by step**
- 💻 **Debugging code & solving math**
- ✉️ **Drafting emails to professors**
- 💼 **Resumes, internships & interview prep**
- 🎓 **Campus life, wellbeing & using this app**

What are you working on today?`;
  }

  if (THANKS_KEYWORDS.some((k) => lower.includes(k))) {
    return `😊 Anytime! Good luck with your studies — come back whenever you're stuck. I've got you. 🎓`;
  }

  // Jokes & small talk keep the assistant feeling human
  if (lower.includes("joke") || lower.includes("funny")) {
    return `😄 **Here's one for the study break:**

> Why do programmers prefer dark mode?
> Because light attracts bugs. 🐛

Want a subject-themed one (math, physics, CS)? Or should we get back to hitting the books?`;
  }

  // Generic but useful structure instead of a dead end
  const liveHint = isLiveAIEnabled()
    ? ""
    : `\n\n*(Tip: add \`VITE_GEMINI_API_KEY\` to your \`.env\` to unlock full live AI answers instead of offline mode.)*`;

  return `✨ **Campus AI**

I want to give you a genuinely useful answer — help me aim:

- **Be specific:** *"Explain database indexing like I'm new to SQL"* works better than *"tell me about databases."*
- **Share the material:** paste your notes, code, or error message and I'll work directly on it.
- **Pick a lane:** I'm strongest at 📚 study planning · 🧠 concept explanations · 💻 code & math · ✉️ emails · 💼 career prep.

What's the subject and what have you tried so far?${liveHint}`;
}
