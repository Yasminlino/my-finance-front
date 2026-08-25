import { FormControl, FormGroup } from "@angular/forms";

export type ColumnFilters = {
  name: string[];         // ✅ agora é array
  categoryName: string[]; // ✅ agora é array
  subCategory: string;    // continua texto
  value: string;          // continua texto
  date: string;           // continua texto yyyy-mm-dd
  status: string[];       // ✅ agora é array
  tipoConta: string[];       // ✅ agora é array
};

export type RowForm = FormGroup<{
  value: FormControl<string>;
  date: FormControl<string>;
  status: FormControl<string>;
  parcela: FormControl<string>;
  observacao: FormControl<string>;
}>;
