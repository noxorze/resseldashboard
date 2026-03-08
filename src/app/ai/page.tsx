"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [finances, setFinances] = useState<FinanceRow | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Salut. Je suis ton assistant IA revendeur. Je peux analyser tes ventes, tes marges, ton bénéfice, ton chiffre d'affaires, tes imports Vinted et t'aider à penser comme un pro du resell. Pose-moi une vraie question business et je te répondrai de façon claire, détaillée et utile.",
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.sale_price || 0),
      0
    );

    const totalProfit = sales.reduce(
      (sum, sale) => sum + Number(sale.profit || 0),
      0
    );

    const totalFees = sales.reduce(
      (sum, sale) => sum + Number(sale.fees || 0),
      0
    );

    const totalPurchase = sales.reduce(
      (sum, sale) => sum + Number(sale.purchase_price || 0),
      0
    );

    const averageSale = sales.length ? totalRevenue / sales.length : 0;
    const averageProfit = sales.length ? totalProfit / sales.length : 0;
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
      totalFees,
      totalPurchase,
      averageSale,
      averageProfit,
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
        Chargement de la page IA...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_0_60px_rgba(220,38,38,0.08)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-red-500">
                Premium Revendeur OS
              </p>
              <h1 className="mt-3 text-3xl font-bold sm:text-5xl">
                Assistant IA revendeur
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-zinc-400 sm:text-base">
                Cette page te permet de parler à une vraie IA spécialisée dans
                l'achat revente, Vinted, les marges, le pricing, la rentabilité
                et la stratégie de resell. Elle reçoit aussi le contexte de ton
                activité pour t'aider à prendre de meilleures décisions.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-2xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
            >
              Retour dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-4">
          <StatCard
            title="Ventes"
            value={`${stats.salesCount}`}
            subtitle="Nombre total de ventes"
          />
          <StatCard
            title="CA total"
            value={`${stats.totalRevenue.toFixed(2)} €`}
            subtitle="Chiffre d'affaires total"
          />
          <StatCard
            title="Profit total"
            value={`${stats.totalProfit.toFixed(2)} €`}
            subtitle="Bénéfice cumulé"
          />
          <StatCard
            title="Marge moyenne"
            value={`${stats.averageMargin.toFixed(1)} %`}
            subtitle="Rentabilité moyenne"
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Panel title="Contexte de ton activité">
            <InfoRow
              label="Panier moyen"
              value={`${stats.averageSale.toFixed(2)} €`}
            />
            <InfoRow
              label="Profit moyen"
              value={`${stats.averageProfit.toFixed(2)} €`}
            />
            <InfoRow
              label="Prix d'achat total"
              value={`${stats.totalPurchase.toFixed(2)} €`}
            />
            <InfoRow
              label="Frais totaux"
              value={`${stats.totalFees.toFixed(2)} €`}
            />
            <InfoRow
              label="Imports Vinted"
              value={`${stats.importedCount}`}
            />
          </Panel>

          <Panel title="Finances manuelles">
            <InfoRow
              label="Argent en attente"
              value={`${Number(finances?.pending_balance || 0).toFixed(2)} €`}
            />
            <InfoRow
              label="Argent disponible"
              value={`${Number(finances?.available_balance || 0).toFixed(2)} €`}
            />
            <InfoRow
              label="Argent transféré"
              value={`${Number(finances?.total_withdrawn || 0).toFixed(2)} €`}
            />
          </Panel>

          <Panel title="Questions intelligentes">
            <div className="space-y-3">
              <QuickButton
                onClick={() =>
                  setInput("Analyse mes chiffres comme un vrai pro du resell")
                }
              >
                Analyse pro complète
              </QuickButton>
              <QuickButton
                onClick={() =>
                  setInput("Est-ce que ma marge moyenne est bonne ?")
                }
              >
                Marge moyenne
              </QuickButton>
              <QuickButton
                onClick={() =>
                  setInput("Comment améliorer ma rentabilité concrètement ?")
                }
              >
                Améliorer la rentabilité
              </QuickButton>
              <QuickButton
                onClick={() =>
                  setInput("Quel prix de revente viser pour garder une bonne marge ?")
                }
              >
                Prix de revente conseillé
              </QuickButton>
              <QuickButton
                onClick={() =>
                  setInput("Analyse mes imports Vinted et dis-moi ce que je dois améliorer")
                }
              >
                Analyse imports
              </QuickButton>
            </div>
          </Panel>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <h2 className="text-lg font-semibold sm:text-xl">Conversation</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Tu peux poser des questions longues et détaillées. L’IA peut te
            répondre sur la rentabilité, les marges, l'achat, la revente, les
            stratégies de croissance, les erreurs à éviter et la façon de mieux
            piloter ton activité revendeur.
          </p>

          <div className="mt-5 h-[520px] overflow-y-auto rounded-2xl border border-zinc-800 bg-black/50 p-4">
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
                    L’IA réfléchit à une réponse utile...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              placeholder="Ex: analyse mes chiffres et dis-moi où je perds le plus de marge"
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

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-400">{title}</p>
      <h3 className="mt-3 text-3xl font-semibold text-white">{value}</h3>
      <p className="mt-2 text-xs text-red-400">{subtitle}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
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

function QuickButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
    >
      {children}
    </button>
  );
}