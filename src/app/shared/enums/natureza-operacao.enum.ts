export enum NaturezaOperacao {
    RendimentoEntrada = 0,
    Essencial = 1,
    EstilodeVidaLazer = 2,
    ReservaInvestimento = 3,
    Pessoal = 4,
    Empresa = 5
}

export const NaturezaOperacaoLabel: Record<number, string> = {
  [NaturezaOperacao.RendimentoEntrada]: 'Rendimento / Entrada',
  [NaturezaOperacao.Essencial]: 'Essencial',
  [NaturezaOperacao.EstilodeVidaLazer]: 'Estilo de Vida / Lazer',
  [NaturezaOperacao.ReservaInvestimento]: 'Reserva / Investimentos',
  [NaturezaOperacao.Pessoal]: 'Pessoal',
  [NaturezaOperacao.Empresa]: 'Empresa'
};