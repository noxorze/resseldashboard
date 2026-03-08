"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function FinancesPage() {
  const router = useRouter();

  const [pending, setPending] = useState(0);
  const [available, setAvailable] = useState(0);
  const [withdrawn, setWithdrawn] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("finances")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          setMessage("Erreur chargement : " + error.message);
        }

        if (data) {
          setPending(Number(data.pending_balance || 0));
          setAvailable(Number(data.available_balance || 0));
          setWithdrawn(Number(data.total_withdrawn || 0));
        }
      } catch (error) {
        console.error("Erreur finances:", error);
        setMessage("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleSave = async () => {
    try {
      setMessage("Sauvegarde...");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Tu dois être connecté.");
        return;
      }

      const { error } = await supabase.from("finances").upsert(
        {
          user_id: session.user.id,
          pending_balance: pending,
          available_balance: available,
          total_withdrawn: withdrawn,
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        setMessage("Erreur sauvegarde : " + error.message);
        return;
      }

      setMessage("Sauvegardé.");
    } catch (error) {
      console.error("Erreur sauvegarde finances:", error);
      setMessage("Erreur inattendue.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Chargement...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500">
              Premium Revendeur OS
            </p>
            <h1 className="mt-3 text-3xl font-bold">Gestion financière</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Modifie facilement les montants manuels de ton compte.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
          >
            Retour
          </Link>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <label className="text-sm text-zinc-400">Argent en attente</label>
            <input
              type="number"
              value={pending}
              onChange={(e) => setPending(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none transition focus:border-red-500"
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <label className="text-sm text-zinc-400">Argent disponible</label>
            <input
              type="number"
              value={available}
              onChange={(e) => setAvailable(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none transition focus:border-red-500"
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <label className="text-sm text-zinc-400">Argent transféré</label>
            <input
              type="number"
              value={withdrawn}
              onChange={(e) => setWithdrawn(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none transition focus:border-red-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500"
          >
            Sauvegarder
          </button>

          {message && <p className="text-sm text-zinc-400">{message}</p>}
        </div>
      </div>
    </main>
  );
}