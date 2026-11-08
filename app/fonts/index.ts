// Fonte única das fontes do projeto, usada pelos 3 root layouts
// (app/(site)/layout.tsx, app/admin/layout.tsx, app/global-not-found.tsx).
//
// Hospedadas localmente (next/font/local) e NÃO via next/font/google: as
// máquinas de build da Vercel (iad1) passaram a receber do Google Fonts URLs
// de arquivo sem extensão para o Archivo, e o loader do next/font quebrou com
// "Cannot read properties of null (reading '1')". Hospedar aqui elimina a
// dependência de rede com o Google em build time.
//
// Para adicionar um peso: baixe o woff2 do subset `latin` (CSS de
// https://fonts.googleapis.com/css2?family=... com User-Agent de Chrome, pegue
// o bloco `/* latin */`), salve em ./arquivos/ com nome descritivo e declare
// aqui. Cada layout só aplica as `variable` que usa; declarar aqui não carrega
// nada em quem não referencia a fonte.
import localFont from "next/font/local";

export const libreCaslonDisplay = localFont({
  src: [{ path: "./arquivos/libre-caslon-display-latin-400.woff2", weight: "400", style: "normal" }],
  variable: "--display",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const libreCaslonText = localFont({
  src: [
    { path: "./arquivos/libre-caslon-text-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./arquivos/libre-caslon-text-latin-400-italico.woff2", weight: "400", style: "italic" },
  ],
  variable: "--texto",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

// Variável (400–700): o 700 existe por causa do H3 do artigo (styles/blog.css),
// que é bold; sem ele o navegador sintetizaria um falso-negrito.
export const archivo = localFont({
  src: [{ path: "./arquivos/archivo-latin-variavel.woff2", weight: "400 700", style: "normal" }],
  variable: "--sans",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "sans-serif"],
});

export const ibmPlexMono = localFont({
  src: [
    { path: "./arquivos/ibm-plex-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./arquivos/ibm-plex-mono-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./arquivos/ibm-plex-mono-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--mono",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["ui-monospace", "monospace"],
});

// Só o admin usa (soma de valores no cabeçalho das colunas do CRM).
export const geologica = localFont({
  src: [{ path: "./arquivos/geologica-latin-variavel.woff2", weight: "400 500", style: "normal" }],
  variable: "--geologica",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "sans-serif"],
});
