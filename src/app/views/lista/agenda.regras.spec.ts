import { OcorrenciaDto } from 'src/app/core/models/lista.model';
import {
  agruparPorDia, atrasada, diaRelativo, diasDaSemana, inicioDaSemana, isoDe, periodoPtBr, resumoCurto, resumoDaRegra, rotuloDoDia,
  diasDoMes, doMes, proximasPendentes, tituloDoDia, tituloDoMes
} from './agenda.regras';

function ocorrencia(ajuste: Partial<OcorrenciaDto>): OcorrenciaDto {
  return { itemId: 1, dataOriginal: '2026-10-28', data: '2026-10-28', feito: false, repete: false, descricao: 'X', ...ajuste };
}

describe('agenda.regras (card #69)', () => {
  it('isoDe usa o dia local, sem fuso', () => {
    expect(isoDe(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
  });

  describe('semana', () => {
    it('começa na segunda (domingo é o fim da semana anterior)', () => {
      expect(isoDe(inicioDaSemana(new Date(2026, 9, 29)))).toBe('2026-10-26'); // quinta
      expect(isoDe(inicioDaSemana(new Date(2026, 10, 1)))).toBe('2026-10-26'); // domingo
      expect(isoDe(inicioDaSemana(new Date(2026, 9, 26)))).toBe('2026-10-26'); // segunda
    });

    it('diasDaSemana dá os 7 dias, atravessando o mês', () => {
      expect(diasDaSemana(new Date(2026, 9, 26))).toEqual(
        ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    });

    it('rotuloDoDia: dia da semana curto e o dia do mês', () => {
      expect(rotuloDoDia('2026-10-26')).toEqual({ semana: 'seg', dia: '26' });
      expect(rotuloDoDia('2026-11-01')).toEqual({ semana: 'dom', dia: '1' });
    });
  });

  describe('periodoPtBr', () => {
    it('mesmo mês, meses diferentes e anos diferentes', () => {
      expect(periodoPtBr('2026-11-02', '2026-11-08')).toBe('2 – 8 nov 2026');
      expect(periodoPtBr('2026-10-26', '2026-11-01')).toBe('26 out – 1 nov 2026');
      expect(periodoPtBr('2026-12-28', '2027-01-03')).toBe('28 dez 2026 – 3 jan 2027');
    });
  });

  describe('agruparPorDia', () => {
    it('cada dia com os seus; dia todo primeiro, depois por hora', () => {
      const grupos = agruparPorDia([
        ocorrencia({ itemId: 1, data: '2026-10-27', hora: '18:00:00', descricao: 'Academia' }),
        ocorrencia({ itemId: 2, data: '2026-10-27', hora: null, descricao: 'Aniversário' }),
        ocorrencia({ itemId: 3, data: '2026-10-27', hora: '07:30:00', descricao: 'Café' }),
        ocorrencia({ itemId: 4, data: '2026-10-29', descricao: 'Feira' }),
        ocorrencia({ itemId: 5, data: '2026-11-09', descricao: 'Fora da semana' })
      ], diasDaSemana(new Date(2026, 9, 26)));

      expect(Object.keys(grupos)).toEqual(diasDaSemana(new Date(2026, 9, 26)));
      expect(grupos['2026-10-27'].map(o => o.descricao)).toEqual(['Aniversário', 'Café', 'Academia']);
      expect(grupos['2026-10-29'].length).toBe(1);
      expect(grupos['2026-10-26']).toEqual([]);
    });
  });

  describe('atrasada', () => {
    const agora = new Date(2026, 9, 29, 14, 0);

    it('pendente de dia passado, ou de hoje com hora que já passou', () => {
      expect(atrasada(ocorrencia({ data: '2026-10-28' }), agora)).toBeTrue();
      expect(atrasada(ocorrencia({ data: '2026-10-29', hora: '13:30:00' }), agora)).toBeTrue();
      expect(atrasada(ocorrencia({ data: '2026-10-29', hora: '14:30:00' }), agora)).toBeFalse();
      expect(atrasada(ocorrencia({ data: '2026-10-29', hora: null }), agora)).toBeFalse();
      expect(atrasada(ocorrencia({ data: '2026-10-30' }), agora)).toBeFalse();
    });

    it('feita nunca está atrasada', () => {
      expect(atrasada(ocorrencia({ data: '2026-10-28', feito: true }), agora)).toBeFalse();
    });
  });

  describe('resumoDaRegra', () => {
    it('não repete: vazio', () => {
      expect(resumoDaRegra({ repeticao: 'NENHUMA', data: '2026-10-28' })).toBe('');
    });

    it('todo dia, toda semana (dias em ordem) e todo mês, com hora e fim', () => {
      expect(resumoDaRegra({ repeticao: 'DIARIA', data: '2026-10-28' })).toBe('Todo dia');
      expect(resumoDaRegra({ repeticao: 'SEMANAL', diasSemana: [5, 1, 3], hora: '07:00:00', data: '2026-10-28' }))
        .toBe('Seg, qua e sex às 07:00');
      expect(resumoDaRegra({ repeticao: 'SEMANAL', diasSemana: [4], data: '2026-10-28', repetirAte: '2026-11-30' }))
        .toBe('Qui, até 30/11/2026');
      expect(resumoDaRegra({ repeticao: 'MENSAL', data: '2026-10-10', hora: '09:15' })).toBe('Todo dia 10 às 09:15');
    });
  });

  describe('resumoCurto', () => {
    it('cada regra em poucas palavras, embaixo do item', () => {
      expect(resumoCurto({ repeticao: 'NENHUMA' })).toBe('não repete');
      expect(resumoCurto({})).toBe('não repete');
      expect(resumoCurto({ repeticao: 'DIARIA' })).toBe('todo dia');
      expect(resumoCurto({ repeticao: 'SEMANAL', diasSemana: [5, 1, 3] })).toBe('seg, qua e sex');
      expect(resumoCurto({ repeticao: 'SEMANAL', diasSemana: [4] })).toBe('toda quinta');
      expect(resumoCurto({ repeticao: 'SEMANAL', diasSemana: [6] })).toBe('todo sábado');
      expect(resumoCurto({ repeticao: 'SEMANAL', diasSemana: [1, 2, 3, 4, 5, 6, 7] })).toBe('todo dia');
      expect(resumoCurto({ repeticao: 'MENSAL', data: '2026-11-05' })).toBe('todo dia 5');
    });
  });

  describe('diaRelativo e tituloDoDia', () => {
    const hoje = '2026-11-03';

    it('hoje, amanhã e ontem; os outros dias sem rótulo', () => {
      expect(diaRelativo('2026-11-03', hoje)).toBe('Hoje');
      expect(diaRelativo('2026-11-04', hoje)).toBe('Amanhã');
      expect(diaRelativo('2026-11-02', hoje)).toBe('Ontem');
      expect(diaRelativo('2026-11-05', hoje)).toBeNull();
    });

    it('título da visão Dia, com o ano só quando é outro', () => {
      expect(tituloDoDia('2026-11-03', hoje)).toBe('Hoje · ter, 3 nov');
      expect(tituloDoDia('2026-11-11', hoje)).toBe('qua, 11 nov');
      expect(tituloDoDia('2027-01-01', hoje)).toBe('sex, 1 jan 2027');
      expect(tituloDoDia('2026-12-31', '2027-01-01')).toBe('Ontem · qui, 31 dez 2026');
    });
  });

  describe('mês (parte 2)', () => {
    it('grade da segunda da 1ª semana ao domingo da última', () => {
      const nov = diasDoMes(new Date(2026, 10, 18));
      expect(nov[0]).toBe('2026-10-26');
      expect(nov[nov.length - 1]).toBe('2026-12-06');
      expect(nov.length).toBe(42);
      expect(diasDoMes(new Date(2027, 1, 1)).length).toBe(28);
      expect(diasDoMes(new Date(2026, 1, 10)).length).toBe(35);
      expect(doMes('2026-10-31', new Date(2026, 10, 1))).toBeFalse();
      expect(doMes('2026-11-30', new Date(2026, 10, 1))).toBeTrue();
      expect(tituloDoMes(new Date(2026, 2, 1))).toBe('março de 2026');
    });

    it('próximas pendentes a partir de agora, em ordem, só as primeiras', () => {
      const agora = new Date(2026, 10, 3, 12, 0);
      const lista = [
        ocorrencia({ itemId: 1, data: '2026-11-05', hora: '08:00:00' }),
        ocorrencia({ itemId: 2, data: '2026-11-03', hora: '09:00:00' }),
        ocorrencia({ itemId: 3, data: '2026-11-03', hora: '18:00:00' }),
        ocorrencia({ itemId: 4, data: '2026-11-03', hora: null }),
        ocorrencia({ itemId: 5, data: '2026-11-04', hora: '07:00:00', feito: true }),
        ocorrencia({ itemId: 6, data: '2026-11-04', hora: '10:00:00' })
      ];
      expect(proximasPendentes(lista, agora).map(o => o.itemId)).toEqual([4, 3, 6]);
      expect(proximasPendentes(lista, agora, 10).map(o => o.itemId)).toEqual([4, 3, 6, 1]);
    });
  });
});
