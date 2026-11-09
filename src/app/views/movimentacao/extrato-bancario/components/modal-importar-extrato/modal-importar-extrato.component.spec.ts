import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ModalImportarExtratoComponent } from './modal-importar-extrato.component';
import { filtrarLinhas, montarOpcoes, resumoDoQueEntrou } from './importar.regras';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { BancoDto } from 'src/app/core/models/banco.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { LinhaPreviaImportacaoDto, PreviaImportacaoDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';

const linha = (chave: string, extra: Partial<LinhaPreviaImportacaoDto> = {}): LinhaPreviaImportacaoDto => ({
  chave, data: '2026-10-01', descricao: 'Compra ' + chave, valor: 10, tipoLancamento: 'Saída', categoriaId: 1,
  nomePessoa: null, entraNosAcertos: false, duplicado: false, ...extra
});
const previa = (extra: Partial<PreviaImportacaoDto> = {}): PreviaImportacaoDto => ({
  formato: 'Nubank', ehFatura: false, bancoId: 5, bancoDetectado: true, mesReferencia: '2026-10', dataInicio: '2026-10-01', dataFim: '2026-10-30',
  novos: 2, duplicados: 1, invalidas: 0, entradas: 0, saidas: 20, mesJaImportado: false, aviso: '',
  linhas: [linha('a'), linha('b', { categoriaId: null, nomePessoa: 'CARLOS', entraNosAcertos: true }), linha('c', { duplicado: true })],
  ...extra
});

/** Assistente de importação em 3 passos (card #74). */
describe('ModalImportarExtratoComponent', () => {
  let fixture: ComponentFixture<ModalImportarExtratoComponent>;
  let modal: ModalImportarExtratoComponent;
  let itens: jasmine.SpyObj<ExtratoBancarioItemService>;
  let alertas: jasmine.SpyObj<AlertService>;

  const tiposCartao: TipoCartaoDto[] = [{ id: 2, nomeTipoCartao: 'Conta corrente', ehCredito: false, ehSistema: true }];
  const bancos = [{ id: 5, nomeBanco: 'NuBank', tipoCartaoId: 2 }, { id: 6, nomeBanco: 'Caixa', tipoCartaoId: 2 }] as BancoDto[];
  const categorias = [{ id: 1, nome: 'Mercado', subcategoria: '', ativo: true }, { id: 9, nome: 'Lazer', subcategoria: '', ativo: true }] as CategoriaDto[];
  const arquivo = new File(['Data,Valor'], 'NU_2026-10.csv', { type: 'text/csv' });
  const texto = () => document.body.textContent ?? '';
  const escolher = () => {
    (modal as unknown as { usarArquivo(f: File): void }).usarArquivo(arquivo);
    fixture.detectChanges();
  };

  beforeEach(() => {
    itens = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['importar', 'previaImportacao']);
    itens.previaImportacao.and.returnValue(of(previa()));
    itens.importar.and.returnValue(of({ quantidadeCriados: 1, quantidadeIgnorados: 0, quantidadeJaImportados: 1, quantidadeDesmarcados: 1, mesDestino: '2026-10', mensagem: '' }));
    alertas = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'info', 'error']);
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: LarguraTelaService, useValue: { movel: signal(false) } },
        { provide: ExtratoBancarioItemService, useValue: itens },
        { provide: AlertService, useValue: alertas }
      ]
    });
    fixture = TestBed.createComponent(ModalImportarExtratoComponent);
    modal = fixture.componentInstance;
    fixture.componentRef.setInput('bancos', bancos);
    fixture.componentRef.setInput('tiposCartao', tiposCartao);
    fixture.componentRef.setInput('categorias', categorias);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('abre sem erro, mostra os formatos e só valida ao continuar', () => {
    expect(texto()).toContain('CSV do Nubank');
    expect(texto()).not.toContain('Escolha o arquivo do extrato');

    modal.continuar();
    fixture.detectChanges();

    expect(texto()).toContain('Escolha o arquivo do extrato');
    expect(modal.passo).toBe(0);
  });

  it('ao escolher o arquivo, lê a prévia e usa o banco detectado', () => {
    escolher();

    expect(itens.previaImportacao).toHaveBeenCalledWith(arquivo, null);
    expect(modal.bancoId).toBe(5);
    expect(texto()).toContain('Detectado pelo arquivo');
    expect(texto()).toContain('out/2026');
  });

  it('trocar o banco lê a prévia de novo com ele', () => {
    escolher();
    modal.bancoId = 6;
    modal.aoTrocarBanco();
    expect(itens.previaImportacao).toHaveBeenCalledWith(arquivo, 6);
  });

  it('arquivo não reconhecido mostra o motivo e não avança', () => {
    itens.previaImportacao.and.returnValue(throwError(() => ({ error: { mensagem: 'Formato não reconhecido.' } })));
    escolher();
    modal.continuar();
    expect(modal.erro).toBeTruthy();
    expect(modal.passo).toBe(0);
  });

  it('conferir: duplicado vem desmarcado; importa só o marcado com a categoria trocada', () => {
    escolher();
    modal.continuar();
    fixture.detectChanges();
    expect(modal.passo).toBe(1);
    expect(modal.marcadas.has('c')).toBeFalse();
    expect(texto()).toContain('já importado');

    modal.alternar(linha('a'));
    modal.trocarCategoria(linha('b'), 9);
    modal.alternar(linha('c', { duplicado: true }));
    modal.importar();

    expect(itens.importar).toHaveBeenCalledWith(arquivo, { id: 5, nomeBanco: 'NuBank', tipoCartaoId: 2 }, { pular: ['a'], categorias: { b: 9 } });
    expect(modal.passo).toBe(2);
  });

  it('pronto: atalhos para o Extrato e fechar recarrega', () => {
    const fechou = jasmine.createSpy('fechado');
    const abriu = jasmine.createSpy('verExtrato');
    modal.fechado.subscribe(fechou);
    modal.verExtrato.subscribe(abriu);
    escolher();
    modal.continuar();
    modal.importar();
    fixture.detectChanges();

    expect(texto()).toContain('1 lançamento importado');
    expect(texto()).toContain('Acertos com CARLOS');
    modal.abrirExtrato('acertos');
    expect(abriu).toHaveBeenCalledWith({ mes: '2026-10', bancoId: 5, foco: 'acertos' });

    modal.fechar();
    expect(fechou).toHaveBeenCalledWith(true);
  });

  it('erro ao gravar avisa e fica no Conferir', () => {
    itens.importar.and.returnValue(throwError(() => new Error('x')));
    escolher();
    modal.continuar();
    modal.importar();
    expect(alertas.error).toHaveBeenCalled();
    expect(modal.passo).toBe(1);
  });

  it('regras: filtro, opções só do que mudou e o que entrou', () => {
    const linhas = previa().linhas;
    const categoriasMapa = new Map<string, number | null>([['a', 1], ['b', null], ['c', 1]]);

    expect(filtrarLinhas(linhas, 'sem-categoria', '', categoriasMapa).map(l => l.chave)).toEqual(['b']);
    expect(filtrarLinhas(linhas, 'duplicados', '', categoriasMapa).map(l => l.chave)).toEqual(['c']);
    expect(filtrarLinhas(linhas, 'todos', 'carlos', categoriasMapa).map(l => l.chave)).toEqual(['b']);
    expect(montarOpcoes(linhas, new Set(['a', 'b']), categoriasMapa)).toEqual({ pular: [], categorias: {} });
    expect(resumoDoQueEntrou(linhas, new Set(['a', 'b']), categoriasMapa)).toEqual({ semCategoria: 1, pessoas: ['CARLOS'] });
  });
});
