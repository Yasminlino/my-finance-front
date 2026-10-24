import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ExtratoBancarioDetalhesComponent } from './extrato-bancario-detalhes.component';
import { ExtratoBancarioModule } from '../extrato-bancario.module';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';

describe('ExtratoBancarioDetalhesComponent', () => {
  let component: ExtratoBancarioDetalhesComponent;
  let fixture: ComponentFixture<ExtratoBancarioDetalhesComponent>;

  beforeEach(() => {
    // Montado no próprio módulo (declara os componentes filhos), com HTTP de teste: o
    // "should create" do gerador falhava sem providers (FE-P3-04).
    TestBed.configureTestingModule({
      imports: [ExtratoBancarioModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService]
    });
    fixture = TestBed.createComponent(ExtratoBancarioDetalhesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onDelete', () => {
    // Sem pessoa, a pergunta saía "Excluir o lançamento 'null'?" (card wdaprJSy).
    let confirmar: jasmine.Spy;

    beforeEach(() => {
      confirmar = spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').and.resolveTo(false);
    });

    const item = (campos: Partial<ExtratoItemDto>) =>
      ({ id: 1, dataMovimentacao: '2026-10-01', valor: 12.34, tipoLancamento: 'Saída', ...campos }) as ExtratoItemDto;

    it('sem pessoa nem descrição, identifica pelo valor e pela data', async () => {
      await component.onDelete(item({ nomePessoaTransacao: null, descricao: null }));
      expect(confirmar.calls.mostRecent().args[0].replace(/\s/g, ' ')).toBe('Excluir o lançamento de R$ 12,34 em 01/10/2026?');
    });

    it('sem pessoa, usa a descrição', async () => {
      await component.onDelete(item({ nomePessoaTransacao: null, descricao: 'Teste' }));
      expect(confirmar.calls.mostRecent().args[0].replace(/\s/g, ' ')).toBe("Excluir o lançamento 'Teste' de R$ 12,34 em 01/10/2026?");
    });

    it('com pessoa, usa a pessoa', async () => {
      await component.onDelete(item({ nomePessoaTransacao: 'POSTO', descricao: 'Teste' }));
      expect(confirmar.calls.mostRecent().args[0].replace(/\s/g, ' ')).toBe("Excluir o lançamento 'POSTO' de R$ 12,34 em 01/10/2026?");
    });
  });
});
