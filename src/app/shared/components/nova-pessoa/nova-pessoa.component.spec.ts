import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { AlertService } from '../alert.service';
import { NovaPessoaComponent } from './nova-pessoa.component';

describe('NovaPessoaComponent (card #79)', () => {
  let fixture: ComponentFixture<NovaPessoaComponent>;
  let pessoas: jasmine.SpyObj<PessoaMovimentacaoService>;
  let alert: jasmine.SpyObj<AlertService>;

  beforeEach(() => {
    pessoas = jasmine.createSpyObj<PessoaMovimentacaoService>('PessoaMovimentacaoService', ['criar']);
    alert = jasmine.createSpyObj<AlertService>('AlertService', ['error', 'success']);
    TestBed.configureTestingModule({
      imports: [NovaPessoaComponent, NoopAnimationsModule],
      providers: [{ provide: PessoaMovimentacaoService, useValue: pessoas }, { provide: AlertService, useValue: alert }]
    });
    fixture = TestBed.createComponent(NovaPessoaComponent);
    fixture.detectChanges();
  });

  it('cria pelo nome, limpa o campo e devolve a pessoa criada', () => {
    pessoas.criar.and.returnValue(of({ id: 9, nomePessoa: 'CARLOS', categoriaId: null, tipoMovimentacaoId: null }));
    const criadas: number[] = [];
    fixture.componentInstance.criada.subscribe(p => criadas.push(p.id));
    fixture.componentInstance.nome = '  Carlos ';

    fixture.componentInstance.adicionar();

    expect(pessoas.criar).toHaveBeenCalledWith({ nomePessoa: 'Carlos' });
    expect(criadas).toEqual([9]);
    expect(fixture.componentInstance.nome).toBe('');
  });

  it('nome vazio não chama a API; erro avisa e mantém o nome', () => {
    fixture.componentInstance.nome = '   ';
    fixture.componentInstance.adicionar();
    expect(pessoas.criar).not.toHaveBeenCalled();

    pessoas.criar.and.returnValue(throwError(() => new Error('x')));
    fixture.componentInstance.nome = 'Carlos';
    fixture.componentInstance.adicionar();
    expect(alert.error).toHaveBeenCalled();
    expect(fixture.componentInstance.nome).toBe('Carlos');
  });
});
