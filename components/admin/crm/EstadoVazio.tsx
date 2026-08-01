/**
 * Estado vazio, por coluna e por quadro inteiro (docs/crm-spec.md §3.1). A
 * aba Consórcio nasce sem lead nenhum (decisão travada #2 do
 * docs/crm-spec.md) — é o caso de uso mais comum de `variante="quadro"`.
 */
export function EstadoVazio({
  variante,
  mensagem,
}: {
  variante: "quadro" | "coluna";
  mensagem: string;
}) {
  if (variante === "quadro") {
    return (
      <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-black/10 px-6 py-10 text-center">
        <p className="text-sm text-neutral-500">{mensagem}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80px] items-center justify-center rounded-md border border-dashed border-black/10 px-3 py-6 text-center">
      <p className="text-xs text-neutral-400">{mensagem}</p>
    </div>
  );
}
