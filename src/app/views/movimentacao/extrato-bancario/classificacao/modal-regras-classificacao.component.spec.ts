import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { ModalRegrasClassificacaoComponent } from './modal-regras-classificacao.component';
import { PreviaRegraResultadoDto, RegraClassificacaoDto } from 'src/app/core/models/regra-classificacao.model';
import { RegraClassificacaoService } from 'src/app/core/services/regra-classificacao.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { NomesExtratoService } from 'src/app/core/services/nomes-extrato.service';

/** Tela "Regras de classificação" (card #76, fase 1, layout novo de 05/11). */
describe('ModalRegrasClassificacaoComponent', () => {
  let fixture: ComponentFixture<ModalRegrasClassificacaoComponent>;
  let servico: jasmine.SpyObj<RegraClassificacaoService>;
  let confirmacao: ConfirmacaoService;
  const comp = () => fixture.componentInstance;
  const texto = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');
  /** A frase de uma linha, parte por parte (o espaço entre as partes vem do CSS). */
  const frase = (i: number) => Array.from(document.querySelectorAll('.regra-linha')[i].querySelectorAll('.regra-frase > *'))
    .map(e => (e.textContent ?? '').trim()).filter(Boolean).join(' ');

  const regras = (): RegraClassificacaoDto[] => [
    { id: 1, texto: 'IOF', categoriaId: 7, categoriaNome: 'Tarifas e encargos', pessoaNome: 'Eu', ativa: true, ordem: 0, vezesAplicada: 12, ultimaAplicacao: '2026-02-04T12:00:00Z' },
    { id: 2, texto: 'IFOOD', categoriaId: 8, categoriaNome: 'Alimentação', ativa: true, ordem: 1, vezesAplicada: 31 },
    { id: 3, texto: 'POSTO', campo: 'descricao', operador: 'comeca_com', categoriaId: 9, categoriaNome: 'Carro', ativa: false, ordem: 2 }
  ];
  const previa: PreviaRegraResultadoDto = {
    total: 6, semCategoria: 4, conflitos: 1,
    exemplos: [
      { id: 50, dataMovimentacao: '2026-02-03', texto: 'UBER *TRIP HELP.UBER.COM', valor: 23.9, tipoLancamento: 'Saída' },
      { id: 51, dataMovimentacao: '2026-02-07', texto: 'UBER *EATS PENDING', valor: 41.5, tipoLancamento: 'Saída', categoriaId: 8, categoriaNome: 'Alimentação' }
    ],
    exemplosConflito: [{ id: 51, dataMovimentacao: '2026-02-07', texto: 'UBER *EATS PENDING', valor: 41.5, categoriaId: 8, categoriaNome: 'Alimentação' }]
  };

  beforeEach(() => {
    try { localStorage.removeItem('regras-sugestoes-ignoradas'); } catch { /* sem armazenamento */ }
    servico = jasmine.createSpyObj<RegraClassificacaoService>('RegraClassificacaoService',
      ['listar', 'criar', 'atualizar', 'excluir', 'previa', 'aplicar', 'reordenar', 'sugestoesDeRegra']);
    servico.listar.and.returnValue(of(regras()));
    servico.criar.and.callFake(dto => of({ id: 4, ...dto, categoriaId: dto.categoriaId ?? null, ativa: true }));
    servico.atualizar.and.returnValue(of({}));
    servico.excluir.and.returnValue(of({}));
    servico.previa.and.returnValue(of(previa));
    servico.aplicar.and.returnValue(of({ quantidade: 4, itemIds: [50, 52, 53, 54] }));
    servico.reordenar.and.returnValue(of({}));
    servico.sugestoesDeRegra.and.returnValue(of([
      { texto: 'MERCADO LIVRE', quantidade: 5, vezesCategoria: 0 },
      { texto: 'NETFLIX', quantidade: 3, categoriaId: 10, categoriaNome: 'Lazer', vezesCategoria: 3 }
    ]));
    TestBed.configureTestingModule({
      imports: [ModalRegrasClassificacaoComponent],
      providers: [
        provideNoopAnimations(), ConfirmationService,
        { provide: RegraClassificacaoService, useValue: servico },
        { provide: NomesExtratoService, useValue: { listar: () => of([]), grupos: () => of([]) } },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    confirmacao = TestBed.inject(ConfirmacaoService);
    fixture = TestBed.createComponent(ModalRegrasClassificacaoComponent);
    fixture.componentInstance.aba = 'regras';
    fixture.componentRef.setInput('categorias', [{ label: 'Alimentação', value: 8 }, { label: 'Transporte', value: 9 }]);
    fixture.componentRef.setInput('tipos', [{ label: 'Débito', value: 4 }]);
    fixture.componentRef.setInput('pessoas', [{ label: 'Carlos', value: 10 }]);
    fixture.componentRef.setInput('contas', [{ label: 'NuBank', value: 5 }]);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('card #79: "Nomes e regras" abre na aba Nomes do extrato; fechar com nomes mexidos pergunta antes', async () => {
    fixture.destroy();
    fixture = TestBed.createComponent(ModalRegrasClassificacaoComponent);
    fixture.detectChanges();
    expect(comp().aba).toBe('nomes');
    expect(document.querySelector('app-nomes-extrato')).not.toBeNull();
    expect(texto()).toContain('Nomes e regras');

    const fechou: number[] = [];
    comp().fechado.subscribe(() => fechou.push(1));
    spyOn(confirmacao, 'confirmar').and.resolveTo(false);
    spyOnProperty(comp().nomes!, 'temAlteracoes').and.returnValue(true);
    fixture.detectChanges();
    await comp().fechar();
    expect(confirmacao.confirmar).toHaveBeenCalled();
    expect(fechou).toEqual([]);
  });

  it('lista as regras na ordem, como frase, com uso e contagem no topo', () => {
    expect(document.querySelectorAll('.regra-linha').length).toBe(3);
    expect(texto()).toContain('3 regras');
    expect(frase(0)).toBe('Descrição ou pessoa contém IOF Tarifas e encargos pessoa Eu');
    expect(texto()).toContain('Tarifas e encargos');
    expect(texto()).toContain('aplicada 12 vezes · última 04/02');
    expect(frase(2)).toBe('Descrição começa com POSTO Carro');
    expect(texto()).toContain('desligada · nunca aplicada');
  });

  it('busca filtra a lista e esconde a alça de arrastar', () => {
    comp().busca = 'aliment';
    fixture.detectChanges();
    expect(document.querySelectorAll('.regra-linha').length).toBe(1);
    expect(document.querySelector('.regra-alca')).toBeNull();
  });

  it('nova regra: prévia ao vivo com exemplos, destaque e conflito; criar aplica nos sem categoria', fakeAsync(() => {
    const alterou = jasmine.createSpy('alterou');
    comp().alterou.subscribe(alterou);
    comp().novaRegra();
    comp().form!.texto = 'uber';
    comp().form!.categoriaId = 9;
    comp().aoMudarForm();
    tick(300);
    fixture.detectChanges();

    expect(servico.previa).toHaveBeenCalledWith(jasmine.objectContaining({ texto: 'uber', campo: 'descricao_ou_pessoa', operador: 'contem', categoriaId: 9 }));
    expect(texto()).toContain('6 lançamentos já existentes batem com a regra · 4 estão sem categoria');
    expect(texto()).toContain('Aplicar aos 4 sem categoria agora');
    expect(document.querySelector('.regra-exemplo mark')?.textContent).toBe('UBER');
    expect(texto()).toContain('"UBER *EATS PENDING" está em Alimentação');

    comp().salvar();
    tick();
    expect(servico.criar).toHaveBeenCalledWith(jasmine.objectContaining({ texto: 'uber', categoriaId: 9, campo: 'descricao_ou_pessoa' }));
    expect(servico.aplicar).toHaveBeenCalledWith(4);
    expect(alterou).toHaveBeenCalledWith([50, 52, 53, 54]);
    expect(comp().form).toBeNull();
  }));

  it('desmarcar "Aplicar agora" cria sem aplicar; regra sem destino não salva', fakeAsync(() => {
    comp().novaRegra({ texto: 'padaria' });
    expect(comp().podeSalvar).toBeFalse();
    comp().form!.categoriaId = 8;
    comp().aoMudarForm();
    tick(300);
    comp().aplicarAgora = false;
    comp().salvar();
    tick();
    expect(servico.criar).toHaveBeenCalled();
    expect(servico.aplicar).not.toHaveBeenCalled();
  }));

  it('editar grava; desligar grava na hora; excluir confirma antes', async () => {
    comp().editar(regras()[1]);
    comp().form!.texto = 'IFOOD MERCADO';
    comp().aplicarAgora = false;
    await comp().salvar();
    expect(servico.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 2, texto: 'IFOOD MERCADO', ordem: 1 }));

    comp().alternarAtiva(regras()[0], false);
    expect(servico.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1, ativa: false }));

    spyOn(confirmacao, 'confirmar').and.resolveTo(true);
    await comp().excluir(regras()[2]);
    expect(servico.excluir).toHaveBeenCalledWith(3);
  });

  it('duplicar abre a mesma frase como regra nova', () => {
    comp().duplicar(regras()[2]);
    expect(comp().form).toEqual(jasmine.objectContaining({ id: null, texto: 'POSTO', campo: 'descricao', operador: 'comeca_com', categoriaId: 9 }));
  });

  it('subir/descer muda a ordem e grava (vale a de cima)', () => {
    comp().moverRegra(2, 0);
    expect(comp().regras.map(r => r.id)).toEqual([3, 1, 2]);
    expect(servico.reordenar).toHaveBeenCalledWith([3, 1, 2]);
  });

  it('sugestões: criar regra preenche a frase; ignorar some e fica guardado neste navegador', () => {
    expect(texto()).toContain('MERCADO LIVRE aparece em 5 lançamentos sem categoria');
    expect(texto()).toContain('você usou Lazer nas 3 vezes');

    comp().criarDaSugestao(comp().sugestoesVisiveis[1]);
    expect(comp().form).toEqual(jasmine.objectContaining({ id: null, texto: 'NETFLIX', categoriaId: 10 }));

    comp().ignorarSugestao(comp().sugestoesVisiveis[0]);
    expect(comp().sugestoesVisiveis.map(s => s.texto)).toEqual(['NETFLIX']);
    expect(JSON.parse(localStorage.getItem('regras-sugestoes-ignoradas') ?? '[]')).toEqual(['MERCADO LIVRE']);
  });

  it('abre já com a regra inicial ("Editar" do "Criar regra?")', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(ModalRegrasClassificacaoComponent);
    fixture.componentInstance.aba = 'regras';
    fixture.componentRef.setInput('inicial', { texto: 'UBER', categoriaId: 9 });
    fixture.detectChanges();
    expect(comp().form).toEqual(jasmine.objectContaining({ id: null, texto: 'UBER', categoriaId: 9, campo: 'descricao_ou_pessoa' }));
  });

  it('no celular: cards, botão + e a regra no painel de baixo', () => {
    fixture.componentRef.setInput('movel', true);
    fixture.detectChanges();
    expect(texto()).toContain('3 regras · vale a de cima');
    expect(document.querySelector('.regras-fab')).not.toBeNull();
    comp().novaRegra();
    fixture.detectChanges();
    expect(document.querySelector('.regra-sheet .regra-form--movel')).not.toBeNull();
  });
});
