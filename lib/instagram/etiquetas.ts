import type { Situacao } from "@/lib/instagram/tipos";

// Texto e tom da etiqueta de cada pessoa na caixa de entrada. Módulo puro:
// a tela só mapeia o tom para uma variável de cor do admin.

export type TomEtiqueta = "neutro" | "andamento" | "sucesso" | "erro";

export type EntradaEtiqueta = {
  situacao: Situacao;
  comentarios: number;
  falhaMotivo: string | null;
  lembreteEm: string | null;
};

/** "16:00" no fuso de São Paulo (o servidor roda em UTC). */
function horaEmSaoPaulo(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function etiquetaDaSituacao(p: EntradaEtiqueta): { texto: string; tom: TomEtiqueta } {
  if (p.falhaMotivo) return { texto: `falha: ${p.falhaMotivo}`, tom: "erro" };
  if (p.comentarios >= 3) return { texto: "comentou 3+ vezes", tom: "andamento" };
  switch (p.situacao) {
    case "aguardando_botao":
      return { texto: "esperando o toque no botão", tom: "andamento" };
    case "aguardando_seguir":
      return { texto: "não segue ainda", tom: "neutro" };
    case "link_enviado": {
      const base = "recebeu o link, não abriu";
      return {
        texto: p.lembreteEm ? `${base} · lembrete às ${horaEmSaoPaulo(p.lembreteEm)}` : base,
        tom: "andamento",
      };
    }
    case "link_aberto":
      return { texto: "abriu o link", tom: "sucesso" };
  }
}

/** "13/11 14:32" em São Paulo. Estático de propósito (sem "há 5 min"): o SSR e a hidratação têm de gerar o mesmo texto. */
export function dataCurta(iso: string): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const v = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${v("day")}/${v("month")} ${v("hour")}:${v("minute")}`;
}
