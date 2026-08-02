#!/usr/bin/env node
/* Backfill de marca d'água nas imagens de imóveis publicadas antes desta
 * feature existir (ver lib/imoveis/marca-dagua.ts e a migration 019).
 * Idempotente: pula qualquer objeto de `imovel-images` que já tenha um
 * original de mesmo nome-base salvo em `imovel-images-originais` — esse é
 * o marcador de "já processado". Rodar duas vezes não carimba duas vezes.
 *
 * A composição do selo abaixo é uma cópia enxuta de
 * lib/imoveis/marca-dagua.ts: aquele módulo abre com `import "server-only"`,
 * que lança fora do bundler do Next, então não dá para importá-lo direto
 * num script standalone rodado com `node`. Mudou a lógica lá (posição,
 * opacidade, piso/teto do selo), muda aqui também.
 *
 * O caminho de cada objeto é preservado — mesmo nome, mesmo bucket — então
 * as URLs gravadas em `imovel_imagens`/`imovel_tipologias` não mudam e não
 * há update de tabela nem revalidação de página a fazer aqui.
 *
 * Uso: node --env-file=.env.local scripts/marcar-imagens.mjs
 * (precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY — a
 * service role pula RLS, é a única forma de um script fora do admin escrever
 * no bucket privado de originais.)
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BUCKET_PUBLICO = "imovel-images";
const BUCKET_ORIGINAIS = "imovel-images-originais";
const TAMANHO_PAGINA = 1000;

// Espelha lib/imoveis/marca-dagua.ts — ver aviso no topo do arquivo.
const OPACIDADE = 0.55;
const ESCALA_SELO = 0.18;
const LARGURA_MINIMA_SELO = 190;
const LARGURA_MAXIMA_SELO = 420;
const MARGEM_RELATIVA = 0.025;

const VERDE = "\x1b[32m";
const AMARELO = "\x1b[33m";
const VERMELHO = "\x1b[31m";
const RESET = "\x1b[0m";

let marcaPromise = null;
function carregarMarca() {
  if (!marcaPromise) {
    marcaPromise = readFile(path.join(process.cwd(), "public", "marca-dagua.png"));
  }
  return marcaPromise;
}

async function aplicarMarcaDagua(entrada) {
  const imagem = sharp(entrada, { failOn: "none" }).rotate();
  const metadata = await imagem.metadata();

  const largura = metadata.autoOrient?.width ?? metadata.width;
  const altura = metadata.autoOrient?.height ?? metadata.height;
  if (!largura || !altura) {
    throw new Error("Não foi possível ler as dimensões da imagem.");
  }

  const larguraSeloAlvo = Math.round(
    Math.min(LARGURA_MAXIMA_SELO, Math.max(LARGURA_MINIMA_SELO, largura * ESCALA_SELO)),
  );
  const margem = Math.round(largura * MARGEM_RELATIVA);

  const marcaBase = sharp(await carregarMarca());
  const marcaMeta = await marcaBase.metadata();
  const marcaLargura = marcaMeta.width ?? larguraSeloAlvo;
  const marcaAltura = marcaMeta.height ?? larguraSeloAlvo;

  // Salvaguarda para imagem menor que o próprio selo: encolhe mantendo a
  // proporção até caber na área útil (imagem menos as duas margens).
  const areaUtilLargura = Math.max(1, largura - 2 * margem);
  const areaUtilAltura = Math.max(1, altura - 2 * margem);
  const alturaSeloAlvo = larguraSeloAlvo * (marcaAltura / marcaLargura);
  const fatorAjuste = Math.min(1, areaUtilLargura / larguraSeloAlvo, areaUtilAltura / alturaSeloAlvo);
  const larguraSelo = Math.max(1, Math.round(larguraSeloAlvo * fatorAjuste));

  const { data: seloRaw, info: seloInfo } = await marcaBase
    .resize({ width: larguraSelo })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tileOpacidade = Buffer.from([255, 255, 255, Math.round(OPACIDADE * 255)]);
  const seloComOpacidade = await sharp(seloRaw, {
    raw: { width: seloInfo.width, height: seloInfo.height, channels: 4 },
  })
    .composite([
      { input: tileOpacidade, raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" },
    ])
    .png()
    .toBuffer();

  const top = Math.max(0, altura - seloInfo.height - margem);
  const left = Math.max(0, largura - seloInfo.width - margem);

  return imagem.composite([{ input: seloComOpacidade, top, left }]).webp({ quality: 82 }).toBuffer();
}

function nomeBase(caminho) {
  const ponto = caminho.lastIndexOf(".");
  return ponto === -1 ? caminho : caminho.slice(0, ponto);
}

function mimePorExtensao(caminho) {
  const extensao = caminho.split(".").pop()?.toLowerCase();
  if (extensao === "png") return "image/png";
  if (extensao === "webp") return "image/webp";
  if (extensao === "gif") return "image/gif";
  return "image/jpeg";
}

/** Pagina o `list()` do Storage — buckets com mais de 1000 objetos existem. */
async function listarTudo(supabase, bucket) {
  const todos = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list("", { limit: TAMANHO_PAGINA, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Não foi possível listar ${bucket}: ${error.message}`);
    const pagina = (data ?? []).filter((objeto) => objeto.id !== null); // ignora placeholder de pasta
    todos.push(...pagina);
    if (!data || data.length < TAMANHO_PAGINA) break;
    offset += TAMANHO_PAGINA;
  }
  return todos;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error(
      `${VERMELHO}Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar ` +
        `(ex.: node --env-file=.env.local scripts/marcar-imagens.mjs).${RESET}`,
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [publicos, originais] = await Promise.all([
    listarTudo(supabase, BUCKET_PUBLICO),
    listarTudo(supabase, BUCKET_ORIGINAIS),
  ]);

  const jaProcessados = new Set(originais.map((objeto) => nomeBase(objeto.name)));

  let marcados = 0;
  let pulados = 0;
  let falhas = 0;

  for (const objeto of publicos) {
    const caminho = objeto.name;

    if (jaProcessados.has(nomeBase(caminho))) {
      pulados += 1;
      console.log(`${AMARELO}pulado${RESET}  ${caminho} (já tem original)`);
      continue;
    }

    try {
      const { data: blob, error: erroDownload } = await supabase.storage
        .from(BUCKET_PUBLICO)
        .download(caminho);
      if (erroDownload || !blob) throw new Error(erroDownload?.message ?? "download vazio");
      const bruto = Buffer.from(await blob.arrayBuffer());

      const contentType = objeto.metadata?.mimetype ?? mimePorExtensao(caminho);

      // Copia o arquivo tal como está para o bucket de originais — é a única
      // rota de volta que essa imagem vai ter depois de marcada.
      const { error: erroOriginal } = await supabase.storage
        .from(BUCKET_ORIGINAIS)
        .upload(caminho, bruto, { contentType, upsert: false });
      if (erroOriginal) throw new Error(`gravar original: ${erroOriginal.message}`);

      const marcado = await aplicarMarcaDagua(bruto);

      // Mesmo caminho, upsert: true — a URL pública não muda. A extensão do
      // nome fica divergente do conteúdo real (webp), mas quem serve a
      // imagem obedece o contentType explícito, não a extensão do arquivo.
      const { error: erroMarcado } = await supabase.storage
        .from(BUCKET_PUBLICO)
        .upload(caminho, marcado, { contentType: "image/webp", upsert: true });
      if (erroMarcado) throw new Error(`regravar marcado: ${erroMarcado.message}`);

      marcados += 1;
      console.log(`${VERDE}marcado${RESET} ${caminho}`);
    } catch (erro) {
      falhas += 1;
      console.error(`${VERMELHO}falhou${RESET}  ${caminho}: ${erro.message}`);
    }
  }

  console.log("-".repeat(60));
  console.log(`${marcados} marcada(s), ${pulados} pulada(s), ${falhas} falha(s).`);
  if (falhas > 0) {
    console.log(
      `${AMARELO}O CDN do Supabase pode servir a versão antiga por um tempo depois do upsert — ` +
        `imagem sem marca logo após rodar pode ser cache, não falha.${RESET}`,
    );
  }
  process.exitCode = falhas > 0 ? 1 : 0;
}

main();
