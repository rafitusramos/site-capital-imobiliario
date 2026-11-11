import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { ROBOS_IA } from "@/lib/seo/robos-ia";

// Decisão do dono (2026-11-10): busca, leitura sob demanda e treino de IA
// ficam liberados. Para bloquear só o treino, mova os agentes de
// ROBOS_IA_TREINO (lib/seo/robos-ia.ts) para um grupo próprio com
// `disallow: "/"`.
//
// Armadilha: um grupo com user-agent específico SUBSTITUI o `*` para aquele
// robô (não soma). Por isso o `disallow: "/admin"` se repete no grupo de IA;
// sem ele, o /admin ficaria liberado para esses robôs.
const ALLOW = "/";
const DISALLOW = "/admin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      { userAgent: ROBOS_IA, allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
