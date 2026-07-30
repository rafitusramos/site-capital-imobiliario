"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import {
  schemaPorTipo,
  type LeadTipo,
  type LeadFinanciamentoInput,
  type LeadHomeEquityInput,
  type LeadImovelInput,
} from "@/lib/validations/lead";
import { notificarNovoLead } from "@/lib/notificacoes/whatsapp";

export interface CriarLeadInput {
  tipo: LeadTipo;
  dados: Record<string, unknown>;
  paginaUrl: string;
  utm?: Record<string, string>;
  /** Campo honeypot — se vier preenchido, o envio é descartado silenciosamente. */
  honeypot?: string;
  /** Autorização LGPD marcada no formulário. Validado no servidor — nunca confiar no cliente. */
  consentimentoLgpd: boolean;
}

export interface CriarLeadResultado {
  sucesso: boolean;
  protocolo?: string;
  erro?: string;
}

async function obterIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

function parametrosFinanciamento(
  dados: LeadFinanciamentoInput,
  origem: string,
  paginaUrl: string,
  utm: Record<string, string>,
) {
  return {
    p_nome: dados.nome,
    p_email: dados.email,
    p_telefone: dados.telefone,
    p_cpf: dados.cpf ?? null,
    p_origem: origem,
    p_pagina_url: paginaUrl,
    p_utm: utm,
    p_valor_imovel: dados.valorImovel,
    p_percentual_entrada: dados.percentualEntrada,
    p_valor_entrada: dados.entradaDisponivel,
    p_valor_credito: dados.valorCredito,
    p_prazo_meses: dados.prazoMeses,
    p_parcela_estimada: dados.parcelaEstimada,
    p_renda_mensal: dados.renda,
    p_usa_fgts: dados.usaFgts,
    p_tipo_imovel: dados.tipoImovel,
    p_tipo_remuneracao: dados.tipoRemuneracao,
    p_momento_compra: dados.momentoCompra,
    p_cidade: dados.cidade,
    p_estado: dados.estado,
    p_consentimento_lgpd: true,
  };
}

function parametrosHomeEquity(
  dados: LeadHomeEquityInput,
  origem: string,
  paginaUrl: string,
  utm: Record<string, string>,
) {
  return {
    p_nome: dados.nome,
    p_email: dados.email,
    p_telefone: dados.telefone,
    p_cpf: dados.cpf ?? null,
    p_origem: origem,
    p_pagina_url: paginaUrl,
    p_utm: utm,
    p_valor_imovel_garantia: dados.valorImovel,
    p_imovel_quitado: dados.imovelQuitado,
    p_saldo_devedor: dados.saldoDevedor ?? null,
    p_valor_credito_estimado: dados.valorCreditoEstimado,
    p_prazo_meses: dados.prazoMeses,
    p_parcela_estimada: dados.parcelaEstimada,
    p_finalidade: dados.objetivoCredito,
    p_tipo_imovel: dados.tipoImovel,
    p_renda_mensal: dados.renda,
    p_tipo_remuneracao: dados.tipoRemuneracao,
    p_cep: dados.cep,
    p_numero: dados.numero,
    p_area_m2: dados.areaM2,
    p_consentimento_lgpd: true,
  };
}

function parametrosImovel(
  dados: LeadImovelInput,
  origem: string,
  paginaUrl: string,
  utm: Record<string, string>,
) {
  return {
    p_nome: dados.nome,
    p_email: dados.email,
    p_telefone: dados.telefone,
    p_cpf: dados.cpf ?? null,
    p_origem: origem,
    p_pagina_url: paginaUrl,
    p_utm: utm,
    p_imovel_id: dados.imovelId ?? null,
    p_forma_pagamento: dados.formaPagamento ?? null,
    p_prazo_compra: dados.prazoCompra ?? null,
    p_possui_entrada: dados.possuiEntrada ?? null,
    p_valor_entrada: dados.valorEntrada ?? null,
    p_ja_tem_aprovacao: dados.jaTemAprovacao ?? null,
    p_observacoes: dados.observacoes ?? null,
    p_consentimento_lgpd: true,
  };
}

const ORIGEM_POR_TIPO: Record<LeadTipo, string> = {
  financiamento: "lp-financiamento-sbpe",
  "home-equity": "lp-home-equity",
  imoveis: "lp-imovel",
};

export async function criarLead(input: CriarLeadInput): Promise<CriarLeadResultado> {
  // Honeypot: bot preencheu um campo que humano nenhum vê. Finge sucesso, não grava nada.
  if (input.honeypot) {
    return { sucesso: true, protocolo: "" };
  }

  // Consentimento LGPD é obrigatório para prosseguir — o cliente já bloqueia o
  // envio sem o checkbox marcado, mas o servidor nunca confia nisso sozinho.
  if (input.consentimentoLgpd !== true) {
    return {
      sucesso: false,
      erro: "É necessário autorizar o uso dos dados para enviar a solicitação.",
    };
  }

  const schema = schemaPorTipo[input.tipo];
  const parsed = schema.safeParse(input.dados);
  if (!parsed.success) {
    return { sucesso: false, erro: "Dados inválidos. Revise o formulário." };
  }

  const ip = await obterIp();
  const admin = createAdminClient();

  const { data: permitido, error: erroRateLimit } = await admin.rpc("registrar_tentativa_lead", {
    p_ip: ip,
  });
  if (erroRateLimit) throw erroRateLimit;
  if (!permitido) {
    return { sucesso: false, erro: "Muitas tentativas. Tente novamente em instantes." };
  }

  const origem = ORIGEM_POR_TIPO[input.tipo];
  const utm = input.utm ?? {};

  let resultado: { data: Database["public"]["Tables"]["leads"]["Row"] | null; error: unknown };
  switch (input.tipo) {
    case "financiamento":
      resultado = await admin.rpc(
        "criar_lead_financiamento",
        parametrosFinanciamento(parsed.data as LeadFinanciamentoInput, origem, input.paginaUrl, utm),
      );
      break;
    case "home-equity":
      resultado = await admin.rpc(
        "criar_lead_home_equity",
        parametrosHomeEquity(parsed.data as LeadHomeEquityInput, origem, input.paginaUrl, utm),
      );
      break;
    case "imoveis":
      resultado = await admin.rpc(
        "criar_lead_imovel",
        parametrosImovel(parsed.data as LeadImovelInput, origem, input.paginaUrl, utm),
      );
      break;
  }

  const { data: lead, error } = resultado;
  if (error) throw error;
  if (!lead) throw new Error("RPC de criação de lead não retornou dados.");

  try {
    await notificarNovoLead(lead);
  } catch {
    // best-effort — nunca deve derrubar a captação do lead.
  }

  return { sucesso: true, protocolo: lead.protocolo };
}
