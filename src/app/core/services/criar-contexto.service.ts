import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** O que o "+" do celular sabe criar (card #72). */
export type ChaveCriar = 'conta-a-pagar' | 'lancamento' | 'importar' | 'item' | 'compromisso' | 'planejamento' | 'categoria' | 'conta-fixa';

/**
 * A ação "desta tela" do painel Novo: cada tela com barra inferior registra a sua, já preenchida com o contexto
 * (a conta aberta, o mês…). `locais` resolve atalhos do grid na própria tela, quando a URL seria a mesma.
 */
export interface AcaoCriar {
  chave: ChaveCriar;
  titulo: () => string;
  subtitulo?: () => string;
  icone: string;
  /** Chave da paleta (--mf-cor-<cor>-bg/fg). */
  cor: string;
  executar: () => void;
  /** Lançamento já preso a uma conta: o atalho genérico continua no grid como "Lançamento em outra conta". */
  emOutraConta?: () => boolean;
  locais?: Partial<Record<ChaveCriar, () => void>>;
}

@Injectable({ providedIn: 'root' })
export class CriarContextoService {
  private readonly _acao = signal<AcaoCriar | null>(null);
  readonly acao = this._acao.asReadonly();

  definir(acao: AcaoCriar): void {
    this._acao.set(acao);
  }

  /** Só limpa se ainda for a dela: a tela nova pode ter registrado antes de a antiga ser destruída. */
  limpar(acao: AcaoCriar): void {
    if (this._acao() === acao) this._acao.set(null);
  }
}

/** Registra a ação da tela enquanto ela existir. Chamar num inicializador de campo (contexto de injeção). */
export function registrarAcaoCriar(acao: AcaoCriar): AcaoCriar {
  const servico = inject(CriarContextoService);
  servico.definir(acao);
  inject(DestroyRef).onDestroy(() => servico.limpar(acao));
  return acao;
}
