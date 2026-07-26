import type { ComponentType, ReactNode, SVGProps } from "react";

/**
 * Catálogo fixo de ícones da vertical de Imóveis. Todos SVG inline,
 * viewBox 20x20, stroke currentColor — mesmo traço de
 * components/admin/TabelaPosts.tsx / SidebarAdmin.tsx. Nunca emoji: o
 * ícone precisa herdar cor e tamanho do contexto onde é usado (fatos
 * rápidos do hero, checklist de lazer, grid de diferenciais, seletor do
 * admin).
 */

export type IconeProps = SVGProps<SVGSVGElement>;

function criarIcone(paths: ReactNode): ComponentType<IconeProps> {
  return function Icone(props: IconeProps) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

const IconeArea = criarIcone(
  <>
    <path d="M2.5 6.5V3a.5.5 0 0 1 .5-.5h3.5" />
    <path d="M13.5 2.5H17a.5.5 0 0 1 .5.5v3.5" />
    <path d="M17.5 13.5V17a.5.5 0 0 1-.5.5h-3.5" />
    <path d="M6.5 17.5H3a.5.5 0 0 1-.5-.5v-3.5" />
  </>,
);

const IconeDormitorio = criarIcone(
  <>
    <path d="M2 15.5V8a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 18 8v7.5" />
    <path d="M2 13.5h16" />
    <path d="M4 9.5h4a1 1 0 0 1 1 1v1H3v-1a1 1 0 0 1 1-1z" />
    <path d="M2 15.5V17M18 15.5V17" />
  </>,
);

const IconeVaga = criarIcone(
  <>
    <path d="M3 15.5V11l1.7-4.6a1.5 1.5 0 0 1 1.4-1h7.8a1.5 1.5 0 0 1 1.4 1L17 11v4.5" />
    <path d="M3 12.5h14" />
    <circle cx="5.5" cy="14.5" r=".9" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="14.5" r=".9" fill="currentColor" stroke="none" />
    <path d="M3 15.5v1.2M17 15.5v1.2" />
  </>,
);

const IconeBanheiro = criarIcone(
  <>
    <path d="M3 9V4.5A1.5 1.5 0 0 1 4.5 3c.9 0 1.6.6 1.9 1.4" />
    <path d="M2.5 9h15v1.5A5.5 5.5 0 0 1 12 16h-4a5.5 5.5 0 0 1-5.5-5.5V9z" />
    <path d="M6.5 16 6 17.5M13.5 16l.5 1.5" />
  </>,
);

const IconePiscina = criarIcone(
  <>
    <path d="M2 8.5v6M2 8.5a3 6.5 0 0 0 16 0M2 8.5a3 6.5 0 0 1 16 0" />
    <path d="M2 14c1.3 1 2.6 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0" />
    <path d="M2 10.7c1.3 1 2.6 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0" />
  </>,
);

const IconeAcademia = criarIcone(
  <>
    <path d="M2 10h1.5M16.5 10H18" />
    <path d="M4.5 7.5v5M15.5 7.5v5" />
    <path d="M6.5 9v2M13.5 9v2" />
    <path d="M6.5 10h7" />
  </>,
);

const IconeSalaoFestas = criarIcone(
  <>
    <path d="M10 2.5c2 0 3 1.4 3 3 0 2-1.3 3.3-3 5-1.7-1.7-3-3-3-5 0-1.6 1-3 3-3z" />
    <path d="M10 10.5v3.3M10 10.5c.9.6 1.9.6 2.6-.3M10 10.5c-.9.6-1.9.6-2.6-.3" />
    <path d="M7 17.5h6" />
    <path d="M8.7 13.8h2.6l.5 3.7H8.2l.5-3.7z" />
  </>,
);

const IconePlayground = criarIcone(
  <>
    <path d="M4 17.5V5" />
    <path d="M16 17.5V5" />
    <path d="M4 5h12" />
    <path d="M4 9.5 16 13M16 9.5 4 13" />
  </>,
);

const IconeChurrasqueira = criarIcone(
  <>
    <path d="M4 9h12l-1.3 5.4a2 2 0 0 1-1.9 1.6H7.2a2 2 0 0 1-1.9-1.6L4 9z" />
    <path d="M3 9h14" />
    <path d="M8 2.5c-.8 1-.8 1.9 0 2.8M12 2.5c-.8 1-.8 1.9 0 2.8" />
    <path d="M6.5 9V6.7M13.5 9V6.7" />
  </>,
);

const IconeCoworking = criarIcone(
  <>
    <rect x="3" y="4.5" width="14" height="8.5" rx="1" />
    <path d="M1.5 16.5h17" />
    <path d="M7.5 13v1.5M12.5 13v1.5" />
  </>,
);

const IconePetPlace = criarIcone(
  <>
    <circle cx="6" cy="6.5" r="1.3" />
    <circle cx="10" cy="4.8" r="1.3" />
    <circle cx="14" cy="6.5" r="1.3" />
    <circle cx="4.3" cy="10" r="1.3" />
    <path d="M10 17c-2.6 0-4.2-1.3-4.2-3.1 0-1.8 1.7-2.9 2.5-4 .5-.7.8-1.3 1.7-1.3s1.2.6 1.7 1.3c.8 1.1 2.5 2.2 2.5 4C14.2 15.7 12.6 17 10 17z" />
  </>,
);

const IconeQuadra = criarIcone(
  <>
    <rect x="2.5" y="4" width="15" height="12" rx="1" />
    <path d="M10 4v12" />
    <circle cx="10" cy="10" r="2.4" />
  </>,
);

const IconeSauna = criarIcone(
  <>
    <path d="M6 8.5c-.9-1.3-.9-2.5 0-3.7M10 8.5c-.9-1.3-.9-2.5 0-3.7M14 8.5c-.9-1.3-.9-2.5 0-3.7" />
    <path d="M3 17v-3.5A2.5 2.5 0 0 1 5.5 11h9a2.5 2.5 0 0 1 2.5 2.5V17" />
    <path d="M3 17h14" />
  </>,
);

const IconeBicicletario = criarIcone(
  <>
    <circle cx="5" cy="14" r="2.5" />
    <circle cx="15" cy="14" r="2.5" />
    <path d="M5 14 8 7h4l3 7M8 7l2 3.5h3.5" />
  </>,
);

const IconePortaria = criarIcone(
  <>
    <path d="M10 2 3 4.8v4.7c0 4 3 7 7 7.9 4-1 7-4 7-8V4.8L10 2z" />
    <path d="M7.5 10 9.3 11.8 12.8 8.2" />
  </>,
);

const IconeElevador = criarIcone(
  <>
    <rect x="3.5" y="2.5" width="13" height="15" rx="1" />
    <path d="M8 8.5 10 6.2l2 2.3M8 11.7l2 2.3 2-2.3" />
  </>,
);

const IconeAreaVerde = criarIcone(
  <>
    <path d="M10 17.5V11" />
    <path d="M10 11c-3.5 0-6-2.3-6-6.5 4 0 6.5 1.6 6.5 5.2" />
    <path d="M10 11c3 0 5.2-2 5.2-5.6-3.4 0-5.6 1.4-5.6 4.5" />
  </>,
);

const IconeCarroEletrico = criarIcone(
  <>
    <path d="M3 13.5v-3l1.6-4a1.5 1.5 0 0 1 1.4-1h8a1.5 1.5 0 0 1 1.4 1l1.6 4v3" />
    <path d="M3 11.5h14" />
    <circle cx="6" cy="13.7" r=".9" fill="currentColor" stroke="none" />
    <circle cx="14" cy="13.7" r=".9" fill="currentColor" stroke="none" />
    <path d="M11 2.5 8.7 6.3h2.4L9 10" />
  </>,
);

/** Ícone padrão para slugs sem correspondência exata no catálogo (ex.: itens de seed antigos). */
const IconeGenerico = criarIcone(
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6.5v4M10 13.5v.1" />
  </>,
);

export const ICONES: Record<string, ComponentType<IconeProps>> = {
  area: IconeArea,
  dormitorio: IconeDormitorio,
  vaga: IconeVaga,
  banheiro: IconeBanheiro,
  piscina: IconePiscina,
  academia: IconeAcademia,
  "salao-festas": IconeSalaoFestas,
  playground: IconePlayground,
  churrasqueira: IconeChurrasqueira,
  coworking: IconeCoworking,
  "pet-place": IconePetPlace,
  quadra: IconeQuadra,
  sauna: IconeSauna,
  bicicletario: IconeBicicletario,
  portaria: IconePortaria,
  elevador: IconeElevador,
  "area-verde": IconeAreaVerde,
  "carro-eletrico": IconeCarroEletrico,
};

export const ICONE_GENERICO = IconeGenerico;

/** Resolve um slug de ícone para o componente — cai no fallback genérico se não existir no catálogo. */
export function obterIcone(slug: string | null | undefined): ComponentType<IconeProps> {
  if (!slug) return IconeGenerico;
  return ICONES[slug] ?? IconeGenerico;
}

/** Lista de chaves do catálogo, para popular o `<select>` de ícone no admin. */
export function listaDeIcones(): string[] {
  return Object.keys(ICONES);
}
