import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type SiteContext = {
  salesCount?: number;
  totalRevenue?: number;
  totalProfit?: number;
  averageMargin?: number;
  averageSale?: number;
  importedCount?: number;
  pendingBalance?: number;
  availableBalance?: number;
  totalWithdrawn?: number;
  bestSaleName?: string | null;
  bestSaleProfit?: number | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    const context = (body.context || {}) as SiteContext;

    if (!message || typeof message !== "string") {
      return Response.json({ reply: "Message invalide." }, { status: 400 });
    }

    const contextBlock = `
Contexte du compte revendeur :
- Nombre de ventes : ${context.salesCount ?? 0}
- Chiffre d'affaires total : ${Number(context.totalRevenue ?? 0).toFixed(2)} €
- Bénéfice total : ${Number(context.totalProfit ?? 0).toFixed(2)} €
- Marge moyenne : ${Number(context.averageMargin ?? 0).toFixed(1)} %
- Panier moyen : ${Number(context.averageSale ?? 0).toFixed(2)} €
- Nombre d'imports Vinted : ${context.importedCount ?? 0}
- Argent en attente : ${Number(context.pendingBalance ?? 0).toFixed(2)} €
- Argent disponible : ${Number(context.availableBalance ?? 0).toFixed(2)} €
- Argent transféré : ${Number(context.totalWithdrawn ?? 0).toFixed(2)} €
- Meilleure vente : ${context.bestSaleName || "Aucune"}
- Bénéfice de la meilleure vente : ${Number(context.bestSaleProfit ?? 0).toFixed(2)} €
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: `
Tu es une IA experte en achat revente, Vinted, resell et optimisation business.

Tu aides un revendeur à :
- analyser ses ventes
- améliorer ses marges
- optimiser ses achats
- fixer ses prix
- comprendre ses bénéfices
- améliorer sa stratégie de revente
- répondre aux questions liées au resell

Tu dois répondre en français.

Tu peux utiliser le contexte du compte fourni par le site pour répondre de façon personnalisée.

Tu réponds uniquement sur :
- achat revente
- resell
- Vinted
- bénéfices
- marges
- prix de vente
- stratégie revendeur
- business de revente
- optimisation des imports et ventes

Si la question est hors sujet, tu réponds seulement :
"Je suis spécialisé dans l'achat revente et le resell."

Réponds comme un coach revendeur pro : clair, utile, concret, orienté action.
`,
        },
        {
          role: "system",
          content: contextBlock,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Je n'ai pas réussi à répondre.";

    return Response.json({ reply });
  } catch (error) {
    console.error("Erreur API IA:", error);

    return Response.json(
      { reply: "Erreur serveur IA." },
      { status: 500 }
    );
  }
}