import "server-only";
import { configMeta } from "./config";
import { criarGraph, type GraphIg } from "./graph";
import { criarMotor, type Motor, type RepositorioIg } from "./motor";
import { criarRepositorio } from "./repositorio";

// Monta o motor de produção (repositório Supabase + Graph real). Devolve null
// quando falta configuração ou não há conta conectada: as rotas públicas tratam
// isso como "nada a fazer", nunca como erro.

export function repositorioPadrao(): RepositorioIg {
  return criarRepositorio();
}

export async function graphPadrao(repo: RepositorioIg = repositorioPadrao()): Promise<GraphIg | null> {
  if (!configMeta()) return null;
  const conta = await repo.conta();
  return conta ? criarGraph(conta.token, conta.igUserId) : null;
}

export async function motorPadrao(): Promise<Motor | null> {
  if (!configMeta()) return null;
  const repo = repositorioPadrao();
  const graph = await graphPadrao(repo);
  if (!graph) return null;
  return criarMotor({ repo, graph, agora: () => new Date(), sortear: (n) => Math.floor(Math.random() * n) });
}
