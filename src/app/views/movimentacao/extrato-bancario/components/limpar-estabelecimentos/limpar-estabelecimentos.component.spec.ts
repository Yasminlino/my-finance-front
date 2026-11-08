import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { LimparEstabelecimentosComponent } from './limpar-estabelecimentos.component';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** "Limpar estabelecimentos" no Configurar pessoas (card #76, fase 2). */
describe('LimparEstabelecimentosComponent', () => {
  let fixture: ComponentFixture<LimparEstabelecimentosComponent>;
  let servico: jasmine.SpyObj<PessoaMovimentacaoService>;
  let confirmacao: ConfirmacaoService;
  const comp = () => fixture.componentInstance;
  const texto = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(() => {
    servico = jasmine.createSpyObj<PessoaMovimentacaoService>('PessoaMovimentacaoService', ['estabelecimentos', 'removerEstabelecimentos']);
    servico.estabelecimentos.and.returnValue(of([
      { id: 7, nomePessoa: 'AMAZON BR', lancamentos: 0 },
      { id: 1, nomePessoa: 'SHOPEE', lancamentos: 12 },
      { id: 9, nomePessoa: 'SUPERMERCADO SÃO JOÃO', lancamentos: 1 }
    ]));
    servico.removerEstabelecimentos.and.callFake(ids => of(ids.length));
    TestBed.configureTestingModule({
      imports: [LimparEstabelecimentosComponent],
      providers: [
        provideNoopAnimations(), ConfirmationService,
        { provide: PessoaMovimentacaoService, useValue: servico },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    confirmacao = TestBed.inject(ConfirmacaoService);
    fixture = TestBed.createComponent(LimparEstabelecimentosComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('lista as candidatas com quantos lançamentos cada uma tem, nenhuma marcada', () => {
    expect(document.querySelectorAll('.limpar-linha').length).toBe(3);
    expect(texto()).toContain('SHOPEE');
    expect(texto()).toContain('12 lançamentos');
    expect(texto()).toContain('1 lançamento');
    expect(comp().marcadas.size).toBe(0);
  });

  it('busca sem acento e "marcar as visíveis" só marca o que aparece', () => {
    comp().busca = 'sao joao';
    expect(comp().visiveis.map(c => c.id)).toEqual([9]);
    comp().marcarTodas(true);
    expect([...comp().marcadas]).toEqual([9]);
    expect(comp().todasMarcadas).toBeTrue();
    comp().busca = '';
    expect(comp().todasMarcadas).toBeFalse();
  });

  it('apagar confirma antes, manda só as marcadas e avisa quantas', async () => {
    const fechado = jasmine.createSpy('fechado');
    comp().fechado.subscribe(fechado);
    spyOn(confirmacao, 'confirmar').and.resolveTo(true);
    comp().alternar(1, true);
    comp().alternar(7, true);
    comp().alternar(7, false);

    await comp().apagar();

    expect(confirmacao.confirmar).toHaveBeenCalled();
    expect(servico.removerEstabelecimentos).toHaveBeenCalledWith([1]);
    expect(fechado).toHaveBeenCalledWith(1);
  });

  it('desistir na confirmação não apaga', async () => {
    spyOn(confirmacao, 'confirmar').and.resolveTo(false);
    comp().alternar(1, true);
    await comp().apagar();
    expect(servico.removerEstabelecimentos).not.toHaveBeenCalled();
  });
});
