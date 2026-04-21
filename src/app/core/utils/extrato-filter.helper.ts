// extrato-filter.helper.ts
export function filtrarExtratos(
  extratoEntrada: any[],
  extratoSaida: any[],
  tipo: 'entrada' | 'saida' | 'ambos',
  banco ?: string,
  categoria ?: string
) {
    let itens: any[] = [];

    if (tipo === 'entrada') itens = extratoEntrada;
    if (tipo === 'saida') itens = extratoSaida;
    if (tipo === 'ambos') itens = [...extratoEntrada, ...extratoSaida];

    if (banco)
    {
        itens = itens.filter(i => i.banco?.nomeBanco === banco);
    }

    if (categoria)
    {
        itens = itens.filter(i => i.categoria?.name === categoria);
    }

    return itens;
}