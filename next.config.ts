import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
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
