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

const IconeTorre = criarIcone(
  <>
    <rect x="5.5" y="2.5" width="9" height="15" rx="1" />
    <path d="M8.5 6h3M8.5 9h3M8.5 12h3" />
    <path d="M8.8 17.5V15h2.4v2.5" />
  </>,
);

const IconeDelivery = criarIcone(
  <>
    <rect x="2.5" y="3" width="15" height="14" rx="1" />
    <path d="M7.5 3v14M12.5 3v14M2.5 10h15" />
    <circle cx="5" cy="6.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="10" cy="6.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="5" cy="13.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="10" cy="13.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13.5" r=".7" fill="currentColor" stroke="none" />
  </>,
);

const IconeAltoPadrao = criarIcone(
  <>
    <path d="M6 3h8l3.5 4.5L10 17 2.5 7.5 6 3z" />
    <path d="M2.5 7.5h15" />
    <path d="M7.5 7.5 10 3l2.5 4.5M7.5 7.5 10 17l2.5-9.5" />
  </>,
);

const IconeHallPrivativo = criarIcone(
  <>
    <path d="M3.5 17.5V4A1.5 1.5 0 0 1 5 2.5h10A1.5 1.5 0 0 1 16.5 4v13.5" />
    <path d="M6.5 17.5V6h7v11.5M10 6v11.5" />
    <path d="M2 17.5h16" />
    <circle cx="8.7" cy="12" r=".7" fill="currentColor" stroke="none" />
    <circle cx="11.3" cy="12" r=".7" fill="currentColor" stroke="none" />
  </>,
);

const IconeTomadaUsb = criarIcone(
  <>
    <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
    <rect x="5" y="7" width="10" height="6.5" rx="1.2" />
    <rect x="7" y="8.6" width="6" height="1.6" rx=".3" fill="currentColor" stroke="none" />
  </>,
);

const IconeArCondicionado = criarIcone(
  <>
    <rect x="2.5" y="3.5" width="15" height="6.5" rx="1.5" />
    <path d="M5 7.5h10" />
    <path d="M6 12.5 5 16M10 12.5V17M14 12.5l1 3.5" />
  </>,
);

const IconePlantaFlexivel = criarIcone(
  <>
    <rect x="2.5" y="3" width="15" height="14" rx="1" />
    <path d="M10 3v14" strokeDasharray="2 2" />
    <path d="M10 10.5h7.5" />
  </>,
);

const IconeSalaEstar = criarIcone(
  <>
    <path d="M5.5 10V7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v3" />
    <path d="M2.5 10.5a1.5 1.5 0 0 1 3 0V12h9v-1.5a1.5 1.5 0 0 1 3 0v5h-15v-5z" />
    <path d="M4.5 15.5V17M15.5 15.5V17" />
  </>,
);

const IconeLavabo = criarIcone(
  <>
    <path d="M3 10h14c0 3.5-3 5.5-7 5.5S3 13.5 3 10z" />
    <path d="M10 10V6a2.5 2.5 0 0 1 2.5-2.5H14.5M14.5 3.5V5.5" />
    <path d="M10 15.5v2M7.5 17.5h5" />
  </>,
);

const IconeLavanderia = criarIcone(
  <>
    <rect x="3.5" y="2.5" width="13" height="15" rx="1.5" />
    <path d="M3.5 6.5h13" />
    <circle cx="6.2" cy="4.5" r=".6" fill="currentColor" stroke="none" />
    <circle cx="10" cy="12" r="3.5" />
    <path d="M8.3 12c.6-.6 1.1-.6 1.7 0s1.1.6 1.7 0" />
  </>,
);

const IconeVaranda = criarIcone(
  <>
    <path d="M4 8V3.5h12V8" />
    <path d="M2.5 8h15M2.5 15h15" />
    <path d="M5 8v7M7.5 8v7M10 8v7M12.5 8v7M15 8v7" />
    <path d="M1.5 17.5h17" />
  </>,
);

const IconePisoNivelado = criarIcone(
  <>
    <rect x="2.5" y="5.5" width="15" height="5.5" rx="2" />
    <circle cx="10" cy="8.25" r="1" />
    <path d="M6.6 7.1v2.3M13.4 7.1v2.3" />
    <path d="M2 16h16" />
  </>,
);

const IconeSeparacaoIntima = criarIcone(
  <>
    <path d="M5 17.5V3h10v14.5" />
    <path d="M5 3l6.5 1.8v10.9L5 17.5" />
    <circle cx="9.3" cy="10.3" r=".7" fill="currentColor" stroke="none" />
    <path d="M2 17.5h16" />
  </>,
);

const IconePersiana = criarIcone(
  <>
    <rect x="3" y="2.5" width="14" height="2.5" rx=".8" />
    <path d="M4.5 7.5h11M4.5 10.5h11M4.5 13.5h11" />
    <path d="M10 13.5v3" />
    <circle cx="10" cy="17" r=".8" fill="currentColor" stroke="none" />
  </>,
);

const IconeDeposito = criarIcone(
  <>
    <path d="M3 17.5V5.5l7-3 7 3v12" />
    <path d="M6 17.5V9h8v8.5" />
    <path d="M6 11.5h8M6 14h8" />
  </>,
);

const IconeConveniencia = criarIcone(
  <>
    <path d="M2.5 8 3.7 3.5h12.6L17.5 8" />
    <path d="M2.5 8a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
    <path d="M4 10.5v7h12v-7" />
    <path d="M8 17.5v-5h4v5" />
  </>,
);

const IconeMercado = criarIcone(
  <>
    <path d="M2 3h2.4l2 9.5h8.1l1.7-7H5.2" />
    <circle cx="8" cy="16" r="1.2" />
    <circle cx="14" cy="16" r="1.2" />
  </>,
);

const IconeRestaurante = criarIcone(
  <>
    <path d="M4.5 2.5V7a1.5 1.5 0 0 0 3 0V2.5M6 2.5V8M6 8.5v9" />
    <path d="M14 17.5V2.5c-1.8 1.4-2.8 3.6-2.8 6.2H14" />
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
  torre: IconeTorre,
  delivery: IconeDelivery,
  "alto-padrao": IconeAltoPadrao,
  "hall-privativo": IconeHallPrivativo,
  "tomada-usb": IconeTomadaUsb,
  "ar-condicionado": IconeArCondicionado,
  "planta-flexivel": IconePlantaFlexivel,
  "sala-estar": IconeSalaEstar,
  lavabo: IconeLavabo,
  lavanderia: IconeLavanderia,
  varanda: IconeVaranda,
  "piso-nivelado": IconePisoNivelado,
  "separacao-intima": IconeSeparacaoIntima,
  persiana: IconePersiana,
  deposito: IconeDeposito,
  conveniencia: IconeConveniencia,
  mercado: IconeMercado,
  restaurante: IconeRestaurante,
};

/** Rótulo em português de cada ícone do catálogo (mesmas chaves de ICONES). */
export const ROTULOS_ICONES: Record<string, string> = {
  area: "Área",
  dormitorio: "Dormitório",
  vaga: "Vaga",
  banheiro: "Banheiro",
  piscina: "Piscina",
  academia: "Academia",
  "salao-festas": "Salão de festas",
  playground: "Playground",
  churrasqueira: "Churrasqueira",
  coworking: "Coworking",
  "pet-place": "Pet place",
  quadra: "Quadra",
  sauna: "Sauna",
  bicicletario: "Bicicletário",
  portaria: "Portaria",
  elevador: "Elevador",
  "area-verde": "Área verde",
  "carro-eletrico": "Carro elétrico",
  torre: "Torre única",
  delivery: "Espaço delivery",
  "alto-padrao": "Alto padrão",
  "hall-privativo": "Hall privativo",
  "tomada-usb": "Tomadas USB",
  "ar-condicionado": "Ar-condicionado",
  "planta-flexivel": "Planta flexível",
  "sala-estar": "Sala de estar",
  lavabo: "Lavabo",
  lavanderia: "Área de serviço",
  varanda: "Varanda",
  "piso-nivelado": "Piso nivelado",
  "separacao-intima": "Separação social/íntima",
  persiana: "Persianas",
  deposito: "Depósito privativo",
  conveniencia: "Conveniência",
  mercado: "Mercado",
  restaurante: "Restaurante",
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

/** Rótulo legível do slug; cai no próprio slug para itens fora do catálogo. */
export function rotuloDoIcone(slug: string): string {
  return ROTULOS_ICONES[slug] ?? slug;
}

/** Catálogo para o seletor do admin: slug + rótulo, em ordem alfabética do rótulo. */
export function opcoesDeIcones(): { slug: string; rotulo: string }[] {
  return listaDeIcones()
    .map((slug) => ({ slug, rotulo: rotuloDoIcone(slug) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
