export type LinhaContaMensal = {
  id: number;
  idAccount: number;

  name: string;
  value: string | number;        // pode vir number do backend; no input usamos string formatada
  date: Date;                 // ideal: YYYY-MM-DD

  categoryId: number;
  categoryName: string;
  subCategory?: string;          // "Receita" | "Despesa"

  status: string;
  statusSalvo: string;
  desbloqueiaCampos: boolean;
};

export type AgrupamentoContaMensal = {
  categoryId: number;
  categoryName: string;
  subCategory?: string;
  accounts: Array<{
    id: number;
    transactions: Array<{
      id: number;
      name: string;
      value: any;
      date: Date;   // YYYY-MM-DD
      status: string;
    }>;
  }>;
};

export type GrupoContaMensal = {
    id: number;
    name: string;
    value: number;
    idAccount: number;
    categoryId: number;
    date: string;   // ISO string vindo da API
    status: string;
    transactions: Array<{
      id: number;
      name: string;
      value: number;
      date: string;   // ISO string vindo da API
      status: string;
      idAccount?: number | null;
      categoryId?: number | null;
    }>;
    account: {
      id: number;
      name: string;
      value: number;
      categoryId: number;
    }
};

export type ContaMensal = {
  date: Date;
  name: string;
  value: number;
  idAccount: number;
  status: string;
}
