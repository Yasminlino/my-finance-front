/** Card #73: tipos de aviso do sino. */
export type TipoAviso = 'contas-a-vencer' | 'vencidas' | 'fatura' | 'agenda' | 'acertos';

/** Um aviso calculado pela API (GET /notificacoes); não é gravado. */
export type AvisoDto = {
  /** Estável enquanto o aviso valer ("vencer:123:2026-11-12"). */
  id: string;
  tipo: TipoAviso;
  /** ISO UTC: quando o aviso passou a valer. */
  desde: string;
  novo: boolean;
  titulo: string;
  detalhe?: string | null;
  valor?: number | null;
  /** yyyy-mm-dd: vencimento, fechamento, dia da agenda. */
  data?: string | null;
  transacaoId?: number | null;
  bancoId?: number | null;
  listaId?: number | null;
  pessoaId?: number | null;
};

export type NotificacoesDto = {
  avisos: AvisoDto[];
  novos: number;
  lidasAte?: string | null;
  /** yyyy-mm-dd: "Pausar tudo" vale até esse dia; o sino fica sem avisos. */
  pausadoAte?: string | null;
};

export type AvisoComAntecedenciaDto = { ativo: boolean; diasAntes: number };

/** Preferências de notificação (GET/PUT /preferencias/notificacoes). */
export type PreferenciasNotificacaoDto = {
  contasAVencer: AvisoComAntecedenciaDto;
  vencidas: { ativo: boolean; soUltimos90Dias: boolean };
  fatura: AvisoComAntecedenciaDto;
  agenda: AvisoComAntecedenciaDto;
  acertos: { ativo: boolean; diasEmAberto: number };
  /** yyyy-mm-dd; null = não pausado. */
  pausadoAte?: string | null;
};
