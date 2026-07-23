import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jade: "var(--jade)",
        bronze: "var(--bronze)",
        abissal: "var(--abissal)",
      },
      fontFamily: {
        cinzel: ["var(--font-cinzel)"],
        josefin: ["var(--font-josefin)"],
      },
    },
  },
  plugins: [],
};

export default config;
