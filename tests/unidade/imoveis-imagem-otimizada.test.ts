import { describe, expect, test } from "vitest";
import {
  HOST_SUPABASE_PADRAO,
  SIZES_CARROSSEL,
  ehImagemOtimizavel,
  hostDoSupabase,
  prioridadeDoSlide,
} from "@/lib/imoveis/imagem-otimizada";

const HOST = "abc.supabase.co";
const url = (host: string, bucket = "imovel-images") =>
  `https://${host}/storage/v1/object/public/${bucket}/uuid.webp`;

describe("hostDoSupabase", () => {
  test("extrai o host da URL do projeto", () => {
    expect(hostDoSupabase("https://abc.supabase.co")).toBe("abc.supabase.co");
    expect(hostDoSupabase("https://abc.supabase.co/")).toBe("abc.supabase.co");
  });
  test("cai no padrão quando ausente ou inválida", () => {
    expect(hostDoSupabase(undefined)).toBe(HOST_SUPABASE_PADRAO);
    expect(hostDoSupabase("")).toBe(HOST_SUPABASE_PADRAO);
    expect(hostDoSupabase("lixo")).toBe(HOST_SUPABASE_PADRAO);
  });
});

describe("ehImagemOtimizavel", () => {
  test("aceita só o bucket público de imóveis do projeto", () => {
    expect(ehImagemOtimizavel(url(HOST), HOST)).toBe(true);
  });
  test("recusa outro host, outro bucket, caminho local e vazio", () => {
    expect(ehImagemOtimizavel(url("outro.supabase.co"), HOST)).toBe(false);
    expect(ehImagemOtimizavel(url(HOST, "post-images"), HOST)).toBe(false);
    expect(ehImagemOtimizavel("/marca-dagua.png", HOST)).toBe(false);
    expect(ehImagemOtimizavel("", HOST)).toBe(false);
    expect(ehImagemOtimizavel(null, HOST)).toBe(false);
  });
  test("recusa host que só começa igual ao do projeto", () => {
    expect(ehImagemOtimizavel(url(`${HOST}.evil.com`), HOST)).toBe(false);
  });
});

describe("prioridadeDoSlide", () => {
  test("ativo e vizinhos seguem a prioridade padrão; o resto é baixo", () => {
    expect(prioridadeDoSlide(3, 3)).toBeUndefined();
    expect(prioridadeDoSlide(2, 3)).toBeUndefined();
    expect(prioridadeDoSlide(4, 3)).toBeUndefined();
    expect(prioridadeDoSlide(5, 3)).toBe("low");
    expect(prioridadeDoSlide(0, 3)).toBe("low");
  });
});

test("sizes do carrossel acompanham os breakpoints do CSS", () => {
  expect(SIZES_CARROSSEL).toContain("(min-width: 1024px) 540px");
});
