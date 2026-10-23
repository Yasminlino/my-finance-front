import { TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { ConfirmacaoService } from './confirmacao.service';

describe('ConfirmacaoService', () => {
  let service: ConfirmacaoService;
  let pedido: Confirmation | null;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ConfirmationService] });
    service = TestBed.inject(ConfirmacaoService);
    pedido = null;
    TestBed.inject(ConfirmationService).requireConfirmation$.subscribe(c => (pedido = c));
  });

  it('abre o diálogo com a mensagem e resolve true ao aceitar', async () => {
    const resposta = service.confirmar('Excluir o banco "Nubank"?');

    expect(pedido?.message).toBe('Excluir o banco "Nubank"?');
    expect(pedido?.acceptLabel).toBe('Excluir');
    pedido!.accept!();

    expect(await resposta).toBeTrue();
  });

  it('resolve false ao cancelar ou fechar', async () => {
    const resposta = service.confirmar('Excluir?');

    pedido!.reject!();

    expect(await resposta).toBeFalse();
  });

  it('aceita título e rótulo próprios', () => {
    service.confirmar('Desfazer todas as alterações?', { titulo: 'Desfazer', aceitar: 'Desfazer' });

    expect(pedido?.header).toBe('Desfazer');
    expect(pedido?.acceptLabel).toBe('Desfazer');
  });
});
