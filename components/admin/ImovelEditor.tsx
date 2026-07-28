"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  salvarImovel,
  publicarImovel,
  despublicarImovel,
  excluirImovel,
  uploadImagemImovel,
  salvarImagens,
  salvarTipologias,
  salvarDiferenciais,
  salvarFaqs,
  type SalvarImovelInput,
} from "@/app/actions/admin-imoveis";
import { slugify } from "@/lib/blog/slugify";
import { mascaraMoeda } from "@/lib/mascaras";
import type { ImovelComColecoesAdmin } from "@/lib/queries/admin-imoveis";
import type { ImovelFaseOpcao, ImovelTipoOpcao } from "@/lib/queries/imoveis";
import type { ImagemInput, TipologiaInput, DiferencialInput, FaqInput } from "@/lib/validations/imovel";
import type { ImovelImagemGrupo, ImovelDiferencialGrupo } from "@/types/database";
import { listaDeIcones, obterIcone } from "@/components/imoveis/icones";

const CAMPO =
  "mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const CAMPO_INLINE =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";
const BOTAO_SECUNDARIO =
  "rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-[var(--abissal)] transition hover:border-[var(--abissal)] disabled:opacity-50";
const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] disabled:opacity-50";

type AbaId = "dados" | "galeria" | "tipologias" | "diferenciais" | "faq";

const ABAS: { id: AbaId; label: string }[] = [
  { id: "dados", label: "Dados gerais" },
  { id: "galeria", label: "Galeria" },
  { id: "tipologias", label: "Tipologias" },
  { id: "diferenciais", label: "Diferenciais" },
  { id: "faq", label: "FAQ" },
];

function paraNumeroOuNull(valor: string): number | null {
  const t = valor.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

/**
 * Campos monetários do cadastro. Diferente de `paraNumeroOuNull`, lê só os
 * dígitos — assim o texto mascarado ("R$ 445.000") volta a ser 445000 — e
 * devolve null quando não sobra dígito nenhum (campo apagado), em vez de 0.
 */
function paraMoedaOuNull(valor: string): number | null {
  const digitos = valor.replace(/\D/g, "");
  return digitos === "" ? null : Number(digitos);
}

/** Número do banco -> texto mascarado do input. Os preços aqui são reais inteiros. */
function moedaParaCampo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return mascaraMoeda(String(Math.round(valor)));
}

function paraInteiro(valor: string, padrao = 0): number {
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? padrao : n;
}

/** Gera um id temporário só para `key` do React em linhas ainda não salvas. */
function idTemporario(): string {
  return `tmp-${Math.random().toString(36).slice(2)}`;
}

type ValoresDados = {
  titulo: string;
  slug: string;
  tipo_id: string;
  fase_id: string;
  bairro: string;
  cidade: string;
  estado: string;
  endereco: string;
  cep: string;
  area_min: string;
  area_max: string;
  dormitorios_min: string;
  dormitorios_max: string;
  banheiros_min: string;
  banheiros_max: string;
  vagas_min: string;
  vagas_max: string;
  valor_a_partir_de: string;
  valor_sob_consulta: boolean;
  previsao_entrega: string;
  video_youtube_url: string;
  construtora: string;
  construtora_logo_url: string;
  descricao_breve: string;
  descricao_completa: string;
  descricao_unidades: string;
  seo_title: string;
  seo_description: string;
  ordem: string;
};

/**
 * Empreendimento novo (imovel === null) nasce com tipo "Apartamento" e fase
 * "Lançamento" pré-selecionados, quando essas opções existem — o mesmo
 * default de antes da normalização em tabela. Se a opção não existir mais
 * (desativada), cai para a primeira da lista.
 */
function idPadrao(opcoes: { id: string; slug: string }[], slugPreferido: string): string {
  return opcoes.find((opcao) => opcao.slug === slugPreferido)?.id ?? opcoes[0]?.id ?? "";
}

function valoresIniciaisDados(
  imovel: ImovelComColecoesAdmin | null,
  tipos: ImovelTipoOpcao[],
  fases: ImovelFaseOpcao[],
): ValoresDados {
  return {
    titulo: imovel?.titulo ?? "",
    slug: imovel?.slug ?? "",
    tipo_id: imovel?.tipo_id ?? idPadrao(tipos, "apartamento"),
    fase_id: imovel?.fase_id ?? idPadrao(fases, "lancamento"),
    bairro: imovel?.bairro ?? "",
    cidade: imovel?.cidade ?? "",
    estado: imovel?.estado ?? "",
    endereco: imovel?.endereco ?? "",
    cep: imovel?.cep ?? "",
    area_min: imovel?.area_min?.toString() ?? "",
    area_max: imovel?.area_max?.toString() ?? "",
    dormitorios_min: imovel?.dormitorios_min?.toString() ?? "",
    dormitorios_max: imovel?.dormitorios_max?.toString() ?? "",
    banheiros_min: imovel?.banheiros_min?.toString() ?? "",
    banheiros_max: imovel?.banheiros_max?.toString() ?? "",
    vagas_min: imovel?.vagas_min?.toString() ?? "",
    vagas_max: imovel?.vagas_max?.toString() ?? "",
    valor_a_partir_de: moedaParaCampo(imovel?.valor_a_partir_de),
    valor_sob_consulta: imovel?.valor_sob_consulta ?? false,
    previsao_entrega: imovel?.previsao_entrega ?? "",
    video_youtube_url: imovel?.video_youtube_url ?? "",
    construtora: imovel?.construtora ?? "",
    construtora_logo_url: imovel?.construtora_logo_url ?? "",
    descricao_breve: imovel?.descricao_breve ?? "",
    descricao_completa: imovel?.descricao_completa ?? "",
    descricao_unidades: imovel?.descricao_unidades ?? "",
    seo_title: imovel?.seo_title ?? "",
    seo_description: imovel?.seo_description ?? "",
    ordem: imovel?.ordem?.toString() ?? "0",
  };
}

type ImovelEditorProps = {
  imovel: ImovelComColecoesAdmin | null;
  tipos: ImovelTipoOpcao[];
  fases: ImovelFaseOpcao[];
};

export function ImovelEditor({ imovel, tipos, fases }: ImovelEditorProps) {
  const router = useRouter();
  const [aba, setAba] = useState<AbaId>("dados");

  // -----------------------------------------------------------------
  // Aba 1 — Dados gerais
  // -----------------------------------------------------------------
  const [valoresDados, setValoresDados] = useState<ValoresDados>(() =>
    valoresIniciaisDados(imovel, tipos, fases),
  );
  const [slugTocado, setSlugTocado] = useState(Boolean(imovel));
  const [confirmaSlug, setConfirmaSlug] = useState(false);
  const [enviandoDados, setEnviandoDados] = useState<
    "salvar" | "publicar" | "despublicar" | "excluir" | null
  >(null);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [mensagemDados, setMensagemDados] = useState<string | null>(null);

  function setCampoDados<K extends keyof ValoresDados>(campo: K, valor: ValoresDados[K]) {
    setValoresDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function aoMudarTitulo(e: ChangeEvent<HTMLInputElement>) {
    const titulo = e.target.value;
    setValoresDados((atual) => ({
      ...atual,
      titulo,
      slug: slugTocado ? atual.slug : slugify(titulo),
    }));
  }

  function aoMudarSlug(e: ChangeEvent<HTMLInputElement>) {
    setSlugTocado(true);
    setCampoDados("slug", e.target.value);
  }

  const slugMudouEmImovelPublicado = imovel?.status === "ativo" && valoresDados.slug !== imovel.slug;

  function bloqueadoPorSlug(): boolean {
    if (slugMudouEmImovelPublicado && !confirmaSlug) {
      setErroDados("Marque a confirmação abaixo antes de salvar a mudança de slug.");
      return true;
    }
    return false;
  }

  function montarPayloadDados(): SalvarImovelInput {
    return {
      id: imovel?.id,
      titulo: valoresDados.titulo,
      slug: valoresDados.slug,
      tipo_id: valoresDados.tipo_id,
      fase_id: valoresDados.fase_id,
      bairro: valoresDados.bairro,
      cidade: valoresDados.cidade,
      estado: valoresDados.estado,
      endereco: valoresDados.endereco,
      cep: valoresDados.cep,
      area_min: paraNumeroOuNull(valoresDados.area_min),
      area_max: paraNumeroOuNull(valoresDados.area_max),
      dormitorios_min: paraNumeroOuNull(valoresDados.dormitorios_min),
      dormitorios_max: paraNumeroOuNull(valoresDados.dormitorios_max),
      banheiros_min: paraNumeroOuNull(valoresDados.banheiros_min),
      banheiros_max: paraNumeroOuNull(valoresDados.banheiros_max),
      vagas_min: paraNumeroOuNull(valoresDados.vagas_min),
      vagas_max: paraNumeroOuNull(valoresDados.vagas_max),
      valor_a_partir_de: paraMoedaOuNull(valoresDados.valor_a_partir_de),
      valor_sob_consulta: valoresDados.valor_sob_consulta,
      previsao_entrega: valoresDados.previsao_entrega,
      video_youtube_url: valoresDados.video_youtube_url,
      construtora: valoresDados.construtora,
      construtora_logo_url: valoresDados.construtora_logo_url,
      descricao_breve: valoresDados.descricao_breve,
      descricao_completa: valoresDados.descricao_completa,
      descricao_unidades: valoresDados.descricao_unidades,
      seo_title: valoresDados.seo_title,
      seo_description: valoresDados.seo_description,
      ordem: paraInteiro(valoresDados.ordem, 0),
    };
  }

  async function salvarDados() {
    setErroDados(null);
    setMensagemDados(null);
    if (bloqueadoPorSlug()) return;

    setEnviandoDados("salvar");
    const resultado = await salvarImovel(montarPayloadDados());
    setEnviandoDados(null);

    if (!resultado.sucesso) {
      setErroDados(resultado.erro ?? "Não foi possível salvar o empreendimento.");
      return;
    }
    if (!imovel && resultado.id) {
      router.replace(`/admin/imoveis/${resultado.id}`);
      return;
    }
    router.refresh();
    setMensagemDados("Dados salvos.");
  }

  async function publicar() {
    if (!imovel) return;
    setErroDados(null);
    setMensagemDados(null);
    setEnviandoDados("publicar");
    const resultado = await publicarImovel(imovel.id, valoresDados.slug);
    setEnviandoDados(null);
    if (!resultado.sucesso) {
      setErroDados(resultado.erro ?? "Não foi possível publicar o empreendimento.");
      return;
    }
    router.refresh();
    setMensagemDados("Publicado.");
  }

  async function despublicar() {
    if (!imovel) return;
    setErroDados(null);
    setMensagemDados(null);
    setEnviandoDados("despublicar");
    const resultado = await despublicarImovel(imovel.id, imovel.slug);
    setEnviandoDados(null);
    if (!resultado.sucesso) {
      setErroDados(resultado.erro ?? "Não foi possível despublicar o empreendimento.");
      return;
    }
    router.refresh();
    setMensagemDados("Despublicado — voltou para rascunho.");
  }

  async function excluir() {
    if (!imovel) return;
    if (!confirm(`Excluir "${imovel.titulo}"? Essa ação não pode ser desfeita.`)) return;
    setErroDados(null);
    setEnviandoDados("excluir");
    const resultado = await excluirImovel(imovel.id, imovel.slug);
    setEnviandoDados(null);
    if (!resultado.sucesso) {
      setErroDados(resultado.erro ?? "Não foi possível excluir o empreendimento.");
      return;
    }
    router.push("/admin/imoveis");
  }

  // -----------------------------------------------------------------
  // Aba 2 — Galeria
  // -----------------------------------------------------------------
  const [imagens, setImagens] = useState<ImagemInput[]>(() =>
    (imovel?.imagens ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      ambiente: img.ambiente,
      grupo: img.grupo,
      ordem: img.ordem,
      destaque: img.destaque,
    })),
  );
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [enviandoGaleria, setEnviandoGaleria] = useState(false);
  const [erroGaleria, setErroGaleria] = useState<string | null>(null);
  const [mensagemGaleria, setMensagemGaleria] = useState<string | null>(null);

  async function aoSelecionarImagem(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !imovel) return;
    setErroGaleria(null);
    setEnviandoImagem(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const resultado = await uploadImagemImovel(formData);
    setEnviandoImagem(false);
    e.target.value = "";
    if (!resultado.sucesso || !resultado.url) {
      setErroGaleria(resultado.erro ?? "Não foi possível enviar a imagem.");
      return;
    }
    setImagens((atual) => [
      ...atual,
      {
        url: resultado.url as string,
        ambiente: "",
        grupo: "empreendimento",
        ordem: atual.length,
        destaque: atual.length === 0,
      },
    ]);
  }

  function atualizarImagem(indice: number, campos: Partial<ImagemInput>) {
    setImagens((atual) =>
      atual.map((item, i) => {
        if (i !== indice) {
          // só uma imagem pode ser a capa (destaque)
          if (campos.destaque === true) return { ...item, destaque: false };
          return item;
        }
        return { ...item, ...campos };
      }),
    );
  }

  function removerImagem(indice: number) {
    setImagens((atual) => atual.filter((_, i) => i !== indice));
  }

  async function salvarGaleria() {
    if (!imovel) return;
    setErroGaleria(null);
    setMensagemGaleria(null);
    setEnviandoGaleria(true);
    const resultado = await salvarImagens(imovel.id, valoresDados.slug, imagens);
    setEnviandoGaleria(false);
    if (!resultado.sucesso) {
      setErroGaleria(resultado.erro ?? "Não foi possível salvar a galeria.");
      return;
    }
    router.refresh();
    setMensagemGaleria("Galeria salva.");
  }

  // -----------------------------------------------------------------
  // Aba 3 — Tipologias
  // -----------------------------------------------------------------
  const [tipologias, setTipologias] = useState<(TipologiaInput & { chaveLocal: string })[]>(() =>
    (imovel?.tipologias ?? []).map((t) => ({
      id: t.id,
      chaveLocal: t.id,
      nome: t.nome,
      area: t.area,
      dormitorios: t.dormitorios,
      suites: t.suites,
      banheiros: t.banheiros,
      vagas: t.vagas,
      valor_a_partir_de: t.valor_a_partir_de,
      planta_url: t.planta_url,
      ordem: t.ordem,
    })),
  );
  const [enviandoTipologias, setEnviandoTipologias] = useState(false);
  const [enviandoPlantaLinha, setEnviandoPlantaLinha] = useState<string | null>(null);
  const [erroTipologias, setErroTipologias] = useState<string | null>(null);
  const [mensagemTipologias, setMensagemTipologias] = useState<string | null>(null);

  function adicionarTipologia() {
    setTipologias((atual) => [
      ...atual,
      {
        chaveLocal: idTemporario(),
        nome: "",
        area: null,
        dormitorios: null,
        suites: null,
        banheiros: null,
        vagas: null,
        valor_a_partir_de: null,
        planta_url: null,
        ordem: atual.length,
      },
    ]);
  }

  function atualizarTipologia(chave: string, campos: Partial<TipologiaInput>) {
    setTipologias((atual) => atual.map((t) => (t.chaveLocal === chave ? { ...t, ...campos } : t)));
  }

  function removerTipologia(chave: string) {
    setTipologias((atual) => atual.filter((t) => t.chaveLocal !== chave));
  }

  async function aoSelecionarPlanta(chave: string, e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErroTipologias(null);
    setEnviandoPlantaLinha(chave);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const resultado = await uploadImagemImovel(formData);
    setEnviandoPlantaLinha(null);
    e.target.value = "";
    if (!resultado.sucesso || !resultado.url) {
      setErroTipologias(resultado.erro ?? "Não foi possível enviar a planta.");
      return;
    }
    atualizarTipologia(chave, { planta_url: resultado.url });
  }

  async function salvarTipologiasAba() {
    if (!imovel) return;
    setErroTipologias(null);
    setMensagemTipologias(null);
    setEnviandoTipologias(true);
    const payload = tipologias.map(({ chaveLocal, ...resto }) => resto);
    const resultado = await salvarTipologias(imovel.id, valoresDados.slug, payload);
    setEnviandoTipologias(false);
    if (!resultado.sucesso) {
      setErroTipologias(resultado.erro ?? "Não foi possível salvar as tipologias.");
      return;
    }
    router.refresh();
    setMensagemTipologias("Tipologias salvas.");
  }

  // -----------------------------------------------------------------
  // Aba 4 — Diferenciais
  // -----------------------------------------------------------------
  const [diferenciais, setDiferenciais] = useState<(DiferencialInput & { chaveLocal: string })[]>(
    () =>
      (imovel?.diferenciais ?? []).map((d) => ({
        id: d.id,
        chaveLocal: d.id,
        grupo: d.grupo,
        nome: d.nome,
        icone: d.icone,
        ordem: d.ordem,
      })),
  );
  const [enviandoDiferenciais, setEnviandoDiferenciais] = useState(false);
  const [erroDiferenciais, setErroDiferenciais] = useState<string | null>(null);
  const [mensagemDiferenciais, setMensagemDiferenciais] = useState<string | null>(null);

  function adicionarDiferencial() {
    setDiferenciais((atual) => [
      ...atual,
      {
        chaveLocal: idTemporario(),
        grupo: "lazer",
        nome: "",
        icone: null,
        ordem: atual.length,
      },
    ]);
  }

  function atualizarDiferencial(chave: string, campos: Partial<DiferencialInput>) {
    setDiferenciais((atual) => atual.map((d) => (d.chaveLocal === chave ? { ...d, ...campos } : d)));
  }

  function removerDiferencial(chave: string) {
    setDiferenciais((atual) => atual.filter((d) => d.chaveLocal !== chave));
  }

  async function salvarDiferenciaisAba() {
    if (!imovel) return;
    setErroDiferenciais(null);
    setMensagemDiferenciais(null);
    setEnviandoDiferenciais(true);
    const payload = diferenciais.map(({ chaveLocal, ...resto }) => resto);
    const resultado = await salvarDiferenciais(imovel.id, valoresDados.slug, payload);
    setEnviandoDiferenciais(false);
    if (!resultado.sucesso) {
      setErroDiferenciais(resultado.erro ?? "Não foi possível salvar os diferenciais.");
      return;
    }
    router.refresh();
    setMensagemDiferenciais("Diferenciais salvos.");
  }

  // -----------------------------------------------------------------
  // Aba 5 — FAQ
  // -----------------------------------------------------------------
  const [faqs, setFaqs] = useState<(FaqInput & { chaveLocal: string })[]>(() =>
    (imovel?.faqs ?? []).map((f) => ({
      id: f.id,
      chaveLocal: f.id,
      pergunta: f.pergunta,
      resposta: f.resposta,
      ordem: f.ordem,
    })),
  );
  const [enviandoFaqs, setEnviandoFaqs] = useState(false);
  const [erroFaqs, setErroFaqs] = useState<string | null>(null);
  const [mensagemFaqs, setMensagemFaqs] = useState<string | null>(null);

  function adicionarFaq() {
    setFaqs((atual) => [
      ...atual,
      { chaveLocal: idTemporario(), pergunta: "", resposta: "", ordem: atual.length },
    ]);
  }

  function atualizarFaq(chave: string, campos: Partial<FaqInput>) {
    setFaqs((atual) => atual.map((f) => (f.chaveLocal === chave ? { ...f, ...campos } : f)));
  }

  function removerFaq(chave: string) {
    setFaqs((atual) => atual.filter((f) => f.chaveLocal !== chave));
  }

  async function salvarFaqsAba() {
    if (!imovel) return;
    setErroFaqs(null);
    setMensagemFaqs(null);
    setEnviandoFaqs(true);
    const payload = faqs.map(({ chaveLocal, ...resto }) => resto);
    const resultado = await salvarFaqs(imovel.id, valoresDados.slug, payload);
    setEnviandoFaqs(false);
    if (!resultado.sucesso) {
      setErroFaqs(resultado.erro ?? "Não foi possível salvar o FAQ.");
      return;
    }
    router.refresh();
    setMensagemFaqs("FAQ salvo.");
  }

  // -----------------------------------------------------------------
  return (
    <div>
      <Link
        href="/admin/imoveis"
        className="mb-4 inline-block text-sm text-neutral-500 hover:text-[var(--abissal)]"
      >
        ← Voltar para empreendimentos
      </Link>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-black/10">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition ${
              aba === item.id
                ? "border border-b-0 border-black/10 bg-white text-[var(--abissal)]"
                : "text-neutral-500 hover:text-[var(--abissal)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {aba === "dados" ? (
        <div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <label className={LABEL} htmlFor="titulo">
                Título
              </label>
              <input id="titulo" value={valoresDados.titulo} onChange={aoMudarTitulo} className={CAMPO} />

              <label className={LABEL} htmlFor="slug">
                Slug
              </label>
              <input id="slug" value={valoresDados.slug} onChange={aoMudarSlug} className={`${CAMPO} font-mono`} />
              {slugMudouEmImovelPublicado ? (
                <div className="-mt-2 mb-4 rounded-md border border-[var(--erro)]/30 bg-red-50 p-3 text-sm text-[var(--erro)]">
                  <p className="mb-2">
                    ⚠ Este empreendimento está publicado em <code>/imoveis/{imovel!.slug}/</code>. Mudar
                    o slug quebra essa URL indexada (SEO) — você precisará adicionar um redirect 301
                    manualmente em <code>next.config.ts</code>.
                  </p>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={confirmaSlug}
                      onChange={(e) => setConfirmaSlug(e.target.checked)}
                    />
                    Entendo que isso quebra a URL indexada e quero mudar assim mesmo.
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="tipo">
                    Tipo
                  </label>
                  <select
                    id="tipo"
                    value={valoresDados.tipo_id}
                    onChange={(e) => setCampoDados("tipo_id", e.target.value)}
                    className={CAMPO}
                  >
                    {tipos.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="fase">
                    Fase
                  </label>
                  <select
                    id="fase"
                    value={valoresDados.fase_id}
                    onChange={(e) => setCampoDados("fase_id", e.target.value)}
                    className={CAMPO}
                  >
                    {fases.map((fase) => (
                      <option key={fase.id} value={fase.id}>
                        {fase.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LABEL} htmlFor="bairro">
                    Bairro
                  </label>
                  <input
                    id="bairro"
                    value={valoresDados.bairro}
                    onChange={(e) => setCampoDados("bairro", e.target.value)}
                    className={CAMPO}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="cidade">
                    Cidade
                  </label>
                  <input
                    id="cidade"
                    value={valoresDados.cidade}
                    onChange={(e) => setCampoDados("cidade", e.target.value)}
                    className={CAMPO}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="estado">
                    UF
                  </label>
                  <input
                    id="estado"
                    value={valoresDados.estado}
                    onChange={(e) => setCampoDados("estado", e.target.value)}
                    className={CAMPO}
                  />
                </div>
              </div>

              <label className={LABEL} htmlFor="endereco">
                Endereço
              </label>
              <input
                id="endereco"
                value={valoresDados.endereco}
                onChange={(e) => setCampoDados("endereco", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="cep">
                CEP
              </label>
              <input
                id="cep"
                value={valoresDados.cep}
                onChange={(e) => setCampoDados("cep", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL}>Faixa de área (m²)</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  aria-label="Área mínima"
                  placeholder="mín."
                  value={valoresDados.area_min}
                  onChange={(e) => setCampoDados("area_min", e.target.value)}
                  className={CAMPO}
                />
                <input
                  aria-label="Área máxima"
                  placeholder="máx."
                  value={valoresDados.area_max}
                  onChange={(e) => setCampoDados("area_max", e.target.value)}
                  className={CAMPO}
                />
              </div>

              <label className={LABEL}>Faixa de dormitórios</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  aria-label="Dormitórios mínimo"
                  placeholder="mín."
                  value={valoresDados.dormitorios_min}
                  onChange={(e) => setCampoDados("dormitorios_min", e.target.value)}
                  className={CAMPO}
                />
                <input
                  aria-label="Dormitórios máximo"
                  placeholder="máx."
                  value={valoresDados.dormitorios_max}
                  onChange={(e) => setCampoDados("dormitorios_max", e.target.value)}
                  className={CAMPO}
                />
              </div>

              <label className={LABEL}>Faixa de banheiros</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  aria-label="Banheiros mínimo"
                  placeholder="mín."
                  value={valoresDados.banheiros_min}
                  onChange={(e) => setCampoDados("banheiros_min", e.target.value)}
                  className={CAMPO}
                />
                <input
                  aria-label="Banheiros máximo"
                  placeholder="máx."
                  value={valoresDados.banheiros_max}
                  onChange={(e) => setCampoDados("banheiros_max", e.target.value)}
                  className={CAMPO}
                />
              </div>

              <label className={LABEL}>Faixa de vagas</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  aria-label="Vagas mínimo"
                  placeholder="mín."
                  value={valoresDados.vagas_min}
                  onChange={(e) => setCampoDados("vagas_min", e.target.value)}
                  className={CAMPO}
                />
                <input
                  aria-label="Vagas máximo"
                  placeholder="máx."
                  value={valoresDados.vagas_max}
                  onChange={(e) => setCampoDados("vagas_max", e.target.value)}
                  className={CAMPO}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="valor_a_partir_de">
                    Valor a partir de (R$)
                  </label>
                  <input
                    id="valor_a_partir_de"
                    inputMode="numeric"
                    placeholder="R$ 445.000"
                    value={valoresDados.valor_a_partir_de}
                    onChange={(e) => setCampoDados("valor_a_partir_de", mascaraMoeda(e.target.value))}
                    disabled={valoresDados.valor_sob_consulta}
                    className={`${CAMPO} disabled:bg-neutral-100 disabled:text-neutral-400`}
                  />
                  <label className="-mt-2 mb-4 flex items-center gap-2 text-sm text-[var(--abissal)]">
                    <input
                      type="checkbox"
                      checked={valoresDados.valor_sob_consulta}
                      onChange={(e) => setCampoDados("valor_sob_consulta", e.target.checked)}
                    />
                    Sob consulta (não exibe o valor na página)
                  </label>
                </div>
                <div>
                  <label className={LABEL} htmlFor="previsao_entrega">
                    Previsão de entrega
                  </label>
                  <input
                    id="previsao_entrega"
                    placeholder="Dez/2027"
                    value={valoresDados.previsao_entrega}
                    onChange={(e) => setCampoDados("previsao_entrega", e.target.value)}
                    className={CAMPO}
                  />
                </div>
              </div>

              <label className={LABEL} htmlFor="video_youtube_url">
                Vídeo do YouTube (opcional)
              </label>
              <input
                id="video_youtube_url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={valoresDados.video_youtube_url}
                onChange={(e) => setCampoDados("video_youtube_url", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="ordem">
                Ordem no índice (menor aparece primeiro)
              </label>
              <input
                id="ordem"
                value={valoresDados.ordem}
                onChange={(e) => setCampoDados("ordem", e.target.value)}
                className={CAMPO}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="construtora">
                Construtora
              </label>
              <input
                id="construtora"
                value={valoresDados.construtora}
                onChange={(e) => setCampoDados("construtora", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="construtora_logo_url">
                URL do logo da construtora
              </label>
              <input
                id="construtora_logo_url"
                value={valoresDados.construtora_logo_url}
                onChange={(e) => setCampoDados("construtora_logo_url", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="descricao_breve">
                Subtítulo do card (descrição breve)
              </label>
              <textarea
                id="descricao_breve"
                rows={2}
                value={valoresDados.descricao_breve}
                onChange={(e) => setCampoDados("descricao_breve", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="descricao_completa">
                Seção &quot;O projeto&quot;
              </label>
              <textarea
                id="descricao_completa"
                rows={6}
                value={valoresDados.descricao_completa}
                onChange={(e) => setCampoDados("descricao_completa", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="descricao_unidades">
                Seção &quot;As unidades&quot;
              </label>
              <textarea
                id="descricao_unidades"
                rows={4}
                value={valoresDados.descricao_unidades}
                onChange={(e) => setCampoDados("descricao_unidades", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="seo_title">
                SEO — título
              </label>
              <input
                id="seo_title"
                value={valoresDados.seo_title}
                onChange={(e) => setCampoDados("seo_title", e.target.value)}
                className={CAMPO}
              />

              <label className={LABEL} htmlFor="seo_description">
                SEO — descrição
              </label>
              <textarea
                id="seo_description"
                rows={3}
                value={valoresDados.seo_description}
                onChange={(e) => setCampoDados("seo_description", e.target.value)}
                className={CAMPO}
              />

              {imovel ? (
                <div className="mb-4 text-xs text-neutral-500">
                  Status atual: <span className="font-medium">{imovel.status}</span>
                </div>
              ) : null}
            </div>
          </div>

          {erroDados ? <p className="mb-3 text-sm text-[var(--erro)]">{erroDados}</p> : null}
          {mensagemDados ? <p className="mb-3 text-sm text-[var(--jade)]">{mensagemDados}</p> : null}

          <div className="flex flex-wrap gap-3 border-t border-black/10 pt-4">
            <button
              type="button"
              disabled={enviandoDados !== null}
              onClick={salvarDados}
              className={BOTAO_PRIMARIO}
            >
              {enviandoDados === "salvar" ? "Salvando…" : "Salvar dados gerais"}
            </button>
            {imovel?.status === "ativo" ? (
              <button
                type="button"
                disabled={enviandoDados !== null}
                onClick={despublicar}
                className={BOTAO_SECUNDARIO}
              >
                {enviandoDados === "despublicar" ? "Despublicando…" : "Despublicar"}
              </button>
            ) : imovel ? (
              <button
                type="button"
                disabled={enviandoDados !== null}
                onClick={publicar}
                className={BOTAO_PRIMARIO}
              >
                {enviandoDados === "publicar" ? "Publicando…" : "Publicar"}
              </button>
            ) : null}
            {imovel ? (
              <button
                type="button"
                disabled={enviandoDados !== null}
                onClick={excluir}
                className="ml-auto rounded-md px-4 py-2 text-sm font-semibold text-[var(--erro)] transition hover:bg-red-50 disabled:opacity-50"
              >
                {enviandoDados === "excluir" ? "Excluindo…" : "Excluir"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {aba !== "dados" && !imovel ? (
        <p className="text-sm text-neutral-500">
          Salve os dados gerais primeiro para habilitar esta aba.
        </p>
      ) : null}

      {aba === "galeria" && imovel ? (
        <div>
          <label className={LABEL} htmlFor="nova-imagem">
            Enviar nova imagem
          </label>
          <input
            id="nova-imagem"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={aoSelecionarImagem}
            disabled={enviandoImagem}
            className="mb-4 block w-full text-sm"
          />

          <div className="mb-4 space-y-3">
            {imagens.map((imagem, indice) => (
              <div
                key={imagem.id ?? `nova-${indice}`}
                className="grid grid-cols-1 items-center gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[80px_1.5fr_1fr_80px_90px_auto]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagem.url} alt="" className="h-14 w-20 rounded object-cover" />
                <input
                  aria-label="Ambiente"
                  placeholder="Ambiente (ex.: Fachada)"
                  value={imagem.ambiente ?? ""}
                  onChange={(e) => atualizarImagem(indice, { ambiente: e.target.value })}
                  className={CAMPO_INLINE}
                />
                <select
                  aria-label="Grupo"
                  value={imagem.grupo}
                  onChange={(e) => atualizarImagem(indice, { grupo: e.target.value as ImovelImagemGrupo })}
                  className={CAMPO_INLINE}
                >
                  <option value="empreendimento">Empreendimento</option>
                  <option value="decorado">Decorado</option>
                  <option value="planta">Planta</option>
                  <option value="implantacao">Implantação</option>
                </select>
                <input
                  aria-label="Ordem"
                  type="text"
                  inputMode="numeric"
                  value={imagem.ordem}
                  onChange={(e) => atualizarImagem(indice, { ordem: paraInteiro(e.target.value) })}
                  className={CAMPO_INLINE}
                />
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--abissal)]">
                  <input
                    type="checkbox"
                    checked={imagem.destaque}
                    onChange={(e) => atualizarImagem(indice, { destaque: e.target.checked })}
                  />
                  Capa
                </label>
                <button
                  type="button"
                  onClick={() => removerImagem(indice)}
                  className="text-sm font-semibold text-[var(--erro)] hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
            {imagens.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhuma imagem ainda.</p>
            ) : null}
          </div>

          {erroGaleria ? <p className="mb-3 text-sm text-[var(--erro)]">{erroGaleria}</p> : null}
          {mensagemGaleria ? <p className="mb-3 text-sm text-[var(--jade)]">{mensagemGaleria}</p> : null}

          <button
            type="button"
            disabled={enviandoGaleria}
            onClick={salvarGaleria}
            className={BOTAO_PRIMARIO}
          >
            {enviandoGaleria ? "Salvando…" : "Salvar galeria"}
          </button>
        </div>
      ) : null}

      {aba === "tipologias" && imovel ? (
        <div>
          <div className="mb-4 space-y-3">
            {tipologias.map((tipologia) => (
              <div key={tipologia.chaveLocal} className="rounded-md border border-neutral-200 p-3">
                <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-6">
                  <input
                    aria-label="Nome"
                    placeholder="Nome (ex.: 2 dormitórios)"
                    value={tipologia.nome}
                    onChange={(e) => atualizarTipologia(tipologia.chaveLocal, { nome: e.target.value })}
                    className={`${CAMPO_INLINE} sm:col-span-2`}
                  />
                  <input
                    aria-label="Área"
                    placeholder="Área m²"
                    value={tipologia.area ?? ""}
                    onChange={(e) =>
                      atualizarTipologia(tipologia.chaveLocal, { area: paraNumeroOuNull(e.target.value) })
                    }
                    className={CAMPO_INLINE}
                  />
                  <input
                    aria-label="Dormitórios"
                    placeholder="Dorms"
                    value={tipologia.dormitorios ?? ""}
                    onChange={(e) =>
                      atualizarTipologia(tipologia.chaveLocal, {
                        dormitorios: paraNumeroOuNull(e.target.value),
                      })
                    }
                    className={CAMPO_INLINE}
                  />
                  <input
                    aria-label="Suítes"
                    placeholder="Suítes"
                    value={tipologia.suites ?? ""}
                    onChange={(e) =>
                      atualizarTipologia(tipologia.chaveLocal, { suites: paraNumeroOuNull(e.target.value) })
                    }
                    className={CAMPO_INLINE}
                  />
                  <input
                    aria-label="Banheiros"
                    placeholder="Banheiros"
                    value={tipologia.banheiros ?? ""}
                    onChange={(e) =>
                      atualizarTipologia(tipologia.chaveLocal, {
                        banheiros: paraNumeroOuNull(e.target.value),
                      })
                    }
                    className={CAMPO_INLINE}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                  <input
                    aria-label="Vagas"
                    placeholder="Vagas"
                    value={tipologia.vagas ?? ""}
                    onChange={(e) =>
                      atualizarTipologia(tipologia.chaveLocal, { vagas: paraNumeroOuNull(e.target.value) })
                    }
                    className={CAMPO_INLINE}
                  />
                  <input
                    aria-label="Valor a partir de"
                    placeholder="R$ 445.000"
                    inputMode="numeric"
                    value={moedaParaCampo(tipologia.valor_a_partir_de)}
                    onChange={(e) =>
                      atualizarTipologia(tipologia.chaveLocal, {
                        valor_a_partir_de: paraMoedaOuNull(e.target.value),
                      })
                    }
                    className={`${CAMPO_INLINE} sm:col-span-2`}
                  />
                  <input
                    aria-label="Ordem"
                    placeholder="Ordem"
                    value={tipologia.ordem}
                    onChange={(e) =>
                      atualizarTipologia(tipologia.chaveLocal, { ordem: paraInteiro(e.target.value) })
                    }
                    className={CAMPO_INLINE}
                  />
                  <div className="sm:col-span-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={enviandoPlantaLinha === tipologia.chaveLocal}
                      onChange={(e) => aoSelecionarPlanta(tipologia.chaveLocal, e)}
                      className="block w-full text-xs"
                    />
                    {tipologia.planta_url ? (
                      <span className="mt-1 block truncate text-xs text-neutral-500">
                        Planta: {tipologia.planta_url}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removerTipologia(tipologia.chaveLocal)}
                    className="text-sm font-semibold text-[var(--erro)] hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {tipologias.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhuma tipologia ainda.</p>
            ) : null}
          </div>

          <button type="button" onClick={adicionarTipologia} className={`${BOTAO_SECUNDARIO} mb-4`}>
            + Adicionar tipologia
          </button>

          {erroTipologias ? <p className="mb-3 text-sm text-[var(--erro)]">{erroTipologias}</p> : null}
          {mensagemTipologias ? (
            <p className="mb-3 text-sm text-[var(--jade)]">{mensagemTipologias}</p>
          ) : null}

          <div>
            <button
              type="button"
              disabled={enviandoTipologias}
              onClick={salvarTipologiasAba}
              className={BOTAO_PRIMARIO}
            >
              {enviandoTipologias ? "Salvando…" : "Salvar tipologias"}
            </button>
          </div>
        </div>
      ) : null}

      {aba === "diferenciais" && imovel ? (
        <div>
          <div className="mb-4 space-y-3">
            {diferenciais.map((diferencial) => {
              const IconePreview = obterIcone(diferencial.icone);
              return (
                <div
                  key={diferencial.chaveLocal}
                  className="grid grid-cols-1 items-center gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[110px_1.5fr_1fr_40px_auto]"
                >
                  <select
                    aria-label="Grupo"
                    value={diferencial.grupo}
                    onChange={(e) =>
                      atualizarDiferencial(diferencial.chaveLocal, {
                        grupo: e.target.value as ImovelDiferencialGrupo,
                      })
                    }
                    className={CAMPO_INLINE}
                  >
                    <option value="lazer">Lazer</option>
                    <option value="diferencial">Diferencial</option>
                  </select>
                  <input
                    aria-label="Nome"
                    placeholder="Nome (ex.: Piscina)"
                    value={diferencial.nome}
                    onChange={(e) => atualizarDiferencial(diferencial.chaveLocal, { nome: e.target.value })}
                    className={CAMPO_INLINE}
                  />
                  <select
                    aria-label="Ícone"
                    value={diferencial.icone ?? ""}
                    onChange={(e) =>
                      atualizarDiferencial(diferencial.chaveLocal, { icone: e.target.value || null })
                    }
                    className={CAMPO_INLINE}
                  >
                    <option value="">Sem ícone</option>
                    {listaDeIcones().map((slug) => (
                      <option key={slug} value={slug}>
                        {slug}
                      </option>
                    ))}
                  </select>
                  <IconePreview className="h-5 w-5 text-[var(--jade)]" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => removerDiferencial(diferencial.chaveLocal)}
                    className="text-sm font-semibold text-[var(--erro)] hover:underline"
                  >
                    Remover
                  </button>
                </div>
              );
            })}
            {diferenciais.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhum diferencial ainda.</p>
            ) : null}
          </div>

          <button type="button" onClick={adicionarDiferencial} className={`${BOTAO_SECUNDARIO} mb-4`}>
            + Adicionar diferencial
          </button>

          {erroDiferenciais ? <p className="mb-3 text-sm text-[var(--erro)]">{erroDiferenciais}</p> : null}
          {mensagemDiferenciais ? (
            <p className="mb-3 text-sm text-[var(--jade)]">{mensagemDiferenciais}</p>
          ) : null}

          <div>
            <button
              type="button"
              disabled={enviandoDiferenciais}
              onClick={salvarDiferenciaisAba}
              className={BOTAO_PRIMARIO}
            >
              {enviandoDiferenciais ? "Salvando…" : "Salvar diferenciais"}
            </button>
          </div>
        </div>
      ) : null}

      {aba === "faq" && imovel ? (
        <div>
          <div className="mb-4 space-y-3">
            {faqs.map((faq) => (
              <div key={faq.chaveLocal} className="rounded-md border border-neutral-200 p-3">
                <label className={LABEL}>Pergunta</label>
                <textarea
                  rows={2}
                  value={faq.pergunta}
                  onChange={(e) => atualizarFaq(faq.chaveLocal, { pergunta: e.target.value })}
                  className={CAMPO}
                />
                <label className={LABEL}>Resposta</label>
                <textarea
                  rows={3}
                  value={faq.resposta}
                  onChange={(e) => atualizarFaq(faq.chaveLocal, { resposta: e.target.value })}
                  className={CAMPO}
                />
                <button
                  type="button"
                  onClick={() => removerFaq(faq.chaveLocal)}
                  className="text-sm font-semibold text-[var(--erro)] hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
            {faqs.length === 0 ? <p className="text-sm text-neutral-500">Nenhuma pergunta ainda.</p> : null}
          </div>

          <button type="button" onClick={adicionarFaq} className={`${BOTAO_SECUNDARIO} mb-4`}>
            + Adicionar pergunta
          </button>

          {erroFaqs ? <p className="mb-3 text-sm text-[var(--erro)]">{erroFaqs}</p> : null}
          {mensagemFaqs ? <p className="mb-3 text-sm text-[var(--jade)]">{mensagemFaqs}</p> : null}

          <div>
            <button type="button" disabled={enviandoFaqs} onClick={salvarFaqsAba} className={BOTAO_PRIMARIO}>
              {enviandoFaqs ? "Salvando…" : "Salvar FAQ"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
