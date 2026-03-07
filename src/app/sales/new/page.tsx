"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewSalePage() {
  const router = useRouter();

  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [fees, setFees] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const profit = useMemo(() => {
    const purchase = Number(purchasePrice) || 0;
    const sale = Number(salePrice) || 0;
    const extraFees = Number(fees) || 0;
    return sale - purchase - extraFees;
  }, [purchasePrice, salePrice, fees]);

  const handleSaveSale = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tu dois être connecté.");
      setLoading(false);
      return;
    }

    if (!productName.trim()) {
      setMessage("Le nom du produit est obligatoire.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("sales").insert({
      user_id: session.user.id,
      product_name: productName,
      purchase_price: Number(purchasePrice) || 0,
      sale_price: Number(salePrice) || 0,
      fees: Number(fees) || 0,
      profit: profit,
    });

    if (error) {
      setMessage("Erreur : " + error.message);
      setLoading(false);
      return;
    }

    setMessage("Vente enregistrée avec succès.");

    setTimeout(() => {
      router.push("/");
    }, 900);

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500">
              Premium Revendeur OS
            </p>

            <h1 className="mt-3 text-3xl font-bold">Ajouter une vente</h1>

            <p className="mt-2 text-sm text-zinc-400">
              Renseigne ta vente et enregistre-la dans ton dashboard.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
          >
            Retour
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-zinc-400">Produit</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Nike Tech"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-zinc-400">
                  Prix d&apos;achat
                </label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">
                  Prix de vente
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400">Frais</label>
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
              />
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-zinc-400">Bénéfice estimé</p>
              <p className="mt-2 text-3xl font-bold">{profit} €</p>
            </div>

            {message && (
              <div className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveSale}
              disabled={loading}
              className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {loading ? "Enregistrement..." : "Enregistrer la vente"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}