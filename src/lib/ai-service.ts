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
];

const SYSTEM_PROMPT = `You are Campus AI, an intelligent, empathetic, and highly capable AI assistant built into the CampusConnectICU university app (modeled like Meta AI in WhatsApp).
Your goal is to support university students with academic learning, study organization, campus guidance, coding/math problem solving, career advice, and everyday student life.

Tone & Style Guidelines:
- Be concise, friendly, encouraging, and clear.
- Use clean Markdown formatting (bullet points, bold headers, code blocks when applicable).
- Keep responses readable on mobile screens (avoid huge walls of text).
- Use helpful emojis where appropriate.
- If asked technical or coding questions, provide accurate explanations with concise code snippets.
- If asked about campus features, remind them about CampusConnectICU features like student posts, live feeds, direct messaging, and friend connections.`;

/**
 * Generate AI response using Google Gemini API or Smart Campus Fallback
 */
export async function generateAIResponse(
  userPrompt: string,
  history: AIMessage[] = []
): Promise<string> {
  const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || "";

  if (geminiApiKey && geminiApiKey.trim() !== "") {
    try {
      // Format chat history for Gemini API
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: "model",
          parts: [{ text: "Hello! I am Campus AI, your assistant on CampusConnectICU. How can I help you with your studies or campus life today? ✨" }],
        },
      ];

      // Add recent relevant message history
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }

      // Add current user prompt
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Gemini API error response:", errorData);
        return getSmartFallbackResponse(userPrompt);
      }

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText && generatedText.trim()) {
        return generatedText.trim();
      }
    } catch (err) {
      console.warn("Gemini API call failed, using intelligent campus fallback:", err);
    }
  }

  // Fallback engine if no API key or network request fails
  return getSmartFallbackResponse(userPrompt);
}

/**
 * Intelligent local fallback response generator tailored for students
 */
function getSmartFallbackResponse(prompt: string): string {
  const lower = prompt.toLowerCase().trim();

  if (lower.includes("gpa") || lower.includes("grade") || lower.includes("calculate")) {
    return `📊 **Understanding & Calculating your GPA**

Grade Point Average (GPA) measures your academic achievement:
- **Grade Scale**: A (4.0), B (3.0), C (2.0), D (1.0), F (0.0).
- **Formula**: \`GPA = Total Quality Points / Total Credit Hours\`

💡 *Tip*: Focus on high-credit courses as they impact your cumulative GPA most! Need help calculating specific course grades? Let me know your course credits & grades!`;
  }

  if (lower.includes("study") || lower.includes("schedule") || lower.includes("exam") || lower.includes("quiz")) {
    return `📚 **Smart Campus Study Plan Strategy**

1. **Pomodoro Method**: 25 mins focus + 5 mins rest. Repeat 4 times.
2. **Active Recall**: Test yourself with flashcards rather than re-reading notes.
3. **Spaced Repetition**: Review material 1 day, 3 days, and 1 week after class.
4. **Group Study**: Connect with classmates right here on **CampusConnectICU** to form study groups!

Would you like me to generate a practice quiz topic or study checklist for you? ✍️`;
  }

  if (lower.includes("email") || lower.includes("professor") || lower.includes("extension") || lower.includes("doctor")) {
    return `✉️ **Sample Email to Professor**

**Subject**: *[Course Code] - Extension Request: [Your Name]*

Dear Professor [Name],

I hope this email finds you well. I am writing to respectfully request a short extension on the upcoming **[Assignment Name]** due on [Date]. 

Unfortunately, [brief reason, e.g., unexpected illness / personal issue], which has temporarily impacted my ability to complete the work to my usual standard.

Would it be possible to submit it by [Proposed Date]? I appreciate your understanding and time.

Best regards,  
**[Your Name]**  
Student ID: [Your ID]`;
  }

  if (lower.includes("code") || lower.includes("python") || lower.includes("java") || lower.includes("react") || lower.includes("bug")) {
    return `💻 **Campus AI Code Helper**

Here are 3 key debugging strategies for assignments:
\`\`\`ts
// 1. Log inputs and edge cases early
console.log("Input payload:", data);

// 2. Wrap async operations safely
try {
  const result = await fetchData();
} catch (error) {
  console.error("Caught runtime exception:", error);
}
\`\`\`

Paste your specific code block or error message here, and I'll help you debug it step-by-step! 🚀`;
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("who are you")) {
    return `👋 **Hey there! I'm Campus AI.**

I'm your built-in university assistant on **CampusConnectICU**! 🎓

Here is what I can help you with:
- 📚 **Study strategies & exam tips**
- 📝 **Summarizing notes & drafting emails**
- 💻 **Debugging code & math assistance**
- 🎓 **Campus life & productivity hacks**

What are you working on today? Feel free to ask anything! ✨`;
  }

  if (lower.includes("campus") || lower.includes("icu") || lower.includes("app") || lower.includes("feature")) {
    return `🎓 **Welcome to CampusConnectICU!**

You can use CampusConnectICU to:
- 💬 **Messaging**: Chat 1-on-1, join groups, or ask **Campus AI** anytime!
- 📢 **Feed & Posts**: Share updates, photos, videos, and campus news.
- 🤝 **Friends**: Discover and connect with fellow students across departments.
- 🔒 **Secure Verification**: Get verified student badges and protected chats.

Is there a specific feature or study topic you'd like to explore?`;
  }

  // General comprehensive response
  return `✨ **Campus AI Assistant**

That's a great question! Here is a helpful perspective:

- **Key Insight**: Break down complex problems into smaller manageable steps.
- **Actionable Advice**: Organize your notes, double-check references, and collaborate with your peers.
- **Next Step**: Let me know if you want me to expand on a specific part, summarize key points, or quiz you on this topic!

*(Note: To unlock live full-generative AI streaming, add your \`VITE_GEMINI_API_KEY\` to your \`.env\` file).*`;
}
