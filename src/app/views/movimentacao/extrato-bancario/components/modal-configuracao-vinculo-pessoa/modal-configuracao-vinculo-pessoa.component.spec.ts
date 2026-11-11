import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ModalConfiguracaoVinculoPessoaComponent } from './modal-configuracao-vinculo-pessoa.component';

/** Card #79: "Pessoas que usam meus cartões" — lista simples, cadastro à mão, o "Eu" travado no topo. */
describe('ModalConfiguracaoVinculoPessoaComponent (Pessoas que usam meus cartões)', () => {
  let fixture: ComponentFixture<ModalConfiguracaoVinculoPessoaComponent>;
  let pessoas: jasmine.SpyObj<PessoaMovimentacaoService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;
  const p = (id: number, nomePessoa: string, ehTitular = false): PessoaMovimentacaoDto =>
    ({ id, nomePessoa, ehTitular, categoriaId: null, tipoMovimentacaoId: null });

  beforeEach(() => {
    pessoas = jasmine.createSpyObj<PessoaMovimentacaoService>('PessoaMovimentacaoService', ['listar', 'criar', 'excluir']);
    pessoas.listar.and.returnValue(of([p(3, 'CARLOS'), p(1, 'EU', true), p(2, 'ÁGATHA')]));
    pessoas.excluir.and.returnValue(of({}));
    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);
    TestBed.configureTestingModule({
      imports: [ModalConfiguracaoVinculoPessoaComponent, NoopAnimationsModule],
      providers: [
        { provide: PessoaMovimentacaoService, useValue: pessoas },
        { provide: ConfirmacaoService, useValue: confirmacao },
        { provide: AlertService, useValue: jasmine.createSpyObj<AlertService>('AlertService', ['error', 'success']) }
      ]
    });
    fixture = TestBed.createComponent(ModalConfiguracaoVinculoPessoaComponent);
    fixture.detectChanges();
  });

  it('mostra o "Eu" à parte e as outras em ordem, sem categoria nem "entra nos acertos"', () => {
    const comp = fixture.componentInstance;
    expect(comp.titular?.id).toBe(1);
    expect(comp.pessoas.map(x => x.nomePessoa)).toEqual(['ÁGATHA', 'CARLOS']);
    const texto = (fixture.nativeElement as HTMLElement).ownerDocument.body.textContent ?? '';
    expect(texto).not.toContain('Entra nos acertos');
    expect(texto).not.toContain('Limpar estabelecimentos');
  });

  it('excluir pede confirmação e avisa a tela de trás ao fechar', async () => {
    confirmacao.confirmar.and.resolveTo(true);
    const fechou: boolean[] = [];
    fixture.componentInstance.closed.subscribe(v => fechou.push(v));

    await fixture.componentInstance.excluir(p(3, 'CARLOS'));
    fixture.componentInstance.close();

    expect(pessoas.excluir).toHaveBeenCalledWith(3);
    expect(fixture.componentInstance.pessoas.map(x => x.id)).toEqual([2]);
    expect(fechou).toEqual([true]);
  });

  it('sem confirmar, não exclui; sem mudar nada, fecha com false', async () => {
    confirmacao.confirmar.and.resolveTo(false);
    const fechou: boolean[] = [];
    fixture.componentInstance.closed.subscribe(v => fechou.push(v));

    await fixture.componentInstance.excluir(p(3, 'CARLOS'));
    fixture.componentInstance.close();

    expect(pessoas.excluir).not.toHaveBeenCalled();
    expect(fechou).toEqual([false]);
  });
});
