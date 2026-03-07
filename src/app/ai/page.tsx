"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Sale = {
  id: string;
  product_name: string;
  purchase_price: number;
  sale_price: number;
  fees: number;
  profit: number;
  created_at: string;
  sale_date?: string | null;
  buyer_name?: string | null;
  status?: string | null;
  source?: string | null;
};

type FinanceRow = {
  pending_balance: number;
  available_balance: number;
  total_withdrawn: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AIPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [finances, setFinances] = useState<FinanceRow | null>(null);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Salut. Je suis ton assistant IA revendeur. Pose-moi tes questions sur l’achat, la revente, les marges, Vinted, le pricing, la rentabilité ou ta stratégie.",
    },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          setError("Erreur session : " + sessionError.message);
          setLoading(false);
          return;
        }

        if (!session) {
          router.push("/login");
          return;
        }

        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (salesError) {
          setError("Erreur ventes : " + salesError.message);
          setLoading(false);
          return;
        }

        const { data: financesData, error: financesError } = await supabase
          .from("finances")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (financesError) {
          setError("Erreur finances : " + financesError.message);
          setLoading(false);
          return;
        }

        setSales(salesData || []);
        setFinances(
          financesData || {
            pending_balance: 0,
            available_balance: 0,
            total_withdrawn: 0,
          }
        );
      } catch (err) {
        console.error(err);
        setError("Erreur inattendue pendant le chargement.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.sale_price || 0),
      0
    );

    const totalProfit = sales.reduce(
      (sum, sale) => sum + Number(sale.profit || 0),
      0
    );

    const averageSale = sales.length ? totalRevenue / sales.length : 0;
    const averageMargin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;

    const importedCount = sales.filter(
      (sale) => sale.source === "vinted_orders_import"
    ).length;

    const bestSale =
      sales.length > 0
        ? [...sales].sort((a, b) => Number(b.profit) - Number(a.profit))[0]
        : null;

    return {
      salesCount: sales.length,
      totalRevenue,
      totalProfit,
      averageSale,
      averageMargin,
      importedCount,
      bestSale,
    };
  }, [sales]);

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            salesCount: stats.salesCount,
            totalRevenue: stats.totalRevenue,
            totalProfit: stats.totalProfit,
            averageMargin: stats.averageMargin,
            averageSale: stats.averageSale,
            importedCount: stats.importedCount,
            pendingBalance: Number(finances?.pending_balance || 0),
            availableBalance: Number(finances?.available_balance || 0),
            totalWithdrawn: Number(finances?.total_withdrawn || 0),
            bestSaleName: stats.bestSale?.product_name || null,
            bestSaleProfit: Number(stats.bestSale?.profit || 0),
          },
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Je n'ai pas réussi à répondre.",
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erreur de connexion avec l’IA.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-4 text-sm text-zinc-300">
          Chargement de la page IA...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500">
              Premium Revendeur OS
            </p>
            <h1 className="mt-3 text-3xl font-bold">Chat IA revendeur</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Pose tes questions sur l’achat, la revente, les marges, Vinted et ta stratégie.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
          >
            Retour
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Résumé rapide</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Ventes" value={`${stats.salesCount}`} />
              <InfoRow label="CA total" value={`${stats.totalRevenue.toFixed(2)} €`} />
              <InfoRow label="Bénéfice" value={`${stats.totalProfit.toFixed(2)} €`} />
              <InfoRow label="Marge moyenne" value={`${stats.averageMargin.toFixed(1)} %`} />
              <InfoRow label="Argent dispo" value={`${Number(finances?.available_balance || 0).toFixed(2)} €`} />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Questions rapides</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <QuickAskButton onClick={() => setInput("Combien j'ai fait ce mois-ci sur Vinted ?")}>
                CA du mois
              </QuickAskButton>
              <QuickAskButton onClick={() => setInput("Est-ce que ma marge moyenne est bonne ?")}>
                Marge
              </QuickAskButton>
              <QuickAskButton onClick={() => setInput("Quelle stratégie me conseilles-tu pour améliorer ma rentabilité ?")}>
                Stratégie
              </QuickAskButton>
              <QuickAskButton onClick={() => setInput("Quel prix de revente viser pour garder une bonne marge ?")}>
                Prix de revente
              </QuickAskButton>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Conversation</h2>

          <div className="mt-5 h-[460px] overflow-y-auto rounded-2xl border border-zinc-800 bg-black/50 p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
                    L’IA réfléchit...
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
              placeholder="Ex: Est-ce que ma marge est bonne pour du Vinted ?"
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function QuickAskButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
    >
      {children}
    </button>
  );
}