import { ListaDto } from 'src/app/core/models/lista.model';
import {
  CAMPOS_DO_MODELO, chipsDosCampos, contarPorFiltro, corDaLista, filtrarPlanejamentos, iconeDaLista, nomeDoMesSeguinte,
  ordenarPlanejamentos, percentualFeito, rotaDaLista, tipoDeResumo
} from './listas.regras';

function lista(ajuste: Partial<ListaDto> = {}): ListaDto {
  return {
    id: 1, nome: 'Mercado', usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'BRANCO', ...ajuste
  };
}

describe('listas.regras (card #63)', () => {
  describe('chipsDosCampos', () => {
    it('mostra os campos ligados na ordem do formulário', () => {
      expect(chipsDosCampos(lista({ ...CAMPOS_DO_MODELO.ORCAMENTO, limite: 100 }))).toEqual(['Valor', 'Limite', 'Obs.']);
      expect(chipsDosCampos(lista({ usaQuantidade: true, usaValor: true, usaData: true }))).toEqual(['Qtd', 'Valor', 'Data']);
    });

    it('sem campo extra, "Só itens"', () => {
      expect(chipsDosCampos(lista())).toEqual(['Só itens']);
    });
  });

  describe('corDaLista', () => {
    it('a cor escolhida vence', () => {
      expect(corDaLista(lista({ cor: 'rosa', usaValor: true }))).toBe('rosa');
    });

    it('sem cor (ou com cor fora da paleta): verde com Valor, roxo com Data, azul nos demais', () => {
      expect(corDaLista(lista({ usaValor: true, usaData: true }))).toBe('verde');
      expect(corDaLista(lista({ usaData: true }))).toBe('roxo');
      expect(corDaLista(lista())).toBe('azul');
      expect(corDaLista(lista({ cor: '#fff' }))).toBe('azul');
    });
  });

  describe('iconeDaLista', () => {
    it('o ícone escolhido vence; sem ícone, o do modelo', () => {
      expect(iconeDaLista(lista({ icone: 'pi pi-heart', modelo: 'COMPRAS' }))).toBe('pi pi-heart');
      expect(iconeDaLista(lista({ modelo: 'COMPRAS' }))).toBe('pi pi-shopping-cart');
      expect(iconeDaLista(lista({ modelo: 'ORCAMENTO' }))).toBe('pi pi-wallet');
      expect(iconeDaLista(lista({ modelo: 'TAREFAS' }))).toBe('pi pi-check-square');
      expect(iconeDaLista(lista({ modelo: 'AGENDA' }))).toBe('pi pi-calendar');
      expect(iconeDaLista(lista({ modelo: 'BRANCO' }))).toBe('pi pi-clipboard');
    });
  });

  describe('tipoDeResumo', () => {
    it('Valor primeiro, depois Data, depois progresso', () => {
      expect(tipoDeResumo(lista({ usaValor: true, usaData: true }))).toBe('valor');
      expect(tipoDeResumo(lista({ usaData: true }))).toBe('data');
      expect(tipoDeResumo(lista({ usaQuantidade: true }))).toBe('progresso');
    });
  });

  describe('percentualFeito', () => {
    it('arredonda e dá 0 sem itens', () => {
      expect(percentualFeito(1, 3)).toBe(33);
      expect(percentualFeito(2, 3)).toBe(67);
      expect(percentualFeito(0, 0)).toBe(0);
    });
  });

  describe('nomeDoMesSeguinte', () => {
    const hoje = new Date(2026, 9, 29); // 29/10/2026

    it('troca o "· mmm/aaaa" do fim pelo mês seguinte', () => {
      expect(nomeDoMesSeguinte('Lista de compras · out/2026', hoje)).toBe('Lista de compras · nov/2026');
      expect(nomeDoMesSeguinte('Compras · dez/2026', hoje)).toBe('Compras · jan/2027');
      expect(nomeDoMesSeguinte('Compras ·  MAR/2027 ', hoje)).toBe('Compras · abr/2027');
    });

    it('sem o sufixo, acrescenta o mês seguinte ao de hoje', () => {
      expect(nomeDoMesSeguinte('Lista de compras', hoje)).toBe('Lista de compras · nov/2026');
      expect(nomeDoMesSeguinte('Mercado', new Date(2026, 11, 3))).toBe('Mercado · jan/2027');
    });

    it('não passa de 120 caracteres', () => {
      const nome = nomeDoMesSeguinte('x'.repeat(130), hoje);
      expect(nome.length).toBe(120);
      expect(nome.endsWith(' · nov/2026')).toBeTrue();
    });
  });

  describe('filtro, busca e ordem', () => {
    const listas = [
      lista({ id: 1, nome: 'Gastos do mês', usaValor: true }),
      lista({ id: 2, nome: 'Agenda semanal', usaData: true }),
      lista({ id: 3, nome: 'Lista de compras', usaValor: true, usaData: true }),
      lista({ id: 4, nome: 'Mudança' })
    ];

    it('conta por filtro (uma lista com Valor e Data entra nos dois)', () => {
      expect(contarPorFiltro(listas)).toEqual({ TODOS: 4, VALOR: 2, DATA: 2 });
    });

    it('filtra por campo e busca sem acento nem maiúscula', () => {
      expect(filtrarPlanejamentos(listas, 'VALOR', '').map(l => l.id)).toEqual([1, 3]);
      expect(filtrarPlanejamentos(listas, 'DATA', '').map(l => l.id)).toEqual([2, 3]);
      expect(filtrarPlanejamentos(listas, 'TODOS', 'MUDANCA').map(l => l.id)).toEqual([4]);
      expect(filtrarPlanejamentos(listas, 'VALOR', ' mês ').map(l => l.id)).toEqual([1]);
    });

    it('mais recentes = id maior primeiro; nome = A–Z sem diferenciar acento', () => {
      expect(ordenarPlanejamentos(listas, 'RECENTES').map(l => l.id)).toEqual([4, 3, 2, 1]);
      expect(ordenarPlanejamentos(listas, 'NOME').map(l => l.id)).toEqual([2, 1, 3, 4]);
    });

    it('não mexe no array recebido', () => {
      const copia = [...listas];
      ordenarPlanejamentos(listas, 'RECENTES');
      expect(listas).toEqual(copia);
    });
  });

  it('rotaDaLista abre a tela interna única, quaisquer que sejam os campos (card #66)', () => {
    expect(rotaDaLista(lista({ id: 5, usaValor: true }))).toEqual(['/planejamento', '5']);
    expect(rotaDaLista(lista({ id: 5, usaData: true }))).toEqual(['/planejamento', '5']);
  });
});
