import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ModalComponent, ModalMaisDirective, ModalRodapeDirective } from 'src/app/shared/ui/modal/modal.component';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { StepsModule } from 'primeng/steps';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { finalize } from 'rxjs';

import { BancoDto } from 'src/app/core/models/banco.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { LinhaPreviaImportacaoDto, PreviaImportacaoDto, ResultadoImportacaoDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { corDoBanco, mesCurto, siglaDoBanco } from '../modal-importacoes-mensais/importacoes.regras';
import { FORMATOS_ACEITOS, FiltroConferir, filtrarLinhas, montarOpcoes, resumoDoQueEntrou } from './importar.regras';

/** Pedido para abrir o Extrato depois de importar (atalhos do passo Pronto). */
export interface AbrirExtrato {
  mes: string;
  bancoId: number;
  foco: 'acertos' | 'sem-categoria' | null;
}

/**
 * Importar extrato em 3 passos, Arquivo → Conferir → Pronto (card #74). Nada é gravado antes de "Importar N":
 * a prévia lê o arquivo na API, e a confirmação reenvia o arquivo com as linhas desmarcadas e as categorias trocadas.
 * Emite `fechado(true)` quando algo entrou, para a tela recarregar.
 */
@Component({
  selector: 'app-modal-importar-extrato',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PrimeTemplate, ButtonModule, CheckboxModule, DialogModule, DropdownModule, IconFieldModule, InputIconModule,
    InputTextModule, MessageModule, SelectButtonModule, StepsModule, TableModule, TagModule, ModalComponent, ModalRodapeDirective
  ],
  templateUrl: './modal-importar-extrato.component.html',
  styleUrl: './modal-importar-extrato.component.scss'
})
export class ModalImportarExtratoComponent implements OnInit {
  @Input() bancos: BancoDto[] = [];
  @Input() tiposCartao: TipoCartaoDto[] = [];
  @Input() categorias: CategoriaDto[] = [];
  /** Conta já escolhida (o "falta" da cobertura, card #75). */
  @Input() bancoInicial: number | null = null;
  @Output() fechado = new EventEmitter<boolean>();
  /** Mês (AAAA-MM) em que os lançamentos importados aparecem; emitido antes de fechar. */
  @Output() importadoEm = new EventEmitter<string>();
  @Output() verExtrato = new EventEmitter<AbrirExtrato>();

  private readonly itemService = inject(ExtratoBancarioItemService);
  private readonly alertService = inject(AlertService);
  readonly movel = inject(LarguraTelaService).movel;

  readonly formatos = FORMATOS_ACEITOS;
  readonly passos = [{ label: 'Arquivo' }, { label: 'Conferir' }, { label: 'Pronto' }];
  readonly opcoesFiltro: { label: string; value: FiltroConferir }[] = [
    { label: 'Todos', value: 'todos' }, { label: 'Sem categoria', value: 'sem-categoria' }, { label: 'Duplicados', value: 'duplicados' }
  ];
  readonly sigla = siglaDoBanco;
  readonly mesCurto = mesCurto;

  passo = 0;
  arquivo: File | null = null;
  bancoId: number | null = null;
  previa: PreviaImportacaoDto | null = null;
  carregando = false;
  importando = false;
  tentouContinuar = false;
  erro: string | null = null;
  arrastando = false;

  filtro: FiltroConferir = 'todos';
  busca = '';
  marcadas = new Set<string>();
  categoriaDe = new Map<string, number | null>();
  resultado: ResultadoImportacaoDto | null = null;
  private alterou = false;

  ngOnInit(): void {
    this.bancoId = this.bancoInicial;
  }

  get banco(): BancoDto | undefined {
    return this.bancos.find(b => b.id === this.bancoId);
  }

  tipoDe(banco: BancoDto | undefined): string {
    return this.tiposCartao.find(t => t.id === banco?.tipoCartaoId)?.nomeTipoCartao ?? '';
  }

  estiloBanco(bancoId: number): Record<string, string> {
    const cor = corDoBanco(bancoId);
    return { background: `var(--mf-cor-${cor}-bg)`, color: `var(--mf-cor-${cor}-fg)` };
  }

  get opcoesCategoria(): { label: string; value: number | null }[] {
    return [{ label: 'Sem categoria', value: null }, ...this.categorias
      .filter(c => c.ativo !== false)
      .map(c => ({ label: c.subcategoria ? `${c.nome} · ${c.subcategoria}` : c.nome, value: c.id as number | null }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))];
  }

  get linhasVisiveis(): LinhaPreviaImportacaoDto[] {
    return filtrarLinhas(this.previa?.linhas ?? [], this.filtro, this.busca, this.categoriaDe);
  }

  get quantidadeMarcada(): number {
    return this.marcadas.size;
  }

  get oQueEntrou(): { semCategoria: number; pessoas: string[] } {
    return resumoDoQueEntrou(this.previa?.linhas ?? [], this.marcadas, this.categoriaDe);
  }

  get faltaArquivo(): boolean {
    return this.tentouContinuar && !this.arquivo;
  }

  get faltaBanco(): boolean {
    return this.tentouContinuar && !this.bancoId;
  }

  moeda(v: number): string {
    return formatCurrencyBR(v);
  }

  aoEscolher(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.usarArquivo(input.files?.[0] ?? null);
    input.value = '';
  }

  aoSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando = false;
    this.usarArquivo(evento.dataTransfer?.files?.[0] ?? null);
  }

  private usarArquivo(arquivo: File | null): void {
    if (!arquivo) return;
    this.arquivo = arquivo;
    this.prever();
  }

  aoTrocarBanco(): void {
    if (this.arquivo) this.prever();
  }

  /** Lê o arquivo na API sem gravar; sem banco escolhido, a API tenta reconhecer pelo formato. */
  prever(): void {
    if (!this.arquivo) return;
    this.carregando = true;
    this.erro = null;
    this.previa = null;
    this.itemService.previaImportacao(this.arquivo, this.bancoId)
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: p => {
          this.previa = p;
          if (!this.bancoId && p.bancoId) this.bancoId = p.bancoId;
          this.marcadas = new Set(p.linhas.filter(l => !l.duplicado).map(l => l.chave));
          this.categoriaDe = new Map(p.linhas.map(l => [l.chave, l.categoriaId ?? null]));
        },
        error: e => (this.erro = extrairMensagemErro(e, 'Não foi possível ler o arquivo.'))
      });
  }

  continuar(): void {
    this.tentouContinuar = true;
    if (this.faltaArquivo || this.faltaBanco || !this.previa?.bancoId || this.carregando) return;
    this.filtro = 'todos';
    this.busca = '';
    this.passo = 1;
  }

  alternar(linha: LinhaPreviaImportacaoDto): void {
    if (linha.duplicado) return;
    if (this.marcadas.has(linha.chave)) this.marcadas.delete(linha.chave);
    else this.marcadas.add(linha.chave);
    this.marcadas = new Set(this.marcadas);
  }

  trocarCategoria(linha: LinhaPreviaImportacaoDto, categoriaId: number | null): void {
    this.categoriaDe = new Map(this.categoriaDe).set(linha.chave, categoriaId);
  }

  nomeCategoria(chave: string): string {
    const id = this.categoriaDe.get(chave);
    return this.opcoesCategoria.find(o => o.value === (id ?? null))?.label ?? 'Sem categoria';
  }

  importar(): void {
    const banco = this.banco;
    if (!banco || !this.arquivo || !this.previa || this.importando || !this.quantidadeMarcada) return;
    this.importando = true;
    const opcoes = montarOpcoes(this.previa.linhas, this.marcadas, this.categoriaDe);
    this.itemService.importar(this.arquivo, { id: banco.id, nomeBanco: banco.nomeBanco, tipoCartaoId: banco.tipoCartaoId ?? null }, opcoes)
      .pipe(finalize(() => (this.importando = false)))
      .subscribe({
        next: r => {
          this.resultado = r;
          this.alterou = this.alterou || (r?.quantidadeCriados ?? 0) > 0;
          if ((r?.quantidadeCriados ?? 0) > 0 && r?.mesDestino) this.importadoEm.emit(r.mesDestino);
          this.passo = 2;
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Falha ao importar arquivo.'))
      });
  }

  voltar(): void {
    this.passo = 0;
  }

  importarOutro(): void {
    this.passo = 0;
    this.arquivo = null;
    this.previa = null;
    this.resultado = null;
    this.tentouContinuar = false;
    this.erro = null;
  }

  abrirExtrato(foco: AbrirExtrato['foco']): void {
    const mes = this.resultado?.mesDestino ?? this.previa?.mesReferencia;
    if (!mes || !this.bancoId) {
      this.fechar();
      return;
    }
    this.verExtrato.emit({ mes, bancoId: this.bancoId, foco });
  }

  fechar(): void {
    if (!this.importando) this.fechado.emit(this.alterou);
  }
}
