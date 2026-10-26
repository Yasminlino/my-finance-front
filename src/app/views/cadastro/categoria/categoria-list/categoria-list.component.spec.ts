import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { CategoriaListComponent } from './categoria-list.component';
import { CategoriaModule } from '../categoria.module';
import { CategoryService } from 'src/app/core/services/category.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CategoriaDto } from 'src/app/core/models/categoria.model';

/** Cadastro de Categorias no layout novo (card #23), desktop. */
describe('CategoriaListComponent', () => {
  let fixture: ComponentFixture<CategoriaListComponent>;
  let service: jasmine.SpyObj<CategoryService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const movel = signal(false);

  const dados = (): CategoriaDto[] => [
    { id: 6, nome: 'Casa', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true, quantidadeContas: 5, icone: 'pi pi-home', cor: 'laranja' },
    { id: 16, nome: 'Ágatha', subcategoria: 'Despesa', naturezaOperacao: 0, ativo: true, quantidadeContas: 1 },
    { id: 26, nome: 'Tansferência entre contas', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true, quantidadeContas: 0 },
    { id: 27, nome: 'Transferência entre contas', subcategoria: 'Receita', naturezaOperacao: 0, ativo: true, quantidadeContas: 0 },
    { id: 19, nome: '13º', subcategoria: 'Receita', naturezaOperacao: 0, ativo: false, quantidadeContas: 1 }
  ];

  const comp = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;
  const linhas = () => Array.from(el().querySelectorAll('.tabela-categorias tbody tr'));
  const linhaDe = (nome: string) => linhas().find(l => l.textContent?.includes(nome))!;

  beforeEach(() => {
    movel.set(false);
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['listar', 'atualizar', 'excluir', 'criar']);
    service.listar.and.returnValue(of(dados()));
    service.atualizar.and.returnValue(of({}));
    service.excluir.and.returnValue(of({}));
    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);
    confirmacao.confirmar.and.resolveTo(true);
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      imports: [CategoriaModule],
      providers: [
        provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService,
        { provide: CategoryService, useValue: service },
        { provide: ConfirmacaoService, useValue: confirmacao },
        { provide: AlertService, useValue: alerta },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
    fixture = TestBed.createComponent(CategoriaListComponent);
    fixture.detectChanges();
  });

  it('cabeçalho com título, subtítulo e "Nova categoria"', () => {
    expect(el().querySelector('.mf-page-title')?.textContent).toContain('Categorias');
    expect(el().textContent).toContain('Agrupam as contas e definem se são despesa ou receita');
    expect(el().textContent).toContain('Nova categoria');
  });

  it('por padrão lista só as ativas, sem a linha de filtro por coluna', () => {
    expect(linhas().length).toBe(4);
    expect(el().textContent).not.toContain('13º');
    expect(el().querySelector('app-data-grid')).toBeNull();
  });

  it('barra de filtros mostra natureza, situação e limpar à direita', () => {
    const fim = el().querySelector('.mf-filter-bar__fim')!;
    expect(fim.querySelector('p-multiselect')).not.toBeNull();
    expect(fim.querySelector('p-dropdown .filtro-situacao')).not.toBeNull();
    expect(fim.querySelector('[aria-label="Limpar filtros"]')).not.toBeNull();
  });

  it('as opções das abas não mudam de referência sem mudar o filtro (senão o clique na aba se perde)', () => {
    const opcoes = comp().opcoesTipo;
    fixture.detectChanges();
    expect(comp().opcoesTipo).toBe(opcoes);
  });

  it('situação "todas" traz as inativas; "inativas" traz só elas', () => {
    comp().situacao = 'todas';
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(linhas().length).toBe(5);
    expect(linhaDe('13º')).toBeTruthy();

    comp().situacao = 'inativas';
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(linhas().length).toBe(1);
    expect(linhaDe('13º')).toBeTruthy();
  });

  it('receitas vêm primeiro na tabela', () => {
    expect(linhas()[0].textContent).toContain('Transferência entre contas');
    expect(linhas()[0].textContent).toContain('Receita');
  });

  it('"Ordenar por" fica na barra e reordena a tabela', () => {
    expect(el().querySelector('.mf-filter-bar__fim p-dropdown .filtro-ordem')).not.toBeNull();

    comp().ordem = 'contas';
    comp().aoMudarFiltro();
    fixture.detectChanges();

    expect(linhas()[0].textContent).toContain('Casa');
  });

  it('filtro Receitas e contadores por tipo', () => {
    expect(comp().contagem).toEqual({ todas: 4, despesas: 3, receitas: 1 });

    comp().filtroTipo = 'receitas';
    comp().aoMudarFiltro();
    fixture.detectChanges();

    expect(linhas().length).toBe(1);
    expect(linhaDe('Transferência entre contas')).toBeTruthy();
  });

  it('resumo com despesas, receitas e "a revisar"', () => {
    expect(comp().resumo.despesas).toBe(3);
    expect(comp().resumo.receitas).toBe(1);
    expect(comp().resumo.aRevisar).toBe(1);
    expect(el().textContent).toContain('A revisar');
  });

  it('linha com ícone e cor da categoria, tag do tipo e chip da natureza', () => {
    const casa = linhaDe('Casa');
    const icone = casa.querySelector('.mf-icone-categoria')!;
    expect(icone.classList).toContain('mf-cor-laranja');
    expect(icone.querySelector('i')?.className).toBe('pi pi-home');
    expect(casa.querySelector('p-tag')?.textContent).toContain('Despesa');
    expect(casa.textContent).toContain('Essencial');
  });

  it('avisa tipo × natureza incompatíveis e nome parecido', () => {
    expect(linhaDe('Ágatha').querySelector('.aviso-incompativel')).not.toBeNull();
    expect(linhaDe('Tansferência').querySelector('.aviso-parecido')).not.toBeNull();
    expect(linhaDe('Casa').querySelector('.aviso-incompativel, .aviso-parecido')).toBeNull();
  });

  describe('ativar e inativar pela lista', () => {
    it('inativar categoria usada pede confirmação com a quantidade de contas e grava', fakeAsync(() => {
      const casa = comp().registros.find(c => c.id === 6)!;

      comp().alternarAtivo(casa, false);
      tick();

      expect(confirmacao.confirmar.calls.mostRecent().args[0]).toContain('5 contas');
      expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 6, ativo: false, icone: 'pi pi-home', cor: 'laranja' }));
      expect(alerta.success).toHaveBeenCalled();
    }));

    it('inativar sem contas não pede confirmação', fakeAsync(() => {
      comp().alternarAtivo(comp().registros.find(c => c.id === 26)!, false);
      tick();

      expect(confirmacao.confirmar).not.toHaveBeenCalled();
      expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 26, ativo: false }));
    }));

    it('cancelar a confirmação volta o switch e não grava', fakeAsync(() => {
      confirmacao.confirmar.and.resolveTo(false);
      const casa = comp().registros.find(c => c.id === 6)!;

      comp().alternarAtivo(casa, false);
      tick();

      expect(service.atualizar).not.toHaveBeenCalled();
      expect(comp().registros.find(c => c.id === 6)!.ativo).toBeTrue();
    }));

    it('erro na gravação volta o switch e avisa', fakeAsync(() => {
      service.atualizar.and.returnValue(throwError(() => new Error('falhou')));

      comp().alternarAtivo(comp().registros.find(c => c.id === 26)!, false);
      tick();

      expect(comp().registros.find(c => c.id === 26)!.ativo).toBeTrue();
      expect(alerta.error).toHaveBeenCalled();
    }));
  });

  describe('celular', () => {
    const cards = () => Array.from(el().querySelectorAll('.mf-list-card'));

    beforeEach(() => {
      movel.set(true);
      fixture.detectChanges();
    });

    it('lista em cards agrupada por tipo, sem tabela, com o botão flutuante', () => {
      expect(el().querySelector('.tabela-categorias')).toBeNull();
      expect(el().textContent).toContain('Despesas · 3');
      expect(el().textContent).toContain('Receitas · 1');
      expect(cards().length).toBe(4);
      expect(el().querySelector('mf-fab')).not.toBeNull();
      expect(el().textContent).not.toContain('Nova categoria');
    });

    it('o grupo de receitas vem antes do de despesas', () => {
      const texto = el().textContent!;
      expect(texto.indexOf('Receitas · 1')).toBeLessThan(texto.indexOf('Despesas · 3'));
    });

    it('tocar no card abre a edição', () => {
      (cards().find(c => c.textContent?.includes('Casa')) as HTMLElement).click();

      expect(comp().showModalForm).toBeTrue();
      expect(comp().editing?.id).toBe(6);
    });

    it('o switch do card não abre a edição', () => {
      const casa = cards().find(c => c.textContent?.includes('Casa'))!;
      (casa.querySelector('.card-ativo') as HTMLElement).click();

      expect(comp().showModalForm).toBeFalse();
    });

    it('o botão "Mais filtros" aparece ao lado da busca', () => {
      const fim = el().querySelector('.mf-filter-bar__fim')!;
      expect(fim.querySelector('[aria-label="Mais filtros"]')).not.toBeNull();
      expect(fim.querySelector('p-multiselect')).toBeNull();
    });

    it('natureza e situação ficam no painel de baixo', () => {
      comp().filtrosMovelAbertos = true;
      fixture.detectChanges();

      const painel = document.querySelector('.filtros-movel');
      expect(painel?.textContent).toContain('Natureza');
      expect(painel?.textContent).toContain('Situação');
      expect(painel?.textContent).toContain('Ordenar por');
    });
  });

  describe('excluir', () => {
    it('categoria usada por contas não vai para a API: avisa quantas contas e sugere inativar', fakeAsync(() => {
      comp().onDelete(comp().registros.find(c => c.id === 6)!);
      tick();

      expect(service.excluir).not.toHaveBeenCalled();
      expect(alerta.info.calls.mostRecent().args[0]).toContain('5 contas');
    }));

    it('pelo menu ⋮ da linha: "Excluir" chega na exclusão da categoria certa', fakeAsync(() => {
      (linhaDe('Casa').querySelector('[aria-label="Mais ações de Casa"]') as HTMLElement).click();
      fixture.detectChanges();
      tick();

      const item = Array.from(document.querySelectorAll('.p-menu .p-menuitem-link, .p-menu .p-menuitem-content'))
        .find(e => e.textContent?.includes('Excluir')) as HTMLElement;
      item.click();
      tick();

      expect(alerta.info.calls.mostRecent()?.args[0]).toContain('5 contas');
    }));

    it('sem contas, confirma e exclui', fakeAsync(() => {
      comp().onDelete(comp().registros.find(c => c.id === 26)!);
      tick();

      expect(confirmacao.confirmar).toHaveBeenCalled();
      expect(service.excluir).toHaveBeenCalledWith(26);
    }));
  });
});
