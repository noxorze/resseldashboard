"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Compte créé. Tu peux maintenant te connecter.");
        setIsSignup(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-[0_0_40px_rgba(220,38,38,0.08)]">
        <p className="text-[11px] uppercase tracking-[0.35em] text-red-500">
          Premium Revendeur
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          {isSignup ? "Créer un compte" : "Connexion"}
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Accède à ton tableau de bord revendeur.
        </p>

        <form onSubmit={handleAuth} className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {loading
              ? "Chargement..."
              : isSignup
              ? "Créer mon compte"
              : "Se connecter"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
          }}
          className="mt-5 text-sm text-zinc-400 transition hover:text-red-400"
        >
          {isSignup ? "J’ai déjà un compte" : "Créer un compte"}
        </button>
      </div>
    </main>
  );
}