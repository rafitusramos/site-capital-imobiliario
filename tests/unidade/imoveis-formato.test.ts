import { describe, expect, test } from "vitest";
import {
  extrairIdYoutube,
  formatarFase,
  formatarFaixaArea,
  formatarFaixaBanheiros,
  formatarFaixaDormitorios,
  formatarFaixaVagas,
  formatarPrecoAPartir,
  formatarTipo,
} from "@/lib/imoveis/formato";

describe("formatarFaixaArea", () => {
  test("min e max diferentes vira faixa", () => {
    expect(formatarFaixaArea(68, 142)).toBe("68 a 142 m²");
  });

  test("min igual a max mostra só um valor", () => {
    expect(formatarFaixaArea(68, 68)).toBe("68 m²");
  });

  test("só min informado", () => {
    expect(formatarFaixaArea(68, null)).toBe("68 m²");
  });

  test("só max informado", () => {
    expect(formatarFaixaArea(null, 142)).toBe("142 m²");
  });

  test("ambos null devolve null", () => {
    expect(formatarFaixaArea(null, null)).toBeNull();
  });
});

describe("formatarFaixaDormitorios", () => {
  test("min e max diferentes vira faixa no plural", () => {
    expect(formatarFaixaDormitorios(2, 3)).toBe("2 e 3 dorms");
  });

  test("min igual a max no plural", () => {
    expect(formatarFaixaDormitorios(3, 3)).toBe("3 dorms");
  });

  test("valor único 1 fica no singular", () => {
    expect(formatarFaixaDormitorios(1, null)).toBe("1 dorm");
    expect(formatarFaixaDormitorios(null, 1)).toBe("1 dorm");
  });

  test("ambos null devolve null", () => {
    expect(formatarFaixaDormitorios(null, null)).toBeNull();
  });
});

describe("formatarFaixaVagas", () => {
  test("min e max diferentes vira faixa no plural", () => {
    expect(formatarFaixaVagas(1, 2)).toBe("1 a 2 vagas");
  });

  test("min igual a max no plural", () => {
    expect(formatarFaixaVagas(2, 2)).toBe("2 vagas");
  });

  test("valor único 1 fica no singular", () => {
    expect(formatarFaixaVagas(1, null)).toBe("1 vaga");
    expect(formatarFaixaVagas(null, 1)).toBe("1 vaga");
  });

  test("ambos null devolve null", () => {
    expect(formatarFaixaVagas(null, null)).toBeNull();
  });
});

describe("formatarFaixaBanheiros", () => {
  test("min e max diferentes vira faixa no plural", () => {
    expect(formatarFaixaBanheiros(1, 2)).toBe("1 a 2 banheiros");
  });

  test("min igual a max no plural", () => {
    expect(formatarFaixaBanheiros(2, 2)).toBe("2 banheiros");
  });

  test("valor único 1 fica no singular", () => {
    expect(formatarFaixaBanheiros(1, null)).toBe("1 banheiro");
    expect(formatarFaixaBanheiros(null, 1)).toBe("1 banheiro");
  });

  test("ambos null devolve null", () => {
    expect(formatarFaixaBanheiros(null, null)).toBeNull();
  });
});

describe("formatarPrecoAPartir", () => {
  test("null devolve null", () => {
    expect(formatarPrecoAPartir(null)).toBeNull();
  });

  test("número vira string em reais", () => {
    expect(formatarPrecoAPartir(640000)).toBe("R$ 640.000");
  });
});

describe("extrairIdYoutube", () => {
  test("formato watch?v=", () => {
    expect(extrairIdYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("formato youtu.be/", () => {
    expect(extrairIdYoutube("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("formato /embed/", () => {
    expect(extrairIdYoutube("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("formato /shorts/", () => {
    expect(extrairIdYoutube("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("ID puro de 11 caracteres", () => {
    expect(extrairIdYoutube("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("URL não reconhecida devolve null", () => {
    expect(extrairIdYoutube("https://www.example.com/video/123")).toBeNull();
  });

  test("null devolve null", () => {
    expect(extrairIdYoutube(null)).toBeNull();
  });

  test("string vazia devolve null", () => {
    expect(extrairIdYoutube("")).toBeNull();
  });
});

describe("formatarFase", () => {
  test("registro com nome preenchido prefere o nome", () => {
    expect(formatarFase({ slug: "pronto", nome: "Pronto pra você morar" })).toBe(
      "Pronto pra você morar",
    );
  });

  test("registro só com slug cai no rótulo do mapa", () => {
    expect(formatarFase({ slug: "em_construcao" })).toBe("Em construção");
  });

  test("slug string puro usa o mapa", () => {
    expect(formatarFase("lancamento")).toBe("Lançamento");
  });

  test("slug desconhecido devolve o próprio slug", () => {
    expect(formatarFase("fase-inexistente")).toBe("fase-inexistente");
  });

  test("null ou undefined devolve string vazia", () => {
    expect(formatarFase(null)).toBe("");
    expect(formatarFase(undefined)).toBe("");
  });
});

describe("formatarTipo", () => {
  test("registro com nome preenchido prefere o nome", () => {
    expect(formatarTipo({ slug: "casa", nome: "Casa de condomínio" })).toBe("Casa de condomínio");
  });

  test("registro só com slug cai no rótulo do mapa", () => {
    expect(formatarTipo({ slug: "predio-comercial" })).toBe("Prédio Comercial");
  });

  test("slug string puro usa o mapa", () => {
    expect(formatarTipo("chacara")).toBe("Chácara");
  });

  test("slug desconhecido devolve o próprio slug", () => {
    expect(formatarTipo("tipo-inexistente")).toBe("tipo-inexistente");
  });

  test("null ou undefined devolve string vazia", () => {
    expect(formatarTipo(null)).toBe("");
    expect(formatarTipo(undefined)).toBe("");
  });
});
