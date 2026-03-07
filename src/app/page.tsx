"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
  id: string;
  pending_balance: number;
  available_balance: number;
  total_withdrawn: number;
};

type PeriodFilter = "day" | "week" | "month" | "year" | "all";

type ChartPoint = {
  label: string;
  revenue: number;
  profit: number;
};

const QUICK_MESSAGES = [
  "Bonjour, oui l’article est toujours disponible.",
  "Bonjour, l’envoi peut être fait rapidement.",
  "Bonjour, le prix est déjà bien placé.",
  "Bonjour, merci pour votre message. N’hésitez pas si vous avez une question précise.",
  "Bonjour, oui je peux faire un petit geste raisonnable si l’achat est rapide.",
  "Bonjour, l’article est en très bon état.",
];

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [copiedMessage, setCopiedMessage] = useState("");
  const [finances, setFinances] = useState<FinanceRow | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUserEmail(session.user.email ?? "");

      const { data: salesData } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      const { data: financesData } = await supabase
        .from("finances")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (salesData) {
        setSales(salesData);
      }

      if (financesData) {
        setFinances(financesData);
      }

      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeleteSale = async (saleId: string) => {
    const confirmed = window.confirm("Supprimer cette vente ?");

    if (!confirmed) return;

    setDeletingId(saleId);

    const { error } = await supabase.from("sales").delete().eq("id", saleId);

    if (!error) {
      setSales((prev) => prev.filter((sale) => sale.id !== saleId));
    } else {
      alert("Erreur lors de la suppression.");
    }

    setDeletingId(null);
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage("Message copié.");
      setTimeout(() => setCopiedMessage(""), 1500);
    } catch {
      setCopiedMessage("Impossible de copier.");
      setTimeout(() => setCopiedMessage(""), 1500);
    }
  };

  const username = useMemo(() => {
    if (!userEmail) return "Revendeur";
    return userEmail.split("@")[0];
  }, [userEmail]);

  const getSaleDate = (sale: Sale) => {
    return new Date(sale.sale_date || sale.created_at);
  };

  const filteredSales = useMemo(() => {
    const now = new Date();

    return sales.filter((sale) => {
      const saleDate = getSaleDate(sale);

      if (period === "all") return true;

      if (period === "day") {
        return (
          saleDate.getFullYear() === now.getFullYear() &&
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getDate() === now.getDate()
        );
      }

      if (period === "week") {
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - diff);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        return saleDate >= startOfWeek && saleDate < endOfWeek;
      }

      if (period === "month") {
        return (
          saleDate.getFullYear() === now.getFullYear() &&
          saleDate.getMonth() === now.getMonth()
        );
      }

      if (period === "year") {
        return saleDate.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [sales, period]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) => sum + Number(sale.sale_price || 0),
      0
    );
  }, [filteredSales]);

  const totalProfit = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0);
  }, [filteredSales]);

  const averageBasket = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return totalRevenue / filteredSales.length;
  }, [filteredSales, totalRevenue]);

  const averageMargin = useMemo(() => {
    if (filteredSales.length === 0 || totalRevenue === 0) return 0;
    return (totalProfit / totalRevenue) * 100;
  }, [filteredSales.length, totalProfit, totalRevenue]);

  const importedSalesCount = useMemo(() => {
    return filteredSales.filter(
      (sale) => sale.source === "vinted_orders_import"
    ).length;
  }, [filteredSales]);

  const manualSalesCount = useMemo(() => {
    return filteredSales.filter(
      (sale) => sale.source !== "vinted_orders_import"
    ).length;
  }, [filteredSales]);

  const topSale = useMemo(() => {
    if (filteredSales.length === 0) return null;
    return [...filteredSales].sort(
      (a, b) => Number(b.profit) - Number(a.profit)
    )[0];
  }, [filteredSales]);

  const chartData = useMemo(() => {
    const map = new Map<string, ChartPoint>();

    const createLabel = (date: Date) => {
      if (period === "day") {
        return `${date.getHours().toString().padStart(2, "0")}h`;
      }

      if (period === "week") {
        return date.toLocaleDateString("fr-FR", { weekday: "short" });
      }

      if (period === "month") {
        return date.getDate().toString();
      }

      if (period === "year") {
        return date.toLocaleDateString("fr-FR", { month: "short" });
      }

      return `${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    filteredSales.forEach((sale) => {
      const date = getSaleDate(sale);
      const label = createLabel(date);

      const current = map.get(label) || {
        label,
        revenue: 0,
        profit: 0,
      };

      current.revenue += Number(sale.sale_price || 0);
      current.profit += Number(sale.profit || 0);

      map.set(label, current);
    });

    return Array.from(map.values());
  }, [filteredSales, period]);

  const monthlyOverview = useMemo(() => {
    const map = new Map<string, ChartPoint>();

    sales.forEach((sale) => {
      const date = getSaleDate(sale);
      const label = date.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      });

      const current = map.get(label) || {
        label,
        revenue: 0,
        profit: 0,
      };

      current.revenue += Number(sale.sale_price || 0);
      current.profit += Number(sale.profit || 0);

      map.set(label, current);
    });

    return Array.from(map.values()).slice(-8);
  }, [sales]);

  const maxChartValue = useMemo(() => {
    const allValues = chartData.flatMap((item) => [item.revenue, item.profit]);
    return Math.max(...allValues, 1);
  }, [chartData]);

  const maxMonthlyValue = useMemo(() => {
    const allValues = monthlyOverview.flatMap((item) => [
      item.revenue,
      item.profit,
    ]);
    return Math.max(...allValues, 1);
  }, [monthlyOverview]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-4 text-sm text-zinc-400">
          Chargement du tableau de bord...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_0_60px_rgba(220,38,38,0.08)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-red-500">
                Premium Revendeur OS
              </p>

              <h1 className="mt-3 text-3xl font-bold sm:text-5xl">
                Tableau de bord revendeur
              </h1>

              <p className="mt-3 max-w-3xl text-sm text-zinc-400 sm:text-base">
                Bienvenue <span className="text-white">{username}</span>. Gère
                tes ventes, tes imports Vinted, tes montants financiers et tes
                messages rapides dans une interface premium rouge et noire.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/sales/new"
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Ajouter une vente
              </Link>

              <Link
                href="/imports"
                className="rounded-2xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
              >
                Importer Vinted
              </Link>

              <Link
                href="/finances"
                className="rounded-2xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
              >
                Modifier les montants
              </Link>

              <Link
                href="/messages"
                className="rounded-2xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
              >
                Messages clients
              </Link>

              <Link
                href="/ai"
                className="rounded-2xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
              >
                Analyse IA
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-2xl border border-red-500 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap gap-3">
            <PeriodButton active={period === "day"} onClick={() => setPeriod("day")}>
              Jour
            </PeriodButton>
            <PeriodButton active={period === "week"} onClick={() => setPeriod("week")}>
              Semaine
            </PeriodButton>
            <PeriodButton active={period === "month"} onClick={() => setPeriod("month")}>
              Mois
            </PeriodButton>
            <PeriodButton active={period === "year"} onClick={() => setPeriod("year")}>
              Année
            </PeriodButton>
            <PeriodButton active={period === "all"} onClick={() => setPeriod("all")}>
              Tout
            </PeriodButton>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard title="Chiffre d'affaires" value={`${totalRevenue.toFixed(2)} €`} subtitle={`Période : ${labelForPeriod(period)}`} />
          <StatCard title="Bénéfice" value={`${totalProfit.toFixed(2)} €`} subtitle="Profit calculé automatiquement" />
          <StatCard title="Ventes" value={`${filteredSales.length}`} subtitle="Sur la période choisie" />
          <StatCard title="Panier moyen" value={`${averageBasket.toFixed(2)} €`} subtitle="Montant moyen par vente" />
          <StatCard title="Marge moyenne" value={`${averageMargin.toFixed(1)} %`} subtitle="Rentabilité globale" />
          <StatCard title="Imports Vinted" value={`${importedSalesCount}`} subtitle="Ventes importées" />
          <StatCard title="Ventes manuelles" value={`${manualSalesCount}`} subtitle="Ajoutées à la main" />
          <StatCard
            title="Top bénéfice"
            value={topSale ? `${Number(topSale.profit).toFixed(2)} €` : "0 €"}
            subtitle={topSale ? topSale.product_name : "Aucune vente"}
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Panel title="Finances manuelles">
            <InfoRow label="Argent en attente" value={`${Number(finances?.pending_balance || 0).toFixed(2)} €`} />
            <InfoRow label="Argent disponible" value={`${Number(finances?.available_balance || 0).toFixed(2)} €`} />
            <InfoRow label="Argent transféré" value={`${Number(finances?.total_withdrawn || 0).toFixed(2)} €`} />
            <Link
              href="/finances"
              className="inline-block rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
            >
              Modifier les montants
            </Link>
          </Panel>

          <Panel title="Résumé activité">
            <InfoRow label="Email connecté" value={userEmail || "Non défini"} />
            <InfoRow label="Ventes totales" value={`${sales.length}`} />
            <InfoRow
              label="Montant total vendu"
              value={`${sales.reduce((sum, sale) => sum + Number(sale.sale_price || 0), 0).toFixed(2)} €`}
            />
            <InfoRow
              label="Profit total"
              value={`${sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0).toFixed(2)} €`}
            />
          </Panel>

          <Panel title="Messages à copier">
            <div className="space-y-3">
              {QUICK_MESSAGES.map((msg, index) => (
                <button
                  key={`${msg}-${index}`}
                  onClick={() => handleCopyMessage(msg)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-red-500 hover:text-white"
                >
                  {msg}
                </button>
              ))}
            </div>
            {copiedMessage && (
              <div className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                {copiedMessage}
              </div>
            )}
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartPanel title={`Graphique ${labelForPeriod(period).toLowerCase()}`} data={chartData} maxValue={maxChartValue} />
          <ChartPanel title="Évolution mensuelle" data={monthlyOverview} maxValue={maxMonthlyValue} />
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold sm:text-xl">Dernières ventes</h2>
            <span className="text-sm text-zinc-400">{filteredSales.length} vente(s)</span>
          </div>

          {filteredSales.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Aucune vente enregistrée pour cette période.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-2xl border border-zinc-800 bg-black/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {sale.product_name}
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        Achat: {Number(sale.purchase_price).toFixed(2)} € • Vente:{" "}
                        {Number(sale.sale_price).toFixed(2)} € • Frais:{" "}
                        {Number(sale.fees).toFixed(2)} €
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {sale.buyer_name ? `Acheteur: ${sale.buyer_name} • ` : ""}
                        {sale.status ? `Statut: ${sale.status} • ` : ""}
                        {sale.source === "vinted_orders_import"
                          ? "Source: Import Vinted"
                          : "Source: Manuel"}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-green-400">
                        +{Number(sale.profit).toFixed(2)} €
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatSaleDate(sale.sale_date || sale.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Link
                      href={`/sales/edit/${sale.id}`}
                      className="rounded-lg border border-blue-500 px-3 py-2 text-xs text-blue-400 transition hover:bg-blue-500 hover:text-white"
                    >
                      Modifier
                    </Link>

                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      disabled={deletingId === sale.id}
                      className="rounded-lg border border-red-500 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                    >
                      {deletingId === sale.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function labelForPeriod(period: PeriodFilter) {
  if (period === "day") return "Jour";
  if (period === "week") return "Semaine";
  if (period === "month") return "Mois";
  if (period === "year") return "Année";
  return "Tout";
}

function formatSaleDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR");
}

function PeriodButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
          : "rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
      }
    >
      {children}
    </button>
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
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 shadow-[0_0_30px_rgba(220,38,38,0.04)]">
      <p className="text-xs text-zinc-400 sm:text-sm">{title}</p>
      <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
        {value}
      </h3>
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
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
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
      <span className="max-w-[60%] truncate text-right text-sm font-medium text-white">
        {value}
      </span>
    </div>
  );
}

function ChartPanel({
  title,
  data,
  maxValue,
}: {
  title: string;
  data: ChartPoint[];
  maxValue: number;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>

      {data.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-400">
          Pas assez de données pour afficher un graphique.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <div className="flex min-h-[220px] min-w-[520px] items-end gap-4">
            {data.map((item, index) => {
              const revenueHeight = Math.max(10, (item.revenue / maxValue) * 140);
              const profitHeight = Math.max(10, (item.profit / maxValue) * 140);

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-[160px] items-end gap-2">
                    <div
                      className="w-4 rounded-t bg-zinc-500"
                      style={{ height: `${revenueHeight}px` }}
                      title={`CA : ${item.revenue.toFixed(2)} €`}
                    />
                    <div
                      className="w-4 rounded-t bg-red-500"
                      style={{ height: `${profitHeight}px` }}
                      title={`Profit : ${item.profit.toFixed(2)} €`}
                    />
                  </div>

                  <div className="text-center text-xs text-zinc-400">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-zinc-500" />
              Chiffre d’affaires
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-red-500" />
              Bénéfice
            </div>
          </div>
        </div>
      )}
    </div>
  );
}