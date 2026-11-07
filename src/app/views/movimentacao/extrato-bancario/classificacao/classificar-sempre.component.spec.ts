import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ClassificarSempreComponent } from './classificar-sempre.component';
import { PreviaRegraResultadoDto } from 'src/app/core/models/regra-classificacao.model';
import { RegraClassificacaoService } from 'src/app/core/services/regra-classificacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** "Criar regra?" flutuante depois de categorizar (card #76, fase 1, layout novo). */
describe('ClassificarSempreComponent', () => {
  let fixture: ComponentFixture<ClassificarSempreComponent>;
  let servico: jasmine.SpyObj<RegraClassificacaoService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const comp = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const previa = (semCategoria: number): PreviaRegraResultadoDto =>
    ({ total: semCategoria + 1, semCategoria, conflitos: 0, exemplos: [], exemplosConflito: [] });
  const botao = (rotulo: string) =>
    Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes(rotulo)) as HTMLButtonElement;

  beforeEach(() => {
    servico = jasmine.createSpyObj<RegraClassificacaoService>('RegraClassificacaoService', ['criar', 'previa', 'aplicar']);
    servico.criar.and.callFake(dto => of({ id: 5, ...dto, categoriaId: dto.categoriaId ?? null, ativa: true }));
    servico.previa.and.callFake(dto => of(previa(dto.texto === 'IFOOD' ? 3 : 0)));
    servico.aplicar.and.returnValue(of({ quantidade: 3, itemIds: [11, 12, 13] }));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [ClassificarSempreComponent],
      providers: [provideNoopAnimations(), { provide: RegraClassificacaoService, useValue: servico }, { provide: AlertService, useValue: alerta }]
    });
    fixture = TestBed.createComponent(ClassificarSempreComponent);
    fixture.componentRef.setInput('categorias', [{ label: 'Alimentação', value: 8 }, { label: 'Transporte', value: 9 }]);
    fixture.componentRef.setInput('propostas', [
      { texto: 'IFOOD', categoriaId: 8, tipoMovimentacaoId: null },
      { texto: 'UBER', categoriaId: 9, tipoMovimentacaoId: 4 }
    ]);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('mostra a frase e quantos outros sem categoria seriam classificados', () => {
    expect(servico.previa).toHaveBeenCalledWith(jasmine.objectContaining({ texto: 'IFOOD', categoriaId: 8 }));
    expect(texto()).toContain('Criar regra?');
    expect(texto()).toContain('contiver IFOOD, usar Alimentação');
    expect(texto()).toContain('Mais 3 lançamentos sem categoria seriam classificados');
  });

  it('criar regra grava, aplica nos que já foram mostrados e segue para a próxima; no fim devolve os ids', () => {
    const fim = jasmine.createSpy('concluiu');
    const criadas: unknown[] = [];
    comp().regraCriada.subscribe(r => criadas.push(r));
    comp().concluiu.subscribe(fim);

    botao('Criar regra').click();
    expect(servico.criar).toHaveBeenCalledWith(jasmine.objectContaining({ texto: 'IFOOD', categoriaId: 8, campo: 'descricao_ou_pessoa', operador: 'contem' }));
    expect(servico.aplicar).toHaveBeenCalledWith(5);
    expect(criadas.length).toBe(1);
    expect(comp().atual?.texto).toBe('UBER');

    // UBER: ninguém mais sem categoria, então cria sem aplicar.
    servico.aplicar.calls.reset();
    comp().criar();
    expect(servico.aplicar).not.toHaveBeenCalled();
    expect(fim).toHaveBeenCalledWith([11, 12, 13]);
  });

  it('sem outros lançamentos: cria sem aplicar; "Agora não" pula sem gravar', () => {
    servico.previa.and.returnValue(of(previa(0)));
    fixture.componentRef.setInput('propostas', [{ texto: 'PADARIA', categoriaId: 8, tipoMovimentacaoId: null }, { texto: 'UBER', categoriaId: 9, tipoMovimentacaoId: null }]);
    fixture.detectChanges();
    expect(texto()).not.toContain('seriam classificados');

    comp().pular();
    expect(servico.criar).not.toHaveBeenCalled();
    comp().criar();
    expect(servico.criar).toHaveBeenCalledTimes(1);
    expect(servico.aplicar).not.toHaveBeenCalled();
    expect(comp().atual).toBeNull();
  });

  it('"Editar" leva a proposta para a tela de regras e fecha a fila', () => {
    const editar = jasmine.createSpy('editar');
    const fim = jasmine.createSpy('concluiu');
    comp().editar.subscribe(editar);
    comp().concluiu.subscribe(fim);

    botao('Editar').click();

    expect(editar).toHaveBeenCalledWith({ texto: 'IFOOD', categoriaId: 8, tipoMovimentacaoId: null });
    expect(fim).toHaveBeenCalledWith([]);
    expect(comp().atual).toBeNull();
  });

  it('erro ao criar avisa e mantém a proposta', () => {
    servico.criar.and.returnValue(throwError(() => new Error('falhou')));
    comp().criar();
    expect(alerta.error).toHaveBeenCalled();
    expect(comp().atual?.texto).toBe('IFOOD');
  });
});
