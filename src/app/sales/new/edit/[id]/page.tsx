"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function EditSalePage() {
  const router = useRouter();
  const params = useParams();

  const saleId = params.id as string;

  const [loading, setLoading] = useState(true);

  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [fees, setFees] = useState("");

  const [message, setMessage] = useState("");

  const profit = useMemo(() => {
    const purchase = Number(purchasePrice) || 0;
    const sale = Number(salePrice) || 0;
    const extraFees = Number(fees) || 0;

    return sale - purchase - extraFees;
  }, [purchasePrice, salePrice, fees]);

  useEffect(() => {
    const loadSale = async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();

      if (!error && data) {
        setProductName(data.product_name);
        setPurchasePrice(String(data.purchase_price));
        setSalePrice(String(data.sale_price));
        setFees(String(data.fees));
      }

      setLoading(false);
    };

    loadSale();
  }, [saleId]);

  const handleUpdate = async () => {
    setMessage("");

    const { error } = await supabase
      .from("sales")
      .update({
        product_name: productName,
        purchase_price: Number(purchasePrice),
        sale_price: Number(salePrice),
        fees: Number(fees),
        profit: profit,
      })
      .eq("id", saleId);

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    setMessage("Vente modifiée.");

    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Chargement...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="mb-6 flex items-center justify-between">
          <div>

            <p className="text-xs uppercase tracking-[0.35em] text-red-500">
              Premium Revendeur OS
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Modifier une vente
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Mets à jour les informations de ta vente.
            </p>

          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 hover:border-red-500"
          >
            Retour
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

          <div className="flex flex-col gap-4">

            <div>
              <label className="text-sm text-zinc-400">
                Produit
              </label>

              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="text-sm text-zinc-400">
                  Prix achat
                </label>

                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">
                  Prix vente
                </label>

                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                />
              </div>

            </div>

            <div>
              <label className="text-sm text-zinc-400">
                Frais
              </label>

              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
              />
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-zinc-400">
                Nouveau bénéfice
              </p>

              <p className="mt-2 text-3xl font-bold">
                {profit} €
              </p>
            </div>

            {message && (
              <div className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm">
                {message}
              </div>
            )}

            <button
              onClick={handleUpdate}
              className="rounded-xl bg-red-600 px-4 py-3 font-semibold hover:bg-red-500"
            >
              Modifier la vente
            </button>

          </div>

        </div>
      </div>
    </main>
  );
}