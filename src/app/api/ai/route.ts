import Groq from "groq-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        { reply: "GROQ_API_KEY manquante." },
        { status: 500 }
      );
    }

    const groq = new Groq({
      apiKey: apiKey,
    });

    const body = await req.json();
    const message = body?.message;
    const context = (body?.context ?? {}) as SiteContext;

    if (!message || typeof message !== "string") {
      return Response.json(
        { reply: "Message invalide." },
        { status: 400 }
      );
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
- Meilleure vente : ${context.bestSaleName ?? "Aucune"}
- Bénéfice de la meilleure vente : ${Number(context.bestSaleProfit ?? 0).toFixed(2)} €
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `
Tu es une IA experte en achat revente, Vinted, resell, marges et optimisation business.

Tu aides un revendeur à :
- analyser ses ventes
- améliorer sa rentabilité
- comprendre ses bénéfices et ses marges
- fixer ses prix de revente
- optimiser ses achats
- réfléchir comme un vrai professionnel du resell
- donner des conseils concrets, utiles, structurés et intelligents

Tu réponds uniquement sur :
- achat revente
- resell
- Vinted
- bénéfices
- marges
- prix de vente
- prix d'achat
- stratégie revendeur
- business de revente
- optimisation des imports et ventes
- pilotage d'activité revendeur

Tu dois répondre en français.
Tu peux utiliser le contexte du compte fourni par le site pour répondre de façon personnalisée.
Tu dois répondre avec un ton utile, sérieux, motivant et concret.

Si la question est hors sujet, tu réponds seulement :
"Je suis spécialisé dans l'achat revente et le resell."

Quand c'est pertinent :
- donne des conseils actionnables
- explique pourquoi
- propose une amélioration précise
- parle comme un coach revendeur
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
      completion.choices?.[0]?.message?.content ??
      "Je n'ai pas réussi à répondre.";

    return Response.json({ reply: reply });
  } catch (error) {
    console.error("Erreur API IA:", error);

    return Response.json(
      { reply: "Erreur serveur IA." },
      { status: 500 }
    );
  }
}