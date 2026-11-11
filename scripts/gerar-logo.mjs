#!/usr/bin/env node
/* Gera public/images/logo-rt.png (512x512) a partir do mesmo desenho de
 * public/favicon.svg.
 *
 * Por que existe: o `logo` do JSON-LD de #negocio apontava para
 * background.jpg, uma foto retangular. O Google pede para o logo um arquivo
 * de marca, quadrado e com pelo menos 112x112 px. O PNG é commitado; ninguém
 * o lê do disco em runtime. Trocou o desenho, rode:
 *   node scripts/gerar-logo.mjs
 *
 * Armadilha já paga no projeto: texto em SVG rasterizado pelo sharp pode
 * sair corrompido. O buffer é montado como UTF-8 explícito e o texto é
 * ASCII puro ("RT"). Confira o PNG gerado a olho antes de commitar.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const LADO = 512;
const DESTINO = path.join(process.cwd(), "public", "images", "logo-rt.png");

// Mesmo desenho do favicon (viewBox 64x64), escalado pelo viewBox.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#0A241C"/>
  <text x="32" y="42" font-family="Georgia, 'Libre Caslon Display', serif" font-size="27" fill="#F2EFE7" text-anchor="middle">RT</text>
  <rect x="45" y="45" width="9" height="9" fill="#8A6C48"/>
</svg>`;

const png = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();
await mkdir(path.dirname(DESTINO), { recursive: true });
await writeFile(DESTINO, png);
console.log(`logo-rt.png gerado: ${LADO}x${LADO}, ${png.length} bytes`);
