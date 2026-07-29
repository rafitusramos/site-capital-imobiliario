import { vi } from "vitest";

/**
 * Builder de client Supabase falso para os testes de server actions
 * (tests/acoes/*). Não é um ORM completo — cobre só os encadeamentos que o
 * código de produção de fato usa: from().select().eq().single()/maybeSingle(),
 * from().insert().select().single(), from().update().eq(),
 * from().delete().eq()/.in(), rpc(), auth.getUser()/signOut(),
 * storage.from().upload()/.getPublicUrl().
 *
 * Uso típico num teste:
 *   const falso = criarSupabaseFalso();
 *   falso.definirUsuario({ id: "user-1" });
 *   falso.programarResposta("posts", "insert", { data: { id: "post-1" }, error: null });
 *   vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
 *   ...
 *   expect(falso.chamadas[0]).toMatchObject({ tabela: "posts", operacao: "insert" });
 */

export type RespostaFalsa<T = unknown> = { data: T; error: unknown };

export type Operacao = "select" | "insert" | "update" | "delete";

export interface Filtro {
  metodo: string;
  args: unknown[];
}

export interface ChamadaRegistrada {
  tabela: string;
  operacao: Operacao | null;
  /** Payload de insert/update, quando houver. */
  payload?: unknown;
  filtros: Filtro[];
}

export interface ChamadaRpc {
  nome: string;
  params: unknown;
}

export interface ChamadaStorage {
  bucket: string;
  metodo: "upload" | "getPublicUrl";
  args: unknown[];
}

function chaveTabela(tabela: string, operacao: Operacao) {
  return `${tabela}:${operacao}`;
}

/** Tira o próximo item de uma fila (FIFO), mas repete o último se a fila só tiver um item. */
function consumirFila<T>(fila: T[] | undefined, padrao: T): T {
  if (!fila || fila.length === 0) return padrao;
  return fila.length > 1 ? (fila.shift() as T) : fila[0];
}

export function criarSupabaseFalso() {
  const chamadas: ChamadaRegistrada[] = [];
  const chamadasRpc: ChamadaRpc[] = [];
  const chamadasStorage: ChamadaStorage[] = [];

  const respostasTabela = new Map<string, RespostaFalsa[]>();
  const respostasRpc = new Map<string, RespostaFalsa[]>();
  const respostasUpload = new Map<string, RespostaFalsa[]>();
  const respostasPublicUrl = new Map<string, string>();

  const RESPOSTA_PADRAO: RespostaFalsa = { data: null, error: null };

  let usuarioAtual: { id: string; [chave: string]: unknown } | null = null;

  function programarResposta(tabela: string, operacao: Operacao, resposta: RespostaFalsa) {
    const chave = chaveTabela(tabela, operacao);
    const fila = respostasTabela.get(chave) ?? [];
    fila.push(resposta);
    respostasTabela.set(chave, fila);
  }

  function programarRpc(nome: string, resposta: RespostaFalsa) {
    const fila = respostasRpc.get(nome) ?? [];
    fila.push(resposta);
    respostasRpc.set(nome, fila);
  }

  function programarUpload(bucket: string, resposta: RespostaFalsa) {
    const fila = respostasUpload.get(bucket) ?? [];
    fila.push(resposta);
    respostasUpload.set(bucket, fila);
  }

  function programarPublicUrl(bucket: string, url: string) {
    respostasPublicUrl.set(bucket, url);
  }

  function definirUsuario(user: { id: string; [chave: string]: unknown } | null) {
    usuarioAtual = user;
  }

  function criarThenable(obter: () => RespostaFalsa) {
    return {
      then(resolve: (valor: RespostaFalsa) => unknown, reject?: (erro: unknown) => unknown) {
        return Promise.resolve(obter()).then(resolve, reject);
      },
    };
  }

  function criarQueryBuilder(tabela: string) {
    let operacao: Operacao | null = null;
    let payload: unknown;
    const filtros: Filtro[] = [];
    let registrada = false;

    function registrar() {
      if (registrada) return;
      registrada = true;
      chamadas.push({ tabela, operacao, payload, filtros: [...filtros] });
    }

    function resposta(): RespostaFalsa {
      registrar();
      if (!operacao) return RESPOSTA_PADRAO;
      return consumirFila(respostasTabela.get(chaveTabela(tabela, operacao)), RESPOSTA_PADRAO);
    }

    const builder: Record<string, unknown> = {
      select: vi.fn((...args: unknown[]) => {
        if (!operacao) operacao = "select";
        filtros.push({ metodo: "select", args });
        return builder;
      }),
      insert: vi.fn((valores: unknown) => {
        operacao = "insert";
        payload = valores;
        return builder;
      }),
      update: vi.fn((valores: unknown) => {
        operacao = "update";
        payload = valores;
        return builder;
      }),
      delete: vi.fn(() => {
        operacao = "delete";
        return builder;
      }),
      eq: vi.fn((...args: unknown[]) => {
        filtros.push({ metodo: "eq", args });
        return builder;
      }),
      in: vi.fn((...args: unknown[]) => {
        filtros.push({ metodo: "in", args });
        return builder;
      }),
      single: vi.fn(() => criarThenable(resposta)),
      maybeSingle: vi.fn(() => criarThenable(resposta)),
      then(resolve: (valor: RespostaFalsa) => unknown, reject?: (erro: unknown) => unknown) {
        return Promise.resolve(resposta()).then(resolve, reject);
      },
    };

    return builder;
  }

  const cliente = {
    from: vi.fn((tabela: string) => criarQueryBuilder(tabela)),

    rpc: vi.fn((nome: string, params: unknown) => {
      chamadasRpc.push({ nome, params });
      return criarThenable(() => consumirFila(respostasRpc.get(nome), RESPOSTA_PADRAO));
    }),

    auth: {
      getUser: vi.fn(async () => ({ data: { user: usuarioAtual }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },

    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(async (...args: unknown[]) => {
          chamadasStorage.push({ bucket, metodo: "upload", args });
          return consumirFila(respostasUpload.get(bucket), RESPOSTA_PADRAO);
        }),
        getPublicUrl: vi.fn((...args: unknown[]) => {
          chamadasStorage.push({ bucket, metodo: "getPublicUrl", args });
          const url = respostasPublicUrl.get(bucket) ?? `https://fake.supabase.co/storage/v1/object/public/${bucket}/${args[0]}`;
          return { data: { publicUrl: url } };
        }),
      })),
    },
  };

  return {
    cliente,
    chamadas,
    chamadasRpc,
    chamadasStorage,
    programarResposta,
    programarRpc,
    programarUpload,
    programarPublicUrl,
    definirUsuario,
  };
}

export type SupabaseFalso = ReturnType<typeof criarSupabaseFalso>;
