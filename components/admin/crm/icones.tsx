import type { ComponentType, ReactNode, SVGProps } from "react";

/**
 * Catálogo fixo de ícones do CRM (docs/crm-spec.md §4/§3.1). Mesmo molde de
 * components/imoveis/icones.tsx: SVG inline, viewBox 20x20, stroke
 * currentColor — nunca emoji (regra do projeto). As chaves `ligacao`,
 * `whatsapp`, `email`, `reuniao`, `visita`, `proposta`, `contrato`, `nota` e
 * `sistema` casam 1:1 com `crm_interacao_tipos.icone`
 * (015_crm_interacoes_lembretes.sql) — não renomear sem atualizar o seed.
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
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const IconeLapis = criarIcone(<path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" />);

export const IconeLixeira = criarIcone(
  <>
    <path d="M3 5h14M8 5V3.5A1.5 1.5 0 0 1 9.5 2h1A1.5 1.5 0 0 1 12 3.5V5m2 0v11a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6 16V5h8z" />
    <path d="M8.5 8.5v5M11.5 8.5v5" />
  </>,
);

export const IconeEstrela = criarIcone(
  <path d="M10 2.8l2.2 4.6 5 .7-3.6 3.6.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.6 5-.7L10 2.8z" />,
);

export const IconeEstrelaPreenchida: ComponentType<IconeProps> = function EstrelaPreenchida(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none" aria-hidden="true" {...props}>
      <path d="M10 2.8l2.2 4.6 5 .7-3.6 3.6.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.6 5-.7L10 2.8z" />
    </svg>
  );
};

export const IconeRelogio = criarIcone(
  <>
    <circle cx="10" cy="10.5" r="7" />
    <path d="M10 6.5V10.5l3 2" />
    <path d="M7.5 2.5h5" />
  </>,
);

export const IconeTelefone = criarIcone(
  <path d="M4.5 3h2.2l1 3.3-1.6 1.4a9 9 0 0 0 4.2 4.2l1.4-1.6 3.3 1v2.2c0 .8-.7 1.5-1.5 1.4-6-.5-10.4-4.9-10.9-10.9C3 3.7 3.7 3 4.5 3z" />,
);

export const IconeEmail = criarIcone(
  <>
    <rect x="2.5" y="4.5" width="15" height="11" rx="1.2" />
    <path d="M3 5.5 10 11l7-5.5" />
  </>,
);

export const IconeWhatsapp = criarIcone(
  <>
    <path d="M10 2.5a7.3 7.3 0 0 0-6.3 11l-1 3.5 3.6-1a7.3 7.3 0 1 0 3.7-13.5z" />
    <path d="M7 7.3c.1-.3.4-.5.7-.5h.6c.2 0 .4.1.5.3l.6 1.3c.1.2 0 .5-.1.6l-.5.5c.4.9 1.1 1.6 2 2l.5-.5c.2-.2.4-.2.6-.1l1.3.6c.2.1.3.3.3.5v.6c0 .4-.3.7-.6.8-2.6.5-5.5-2.4-6-5-.1-.3 0-.6.1-.6z" />
  </>,
);

export const IconeReuniao = criarIcone(
  <>
    <circle cx="6.5" cy="6.5" r="2.3" />
    <circle cx="14" cy="7" r="1.9" />
    <path d="M2.5 16c0-2.6 2-4.3 4.5-4.3 1.6 0 3 .6 3.8 1.7" />
    <path d="M11.3 16c.2-2 1.6-3.4 3.5-3.4 2 0 3.7 1.5 3.7 4" />
  </>,
);

export const IconeVisita = criarIcone(
  <>
    <path d="M2.5 9.5 10 3l7.5 6.5" />
    <path d="M4.5 8v8a.5.5 0 0 0 .5.5h3v-5h4v5h3a.5.5 0 0 0 .5-.5V8" />
  </>,
);

export const IconeProposta = criarIcone(
  <>
    <path d="M5 2.5h7l3 3V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5z" />
    <path d="M12 2.5V5a.5.5 0 0 0 .5.5H15" />
    <path d="M7 9.5 9 11.5 13 7.5" />
  </>,
);

export const IconeContrato = criarIcone(
  <>
    <path d="M5 2.5h7l3 3V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5z" />
    <path d="M12 2.5V5a.5.5 0 0 0 .5.5H15" />
    <path d="M7 9h6M7 11.5h6M7 14h4" />
  </>,
);

export const IconeNota = criarIcone(
  <>
    <path d="M4 3.5h12v13H4z" />
    <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" />
  </>,
);

export const IconeSistema = criarIcone(
  <>
    <circle cx="10" cy="10" r="2.2" />
    <path d="M10 4.2v2M10 13.8v2M4.2 10h2M13.8 10h2M6 6l1.4 1.4M12.6 12.6 14 14M6 14l1.4-1.4M12.6 7.4 14 6" />
  </>,
);

export const IconeBusca = criarIcone(
  <>
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M16.5 16.5 13 13" />
  </>,
);

export const IconeFiltro = criarIcone(<path d="M3 4.5h14M6 10h8M8.5 15.5h3" />);

export const IconeMais = criarIcone(<path d="M10 4v12M4 10h12" />);

export const IconeFechar = criarIcone(<path d="M4.5 4.5l11 11M15.5 4.5l-11 11" />);

export const IconeAlerta = criarIcone(
  <>
    <path d="M10 2.8 18 16.5H2L10 2.8z" />
    <path d="M10 8v3.5M10 14v.1" />
  </>,
);

export const IconeChevronBaixo = criarIcone(<path d="M4.5 7.5 10 13l5.5-5.5" />);

// Botões de mover etapa do PainelComum.tsx: a seta na ponta do botão aponta
// para o sentido do movimento — direita para avançar, esquerda para
// retroceder/reabrir.
export const IconeSetaDireita = criarIcone(<path d="M4 10h12M11 5l5 5-5 5" />);
export const IconeSetaEsquerda = criarIcone(<path d="M16 10H4M9 5l-5 5 5 5" />);

/** Catálogo por slug — casa com `crm_interacao_tipos.icone` (banco). */
export const ICONES_INTERACAO: Record<string, ComponentType<IconeProps>> = {
  ligacao: IconeTelefone,
  whatsapp: IconeWhatsapp,
  email: IconeEmail,
  reuniao: IconeReuniao,
  visita: IconeVisita,
  proposta: IconeProposta,
  contrato: IconeContrato,
  nota: IconeNota,
  sistema: IconeSistema,
};

/** Resolve o ícone de um tipo de interação pelo slug, com fallback neutro. */
export function obterIconeInteracao(slug: string | null | undefined): ComponentType<IconeProps> {
  if (!slug) return IconeNota;
  return ICONES_INTERACAO[slug] ?? IconeNota;
}
