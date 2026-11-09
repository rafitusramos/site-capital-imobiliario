import type { NextConfig } from "next";

// Host do Supabase Storage, derivado da URL do projeto. Espelha `hostDoSupabase`
// (lib/imoveis/imagem-otimizada.ts), que este arquivo não consegue importar pelo
// alias `@/`: mudou lá, mude aqui.
function hostDoSupabase(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "lqiztovibxbrertyxead.supabase.co";
  }
}

const nextConfig: NextConfig = {
  trailingSlash: true,
  // SPIKE (remover com a rota): o Chromium vem em binários .br que o tracing
  // não enxerga sozinho; sem o include a função sobe sem eles.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/spike-pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  images: {
    // Só as fotos de imóvel passam pelo otimizador: o bucket público e nada além
    // (o resto do site segue com <img>). Qualquer outra URL vai `unoptimized`
    // no componente (ver lib/imoveis/imagem-otimizada.ts).
    remotePatterns: [
      {
        protocol: "https",
        hostname: hostDoSupabase(),
        pathname: "/storage/v1/object/public/imovel-images/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Lista curta de propósito: cada combinação (imagem x largura x formato) é
    // uma transformação cobrada, e o plano Hobby tem cota mensal. 540 é a foto
    // ativa do carrossel no desktop; 640/828/1080/1400 cobrem mobile (1x-3x),
    // tablet e a capa em 100vw. 1400 é o tamanho publicado, então não há
    // ganho em ir além.
    deviceSizes: [640, 828, 1080, 1400],
    imageSizes: [540],
    // Os nomes são UUIDs imutáveis (nunca sobrescritos): a variante otimizada
    // pode ficar em cache por 1 ano sem risco de servir foto velha, e cada ano
    // sem retransformar poupa cota.
    minimumCacheTTL: 31536000,
  },
  experimental: {
    // Habilita app/global-not-found.tsx: como o projeto usa dois root
    // layouts (multiple root layouts, ver app/(site) e app/admin), não
    // existe um not-found componível único — é o caso que esta flag cobre.
    globalNotFound: true,
    serverActions: {
      // O upload de imagem de imóvel passa por server action, e o default do
      // Next é 1MB — qualquer foto real estourava com "Body exceeded 1 MB".
      // O navegador já reduz a imagem antes de enviar
      // (`lib/imoveis/redimensionar.ts`), então isso aqui é rede de segurança,
      // não o caminho normal. Quem de fato segura o tamanho é a validação de
      // 4MB no cliente, escolhida para ficar abaixo do teto de ~4,5MB que a
      // função serverless da Vercel impõe — um limite aqui maior que o da
      // plataforma só faria o upload passar no local e falhar em produção.
      bodySizeLimit: "5mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/sobre.html",
        destination: "/sobre/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
