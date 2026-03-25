export enum NaturezaOperacao {
    RendimentoEntrada = 0,
    Essencial = 1,
    EstilodeVidaLazer = 2,
    ReservaInvestimento = 3 
}

export const NaturezaOperacaoLabel: Record<number, string> = {
  [NaturezaOperacao.RendimentoEntrada]: 'Rendimento / Entrada',
  [NaturezaOperacao.Essencial]: 'Essencial',
  [NaturezaOperacao.EstilodeVidaLazer]: 'Estilo de Vida / Lazer',
  [NaturezaOperacao.ReservaInvestimento]: 'Reserva / Investimentos'
};