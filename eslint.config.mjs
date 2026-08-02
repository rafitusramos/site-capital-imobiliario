import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

// `eslint-config-next` ainda é publicado no formato antigo (eslintrc), então
// o FlatCompat traduz para o flat config do ESLint 9. O script é `eslint .`,
// e não `next lint`: o `next lint` sai no Next 16, e trocar agora evita ter
// de refazer isso no upgrade.
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Skills instaladas pelo `npx skills` — código de terceiro (ver .gitignore).
      ".agents/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // ---------------------------------------------------------------
      // Regras desligadas por decisão de arquitetura, não por conveniência.
      // Cada uma tem a condição que a faria voltar a valer.
      // ---------------------------------------------------------------

      // A nav e os links internos usam <a>, não <Link>, DE PROPÓSITO: a
      // medição depende de carga de página inteira. `gtag('config', ...)`
      // roda uma única vez por carregamento (components/analytics/Tags.tsx),
      // e é ele quem manda o page_view — com navegação client-side do
      // <Link>, o GA4 registraria só a primeira página de cada sessão, e o
      // mesmo vale para o `fbq('track','PageView')`. Como a conversão
      // `generate_lead` do Google Ads é importada do GA4, trocar por <Link>
      // sem antes disparar page_view a cada mudança de rota quebraria a
      // medição de campanha em silêncio — o pior tipo de regressão.
      // Religar quando existir page_view por mudança de rota em
      // lib/analytics/eventos.ts.
      "@next/next/no-html-link-for-pages": "off",

      // As imagens não passam por next/image de propósito. As de imóvel e
      // capa de post já são redimensionadas pelo endpoint de transformação
      // do Supabase Storage (ver CAMINHO_RENDER em lib/og.ts), e as demais
      // são arquivos estáticos leves em /public. Mandar tudo pelo otimizador
      // da Vercel só acrescentaria um intermediário cobrado por uso para
      // refazer um trabalho que já está feito.
      "@next/next/no-img-element": "off",

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          // O projeto marca "não usado de propósito" com underscore.
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          // `const { chaveLocal, ...resto } = x` é como o admin remove um
          // campo antes de mandar ao banco (components/admin/ImovelEditor.tsx).
          // A variável extraída existe justamente para ficar de fora do resto.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default config;
