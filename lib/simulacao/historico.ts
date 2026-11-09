import { formatarData } from "@/lib/crm/tempo";

/**
 * Rótulo do status de cada linha do histórico de simulações no modal do lead
 * (docs/crm-spec.md §3.7). Puro, para o texto ficar travado em teste.
 * `problema` pinta o rótulo de erro.
 */
export function rotuloStatusSimulacao(s: {
  email_status: "anexado" | "enviado" | "falhou" | "sem-chave";
  enviado_em: string | null;
  created_at: string;
}): { texto: string; problema: boolean } {
  switch (s.email_status) {
    case "anexado":
      return { texto: "Anexada", problema: false };
    case "enviado":
      // Linhas enviadas antes da migration 031 não têm enviado_em: a criação era o envio.
      return { texto: `Enviada em ${formatarData(s.enviado_em ?? s.created_at)}`, problema: false };
    case "falhou":
      return { texto: "Falhou", problema: true };
    case "sem-chave":
      return { texto: "Envio não configurado", problema: true };
  }
}
