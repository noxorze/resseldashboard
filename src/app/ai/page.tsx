"use client";

import Link from "next/link";
import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AIPage() {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Page IA temporairement simplifiée pour remettre le site en état. Tu peux continuer à utiliser le dashboard, les ventes, les imports et les finances.",
    },
  ]);

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Réponse indisponible.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erreur de connexion.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500">
              Premium Revendeur OS
            </p>
            <h1 className="mt-3 text-3xl font-bold">Chat IA</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Version temporaire de secours.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
          >
            Retour
          </Link>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="h-[420px] overflow-y-auto rounded-2xl border border-zinc-800 bg-black/50 p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${
                      msg.role === "user"
                        ? "bg-red-600 text-white"
                        : "border border-zinc-800 bg-zinc-950 text-zinc-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                    Chargement...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              placeholder="Message"
              className="flex-1 rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
            />

            <button
              onClick={handleSend}
              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Envoyer
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}