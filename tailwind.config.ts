import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    // Espelha os tokens de styles/lp.css (site) e app/admin/admin.css (admin)
    // — mudou um lado, muda o outro.
    extend: {
      colors: {
        jade: "var(--jade)",
        bronze: "var(--bronze)",
        abissal: "var(--abissal)",
        marfim: "var(--marfim)",
        areia: "var(--areia)",
        tinta: "var(--tinta)",
        branco: "var(--branco)",
        erro: "var(--erro)",
      },
      fontFamily: {
        display: ["var(--display)"],
        texto: ["var(--texto)"],
        sans: ["var(--sans)"],
        mono: ["var(--mono)"],
        // --geologica é carregada só no layout do admin.
        geologica: ["var(--geologica)"],
      },
    },
  },
  plugins: [],
};

export default config;
