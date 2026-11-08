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
import {
  montarPayloadImovel,
  paraInteiro,
  paraMoedaOuNull,
  paraNumeroOuNull,
  moedaParaCampo,
  valoresIniciaisDados,
  type ValoresDados,
} from "@/lib/imoveis/formulario";
import { CamposLancamento } from "@/components/admin/imovel/CamposLancamento";
import { CamposPronto } from "@/components/admin/imovel/CamposPronto";
import { CAMPO, LABEL } from "@/components/admin/imovel/camposComuns";
import { prepararImagem } from "@/lib/imoveis/redimensionar";
import type { ImovelComColecoesAdmin } from "@/lib/queries/admin-imoveis";
import type { ImovelFaseOpcao, ImovelTipoOpcao } from "@/lib/queries/imoveis";
import type { ImagemInput, TipologiaInput, DiferencialInput, FaqInput } from "@/lib/validations/imovel";
import type { ImovelDiferencialGrupo, ImovelModalidade } from "@/types/database";
import { listaDeIcones, obterIcone } from "@/components/imoveis/icones";
import { GaleriaImovel } from "@/components/admin/GaleriaImovel";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { useGuardaAlteracoes } from "@/components/admin/useGuardaAlteracoes";
import { houveAlteracao } from "@/lib/admin/alteracoes";
import { useToast } from "@/lib/admin/toast";

const CAMPO_INLINE =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const BOTAO_SECUNDARIO =
  "rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-[var(--abissal)] transition hover:border-[var(--abissal)] disabled:opacity-50";
const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] disabled:opacity-50";

type AbaId = "dados" | "galeria" | "tipologias" | "diferenciais" | "faq";

// Imóvel pronto é uma unidade só: não tem tipologias.
const ABAS_PRONTO: AbaId[] = ["dados", "galeria", "diferenciais", "faq"];

const ABAS: { id: AbaId; label: string }[] = [
  { id: "dados", label: "Dados gerais" },
  { id: "galeria", label: "Galeria" },
  { id: "tipologias", label: "Tipologias" },
  { id: "diferenciais", label: "Diferenciais" },
  { id: "faq", label: "FAQ" },
];

/** Gera um id temporário só para `key` do React em linhas ainda não salvas. */
function idTemporario(): string {
  return `tmp-${Math.random().toString(36).slice(2)}`;
}

type ImovelEditorProps = {
  imovel: ImovelComColecoesAdmin | null;
  /** Imóvel existente manda; em cadastro novo vem da escolha em /admin/imoveis/novo. */
  modalidade: ImovelModalidade;
  tipos: ImovelTipoOpcao[];
  fases: ImovelFaseOpcao[];
};

export function ImovelEditor({ imovel, modalidade: modalidadeInicial, tipos, fases }: ImovelEditorProps) {
  const router = useRouter();
  const modalidade: ImovelModalidade = imovel?.modalidade ?? modalidadeInicial;
  const pronto = modalidade === "pronto";
  const abasVisiveis = pronto ? ABAS.filter((item) => ABAS_PRONTO.includes(item.id)) : ABAS;
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
  // Erro de validação do campo slug: fica inline, junto da confirmação. O resto
  // do feedback (salvo, publicado, falhas de servidor) sai por toast.
  const [erroSlug, setErroSlug] = useState<string | null>(null);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const { mostrarToast } = useToast();

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
      setErroSlug("Marque a confirmação abaixo antes de salvar a mudança de slug.");
      return true;
    }
    return false;
  }

  function montarPayloadDados(): SalvarImovelInput {
    return montarPayloadImovel(valoresDados, modalidade, imovel?.id);
  }

  async function salvarDados() {
    setErroSlug(null);
    if (bloqueadoPorSlug()) return;

    setEnviandoDados("salvar");
    const resultado = await salvarImovel(montarPayloadDados());
    setEnviandoDados(null);

    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível salvar o empreendimento.");
      return;
    }
    setBaseline((atual) => ({ ...atual, dados: valoresDados }));
    if (!imovel && resultado.id) {
      router.replace(`/admin/imoveis/${resultado.id}`);
      return;
    }
    router.refresh();
    mostrarToast("sucesso", "Dados salvos.");
  }

  async function publicar() {
    if (!imovel) return;
    setErroSlug(null);
    if (bloqueadoPorSlug()) return;

    // Salva os dados pendentes antes: publicar sem salvar publicaria a versão
    // antiga do banco e deixaria a edição só na tela (mesmo contrato do PostEditor).
    setEnviandoDados("publicar");
    const resultadoSalvar = await salvarImovel(montarPayloadDados());
    if (!resultadoSalvar.sucesso) {
      setEnviandoDados(null);
      mostrarToast("erro", resultadoSalvar.erro ?? "Não foi possível salvar antes de publicar.");
      return;
    }
    setBaseline((atual) => ({ ...atual, dados: valoresDados }));

    const resultado = await publicarImovel(imovel.id, valoresDados.slug);
    setEnviandoDados(null);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível publicar o empreendimento.");
      return;
    }
    router.refresh();
    mostrarToast("sucesso", "Publicado.");
  }

  async function despublicar() {
    if (!imovel) return;
    setEnviandoDados("despublicar");
    const resultado = await despublicarImovel(imovel.id, imovel.slug);
    setEnviandoDados(null);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível despublicar o empreendimento.");
      return;
    }
    router.refresh();
    mostrarToast("sucesso", "Despublicado — voltou para rascunho.");
  }

  async function excluir() {
    if (!imovel) return;
    setConfirmandoExcluir(false);
    setEnviandoDados("excluir");
    const resultado = await excluirImovel(imovel.id, imovel.slug);
    setEnviandoDados(null);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível excluir o empreendimento.");
      return;
    }
    // Excluído: a navegação é por código, que a guarda de alterações não intercepta.
    router.push("/admin/imoveis");
  }

  // -----------------------------------------------------------------
  // Aba 2 — Galeria
  // -----------------------------------------------------------------
  const [imagens, setImagens] = useState<ImagemInput[]>(() =>
    (imovel?.imagens ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      // A coluna é nullable, mas imagemSchema reprova null em `ambiente` —
      // normaliza na entrada, senão salvar uma galeria que veio do banco com
      // ambiente vazio falha com "Dados inválidos.".
      ambiente: img.ambiente ?? "",
      grupo: img.grupo,
      ordem: img.ordem,
      destaque: img.destaque,
    })),
  );
  const [galeriaAlterada, setGaleriaAlterada] = useState(false);
  const [enviandoGaleria, setEnviandoGaleria] = useState(false);

  function aoMudarGaleria(novasImagens: ImagemInput[]) {
    setImagens(novasImagens);
    setGaleriaAlterada(true);
  }

  async function salvarGaleria() {
    if (!imovel) return;
    setEnviandoGaleria(true);
    const resultado = await salvarImagens(imovel.id, valoresDados.slug, imagens);
    setEnviandoGaleria(false);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível salvar a galeria.");
      return;
    }
    router.refresh();
    setGaleriaAlterada(false);
    mostrarToast("sucesso", "Galeria salva.");
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
    setEnviandoPlantaLinha(chave);
    // Mesma redução da galeria: sem ela a planta em alta resolução estoura o
    // teto de requisição da função serverless na Vercel.
    const preparado = await prepararImagem(arquivo);
    const formData = new FormData();
    formData.append("arquivo", preparado);
    const resultado = await uploadImagemImovel(formData);
    setEnviandoPlantaLinha(null);
    e.target.value = "";
    if (!resultado.sucesso || !resultado.url) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível enviar a planta.");
      return;
    }
    atualizarTipologia(chave, { planta_url: resultado.url });
  }

  async function salvarTipologiasAba() {
    if (!imovel) return;
    setEnviandoTipologias(true);
    const payload = tipologias.map(({ chaveLocal, ...resto }) => resto);
    const resultado = await salvarTipologias(imovel.id, valoresDados.slug, payload);
    setEnviandoTipologias(false);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível salvar as tipologias.");
      return;
    }
    setBaseline((atual) => ({ ...atual, tipologias }));
    router.refresh();
    mostrarToast("sucesso", "Tipologias salvas.");
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
    setEnviandoDiferenciais(true);
    const payload = diferenciais.map(({ chaveLocal, ...resto }) => resto);
    const resultado = await salvarDiferenciais(imovel.id, valoresDados.slug, payload);
    setEnviandoDiferenciais(false);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível salvar os diferenciais.");
      return;
    }
    setBaseline((atual) => ({ ...atual, diferenciais }));
    router.refresh();
    mostrarToast("sucesso", "Diferenciais salvos.");
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
    setEnviandoFaqs(true);
    const payload = faqs.map(({ chaveLocal, ...resto }) => resto);
    const resultado = await salvarFaqs(imovel.id, valoresDados.slug, payload);
    setEnviandoFaqs(false);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível salvar o FAQ.");
      return;
    }
    setBaseline((atual) => ({ ...atual, faqs }));
    router.refresh();
    mostrarToast("sucesso", "FAQ salvo.");
  }

  // -----------------------------------------------------------------
  // Alterações não salvas. A galeria já tem a sua própria marca
  // (`galeriaAlterada`); as demais abas são comparadas com o último estado
  // gravado, porque o `imovel` da prop não muda depois de salvar.
  const estadoAtual = { dados: valoresDados, tipologias, diferenciais, faqs };
  const [baseline, setBaseline] = useState(estadoAtual);
  const sujo = galeriaAlterada || houveAlteracao(baseline, estadoAtual);
  const { saidaPendente, confirmarSaida, cancelarSaida } = useGuardaAlteracoes(sujo);

  return (
    <div>
      <Link
        href="/admin/imoveis"
        className="mb-4 inline-block text-sm text-neutral-500 hover:text-[var(--abissal)]"
      >
        ← Voltar para empreendimentos
      </Link>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-black/10">
        {abasVisiveis.map((item) => (
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
                  {erroSlug ? (
                    <p role="alert" className="mt-2 font-medium">
                      {erroSlug}
                    </p>
                  ) : null}
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
                {pronto ? (
                  <div>
                    <span className={LABEL}>Fase</span>
                    <p className="mb-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                      Pronto (definida automaticamente)
                    </p>
                  </div>
                ) : (
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
                )}
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

              {pronto ? (
                <CamposPronto valores={valoresDados} setCampo={setCampoDados} />
              ) : (
                <CamposLancamento valores={valoresDados} setCampo={setCampoDados} />
              )}

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

              <label className={LABEL} htmlFor="video_data_publicacao">
                Data de publicação do vídeo
              </label>
              <input
                id="video_data_publicacao"
                type="date"
                value={valoresDados.video_data_publicacao}
                onChange={(e) => setCampoDados("video_data_publicacao", e.target.value)}
                className={CAMPO}
              />
              <p className="-mt-3 mb-4 text-xs text-neutral-500">
                Sem esta data o vídeo não entra nos dados estruturados (Google). É a data em que o
                vídeo foi publicado no YouTube.
              </p>

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
              {!pronto ? (
                <>
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
                </>
              ) : null}

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

              {!pronto ? (
                <>
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
                </>
              ) : null}

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
                onClick={() => setConfirmandoExcluir(true)}
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
          <GaleriaImovel
            imagens={imagens}
            onChange={aoMudarGaleria}
            grupos={pronto ? ["empreendimento"] : undefined}
          />

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
            <button
              type="button"
              disabled={enviandoGaleria}
              onClick={salvarGaleria}
              className={BOTAO_PRIMARIO}
            >
              {enviandoGaleria ? "Salvando…" : "Salvar galeria"}
            </button>
            {galeriaAlterada ? (
              <span className="text-xs text-neutral-500">Há alterações não salvas.</span>
            ) : null}
          </div>
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

          <div>
            <button type="button" disabled={enviandoFaqs} onClick={salvarFaqsAba} className={BOTAO_PRIMARIO}>
              {enviandoFaqs ? "Salvando…" : "Salvar FAQ"}
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmarAcao
        aberto={confirmandoExcluir}
        titulo="Excluir empreendimento?"
        descricao={`"${imovel?.titulo ?? ""}" será excluído e a URL deixa de existir. Essa ação não pode ser desfeita.`}
        rotuloConfirmar="Excluir"
        variante="perigo"
        onConfirmar={excluir}
        onCancelar={() => setConfirmandoExcluir(false)}
      />
      <ConfirmarAcao
        aberto={saidaPendente}
        titulo="Descartar alterações?"
        descricao="Há alterações não salvas neste empreendimento. Se sair agora, elas serão perdidas."
        rotuloConfirmar="Descartar e sair"
        rotuloCancelar="Continuar editando"
        variante="perigo"
        onConfirmar={confirmarSaida}
        onCancelar={cancelarSaida}
      />
    </div>
  );
}
