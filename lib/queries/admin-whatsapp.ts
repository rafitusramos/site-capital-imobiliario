import "server-only";
import { createClient } from "@/lib/supabase/server";
import { configWhatsApp } from "@/lib/whatsapp/config";
import { criarCloud } from "@/lib/whatsapp/cloud";
import { mascararWaId } from "@/lib/whatsapp/mascara";

// Leituras da página /admin/whatsapp. Cliente de cookies: a RLS (só admin) vale.
// Nunca lançam: falha vira console.error e resultado vazio/nulo.

export interface InfoNumero {
  numero: string;
  nomeExibicao: string;
  qualidade: string;
}

export interface EnvioRecente {
  id: string;
  destino: string; // já mascarado
  motivo: "confirmacao" | "etapa" | "resposta_fixa";
  estado: "pendente" | "processando" | "enviado" | "falhou" | "cancelado";
  erro: string | null;
  criadoEm: string;
  enviadoEm: string | null;
}

export interface StatusWhatsApp {
  configurado: boolean;
  /** null = não configurado ou a consulta à Meta falhou. */
  info: InfoNumero | null;
  numeroOficial: string | null;
  ultimoEventoEm: string | null;
  envios: EnvioRecente[];
}

type LinhaEnvio = {
  id: string;
  motivo: EnvioRecente["motivo"];
  estado: EnvioRecente["estado"];
  erro: string | null;
  criado_em: string;
  enviado_em: string | null;
  wa_contatos: { wa_id: string } | { wa_id: string }[] | null;
};

async function consultarNumero(): Promise<InfoNumero | null> {
  const cfg = configWhatsApp();
  if (!cfg) return null;
  try {
    return await criarCloud(cfg.token, cfg.phoneNumberId).infoDoNumero();
  } catch (e) {
    console.error("[statusWhatsApp] falha ao consultar o número:", e);
    return null;
  }
}

export async function statusWhatsApp(): Promise<StatusWhatsApp> {
  const configurado = configWhatsApp() !== null;
  const supabase = await createClient();

  const [info, cfgLinha, enviosLinha] = await Promise.all([
    consultarNumero(),
    supabase.from("wa_config").select("numero_oficial,ultimo_evento_em").eq("id", 1).maybeSingle(),
    supabase
      .from("wa_envios")
      .select("id,motivo,estado,erro,criado_em,enviado_em,wa_contatos(wa_id)")
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  if (cfgLinha.error) console.error("[statusWhatsApp] wa_config:", cfgLinha.error);
  if (enviosLinha.error) console.error("[statusWhatsApp] wa_envios:", enviosLinha.error);

  const cfg = cfgLinha.data as { numero_oficial: string | null; ultimo_evento_em: string | null } | null;
  const linhas = (enviosLinha.data ?? []) as unknown as LinhaEnvio[];

  return {
    configurado,
    info,
    numeroOficial: cfg?.numero_oficial ?? null,
    ultimoEventoEm: cfg?.ultimo_evento_em ?? null,
    envios: linhas.map((l) => {
      const contato = Array.isArray(l.wa_contatos) ? l.wa_contatos[0] : l.wa_contatos;
      return {
        id: l.id,
        destino: mascararWaId(contato?.wa_id ?? ""),
        motivo: l.motivo,
        estado: l.estado,
        erro: l.erro,
        criadoEm: l.criado_em,
        enviadoEm: l.enviado_em,
      };
    }),
  };
}
