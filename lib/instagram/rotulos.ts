// Rótulos puros do admin do Instagram (sem I/O).

export const ROTULO_AUTOMACAO_EXCLUIDA = "Automação excluída";

/**
 * Nome da automação de uma participação na caixa de entrada. `automacaoId` nulo =
 * a automação foi excluída (migration 037): o histórico fica, o nome não.
 */
export function nomeDaAutomacao(automacaoId: string | null, nome: string | null | undefined): string {
  if (!automacaoId) return ROTULO_AUTOMACAO_EXCLUIDA;
  return nome ?? "";
}
