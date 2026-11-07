import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RegraClassificacaoDto } from 'src/app/core/models/regra-classificacao.model';
import { RegraClassificacaoService } from 'src/app/core/services/regra-classificacao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { PropostaDeRegra } from './classificacao.regras';

/**
 * "Criar regra?" (card #76, fase 1, layout novo de 05/11): logo depois de categorizar, um aviso flutuante por proposta,
 * já dizendo quantos outros lançamentos sem categoria seriam classificados. "Criar regra" grava e aplica neles (o número
 * já foi mostrado); "Editar" leva para a tela de regras com a frase preenchida; "Agora não" pula.
 */
@Component({
  selector: 'app-classificar-sempre',
  standalone: true,
  imports: [ButtonModule],
  template: `
    @if (atual; as p) {
      <div class="criar-regra" [class.criar-regra--movel]="movel" role="dialog" aria-labelledby="criar-regra-titulo">
        <div id="criar-regra-titulo" class="criar-regra-titulo">Criar regra?</div>
        <p class="criar-regra-texto">
          Sempre que a descrição ou a pessoa contiver <strong>{{ p.texto }}</strong>, usar <strong>{{ nomeCategoria(p.categoriaId) }}</strong>.
          @if (quantidade > 0) {
            Mais {{ quantidade }} {{ quantidade === 1 ? 'lançamento sem categoria seria classificado' : 'lançamentos sem categoria seriam classificados' }}.
          }
        </p>
        <div class="criar-regra-botoes">
          <p-button label="Agora não" [text]="true" size="small" styleClass="criar-regra-link" [disabled]="ocupado" (onClick)="pular()" />
          <p-button label="Editar" [text]="true" size="small" styleClass="criar-regra-link" [disabled]="ocupado" (onClick)="editarAtual()" />
          <p-button label="Criar regra" size="small" [loading]="ocupado" (onClick)="criar()" />
        </div>
      </div>
    }
  `,
  styles: [`
    .criar-regra {
      position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 1100; width: 26rem; max-width: calc(100vw - 2rem);
      padding: 1rem; border-radius: var(--mf-radius); background: var(--surface-900); color: var(--surface-0);
      box-shadow: var(--mf-shadow-card);
    }
    .criar-regra--movel { left: 0.75rem; right: 0.75rem; bottom: 0.75rem; width: auto; max-width: none; }
    .criar-regra-titulo { font-weight: 700; margin-bottom: 0.25rem; }
    .criar-regra-texto { margin: 0 0 0.75rem; font-size: 0.9rem; line-height: 1.4; }
    .criar-regra-botoes { display: flex; justify-content: flex-end; gap: 0.25rem; }
    :host ::ng-deep .criar-regra-link.p-button { color: var(--surface-200); }
  `]
})
export class ClassificarSempreComponent implements OnChanges {
  /** Fila de propostas (uma por vez); vazia = escondido. */
  @Input() propostas: PropostaDeRegra[] = [];
  @Input() categorias: { label: string; value: number }[] = [];
  @Input() movel = false;
  /** Uma regra foi criada (a tela atualiza a lista, para não propor o mesmo texto de novo). */
  @Output() regraCriada = new EventEmitter<RegraClassificacaoDto>();
  /** A fila acabou; os ids dos lançamentos que as regras classificaram (vazio se nenhum). */
  @Output() concluiu = new EventEmitter<number[]>();
  /** "Editar": abrir a tela de regras com esta proposta preenchida. */
  @Output() editar = new EventEmitter<PropostaDeRegra>();

  private readonly servico = inject(RegraClassificacaoService);
  private readonly alertService = inject(AlertService);

  fila: PropostaDeRegra[] = [];
  /** Outros lançamentos sem categoria que a regra pegaria. */
  quantidade = 0;
  ocupado = false;
  private classificados: number[] = [];
  private pedidoPrevia = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['propostas']) {
      this.fila = [...(this.propostas ?? [])];
      this.classificados = [];
      this.mostrar();
    }
  }

  get atual(): PropostaDeRegra | null {
    return this.fila[0] ?? null;
  }

  nomeCategoria(id: number): string {
    return this.categorias.find(c => c.value === id)?.label ?? 'esta categoria';
  }

  criar(): void {
    const p = this.atual;
    if (!p || this.ocupado) return;
    this.ocupado = true;
    this.servico.criar({
      texto: p.texto, campo: 'descricao_ou_pessoa', operador: 'contem', bancoId: null, categoriaId: p.categoriaId,
      tipoMovimentacaoId: p.tipoMovimentacaoId, pessoaMovimentacaoId: null, ativa: true
    }).subscribe({
      next: regra => {
        this.regraCriada.emit(regra);
        if (this.quantidade <= 0) {
          this.ocupado = false;
          this.alertService.success('Regra criada.');
          this.proxima();
          return;
        }
        this.servico.aplicar(regra.id).subscribe({
          next: r => {
            this.ocupado = false;
            this.classificados = [...this.classificados, ...(r.itemIds ?? [])];
            this.alertService.success(r.quantidade === 1 ? 'Regra criada: 1 lançamento classificado.' : `Regra criada: ${r.quantidade} lançamentos classificados.`);
            this.proxima();
          },
          error: e => {
            this.ocupado = false;
            this.alertService.error(extrairMensagemErro(e, 'A regra foi criada, mas não deu para aplicar nos antigos.'));
            this.proxima();
          }
        });
      },
      error: e => {
        this.ocupado = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao criar a regra.'));
      }
    });
  }

  /** "Agora não": a proposta sai sem gravar nada. */
  pular(): void {
    if (!this.ocupado) this.proxima();
  }

  /** "Editar": a tela de regras abre com a frase; as outras propostas ficam para depois. */
  editarAtual(): void {
    const p = this.atual;
    if (!p || this.ocupado) return;
    this.fila = [];
    this.editar.emit(p);
    this.concluiu.emit(this.classificados);
  }

  private proxima(): void {
    this.fila = this.fila.slice(1);
    this.mostrar();
    if (!this.fila.length) this.concluiu.emit(this.classificados);
  }

  private mostrar(): void {
    this.quantidade = 0;
    const p = this.atual;
    if (!p) return;
    const pedido = ++this.pedidoPrevia;
    this.servico.previa({ texto: p.texto, campo: 'descricao_ou_pessoa', operador: 'contem', categoriaId: p.categoriaId }).subscribe({
      next: r => {
        if (pedido === this.pedidoPrevia) this.quantidade = r?.semCategoria ?? 0;
      },
      error: () => { /* sem prévia: só não mostra o número */ }
    });
  }
}
