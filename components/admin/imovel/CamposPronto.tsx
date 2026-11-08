"use client";

import { mascaraMoeda } from "@/lib/mascaras";
import {
  CAMPO,
  LABEL,
  type CamposProps,
} from "@/components/admin/imovel/camposComuns";
import type { OpcaoMobiliado } from "@/lib/imoveis/formulario";

function CampoSimples({
  id,
  rotulo,
  campo,
  valores,
  setCampo,
  placeholder,
  inputMode = "numeric",
}: CamposProps & {
  id: string;
  rotulo: string;
  campo: "area_util" | "area_total" | "dormitorios" | "suites" | "banheiros" | "vagas" | "andar" | "ano_construcao" | "nome_condominio";
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
}) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        inputMode={inputMode}
        placeholder={placeholder}
        value={valores[campo]}
        onChange={(e) => setCampo(campo, e.target.value)}
        className={CAMPO}
      />
    </div>
  );
}

function CampoMoeda({
  id,
  rotulo,
  campo,
  valores,
  setCampo,
  desabilitado,
}: CamposProps & {
  id: string;
  rotulo: string;
  campo: "valor_venda" | "valor_condominio" | "valor_iptu";
  desabilitado?: boolean;
}) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        inputMode="numeric"
        placeholder="R$ 0"
        value={valores[campo]}
        onChange={(e) => setCampo(campo, mascaraMoeda(e.target.value))}
        disabled={desabilitado}
        className={`${CAMPO} disabled:bg-neutral-100 disabled:text-neutral-400`}
      />
    </div>
  );
}

/**
 * Dados da unidade única de um imóvel pronto: valores simples no lugar das
 * faixas, preço de venda, condomínio, IPTU e a decisão de expor o endereço.
 */
export function CamposPronto({ valores, setCampo }: CamposProps) {
  const base = { valores, setCampo };
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <CampoSimples {...base} id="area_util" rotulo="Área útil (m²)" campo="area_util" inputMode="decimal" />
        <CampoSimples {...base} id="area_total" rotulo="Área total (m²)" campo="area_total" inputMode="decimal" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CampoSimples {...base} id="dormitorios" rotulo="Dormitórios" campo="dormitorios" />
        <CampoSimples {...base} id="suites" rotulo="Suítes" campo="suites" />
        <CampoSimples {...base} id="banheiros" rotulo="Banheiros" campo="banheiros" />
        <CampoSimples {...base} id="vagas" rotulo="Vagas" campo="vagas" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CampoSimples {...base} id="andar" rotulo="Andar (0 = térreo)" campo="andar" />
        <CampoSimples {...base} id="ano_construcao" rotulo="Ano de construção" campo="ano_construcao" placeholder="2018" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="mobiliado">
            Mobiliado
          </label>
          <select
            id="mobiliado"
            value={valores.mobiliado}
            onChange={(e) => setCampo("mobiliado", e.target.value as OpcaoMobiliado)}
            className={CAMPO}
          >
            <option value="">Não informar</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <CampoSimples {...base} id="nome_condominio" rotulo="Nome do condomínio" campo="nome_condominio" inputMode="text" />
      </div>

      <div>
        <label className={LABEL} htmlFor="descricao_unidade">
          Descrição da unidade
        </label>
        <textarea
          id="descricao_unidade"
          rows={4}
          value={valores.descricao_unidade}
          onChange={(e) => setCampo("descricao_unidade", e.target.value)}
          className={CAMPO}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <CampoMoeda
            {...base}
            id="valor_venda"
            rotulo="Valor de venda (R$)"
            campo="valor_venda"
            desabilitado={valores.valor_sob_consulta}
          />
          <label className="-mt-2 mb-4 flex items-center gap-2 text-sm text-[var(--abissal)]">
            <input
              type="checkbox"
              checked={valores.valor_sob_consulta}
              onChange={(e) => setCampo("valor_sob_consulta", e.target.checked)}
            />
            Sob consulta (não exibe o valor)
          </label>
        </div>
        <CampoMoeda {...base} id="valor_condominio" rotulo="Condomínio (R$/mês)" campo="valor_condominio" />
        <CampoMoeda {...base} id="valor_iptu" rotulo="IPTU (R$/mês)" campo="valor_iptu" />
      </div>

      <label className="mb-4 flex items-start gap-2 text-sm text-[var(--abissal)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={valores.exibir_endereco}
          onChange={(e) => setCampo("exibir_endereco", e.target.checked)}
        />
        <span>
          Mostrar o endereço exato na página
          <span className="block text-xs text-neutral-500">
            Desmarcado, o site mostra só bairro e cidade (texto e mapa).
          </span>
        </span>
      </label>

      <fieldset className="mb-4">
        <legend className={LABEL}>Foto de capa</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          {(
            [
              { valor: "unidade", rotulo: "Primeira foto da unidade" },
              { valor: "condominio", rotulo: "Primeira foto do condomínio" },
            ] as const
          ).map((opcao) => (
            <label key={opcao.valor} className="flex min-h-[44px] items-center gap-2 text-sm text-[var(--abissal)]">
              <input
                type="radio"
                name="capa_origem"
                value={opcao.valor}
                checked={valores.capa_origem === opcao.valor}
                onChange={() => setCampo("capa_origem", opcao.valor)}
              />
              {opcao.rotulo}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Aparece no topo da página, no card da listagem e na prévia ao compartilhar. Se o grupo
          escolhido não tiver fotos, o site usa o outro.
        </p>
      </fieldset>
    </>
  );
}
