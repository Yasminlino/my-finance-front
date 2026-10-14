import { formatDateInput } from '../utils/mask';
import { CategoriaDto } from './categoria.model';
import { ExtratoItemDto } from './extrato.model';
import { TipoMovimentacaoDto } from './tipo-movimentacao.model';

/** O que a tela sabe e a linha pode não trazer: listas para resolver nomes e o banco/cartão/mês abertos. */
export type ContextoExtrato = {
  categorias: readonly Pick<CategoriaDto, 'id' | 'name'>[];
  tiposMovimentacao: readonly Pick<TipoMovimentacaoDto, 'id' | 'nomeTipoMovimentacao'>[];
  bancoId?: number | null;
  tipoCartaoId?: number | null;
  numeroFatura?: string | null;
};

/**
 * Linha como vem do grid ou do formulário: ids podem chegar como texto (selects) e a data como Date.
 * Sem `id` é um item novo (lançamento manual).
 */
export type ExtratoItemEntrada = Partial<Omit<ExtratoItemDto, 'id' | 'dataMovimentacao' | 'categoriaId' | 'tipoMovimentacaoId' | 'userId'>> & {
  id?: number | string | null;
  dataMovimentacao?: string | Date | null;
  categoriaId?: number | string | null;
  tipoMovimentacaoId?: number | string | null;
  userId?: number | string | null;
};

const TIPO_LANCAMENTO_PADRAO = 'Saída';

/** Id positivo, ou null ("", 0, null e lixo viram null). */
function idOuNulo(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const id = Number(valor);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** "YYYY-MM-DD" do DateOnly: string ISO perde o horário; Date usa o dia local (não toISOString, que é UTC). */
function dataDeCalendario(valor: string | Date | null | undefined): string {
  if (!valor) return '';
  return typeof valor === 'string' ? valor.split('T')[0] : formatDateInput(valor);
}

/** Resolve pelo id; sem id, procura pelo nome (sem diferenciar maiúsculas). */
function resolver<T extends { id: number }>(
  lista: readonly T[], nomeDe: (item: T) => string | undefined, id: unknown, nome: string | null | undefined
): { id: number | null; nome: string | null } {
  const porId = idOuNulo(id);
  if (porId !== null) {
    const item = lista.find(i => i.id === porId);
    return { id: porId, nome: (item && nomeDe(item)) ?? nome ?? null };
  }
  if (nome) {
    const alvo = nome.toLowerCase();
    const item = lista.find(i => nomeDe(i)?.toLowerCase() === alvo);
    // Achou: devolve o nome como está cadastrado, não como foi digitado.
    return { id: item?.id ?? null, nome: (item && nomeDe(item)) ?? nome };
  }
  return { id: null, nome: null };
}

/**
 * Único ponto que monta o ExtratoBancarioItemDTO enviado à API (FE-P2-01), no create e no update.
 * O contrato é o JSON camelCase da API: campos em PascalCase não são lidos.
 */
export function paraExtratoItemDto(linha: ExtratoItemEntrada, contexto: ContextoExtrato): ExtratoItemDto {
  const categoria = resolver(contexto.categorias, c => c.name, linha.categoriaId, linha.categoriaNome);
  const tipoMovimentacao = resolver(contexto.tiposMovimentacao, t => t.nomeTipoMovimentacao, linha.tipoMovimentacaoId, linha.tipoMovimentacaoNome);
  const id = idOuNulo(linha.id);
  // O dono é sempre o usuário do token; aqui só repassa um id válido que já veio da API (FE-P0-12).
  const userId = idOuNulo(linha.userId);

  const dto: ExtratoItemDto = {
    ...(id !== null ? { id } : {}),
    extratoBancarioId: idOuNulo(linha.extratoBancarioId),
    dataMovimentacao: dataDeCalendario(linha.dataMovimentacao),
    valor: Number(linha.valor ?? 0),
    tipoLancamento: linha.tipoLancamento || TIPO_LANCAMENTO_PADRAO,

    descricao: linha.descricao ?? null,
    observacao: linha.observacao ?? null,
    identificador: linha.identificador ?? null,

    pessoaMovimentacaoId: idOuNulo(linha.pessoaMovimentacaoId),
    nomePessoaTransacao: linha.nomePessoaTransacao ?? null,
    ...(linha.pessoaMovimentacao ? { pessoaMovimentacao: linha.pessoaMovimentacao } : {}),

    bancoId: idOuNulo(linha.bancoId) ?? contexto.bancoId ?? null,
    bancoNome: linha.bancoNome ?? null,
    tipoCartaoId: idOuNulo(linha.tipoCartaoId) ?? contexto.tipoCartaoId ?? null,
    tipoCartaoNome: linha.tipoCartaoNome ?? null,

    categoriaId: categoria.id,
    categoriaNome: categoria.nome,
    tipoMovimentacaoId: tipoMovimentacao.id,
    tipoMovimentacaoNome: tipoMovimentacao.nome,

    numeroFatura: linha.numeroFatura ?? contexto.numeroFatura ?? null,
    ehParcelado: Boolean(linha.ehParcelado),
    parcelaAtual: linha.parcelaAtual ?? null,
    quantidadeParcelas: linha.quantidadeParcelas ?? null,

    ...(userId !== null ? { userId } : {}),
    chaveDescricao: linha.chaveDescricao ?? null,
    alteraVinculoPessoa: Boolean(linha.alteraVinculoPessoa),
  } as ExtratoItemDto;

  return dto;
}
