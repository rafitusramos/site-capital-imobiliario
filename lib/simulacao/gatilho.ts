import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

/**
 * Quando mover um lead pede a tela de simulação: só financiamento, e só ao
 * sair de `criado` para `simulacao`. Home equity segue exatamente como antes
 * (docs/crm-spec.md §3.7).
 */
export function exigeSimulacao(tipo: LeadTipoSlug, de: LeadEtapaSlug, para: LeadEtapaSlug): boolean {
  return tipo === "financiamento" && de === "criado" && para === "simulacao";
}

/** `Simulacao-RT-<protocolo>.pdf`. O protocolo já é gerado pelo banco; aqui só se protege o nome do arquivo. */
export function nomeArquivoSimulacao(protocolo: string): string {
  const limpo = protocolo.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return limpo ? `Simulacao-RT-${limpo}.pdf` : "Simulacao-RT.pdf";
}

export type DesfechoSimulacao =
  | "cancelado"
  | "anexado"
  | "movido-e-enviado"
  | "movido-sem-envio"
  | "movido-envio-falhou";

/** Toast de cada desfecho do diálogo de simulação (null = nada a dizer). */
export function toastDoDesfecho(
  desfecho: DesfechoSimulacao,
  etapaLabel: string,
): { tipo: "sucesso" | "erro"; texto: string } | null {
  switch (desfecho) {
    case "cancelado":
      return null;
    case "anexado":
      return { tipo: "sucesso", texto: "Simulação anexada ao lead. Nada foi enviado ainda." };
    case "movido-e-enviado":
      return { tipo: "sucesso", texto: `Lead movido para ${etapaLabel} e simulação enviada por e-mail.` };
    case "movido-sem-envio":
      return { tipo: "sucesso", texto: `Lead movido para ${etapaLabel}.` };
    case "movido-envio-falhou":
      return {
        tipo: "erro",
        texto: `A etapa mudou para ${etapaLabel}, mas a simulação NÃO foi enviada. Ela continua anexada ao lead.`,
      };
  }
}
