import { interpretarTexto } from './agenda-texto';

/** Adicionar rápido (card #69, parte 2). Hoje = terça, 3/11/2026; o padrão (dia mostrado) é hoje, salvo dito. */
describe('interpretarTexto (card #69)', () => {
  const hoje = new Date(2026, 10, 3, 10, 0);
  const ler = (texto: string, padrao?: string) => interpretarTexto(texto, hoje, padrao);

  it('só a descrição: cai no dia padrão, dia todo, não repete', () => {
    expect(ler('Comprar presente')).toEqual({
      descricao: 'Comprar presente', data: '2026-11-03', hora: null, repeticao: 'NENHUMA', diasSemana: [], temDia: false
    });
    expect(ler('comprar presente', '2026-11-12').data).toBe('2026-11-12');
    expect(ler('comprar presente').descricao).toBe('Comprar presente');
  });

  it('hora em vários jeitos', () => {
    expect(ler('Dentista 14h30').hora).toBe('14:30');
    expect(ler('Dentista 14h').hora).toBe('14:00');
    expect(ler('Dentista 9:05').hora).toBe('09:05');
    expect(ler('Dentista às 9').hora).toBe('09:00');
    expect(ler('Dentista as 9 horas').hora).toBe('09:00');
    expect(ler('Dentista às 9').descricao).toBe('Dentista');
    expect(ler('Comprar 2 pães').hora).toBeNull();
  });

  it('dia da semana = o próximo (hoje conta); "ter" sozinho é o verbo', () => {
    expect(ler('Dentista sex 14h30')).toEqual(jasmine.objectContaining({ descricao: 'Dentista', data: '2026-11-06', hora: '14:30', temDia: true }));
    expect(ler('Reunião na sexta-feira').data).toBe('2026-11-06');
    expect(ler('Feira segunda').data).toBe('2026-11-09');
    expect(ler('Pilates terça').data).toBe('2026-11-03');
    expect(ler('Ter aula de inglês')).toEqual(jasmine.objectContaining({ descricao: 'Ter aula de inglês', data: '2026-11-03', temDia: false }));
  });

  it('hoje, amanhã, depois de amanhã, dia N e datas com barra', () => {
    expect(ler('Ligar pro banco amanhã às 15h')).toEqual(jasmine.objectContaining({ descricao: 'Ligar pro banco', data: '2026-11-04', hora: '15:00' }));
    expect(ler('Faxina depois de amanhã').data).toBe('2026-11-05');
    expect(ler('Faxina hoje', '2026-11-20').data).toBe('2026-11-03');
    expect(ler('Pagar luz dia 10')).toEqual(jasmine.objectContaining({ descricao: 'Pagar luz', data: '2026-11-10' }));
    expect(ler('Pagar luz dia 2').data).toBe('2026-12-02');
    expect(ler('Aniversário da Ana 15/11').data).toBe('2026-11-15');
    expect(ler('Aniversário da Ana 15/11').descricao).toBe('Aniversário da Ana');
    expect(ler('Natal 25/12/2027').data).toBe('2027-12-25');
    expect(ler('Carnaval 10/2').data).toBe('2027-02-10');
    expect(ler('Prova 31/02').data).toBe('2026-11-03');
  });

  it('repetição: todo dia, toda semana, dias da semana, todo mês e todo dia N', () => {
    expect(ler('Academia todo dia às 6h')).toEqual(jasmine.objectContaining({ descricao: 'Academia', repeticao: 'DIARIA', hora: '06:00' }));
    expect(ler('Remédio todos os dias 8h').repeticao).toBe('DIARIA');
    expect(ler('Feira toda quinta 8h')).toEqual(jasmine.objectContaining({
      descricao: 'Feira', repeticao: 'SEMANAL', diasSemana: [4], data: '2026-11-05', hora: '08:00', temDia: true
    }));
    expect(ler('Academia toda seg, qua e sex 7h')).toEqual(jasmine.objectContaining({
      descricao: 'Academia', repeticao: 'SEMANAL', diasSemana: [1, 3, 5], data: '2026-11-04'
    }));
    expect(ler('Futebol todas as quintas').diasSemana).toEqual([4]);
    expect(ler('Faxina toda semana', '2026-11-07')).toEqual(jasmine.objectContaining({ repeticao: 'SEMANAL', diasSemana: [6], data: '2026-11-07' }));
    expect(ler('Aluguel todo dia 5')).toEqual(jasmine.objectContaining({ descricao: 'Aluguel', repeticao: 'MENSAL', data: '2026-11-05' }));
    expect(ler('Aluguel todo dia 2').data).toBe('2026-12-02');
    expect(ler('Internet todo mês', '2026-11-20')).toEqual(jasmine.objectContaining({ repeticao: 'MENSAL', data: '2026-11-20' }));
  });

  it('acento e maiúsculas não atrapalham; texto vazio fica vazio', () => {
    expect(ler('DENTISTA SÁBADO 10H').data).toBe('2026-11-07');
    expect(ler('DENTISTA SÁBADO 10H').hora).toBe('10:00');
    expect(ler('Consulta às 14h30 no dia 20')).toEqual(jasmine.objectContaining({ descricao: 'Consulta', data: '2026-11-20', hora: '14:30' }));
    expect(ler('   ').descricao).toBe('');
  });
});
