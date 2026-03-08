export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json({
    reply: "L'IA est temporairement désactivée. Le site principal reste utilisable.",
  });
}