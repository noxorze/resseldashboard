"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type QuickMessage = {
  id: number;
  category: string;
  title: string;
  text: string;
};

const QUICK_MESSAGES: QuickMessage[] = [
  {
    id: 1,
    category: "Disponibilité",
    title: "Article toujours disponible",
    text: "Bonjour, oui l’article est toujours disponible. Si vous souhaitez l’acheter, vous pouvez passer commande directement. Je reste disponible si vous avez besoin d’une précision supplémentaire concernant l’article.",
  },
  {
    id: 2,
    category: "Disponibilité",
    title: "Disponible et prêt à être envoyé",
    text: "Bonjour, oui l’article est bien disponible et prêt à être envoyé. Si vous commandez rapidement, je pourrai préparer l’envoi dès que possible. N’hésitez pas si vous voulez une information en plus avant achat.",
  },
  {
    id: 3,
    category: "Prix",
    title: "Prix déjà correct",
    text: "Bonjour, merci pour votre message. Le prix est déjà très correct par rapport à l’état et au marché, donc je préfère rester sur ce tarif pour le moment. Merci de votre compréhension.",
  },
  {
    id: 4,
    category: "Prix",
    title: "Petit geste possible",
    text: "Bonjour, merci pour votre intérêt. Le prix est déjà bien placé, mais je peux éventuellement faire un petit geste raisonnable si vous êtes vraiment intéressé(e) et prêt(e) à acheter rapidement.",
  },
  {
    id: 5,
    category: "Prix",
    title: "Refus d’offre trop basse",
    text: "Bonjour, merci pour votre offre. Je ne peux pas accepter ce montant car il est trop bas par rapport au prix de l’article. Si vous souhaitez, vous pouvez me faire une proposition un peu plus proche du prix affiché.",
  },
  {
    id: 6,
    category: "Envoi",
    title: "Envoi rapide",
    text: "Bonjour, l’envoi peut être fait rapidement. En général, je prépare l’article dès que possible après la commande. Vous pouvez acheter sereinement, je fais le nécessaire pour que cela parte au plus vite.",
  },
  {
    id: 7,
    category: "Envoi",
    title: "Envoi sous 24h / 48h",
    text: "Bonjour, merci pour votre message. Je peux généralement expédier l’article sous 24h à 48h selon l’heure de la commande. Je vous tiens informé(e) si besoin une fois la vente confirmée.",
  },
  {
    id: 8,
    category: "État",
    title: "Très bon état",
    text: "Bonjour, l’article est en très bon état. Il a été conservé avec soin et ne présente pas de défaut important à signaler. Si vous voulez, je peux aussi préciser certains détails visibles sur les photos.",
  },
  {
    id: 9,
    category: "État",
    title: "Bon état avec précision",
    text: "Bonjour, l’article est en bon état général. Il peut y avoir de légères traces normales d’utilisation selon la pièce, mais rien de majeur. Les photos permettent déjà d’avoir un bon aperçu de l’état global.",
  },
  {
    id: 10,
    category: "Taille",
    title: "Réponse sur la taille",
    text: "Bonjour, la taille indiquée dans l’annonce est la bonne. Si vous voulez éviter toute hésitation, je vous conseille de comparer avec un article similaire que vous possédez déjà. Je peux aussi vous confirmer ce qui est écrit sur l’étiquette si besoin.",
  },
  {
    id: 11,
    category: "Taille",
    title: "Pas de mesures supplémentaires",
    text: "Bonjour, merci pour votre message. Je n’ai pas forcément les mesures exactes sous la main, mais la taille indiquée dans l’annonce est bien celle de l’article. Elle correspond à ce qui est affiché sur l’étiquette.",
  },
  {
    id: 12,
    category: "Réservation",
    title: "Pas de réservation",
    text: "Bonjour, merci pour votre intérêt. Je préfère ne pas réserver les articles trop longtemps. Le premier qui valide l’achat l’emporte, afin que tout reste simple et équitable.",
  },
  {
    id: 13,
    category: "Réservation",
    title: "Réservation courte possible",
    text: "Bonjour, je peux éventuellement vous le garder un très court moment si vous êtes certain(e) de prendre l’article rapidement. Tenez-moi simplement informé(e) pour que je sache comment m’organiser.",
  },
  {
    id: 14,
    category: "Paiement",
    title: "Paiement via la plateforme",
    text: "Bonjour, pour des raisons de sécurité je passe uniquement par le paiement directement sur la plateforme. Cela protège autant l’acheteur que le vendeur et permet un suivi correct de la transaction.",
  },
  {
    id: 15,
    category: "Achat",
    title: "Merci pour l’achat",
    text: "Bonjour, merci beaucoup pour votre achat. Je prépare votre commande dès que possible et je ferai le nécessaire pour que tout se passe dans les meilleures conditions. Merci encore pour votre confiance.",
  },
  {
    id: 16,
    category: "Achat",
    title: "Commande bien reçue",
    text: "Bonjour, votre commande est bien prise en compte. Merci pour votre confiance. Je vais m’occuper de la préparation de l’article et je vous laisse suivre les prochaines étapes directement sur la plateforme.",
  },
  {
    id: 17,
    category: "Vendu",
    title: "Article déjà vendu",
    text: "Bonjour, merci pour votre message. Désolé, l’article a déjà été vendu. N’hésitez pas à regarder mes autres annonces si quelque chose d’autre peut vous intéresser.",
  },
  {
    id: 18,
    category: "Photos",
    title: "Photos déjà disponibles",
    text: "Bonjour, merci pour votre message. Les photos présentes dans l’annonce montrent déjà l’article sous plusieurs angles. Si vous avez une question précise sur un détail particulier, je peux essayer d’y répondre.",
  },
  {
    id: 19,
    category: "Authenticité",
    title: "Réponse sur l’authenticité",
    text: "Bonjour, l’article correspond bien à ce qui est présenté dans l’annonce. Les photos et la description sont là pour montrer l’article le plus clairement possible. Si vous avez un doute sur un point précis, vous pouvez me le demander.",
  },
  {
    id: 20,
    category: "Politesse",
    title: "Réponse neutre et professionnelle",
    text: "Bonjour, merci pour votre message. Je reste disponible pour répondre à vos questions concernant l’article. N’hésitez pas à me dire précisément ce que vous souhaitez savoir.",
  },
  {
    id: 21,
    category: "Livraison",
    title: "Livraison standard",
    text: "Bonjour, l’envoi se fait normalement via les options proposées sur la plateforme. Une fois la commande passée, tout est indiqué pour le suivi de l’expédition et de la livraison.",
  },
  {
    id: 22,
    category: "Livraison",
    title: "Relance avant achat",
    text: "Bonjour, oui tout est prêt de mon côté. Si vous souhaitez finaliser, vous pouvez passer commande directement. Je ferai l’envoi dès que possible après validation.",
  },
  {
    id: 23,
    category: "Négociation",
    title: "Dernier prix",
    text: "Bonjour, merci pour votre message. Le prix affiché est déjà mon meilleur prix ou très proche de celui-ci, donc je préfère rester sur ce montant. Merci pour votre compréhension.",
  },
  {
    id: 24,
    category: "Négociation",
    title: "Contre-proposition",
    text: "Bonjour, merci pour votre proposition. Je ne peux pas descendre jusque-là, mais je peux éventuellement accepter une offre un peu plus haute si cela vous intéresse toujours.",
  },
  {
    id: 25,
    category: "Relance",
    title: "Relance acheteur intéressé",
    text: "Bonjour, je me permets de revenir vers vous concernant l’article qui vous intéressait. Il est toujours disponible pour le moment. N’hésitez pas à me dire si vous souhaitez toujours le prendre.",
  },
  {
    id: 26,
    category: "Lot",
    title: "Réponse pour achat en lot",
    text: "Bonjour, merci pour votre message. Si plusieurs articles vous intéressent, je peux regarder ce qu’il est possible de faire pour un lot. Envoyez-moi simplement la liste des articles concernés.",
  },
  {
    id: 27,
    category: "Lot",
    title: "Lot avec remise possible",
    text: "Bonjour, oui un achat en lot est possible. Si vous me dites exactement quels articles vous voulez, je pourrai voir si une petite remise peut être envisagée sur l’ensemble.",
  },
  {
    id: 28,
    category: "État",
    title: "Pas de défaut majeur",
    text: "Bonjour, l’article ne présente pas de défaut majeur à signaler. Il correspond à ce qui est visible dans l’annonce. Si vous souhaitez une précision particulière, dites-moi laquelle.",
  },
  {
    id: 29,
    category: "Disponibilité",
    title: "Réponse courte dispo",
    text: "Bonjour, oui c’est toujours disponible.",
  },
  {
    id: 30,
    category: "Prix",
    title: "Réponse courte prix ferme",
    text: "Bonjour, le prix est déjà fixe pour le moment, merci de votre compréhension.",
  },
];

export default function MessagesPage() {
  const [copied, setCopied] = useState("");
  const [search, setSearch] = useState("");

  const filteredMessages = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return QUICK_MESSAGES;

    return QUICK_MESSAGES.filter((msg) => {
      return (
        msg.category.toLowerCase().includes(value) ||
        msg.title.toLowerCase().includes(value) ||
        msg.text.toLowerCase().includes(value)
      );
    });
  }, [search]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Message copié.");
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("Impossible de copier.");
      setTimeout(() => setCopied(""), 1500);
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

            <h1 className="mt-3 text-3xl font-bold">
              Messages rapides
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Recherche une réponse rapide, copie-la en un clic, puis colle-la
              directement sur Vinted.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
          >
            Retour
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <label className="text-sm text-zinc-400">
            Rechercher un message
          </label>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex: dispo, prix, envoi, état, lot..."
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
          />

          <p className="mt-3 text-xs text-zinc-500">
            {filteredMessages.length} réponse(s) trouvée(s)
          </p>
        </div>

        {copied && (
          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            {copied}
          </div>
        )}

        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
              Aucune réponse trouvée avec cette recherche.
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-red-500">
                      {msg.category}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {msg.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => handleCopy(msg.text)}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-400"
                  >
                    Copier
                  </button>
                </div>

                <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">
                  {msg.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}