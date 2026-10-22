import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { InputSwitch } from 'primeng/inputswitch';
import { Subject, catchError, concat, concatMap, defaultIfEmpty, finalize, from, last, map, of, toArray } from 'rxjs';

import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatYearMonth } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';
import { TabelaContasComponent } from '../components/tabela-contas/tabela-contas.component';
import { ListaContasMovelComponent } from '../components/lista-contas-movel/lista-contas-movel.component';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ResumoMes, resumoDoMes, statusAoPagar, vencimentoDe } from '../contas-a-pagar.regras';
import { EdicaoContas } from '../edicao-contas';

const CHAVE_MES = 'dataFiltroContaMensal';

/**
 * Contas a Pagar: escolhe o mês, carrega, liga o modo edição e fala com a API.
 * O que a tabela mostra e o estado da edição ficam em TabelaContasComponent e EdicaoContas.
 */
@Component({
  selector: 'app-contas-a-pagar',
  templateUrl: './contas-a-pagar.component.html',
  styleUrls: ['./contas-a-pagar.component.scss'],
  providers: [ConfirmationService]
})
export class ContasAPagarComponent implements OnInit {
  @ViewChild(TabelaContasComponent) tabela?: TabelaContasComponent;
  @ViewChild(ListaContasMovelComponent) lista?: ListaContasMovelComponent;
  @ViewChild('switchEl') switchEl?: InputSwitch;

  /** Celular (abaixo de 768px): lista de cards e edição de uma conta por vez no bottom sheet. */
  readonly movel = inject(LarguraTelaService).movel;

  private readonly destroyRef = inject(DestroyRef);
  private readonly contaMensalService = inject(ContaMensalService);
  private readonly alertService = inject(AlertService);
  private readonly exclusaoEmLote = inject(ExclusaoEmLoteService);
  private readonly confirmacao = inject(ConfirmationService);
  private readonly location = inject(Location);

  /** Mês pedido ("YYYY-MM"); a carga segue sempre o último. */
  private readonly mes$ = new Subject<string>();

  readonly breadcrumb: MenuItem[] = [{ label: 'Movimentações' }, { label: 'Contas a Pagar' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly itensNovaConta: MenuItem[] = [
    { label: 'Adicionar em lote', icon: 'pi pi-list', command: () => (this.showModalAdd = true) },
    { label: 'Atualizar', icon: 'pi pi-refresh', command: () => this.loadMonth(this.dateFilter) }
  ];

  contasMensais: LinhaContasMensais[] = [];
  dateFilter = new Date();
  selectedMonth = '';
  loading = false;
  hoje = new Date();
  resumo: ResumoMes = resumoDoMes([], this.hoje);

  edicao: EdicaoContas | null = null;
  /** Estado do p-inputSwitch; volta a true quando a saída da edição é cancelada. */
  switchEdicao = false;
  salvando = false;

  /** Celular: conta aberta no bottom sheet. */
  contaEmEdicao: LinhaContasMensais | null = null;
  salvandoConta = false;

  showModalAdd = false;
  showModalCreate = false;

  ngOnInit(): void {
    // Troca de mês: só a resposta do último mês pedido chega à tela (FE-P2-08).
    ultimaBusca(this.mes$, mes => this.contaMensalService.listarDoMes(mes, false), e => {
      this.loading = false;
      this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as contas do mês.'));
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(contas => {
        this.hoje = new Date();
        this.contasMensais = contas;
        this.resumo = resumoDoMes(contas, this.hoje);
        this.loading = false;
      });

    this.loadMonth();
  }

  /** ‹ antes do título: volta para a tela anterior, como fazia o data-grid. */
  voltar(): void {
    this.location.back();
  }

  get nomeDoMes(): string {
    return this.dateFilter.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  loadMonth(dataSelecionada?: Date): void {
    if (dataSelecionada) {
      this.dateFilter = dataSelecionada;
      localStorage.setItem(CHAVE_MES, dataSelecionada.toISOString());
    } else {
      const ultimoMesSelecionado = localStorage.getItem(CHAVE_MES);
      this.dateFilter = ultimoMesSelecionado ? new Date(ultimoMesSelecionado) : new Date();
    }

    this.selectedMonth = formatYearMonth(this.dateFilter);
    this.loading = true;
    this.mes$.next(this.selectedMonth);
  }

  /** ◀ ▶: travado no modo edição, para as alterações não se misturarem com outro mês. */
  mudarMes(delta: number): void {
    if (this.edicao) return;
    this.loadMonth(new Date(this.dateFilter.getFullYear(), this.dateFilter.getMonth() + delta, 1));
  }

  // ---------------------------------------------------------------------------
  // Modo edição
  // ---------------------------------------------------------------------------

  alternarEdicao(ligar: boolean): void {
    if (ligar) {
      this.switchEdicao = true;
      this.edicao = new EdicaoContas(this.contasMensais);
      this.tabela?.limparSelecao();
      return;
    }

    if (!this.edicao?.contagem) {
      this.sairDaEdicao();
      return;
    }

    // O switch já virou: volta até a pessoa confirmar.
    this.switchEdicao = true;
    this.switchEl?.writeValue(true);
    this.confirmarDescarte(() => this.sairDaEdicao());
  }

  /** "Descartar" da barra: volta tudo ao original e sai da edição. */
  descartar(): void {
    if (!this.edicao?.contagem) {
      this.sairDaEdicao();
      return;
    }
    this.confirmarDescarte(() => this.sairDaEdicao());
  }

  private confirmarDescarte(aoConfirmar: () => void): void {
    const n = this.edicao?.contagem ?? 0;
    this.confirmacao.confirm({
      header: 'Descartar alterações',
      message: n === 1
        ? 'Há 1 conta alterada que não foi salva. Descartar a alteração?'
        : `Há ${n} contas alteradas que não foram salvas. Descartar as alterações?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Descartar',
      rejectLabel: 'Continuar editando',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: aoConfirmar
    });
  }

  private sairDaEdicao(): void {
    this.edicao = null;
    this.switchEdicao = false;
  }

  /** Uma conta por vez, na ordem; para no primeiro erro e mantém a edição para corrigir. */
  salvar(): void {
    const edicao = this.edicao;
    if (!edicao?.podeSalvar) return;

    const alteradas = edicao.alteradas();
    this.salvando = true;
    concat(...alteradas.map(conta => this.contaMensalService.atualizar(conta)))
      .pipe(toArray(), finalize(() => (this.salvando = false)))
      .subscribe({
        next: () => {
          this.alertService.success(alteradas.length === 1
            ? 'Alteração salva com sucesso!'
            : `${alteradas.length} alterações salvas com sucesso!`);
          this.sairDaEdicao();
          this.loadMonth(this.dateFilter);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar as alterações. Tente novamente.'))
      });
  }

  /** "Editar": no celular abre o bottom sheet; no desktop liga o modo edição e leva até a conta. */
  editar(conta: LinhaContasMensais): void {
    if (this.movel()) {
      this.contaEmEdicao = conta;
      return;
    }
    if (!this.edicao) this.alternarEdicao(true);
    setTimeout(() => this.tabela?.focarLinha(conta.id));
  }

  /** Salvar do bottom sheet (celular): uma conta; com erro o sheet continua aberto. */
  salvarConta(conta: LinhaContasMensais): void {
    this.salvandoConta = true;
    this.contaMensalService.atualizar(conta)
      .pipe(finalize(() => (this.salvandoConta = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Alteração salva com sucesso!');
          this.contaEmEdicao = null;
          this.loadMonth(this.dateFilter);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a conta. Tente novamente.'))
      });
  }

  /** Tabela no desktop, lista de cards no celular: quem tem a seleção agora. */
  private get selecionavel(): TabelaContasComponent | ListaContasMovelComponent | undefined {
    return this.movel() ? this.lista : this.tabela;
  }

  // ---------------------------------------------------------------------------
  // Ações das linhas
  // ---------------------------------------------------------------------------

  /** Uma por vez, sem abortar na primeira falha; um aviso só no fim, com o resultado real. */
  marcarComoPago(contas: LinhaContasMensais[]): void {
    if (!contas.length) return;
    const hoje = new Date();
    let primeiroErro: unknown = null;

    from(contas).pipe(
      concatMap(conta => this.contaMensalService
        .atualizar({ ...conta, situacao: statusAoPagar(vencimentoDe(conta), hoje) })
        .pipe(
          defaultIfEmpty(null),
          last(),
          map(() => true),
          catchError(erro => {
            primeiroErro ??= erro;
            return of(false);
          })
        )),
      toArray()
    ).subscribe(resultados => {
      const pagas = resultados.filter(Boolean).length;
      this.informarPagamento(contas, pagas, primeiroErro);
      if (pagas) {
        this.selecionavel?.limparSelecao();
        this.loadMonth(this.dateFilter);
      }
    });
  }

  private informarPagamento(contas: LinhaContasMensais[], pagas: number, erro: unknown): void {
    const total = contas.length;
    if (pagas === total) {
      this.alertService.success(total === 1
        ? `Conta '${contas[0].nome}' marcada como paga.`
        : `${total} contas marcadas como pagas.`);
      return;
    }

    const detalhe = extrairMensagemErro(erro, 'tente novamente.');
    if (pagas === 0) {
      this.alertService.error(`Nenhuma conta foi marcada como paga: ${detalhe}`);
      return;
    }
    this.alertService.contrast('Pagamento parcial', `${pagas} de ${total} contas marcadas como pagas. ${total - pagas} falhou(aram): ${detalhe}`);
  }

  excluir(contas: LinhaContasMensais[]): void {
    if (contas.length === 1) {
      this.excluirUma(contas[0]);
      return;
    }

    this.exclusaoEmLote
      .confirmarEExcluir(this.selecionavel, contas, conta => this.contaMensalService.excluir(conta.id), { singular: 'conta', plural: 'contas', feminino: true })
      .subscribe(excluiu => {
        if (excluiu) this.loadMonth(this.dateFilter);
      });
  }

  private excluirUma(conta: LinhaContasMensais): void {
    this.confirmacao.confirm({
      header: 'Excluir conta',
      message: `Excluir a conta '${conta.nome}'?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => this.contaMensalService.excluir(conta.id).subscribe({
        next: () => {
          this.alertService.success(`Conta '${conta.nome}' excluída com sucesso!`);
          this.loadMonth(this.dateFilter);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Falha ao excluir a conta '${conta.nome}'.`))
      })
    });
  }

  onOpenCreate(): void {
    this.showModalCreate = true;
  }
}
