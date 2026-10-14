import { Subject } from 'rxjs';
import { ultimaBusca } from './ultima-busca';

/** FE-P2-08: na troca rápida de mês, a resposta atrasada de um mês anterior não pode sobrescrever a tela. */
describe('ultimaBusca', () => {
  it('descarta a resposta de um período que já foi trocado', () => {
    const periodos = new Subject<string>();
    const respostas: Record<string, Subject<string>> = { set: new Subject(), out: new Subject() };
    const exibido: string[] = [];

    ultimaBusca(periodos, p => respostas[p], () => {}).subscribe(r => exibido.push(r));

    periodos.next('set');
    periodos.next('out');          // troca antes de setembro responder
    respostas['out'].next('dados de outubro');
    respostas['set'].next('dados de setembro'); // chega atrasada

    expect(exibido).toEqual(['dados de outubro']);
  });

  it('um erro avisa e não encerra: o próximo período ainda carrega', () => {
    const periodos = new Subject<string>();
    const falhas: unknown[] = [];
    const exibido: string[] = [];
    const respostas: Record<string, Subject<string>> = { set: new Subject(), out: new Subject() };

    ultimaBusca(periodos, p => respostas[p], e => falhas.push(e)).subscribe(r => exibido.push(r));

    periodos.next('set');
    respostas['set'].error('API fora');
    periodos.next('out');
    respostas['out'].next('dados de outubro');

    expect(falhas).toEqual(['API fora']);
    expect(exibido).toEqual(['dados de outubro']);
  });
});
