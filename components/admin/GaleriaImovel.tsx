"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { uploadImagemImovel } from "@/app/actions/admin-imoveis";
import type { ImagemInput } from "@/lib/validations/imovel";
import type { ImovelImagemGrupo } from "@/types/database";
import {
  GRUPOS_GALERIA,
  agruparImagens,
  achatarGaleria,
  moverDentroDoGrupo,
  moverEntreGrupos,
  adicionarAoGrupo,
  removerDoGrupo,
  type GaleriaAgrupada,
} from "@/lib/imoveis/galeria";

const CAMPO_INLINE =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";

const TIPOS_AUTORIZADOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

/** Frase de convite exibida enquanto o grupo não tem nenhuma imagem. */
const CONVITE_VAZIO: Partial<Record<ImovelImagemGrupo, string>> = {
  empreendimento: "Envie as primeiras fotos da fachada e das áreas comuns.",
  decorado: "Envie as primeiras fotos do decorado.",
  planta: "Envie as primeiras plantas baixas.",
};

/** `ImagemInput` com uma chave local estável, para dar `id` ao dnd-kit mesmo
 * em imagens novas que ainda não têm `id` do banco. */
type ImagemComChave = ImagemInput & { chaveLocal: string };

function chaveLocalNova(): string {
  return `img-${Math.random().toString(36).slice(2)}`;
}

function comChaveLocal(imagem: ImagemInput): ImagemComChave {
  return { ...imagem, chaveLocal: imagem.id ?? chaveLocalNova() };
}

function idContainer(grupo: ImovelImagemGrupo): string {
  return `secao-${grupo}`;
}

function grupoDoContainer(id: string): ImovelImagemGrupo | null {
  const encontrado = GRUPOS_GALERIA.find((g) => idContainer(g.id) === id);
  return encontrado ? encontrado.id : null;
}

function localizarGrupo(
  grupos: GaleriaAgrupada<ImagemComChave>,
  chaveLocal: string,
): ImovelImagemGrupo | null {
  const encontrado = GRUPOS_GALERIA.find((g) =>
    grupos[g.id].some((item) => item.chaveLocal === chaveLocal),
  );
  return encontrado ? encontrado.id : null;
}

export type GaleriaImovelProps = {
  imagens: ImagemInput[];
  onChange: (imagens: ImagemInput[]) => void;
};

/**
 * Aba Galeria do editor de imóveis: 4 seções (uma por grupo), upload
 * múltiplo com validação no cliente, e reordenação por arrastar (mouse,
 * toque e teclado) via dnd-kit. Mantém em `grupos` sua própria cópia
 * "agrupada" da galeria — a fonte da verdade para `ordem`/`destaque`
 * continua sendo `achatarGaleria`, repassada ao pai a cada mudança.
 */
export function GaleriaImovel({ imagens, onChange }: GaleriaImovelProps) {
  const [grupos, setGrupos] = useState<GaleriaAgrupada<ImagemComChave>>(() =>
    agruparImagens(imagens.map(comChaveLocal)),
  );
  const [itemAtivo, setItemAtivo] = useState<ImagemComChave | null>(null);
  const [enviandoPorGrupo, setEnviandoPorGrupo] = useState<Partial<Record<ImovelImagemGrupo, number>>>({});
  const [grupoArrastandoArquivo, setGrupoArrastandoArquivo] = useState<ImovelImagemGrupo | null>(null);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // `onChange` é lido por uma ref para o efeito abaixo não precisar dele nas
  // deps — assim uma nova identidade de função a cada render do pai (comum
  // em handlers inline) não dispara `onChange` de novo sem `grupos` ter mudado.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const primeiraRenderizacao = useRef(true);
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    const achatada = achatarGaleria(grupos).map(({ chaveLocal: _chaveLocal, ...resto }) => resto);
    onChangeRef.current(achatada);
  }, [grupos]);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(consulta.matches);
    function aoMudar(e: MediaQueryListEvent) {
      setReducedMotion(e.matches);
    }
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  // MouseSensor, e não PointerSensor: o PointerSensor também captura toque, e
  // com ele o arraste começaria a 8px de deslize — o que obrigaria a marcar a
  // miniatura com `touch-action: none` e mataria a rolagem da página no
  // celular, justamente onde a grade ocupa quase a tela toda. Com MouseSensor
  // o toque fica todo com o TouchSensor, cujo `delay` deixa o navegador rolar
  // normalmente até o press-and-hold completar.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function enviarArquivos(grupo: ImovelImagemGrupo, arquivos: File[]) {
    if (arquivos.length === 0) return;

    const validos: File[] = [];
    const mensagensDeErro: string[] = [];
    for (const arquivo of arquivos) {
      if (!TIPOS_AUTORIZADOS.has(arquivo.type)) {
        mensagensDeErro.push(`${arquivo.name}: formato não suportado. Use JPEG, PNG, WEBP ou GIF.`);
        continue;
      }
      if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
        mensagensDeErro.push(`${arquivo.name}: maior que 5MB.`);
        continue;
      }
      validos.push(arquivo);
    }

    if (validos.length > 0) {
      setErroUpload(null);
      setEnviandoPorGrupo((atual) => ({ ...atual, [grupo]: (atual[grupo] ?? 0) + validos.length }));

      const resultados = await Promise.all(
        validos.map(async (arquivo) => {
          const formData = new FormData();
          formData.append("arquivo", arquivo);
          const resultado = await uploadImagemImovel(formData);
          return { arquivo, resultado };
        }),
      );

      setEnviandoPorGrupo((atual) => ({
        ...atual,
        [grupo]: Math.max(0, (atual[grupo] ?? 0) - validos.length),
      }));

      const novas: ImagemComChave[] = [];
      for (const { arquivo, resultado } of resultados) {
        if (resultado.sucesso && resultado.url) {
          novas.push({
            url: resultado.url,
            // String vazia, nunca null: o `opcional` de imagemSchema aceita
            // string, "" e undefined, mas REPROVA null — e é esse schema que
            // salvarImagens roda. Ver tests/unidade/galeria.test.ts.
            ambiente: "",
            grupo,
            ordem: 0,
            destaque: false,
            chaveLocal: chaveLocalNova(),
          });
        } else {
          mensagensDeErro.push(`${arquivo.name}: ${resultado.erro ?? "não foi possível enviar."}`);
        }
      }
      if (novas.length > 0) {
        setGrupos((atual) => adicionarAoGrupo(atual, grupo, novas));
      }
    }

    if (mensagensDeErro.length > 0) setErroUpload(mensagensDeErro.join(" "));
  }

  function aoSelecionarArquivos(grupo: ImovelImagemGrupo, e: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    void enviarArquivos(grupo, arquivos);
  }

  function aoArrastarArquivoSobre(e: DragEvent<HTMLElement>, grupo: ImovelImagemGrupo) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setGrupoArrastandoArquivo(grupo);
  }

  function aoSairDoArraste(grupo: ImovelImagemGrupo) {
    setGrupoArrastandoArquivo((atual) => (atual === grupo ? null : atual));
  }

  function aoSoltarArquivo(e: DragEvent<HTMLElement>, grupo: ImovelImagemGrupo) {
    e.preventDefault();
    setGrupoArrastandoArquivo(null);
    const arquivos = Array.from(e.dataTransfer.files ?? []);
    if (arquivos.length === 0) return;
    void enviarArquivos(grupo, arquivos);
  }

  function atualizarAmbiente(grupo: ImovelImagemGrupo, indice: number, valor: string) {
    setGrupos((atual) => ({
      ...atual,
      [grupo]: atual[grupo].map((item, i) => (i === indice ? { ...item, ambiente: valor } : item)),
    }));
  }

  function remover(grupo: ImovelImagemGrupo, indice: number) {
    setGrupos((atual) => removerDoGrupo(atual, grupo, indice));
  }

  function aoIniciarArraste(event: DragStartEvent) {
    const id = String(event.active.id);
    const grupo = localizarGrupo(grupos, id);
    if (!grupo) return;
    setItemAtivo(grupos[grupo].find((item) => item.chaveLocal === id) ?? null);
  }

  function aoTerminarArraste(event: DragEndEvent) {
    setItemAtivo(null);
    const { active, over } = event;
    if (!over) return;

    const idAtivo = String(active.id);
    const idAlvo = String(over.id);
    if (idAtivo === idAlvo) return;

    const grupoOrigem = localizarGrupo(grupos, idAtivo);
    if (!grupoOrigem) return;
    const indiceOrigem = grupos[grupoOrigem].findIndex((item) => item.chaveLocal === idAtivo);
    if (indiceOrigem === -1) return;

    let grupoDestino = localizarGrupo(grupos, idAlvo);
    let indiceDestino: number;
    if (grupoDestino) {
      indiceDestino = grupos[grupoDestino].findIndex((item) => item.chaveLocal === idAlvo);
    } else {
      const doContainer = grupoDoContainer(idAlvo);
      if (!doContainer) return;
      grupoDestino = doContainer;
      indiceDestino = grupos[grupoDestino].length;
    }

    if (grupoOrigem === grupoDestino && indiceOrigem === indiceDestino) return;
    const destinoFinal = grupoDestino;

    setGrupos((atual) =>
      grupoOrigem === destinoFinal
        ? moverDentroDoGrupo(atual, grupoOrigem, indiceOrigem, indiceDestino)
        : moverEntreGrupos(atual, grupoOrigem, indiceOrigem, destinoFinal, indiceDestino),
    );
  }

  return (
    <div>
      {erroUpload ? <p className="mb-4 text-sm text-[var(--erro)]">{erroUpload}</p> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={aoIniciarArraste}
        onDragEnd={aoTerminarArraste}
        onDragCancel={() => setItemAtivo(null)}
      >
        <div className="space-y-8">
          {GRUPOS_GALERIA.map((grupoInfo) => (
            <SecaoGrupo
              key={grupoInfo.id}
              grupoInfo={grupoInfo}
              itens={grupos[grupoInfo.id]}
              enviando={enviandoPorGrupo[grupoInfo.id] ?? 0}
              destacado={grupoArrastandoArquivo === grupoInfo.id}
              reducedMotion={reducedMotion}
              onDragOverArquivo={(e) => aoArrastarArquivoSobre(e, grupoInfo.id)}
              onDragLeaveArquivo={() => aoSairDoArraste(grupoInfo.id)}
              onDropArquivo={(e) => aoSoltarArquivo(e, grupoInfo.id)}
              onSelecionarArquivos={(e) => aoSelecionarArquivos(grupoInfo.id, e)}
              onAlterarAmbiente={(indice, valor) => atualizarAmbiente(grupoInfo.id, indice, valor)}
              onRemover={(indice) => remover(grupoInfo.id, indice)}
            />
          ))}
        </div>

        <DragOverlay>
          {itemAtivo ? (
            <div className="aspect-[4/3] w-32 overflow-hidden rounded-md shadow-lg ring-2 ring-[var(--jade)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemAtivo.url} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

type GrupoInfo = (typeof GRUPOS_GALERIA)[number];

type SecaoGrupoProps = {
  grupoInfo: GrupoInfo;
  itens: ImagemComChave[];
  enviando: number;
  destacado: boolean;
  reducedMotion: boolean;
  onDragOverArquivo: (e: DragEvent<HTMLElement>) => void;
  onDragLeaveArquivo: () => void;
  onDropArquivo: (e: DragEvent<HTMLElement>) => void;
  onSelecionarArquivos: (e: ChangeEvent<HTMLInputElement>) => void;
  onAlterarAmbiente: (indice: number, valor: string) => void;
  onRemover: (indice: number) => void;
};

function SecaoGrupo({
  grupoInfo,
  itens,
  enviando,
  destacado,
  reducedMotion,
  onDragOverArquivo,
  onDragLeaveArquivo,
  onDropArquivo,
  onSelecionarArquivos,
  onAlterarAmbiente,
  onRemover,
}: SecaoGrupoProps) {
  const { setNodeRef } = useDroppable({ id: idContainer(grupoInfo.id) });
  const contagem = itens.length === 1 ? "1 imagem" : `${itens.length} imagens`;

  return (
    <section
      onDragOver={onDragOverArquivo}
      onDragLeave={onDragLeaveArquivo}
      onDrop={onDropArquivo}
      className={`rounded-md border-2 p-4 transition-colors ${
        destacado ? "border-[var(--jade)] bg-[var(--jade)]/5" : "border-transparent"
      }`}
    >
      <header className="mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-[var(--abissal)]">{grupoInfo.nome}</h3>
          <span className="text-xs text-neutral-500">{contagem}</span>
        </div>
        <p className="text-xs text-neutral-500">{grupoInfo.descricao}</p>
      </header>

      {itens.length === 0 && enviando === 0 ? (
        <p className="mb-3 text-sm text-neutral-500">{CONVITE_VAZIO[grupoInfo.id]}</p>
      ) : null}

      <div
        ref={setNodeRef}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        <SortableContext items={itens.map((item) => item.chaveLocal)} strategy={rectSortingStrategy}>
          {itens.map((item, indice) => (
            <Miniatura
              key={item.chaveLocal}
              item={item}
              ehCapa={grupoInfo.id === "empreendimento" && indice === 0}
              reducedMotion={reducedMotion}
              onAlterarAmbiente={(valor) => onAlterarAmbiente(indice, valor)}
              onRemover={() => onRemover(indice)}
            />
          ))}
        </SortableContext>

        {Array.from({ length: enviando }).map((_, i) => (
          <div key={`esqueleto-${i}`} className="aspect-[4/3] animate-pulse rounded-md bg-neutral-200" />
        ))}

        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-neutral-300 text-xs font-medium text-neutral-500 transition hover:border-[var(--jade)] hover:text-[var(--jade)]">
          <span aria-hidden="true" className="text-xl leading-none">
            +
          </span>
          <span>Enviar imagens</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onSelecionarArquivos}
          />
        </label>
      </div>
    </section>
  );
}

type MiniaturaProps = {
  item: ImagemComChave;
  ehCapa: boolean;
  reducedMotion: boolean;
  onAlterarAmbiente: (valor: string) => void;
  onRemover: () => void;
};

function Miniatura({ item, ehCapa, reducedMotion, onAlterarAmbiente, onRemover }: MiniaturaProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.chaveLocal });

  const estilo: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: reducedMotion ? undefined : transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={`group relative ${ehCapa ? "rounded-md ring-1 ring-[var(--bronze)]" : ""}`}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          src={item.url}
          alt={item.ambiente || ""}
          aria-label={`Arrastar para reordenar${item.ambiente ? ` — ${item.ambiente}` : ""}`}
          draggable={false}
          className="aspect-[4/3] w-full cursor-grab rounded-md object-cover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] focus-visible:outline-offset-2 active:cursor-grabbing"
        />
        <button
          type="button"
          onClick={onRemover}
          aria-label="Remover imagem"
          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-xs leading-none text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <span aria-hidden="true">×</span>
        </button>
        {ehCapa ? (
          <span className="absolute bottom-1 left-1 rounded bg-[var(--bronze)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Capa
          </span>
        ) : null}
      </div>
      <input
        value={item.ambiente ?? ""}
        onChange={(e) => onAlterarAmbiente(e.target.value)}
        placeholder="Ambiente (ex.: Fachada)"
        aria-label="Ambiente"
        className={`${CAMPO_INLINE} mt-1.5`}
      />
    </div>
  );
}
