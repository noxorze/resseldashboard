"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { supabase } from "@/lib/supabase";

type ParsedOrder = {
  orderDate: string;
  status: string;
  seller: string;
  buyer: string;
  amount: number;
  wallet: string;
};

type ArchiveInsights = {
  ordersFiles: string[];
  listingsFiles: string[];
  walletFiles: string[];
  transferFiles: string[];
  messageFiles: string[];
  htmlFiles: number;
  totalFiles: number;
};

export default function ImportsPage() {
  const [vintedUsername, setVintedUsername] = useState("");
  const [defaultProductName, setDefaultProductName] = useState("Import Vinted");
  const [defaultPurchasePrice, setDefaultPurchasePrice] = useState("0");
  const [defaultFees, setDefaultFees] = useState("0");

  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [ordersPreview, setOrdersPreview] = useState("");
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "sales" | "files"
  >("overview");

  const parseAmount = (raw: string) => {
    const normalized = raw.replace(",", ".").trim();

    const rubyAmountMatch = normalized.match(/:amount=>0\.(\d+)e(\d+)/i);
    if (rubyAmountMatch) {
      const digits = rubyAmountMatch[1];
      const exponent = Number(rubyAmountMatch[2]);
      const value = Number(digits) * Math.pow(10, exponent - digits.length);
      return value;
    }

    const standardMatch = normalized.match(/(\d+(?:\.\d+)?)/);
    if (standardMatch) {
      return Number(standardMatch[1]);
    }

    return 0;
  };

  const htmlToText = (html: string) => {
    if (typeof window === "undefined") return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.body?.textContent || "";
  };

  const parseOrdersText = (ordersText: string, username: string) => {
    const blocks = ordersText
      .split(/Commandé:\s*/g)
      .map((block) => block.trim())
      .filter(Boolean);

    const extractedOrders: ParsedOrder[] = [];

    for (const block of blocks) {
      const fullBlock = "Commandé: " + block;

      const orderDateMatch = fullBlock.match(/Commandé:\s*(.+)/i);
      const statusMatch = fullBlock.match(/Status:\s*(.+)/i);
      const sellerMatch = fullBlock.match(/Vendeur:\s*(.+)/i);
      const buyerMatch = fullBlock.match(/Acheteur:\s*(.+)/i);
      const amountMatch = fullBlock.match(/Montant de la commande:\s*(.+)/i);
      const walletMatch = fullBlock.match(/Porte-monnaie Vinted:\s*(.+)/i);

      const orderDate = orderDateMatch?.[1]?.trim() ?? "";
      const status = statusMatch?.[1]?.trim() ?? "";
      const seller = sellerMatch?.[1]?.trim() ?? "";
      const buyer = buyerMatch?.[1]?.trim() ?? "";
      const amountRaw = amountMatch?.[1]?.trim() ?? "";
      const wallet = walletMatch?.[1]?.trim() ?? "";

      const isYourSale =
        seller.toLowerCase() === username.trim().toLowerCase();

      const lowerStatus = status.toLowerCase();

      const isFinalized =
        lowerStatus.includes("commande finalisée") ||
        lowerStatus.includes("commande finalisee") ||
        lowerStatus.includes("transaction finalisée") ||
        lowerStatus.includes("transaction finalisee") ||
        lowerStatus.includes("validée manuellement") ||
        lowerStatus.includes("validee manuellement");

      const isCancelled = lowerStatus.includes("annul");

      if (isYourSale && isFinalized && !isCancelled) {
        extractedOrders.push({
          orderDate,
          status,
          seller,
          buyer,
          amount: parseAmount(amountRaw),
          wallet,
        });
      }
    }

    return extractedOrders;
  };

  const handleZipUpload = async (file: File) => {
    try {
      setLoading(true);
      setMessage("Analyse de l’archive en cours...");
      setFileName(file.name);
      setParsedOrders([]);
      setOrdersPreview("");
      setAllFiles([]);

      const zip = await JSZip.loadAsync(file);
      const fileList: string[] = [];

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          fileList.push(relativePath);
        }
      });

      const sorted = fileList.sort();
      setAllFiles(sorted);

      if (!vintedUsername.trim()) {
        setMessage(
          "Archive chargée. Entre ton pseudo Vinted pour détecter automatiquement tes ventes."
        );
        setLoading(false);
        return;
      }

      const ordersCandidates = sorted.filter((path) => {
        const lower = path.toLowerCase();
        return (
          (lower.includes("orders") || lower.includes("commandes")) &&
          (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith(".txt"))
        );
      });

      if (ordersCandidates.length === 0) {
        setMessage(
          "Archive chargée, mais aucun fichier orders/commandes n’a été trouvé."
        );
        setLoading(false);
        return;
      }

      const firstOrdersFile = ordersCandidates[0];
      const entry = zip.file(firstOrdersFile);

      if (!entry) {
        setMessage("Impossible de lire le fichier orders trouvé dans l’archive.");
        setLoading(false);
        return;
      }

      const rawContent = await entry.async("string");
      const textContent =
        firstOrdersFile.toLowerCase().endsWith(".html") ||
        firstOrdersFile.toLowerCase().endsWith(".htm")
          ? htmlToText(rawContent)
          : rawContent;

      setOrdersPreview(textContent.slice(0, 4000));

      const extractedOrders = parseOrdersText(textContent, vintedUsername);
      setParsedOrders(extractedOrders);

      if (extractedOrders.length === 0) {
        setMessage(
          `Archive analysée. Fichier orders trouvé (${firstOrdersFile}), mais aucune vente finalisée n’a été détectée.`
        );
      } else {
        setMessage(
          `Archive analysée. ${extractedOrders.length} vente(s) détectée(s) automatiquement.`
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Erreur lors de l’analyse du ZIP.");
      setAllFiles([]);
      setParsedOrders([]);
      setOrdersPreview("");
    } finally {
      setLoading(false);
    }
  };

  const handleImportToSupabase = async () => {
    try {
      setImporting(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Tu dois être connecté.");
        setImporting(false);
        return;
      }

      if (parsedOrders.length === 0) {
        setMessage("Aucune vente détectée à importer.");
        setImporting(false);
        return;
      }

      const purchasePriceValue = Number(defaultPurchasePrice) || 0;
      const feesValue = Number(defaultFees) || 0;
      const productBaseName = defaultProductName.trim() || "Import Vinted";

      const { data: existingSales, error: existingError } = await supabase
        .from("sales")
        .select("sale_date, sale_price, buyer_name, status, source")
        .eq("user_id", session.user.id)
        .eq("source", "vinted_orders_import");

      if (existingError) {
        setMessage("Erreur lors de la vérification des imports existants.");
        setImporting(false);
        return;
      }

      const existingKeys = new Set(
        (existingSales || []).map((sale) => {
          const saleDate = sale.sale_date ? new Date(sale.sale_date).toISOString() : "";
          return `${saleDate}|${Number(sale.sale_price).toFixed(2)}|${sale.buyer_name || ""}|${sale.status || ""}`;
        })
      );

      const rowsToInsert = parsedOrders
        .map((order, index) => {
          let isoDate = "";
          try {
            isoDate = order.orderDate ? new Date(order.orderDate).toISOString() : "";
          } catch {
            isoDate = "";
          }

          const salePriceValue = Number(order.amount) || 0;
          const calculatedProfit =
            salePriceValue - purchasePriceValue - feesValue;

          return {
            dedupeKey: `${isoDate}|${Number(order.amount).toFixed(2)}|${order.buyer || ""}|${order.status || ""}`,
            row: {
              user_id: session.user.id,
              product_name: `${productBaseName} #${index + 1}`,
              purchase_price: purchasePriceValue,
              sale_price: salePriceValue,
              fees: feesValue,
              profit: calculatedProfit,
              buyer_name: order.buyer || null,
              sale_date: isoDate || null,
              source: "vinted_orders_import",
              status: order.status || null,
            },
          };
        })
        .filter((item) => !existingKeys.has(item.dedupeKey))
        .map((item) => item.row);

      if (rowsToInsert.length === 0) {
        setMessage("Aucune nouvelle vente à importer. Tout semble déjà importé.");
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("sales").insert(rowsToInsert);

      if (error) {
        setMessage("Erreur import : " + error.message);
        setImporting(false);
        return;
      }

      setMessage(
        `${rowsToInsert.length} vente(s) importée(s) avec coût d’achat ${purchasePriceValue.toFixed(2)} € et frais ${feesValue.toFixed(2)} €.`
      );
    } catch (error) {
      console.error(error);
      setMessage("Erreur inattendue pendant l’import.");
    } finally {
      setImporting(false);
    }
  };

  const archiveInsights = useMemo<ArchiveInsights>(() => {
    const ordersFiles = allFiles.filter((f) => {
      const lower = f.toLowerCase();
      return lower.includes("orders") || lower.includes("commandes");
    });

    const listingsFiles = allFiles.filter((f) => {
      const lower = f.toLowerCase();
      return (
        lower.includes("listings") ||
        lower.includes("articles") ||
        lower.includes("items")
      );
    });

    const walletFiles = allFiles.filter((f) => {
      const lower = f.toLowerCase();
      return (
        lower.includes("wallet") ||
        lower.includes("porte-monnaie") ||
        lower.includes("balance")
      );
    });

    const transferFiles = allFiles.filter((f) => {
      const lower = f.toLowerCase();
      return lower.includes("transfer") || lower.includes("transfert");
    });

    const messageFiles = allFiles.filter((f) => {
      const lower = f.toLowerCase();
      return lower.includes("message") || lower.includes("conversation");
    });

    const htmlFiles = allFiles.filter(
      (f) => f.toLowerCase().endsWith(".html") || f.toLowerCase().endsWith(".htm")
    ).length;

    return {
      ordersFiles,
      listingsFiles,
      walletFiles,
      transferFiles,
      messageFiles,
      htmlFiles,
      totalFiles: allFiles.length,
    };
  }, [allFiles]);

  const detectedRevenue = useMemo(() => {
    return parsedOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  }, [parsedOrders]);

  const averageSale = useMemo(() => {
    if (parsedOrders.length === 0) return 0;
    return detectedRevenue / parsedOrders.length;
  }, [parsedOrders, detectedRevenue]);

  const estimatedProfit = useMemo(() => {
    const purchase = Number(defaultPurchasePrice) || 0;
    const fees = Number(defaultFees) || 0;

    return parsedOrders.reduce((sum, order) => {
      return sum + (Number(order.amount) || 0) - purchase - fees;
    }, 0);
  }, [parsedOrders, defaultPurchasePrice, defaultFees]);

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
                Import archive Vinted
              </h1>

              <p className="mt-3 max-w-3xl text-sm text-zinc-400 sm:text-base">
                Charge ton ZIP complet Vinted, détecte tes ventes, donne-leur un
                nom, applique un coût d’achat et des frais par défaut, puis
                importe tout dans ton dashboard.
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

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold sm:text-xl">
              Paramètres d’import
            </h2>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm text-zinc-400">
                  Ton pseudo Vinted
                </label>
                <input
                  type="text"
                  value={vintedUsername}
                  onChange={(e) => setVintedUsername(e.target.value)}
                  placeholder="Ex: timeo24220"
                  className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm text-zinc-400">
                    Nom par défaut
                  </label>
                  <input
                    type="text"
                    value={defaultProductName}
                    onChange={(e) => setDefaultProductName(e.target.value)}
                    placeholder="Ex: Produit Vinted"
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">
                    Achat par défaut
                  </label>
                  <input
                    type="number"
                    value={defaultPurchasePrice}
                    onChange={(e) => setDefaultPurchasePrice(e.target.value)}
                    placeholder="0"
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">
                    Frais par défaut
                  </label>
                  <input
                    type="number"
                    value={defaultFees}
                    onChange={(e) => setDefaultFees(e.target.value)}
                    placeholder="0"
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400">
                  ZIP Vinted complet
                </label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleZipUpload(e.target.files[0]);
                    }
                  }}
                  className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white file:mr-4 file:rounded-xl file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-red-500"
                />
              </div>

              {fileName && (
                <div className="rounded-2xl border border-zinc-800 bg-black/60 px-4 py-3 text-sm text-zinc-300">
                  Archive chargée : {fileName}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-zinc-800 bg-black/60 px-4 py-3 text-sm text-zinc-300">
                  {loading ? "Chargement..." : importing ? "Import..." : message}
                </div>
              )}

              <button
                type="button"
                onClick={handleImportToSupabase}
                disabled={loading || importing || parsedOrders.length === 0}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {importing ? "Import en cours..." : "Importer les ventes détectées"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold sm:text-xl">
              Modules détectés
            </h2>

            <div className="mt-5 space-y-3">
              <MiniRow label="Orders / Commandes" value={`${archiveInsights.ordersFiles.length}`} />
              <MiniRow label="Listings / Articles" value={`${archiveInsights.listingsFiles.length}`} />
              <MiniRow label="Wallet / Balance" value={`${archiveInsights.walletFiles.length}`} />
              <MiniRow label="Transfers / Transferts" value={`${archiveInsights.transferFiles.length}`} />
              <MiniRow label="Messages / Conversations" value={`${archiveInsights.messageFiles.length}`} />
              <MiniRow label="Fichiers HTML" value={`${archiveInsights.htmlFiles}`} />
              <MiniRow label="Fichiers totaux" value={`${archiveInsights.totalFiles}`} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard title="Ventes détectées" value={`${parsedOrders.length}`} subtitle="Depuis orders / commandes" />
          <StatCard title="CA détecté" value={`${detectedRevenue.toFixed(2)} €`} subtitle="Total brut repéré" />
          <StatCard title="Panier moyen" value={`${averageSale.toFixed(2)} €`} subtitle="Montant moyen détecté" />
          <StatCard title="Profit estimé" value={`${estimatedProfit.toFixed(2)} €`} subtitle="Selon achat + frais par défaut" />
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap gap-3">
            <TabButton active={selectedTab === "overview"} onClick={() => setSelectedTab("overview")}>
              Vue complète
            </TabButton>
            <TabButton active={selectedTab === "sales"} onClick={() => setSelectedTab("sales")}>
              Ventes détectées
            </TabButton>
            <TabButton active={selectedTab === "files"} onClick={() => setSelectedTab("files")}>
              Fichiers de l’archive
            </TabButton>
          </div>

          {selectedTab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Ce que cette page fait maintenant">
                <ChecklistItem text="Lire le ZIP complet" />
                <ChecklistItem text="Détecter orders / commandes" />
                <ChecklistItem text="Appliquer un nom par défaut" />
                <ChecklistItem text="Appliquer un coût d’achat par défaut" />
                <ChecklistItem text="Appliquer des frais par défaut" />
                <ChecklistItem text="Importer dans Supabase" />
              </Panel>

              <Panel title="Pourquoi c’est mieux">
                <ChecklistItem text="Les imports n’arrivent plus tous avec achat = 0" />
                <ChecklistItem text="Le bénéfice devient plus réaliste" />
                <ChecklistItem text="Tu peux nommer les imports" />
                <ChecklistItem text="Tu gagnes du temps par rapport à l’ajout manuel" />
              </Panel>

              <Panel title="Ce qu’on fera après">
                <ChecklistItem text="Historique des coûts habituels" />
                <ChecklistItem text="Suggestion automatique du coût d’achat" />
                <ChecklistItem text="Renommage rapide par lot" />
                <ChecklistItem text="Vrai chat IA dans l’app" />
              </Panel>
            </div>
          )}

          {selectedTab === "sales" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Aperçu des ventes détectées
                </h2>
                <span className="text-sm text-zinc-400">
                  {parsedOrders.length} vente(s)
                </span>
              </div>

              {parsedOrders.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Aucune vente détectée pour le moment.
                </p>
              ) : (
                <div className="space-y-3">
                  {parsedOrders.map((order, index) => {
                    const saleAmount = Number(order.amount) || 0;
                    const purchase = Number(defaultPurchasePrice) || 0;
                    const fees = Number(defaultFees) || 0;
                    const estimated = saleAmount - purchase - fees;

                    return (
                      <div
                        key={`${order.orderDate}-${order.buyer}-${index}`}
                        className="rounded-2xl border border-zinc-800 bg-black/40 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-white">
                              {defaultProductName || "Import Vinted"} #{index + 1}
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              Acheteur : {order.buyer || "Inconnu"}
                            </p>
                            <p className="text-sm text-zinc-400">
                              Statut : {order.status}
                            </p>
                            <p className="text-sm text-zinc-400">
                              Achat estimé : {purchase.toFixed(2)} € • Frais : {fees.toFixed(2)} €
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="font-semibold text-green-400">
                              Vente : {saleAmount.toFixed(2)} €
                            </p>
                            <p className="text-sm text-zinc-300">
                              Profit estimé : {estimated.toFixed(2)} €
                            </p>
                            <p className="text-xs text-zinc-500">
                              {order.orderDate || "Date inconnue"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {ordersPreview && (
                <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <h3 className="text-sm font-semibold text-white">
                    Extrait du fichier orders détecté
                  </h3>
                  <pre className="mt-3 max-h-[320px] overflow-y-auto whitespace-pre-wrap text-xs text-zinc-400">
                    {ordersPreview}
                  </pre>
                </div>
              )}
            </div>
          )}

          {selectedTab === "files" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Tous les fichiers de l’archive
                </h2>
                <span className="text-sm text-zinc-400">
                  {allFiles.length} fichier(s)
                </span>
              </div>

              {allFiles.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Aucun fichier affiché pour le moment.
                </p>
              ) : (
                <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="space-y-2 text-sm text-zinc-300">
                    {allFiles.map((file, index) => (
                      <div
                        key={`${file}-${index}`}
                        className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2"
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-sm text-zinc-300">
      {text}
    </div>
  );
}

function MiniRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function TabButton({
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