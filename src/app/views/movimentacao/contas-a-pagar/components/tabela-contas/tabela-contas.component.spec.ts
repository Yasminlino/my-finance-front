import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';

import { TabelaContasComponent } from './tabela-contas.component';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { EdicaoContas } from '../../edicao-contas';

/** Tabela de Contas a Pagar (modo visualização): filtros, busca, colunas, lote e rodapé. */
describe('TabelaContasComponent', () => {
  const hoje = new Date(2026, 9, 17, 10, 0);

  const conta = (parcial: Partial<LinhaContasMensais>): LinhaContasMensais => ({
    id: 1, contaId: 1, nome: 'Luz', valor: 100, data: '2026-10-20' as any, ehParcelado: false,
    categoriaId: 1, categoriaNome: 'Moradia', tipoContaId: '', subcategoriaNome: 'Despesa',
    situacao: 'PENDENTE', statusSalvo: 'PENDENTE', desbloqueiaCampos: false,
    ...parcial
  });

  const contas = [
    conta({ id: 1, nome: 'Energia elétrica', valor: 200 }),
    conta({ id: 2, nome: 'Aluguel', valor: 1500, data: '2026-10-05' as any }),
    conta({ id: 3, nome: 'Salário', valor: 5000, categoriaNome: 'Renda', subcategoriaNome: 'Receita', situacao: 'PAGO NO PRAZO' }),
    conta({ id: 4, nome: 'Carro', valor: 800, categoriaNome: 'Transporte', ehParcelado: true, parcelaAtual: 8, quantidadeParcelas: 12 })
  ];

  let fixture: ComponentFixture<TabelaContasComponent>;
  let tabela: TabelaContasComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const ids = () => tabela.linhasVisiveis.map(c => c.id);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TabelaContasComponent],
      providers: [provideNoopAnimations(), ConfirmationService]
    });
    fixture = TestBed.createComponent(TabelaContasComponent);
    tabela = fixture.componentInstance;
    fixture.componentRef.setInput('hoje', hoje);
    fixture.componentRef.setInput('contas', contas);
    fixture.detectChanges();
  });

  it('filtro de situação com contadores do mês', () => {
    expect(tabela.opcoesFiltro.map(o => [o.value, o.contagem])).toEqual([
      ['todas', 4], ['a-vencer', 2], ['vencidas', 1], ['pagas', 1]
    ]);

    tabela.filtro = 'vencidas';
    tabela.aplicarFiltros();
    expect(ids()).toEqual([2]);

    tabela.filtro = 'pagas';
    tabela.aplicarFiltros();
    expect(ids()).toEqual([3]);
  });

  it('busca por nome, categoria ou observação, sem diferenciar acento', () => {
    tabela.busca = 'eletrica';
    tabela.aplicarFiltros();
    expect(ids()).toEqual([1]);

    tabela.busca = 'transp';
    tabela.aplicarFiltros();
    expect(ids()).toEqual([4]);
  });

  it('filtra por categorias e limpa tudo', () => {
    expect(tabela.categorias).toEqual(['Moradia', 'Renda', 'Transporte']);

    tabela.categoriasSelecionadas = ['Moradia'];
    tabela.aplicarFiltros();
    expect(ids()).toEqual([2, 1]);

    tabela.limparFiltros();
    expect(ids()).toEqual([2, 4, 1, 3]);
  });

  it('ordena por vencimento e, no mesmo dia, pelo nome', () => {
    expect(ids()).toEqual([2, 4, 1, 3]);
    // A lista recebida não é reordenada no lugar.
    expect(contas.map(c => c.id)).toEqual([1, 2, 3, 4]);
  });

  it('ícone da categoria com a cor da natureza e tags no estilo claro do app', () => {
    const icone = () => el().querySelector('#conta-1 .mf-icone-categoria')!;
    expect(icone().classList).toContain('mf-natureza-neutra'); // categorias ainda não carregadas

    fixture.componentRef.setInput('naturezas', new Map([[1, 1]]));
    fixture.detectChanges();

    expect(icone().classList).toContain('mf-natureza-1');
    expect(el().querySelector('.mf-tags-claras')).not.toBeNull();
  });

  it('mostra parcela X / Y, ATRASADA, vencimento relativo e receita com "+"', () => {
    expect(texto()).toContain('8 / 12');
    expect(texto()).toContain('ATRASADA');
    expect(texto()).toContain('Vencida há 12 dias');
    expect(texto()).toContain('Vence em 3 dias');
    expect(texto()).toContain('+ R$ 5.000,00');
  });

  it('rodapé soma as despesas da página', () => {
    expect(tabela.totalDespesasPagina).toBe(2500);

    tabela.aoPaginar({ first: 0, rows: 2 });
    expect(tabela.totalDespesasPagina).toBe(2300);
  });

  it('marcar como pago na linha emite a conta; conta paga não tem o botão', () => {
    const emitidas: LinhaContasMensais[][] = [];
    tabela.marcarPago.subscribe(c => emitidas.push(c));

    const botoes = el().querySelectorAll<HTMLButtonElement>('.acao-pagar button');
    expect(botoes.length).toBe(3);
    botoes[0].click();

    expect(emitidas).toEqual([[contas[1]]]);
  });

  it('barra de lote aparece com seleção e totaliza a seleção', () => {
    expect(el().querySelector('.barra-lote')).toBeNull();

    tabela.aoSelecionar([contas[0], contas[2]]);
    fixture.detectChanges();

    const barra = (el().querySelector('.barra-lote')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(tabela.totaisSelecao).toEqual({ receita: 5000, despesa: 200, saldo: 4800, count: 2 });
    // Quantidade uma vez só e rótulos sem o "(Selecionados)" do componente antigo.
    expect(barra.match(/selecionad/gi)?.length).toBe(1);
    expect(barra).toContain('2 selecionadas');
    // O Angular tira o espaço entre rótulo e valor (o respiro vem do mr-1).
    expect(barra).toMatch(/Despesa\s*R\$\s*200,00/);
    expect(barra).toMatch(/Receita\s*R\$\s*5\.000,00/);
    expect(barra).toMatch(/Saldo\s*R\$\s*4\.800,00/);
    expect(barra.indexOf('Receita')).toBeLessThan(barra.indexOf('Despesa'));
  });

  it('lote: marcar como pago e excluir emitem a seleção inteira; concluirExclusao limpa', () => {
    const pagas: LinhaContasMensais[][] = [];
    const excluidas: LinhaContasMensais[][] = [];
    tabela.marcarPago.subscribe(c => pagas.push(c));
    tabela.excluir.subscribe(c => excluidas.push(c));
    tabela.aoSelecionar([contas[0], contas[1]]);

    tabela.pagarSelecionadas();
    tabela.excluirSelecionadas();
    expect(pagas).toEqual([[contas[0], contas[1]]]);
    expect(excluidas).toEqual([[contas[0], contas[1]]]);

    tabela.concluirExclusao(true);
    expect(tabela.selecao).toEqual([]);
  });

  describe('modo edição', () => {
    let edicao: EdicaoContas;
    let confirmacao: ConfirmationService;
    const linha = (id: number) => el().querySelector<HTMLElement>(`#conta-${id}`)!;

    beforeEach(() => {
      edicao = new EdicaoContas(contas);
      confirmacao = TestBed.inject(ConfirmationService);
      fixture.componentRef.setInput('edicao', edicao);
      fixture.detectChanges();
    });

    it('troca as células por campos, tira a seleção e oferece o filtro Alteradas', () => {
      expect(linha(1).querySelector('p-inputNumber')).not.toBeNull();
      expect(linha(1).querySelector('p-calendar')).not.toBeNull();
      expect(linha(1).querySelector('p-dropdown')).not.toBeNull();
      expect(el().querySelector('p-tableCheckbox')).toBeNull();
      expect(tabela.opcoesFiltro.at(-1)).toEqual({ label: 'Alteradas', value: 'alteradas', contagem: 0 });
    });

    it('observação numa coluna própria, como no protótipo', () => {
      const cabecalhos = Array.from(el().querySelectorAll('th')).map(th => th.textContent?.trim());
      expect(cabecalhos).toEqual(['Conta', 'Parcela', 'Vencimento', 'Valor', 'Status', 'Observação', 'Ações']);

      const celulas = linha(1).querySelectorAll(':scope > td');
      expect(celulas[0].querySelector('input')).toBeNull();
      expect(celulas[5].querySelector('input[placeholder="Observação"]')).not.toBeNull();
    });

    it('campo alterado: linha marcada, valor anterior riscado e contador do filtro', () => {
      tabela.alterar(contas[0], 'valor', 250);
      fixture.detectChanges();

      expect(linha(1).classList).toContain('linha-alterada');
      expect(linha(1).querySelector('s')?.textContent?.replace(/\s+/g, ' ')).toContain('R$ 200,00');
      expect(tabela.opcoesFiltro.at(-1)!.contagem).toBe(1);

      tabela.filtro = 'alteradas';
      tabela.aplicarFiltros();
      expect(ids()).toEqual([1]);
    });

    it('Esc desfaz o campo; o botão da linha desfaz a linha', () => {
      tabela.alterar(contas[0], 'valor', 250);
      tabela.alterar(contas[0], 'observacao', 'conferir');
      fixture.detectChanges();

      linha(1).querySelector('p-inputNumber')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(edicao.foiAlterado(1, 'valor')).toBeFalse();
      expect(tabela.rascunho[1].valor).toBe(200);
      expect(edicao.foiAlterado(1, 'observacao')).toBeTrue();

      linha(1).querySelector<HTMLButtonElement>('.acao-desfazer button')!.click();
      fixture.detectChanges();
      expect(edicao.foiAlterado(1)).toBeFalse();
      expect(tabela.rascunho[1].observacao).toBe('');
    });

    it('erro de validação aparece no campo', () => {
      tabela.alterar(contas[3], 'parcelaAtual', 13);
      fixture.detectChanges();

      expect(linha(4).querySelector('.p-error')?.textContent).toContain('Parcela maior que o total (12).');
      // Inválido pelo validator do controle, não por classe posta à mão: sem ng-valid junto.
      const campo = linha(4).querySelector('p-inputNumber')!;
      expect(campo.classList).toContain('ng-invalid');
      expect(campo.classList).not.toContain('ng-valid');

      tabela.alterar(contas[3], 'parcelaAtual', 12);
      fixture.detectChanges();
      expect(campo.classList).toContain('ng-valid');
      expect(linha(4).querySelector('.p-error')).toBeNull();
    });

    it('prévia do efeito ao mudar o vencimento', () => {
      tabela.alterar(contas[1], 'data', new Date(2026, 9, 30));
      fixture.detectChanges();

      expect(linha(2).textContent).toContain('Deixa de ficar atrasada');
    });

    it('conta paga fica bloqueada até confirmar o desbloqueio', () => {
      expect(linha(3).classList).toContain('linha-bloqueada');
      expect(linha(3).querySelector('p-inputNumber')).toBeNull();

      spyOn(confirmacao, 'confirm').and.callFake(c => { c.accept!(); return confirmacao; });
      linha(3).querySelector<HTMLButtonElement>('.acao-desbloquear button')!.click();
      fixture.detectChanges();

      expect(confirmacao.confirm).toHaveBeenCalled();
      expect(edicao.bloqueada(3)).toBeFalse();
      expect(linha(3).querySelector('p-inputNumber')).not.toBeNull();
    });
  });

  it('pagar em lote ignora as já pagas', () => {
    const pagas: LinhaContasMensais[][] = [];
    tabela.marcarPago.subscribe(c => pagas.push(c));
    tabela.aoSelecionar([contas[0], contas[2]]);

    tabela.pagarSelecionadas();

    expect(pagas).toEqual([[contas[0]]]);
  });
});
