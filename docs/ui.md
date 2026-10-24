# Base de UI do MyFinance

Padrão visual das telas (card #27, Fase 2 do roadmap). A referência é a tela **Contas a Pagar**: as peças
compartilhadas saíram dela. Para conferir tudo junto, abra `/#/ui` com `ng serve` (a página não existe no
build de produção).

## Kit e versões

- **Um kit de UI:** PrimeNG 17.18 + PrimeFlex 3, tema Lara (azul). Use só nomes da v17: `p-sidebar`,
  `p-dropdown`, `p-calendar`, `p-inputSwitch`, `ng-invalid ng-dirty`. **Não** use `p-drawer`, `p-select`,
  `p-datepicker`, `p-toggleSwitch` nem o atributo `invalid` (são da v18).
- **Um sistema de ícones:** PrimeIcons (`pi pi-*`).

## Cores

- Nenhuma tela define cor fixa. Use `var(--mf-*)` (`src/styles/_tokens.scss`) ou as variáveis do tema
  (`--surface-*`, `--text-color*`, `--green-600`…). `npm run checar:estilos` falha se aparecer hexadecimal
  num SCSS de tela.
- Semânticas: `--mf-receita`, `--mf-despesa`, `--mf-alerta`, `--mf-info`, `--mf-neutro`, `--mf-edicao`.
- Tags com fundo claro: envolva com `.mf-tags-claras` (os mesmos pares do data-grid).
- Natureza da categoria (0 Rendimento/Entrada, 1 Essencial, 2 Estilo de vida/Lazer, 3 Reserva/Investimento,
  4 Pessoal, 5 Empresa): `.mf-natureza-N` ou o componente `mf-category-icon`. A cor é a mesma em todas as telas.

## Tipografia

`.mf-page-title`, `.mf-page-subtitle`, `.mf-section-title`, `.mf-label`, `.mf-hint`, `.mf-valor`
(`.mf-valor--receita`, `.mf-valor--despesa`). Nada de `font-size`/`color` próprios para títulos na tela.

## Estrutura de página

1. `mf-page-header` (título, subtítulo, breadcrumb, voltar e ações à direita)
2. Cards de resumo: `mf-stat-card` em `grid` → `col-12 sm:col-6 xl:col-3`
3. Filtros: `mf-filter-bar`
4. Conteúdo: tabela no desktop, lista de cards no celular (abaixo de 768px); `mf-empty-state` quando vazio
5. Celular: ação principal no `mf-fab`

O conteúdo fica dentro de `.mf-pagina`.

## Botões

| Uso | `p-button` |
|---|---|
| Ação principal (Nova conta, Salvar) | padrão (primary), com `icon` e `label` |
| Secundária (Exportar, Cancelar) | `severity="secondary" [outlined]="true"` |
| Destrutiva (Excluir) | `severity="danger" [outlined]="true"`, com confirmação (`ConfirmacaoService`) |
| Sucesso (Marcar como pago) | `severity="success"` |
| Ação na linha da tabela | `[rounded]="true" [text]="true"`, só ícone, com `pTooltip` |
| Menu extra | `icon="pi pi-ellipsis-v"` abrindo `p-menu [popup]="true"` |

- `size="small"` só em tabela e toolbar.
- Rodapés: **Cancelar · Salvar** (a principal sempre à direita).

## Formulários e modais

- Cadastro/edição: `mf-form-panel` (painel à direita, ~500px; `tamanho="lg"` ≈ 720px; tela cheia no celular),
  com rodapé fixo Cancelar · Salvar.
- Campos: label acima (`.mf-label`), asterisco nos obrigatórios, erro com `mf-field-error [control]`.
- Moeda com `p-inputNumber mode="currency" currency="BRL" locale="pt-BR"` (ou a diretiva `currencyInput`);
  datas com `p-calendar dateFormat="dd/mm/yy" appendTo="body"`.
- `p-dialog` só para conteúdo que não é formulário de cadastro, com `.mf-dialog-sm` (32rem),
  `.mf-dialog-md` (50rem) ou `.mf-dialog-lg` (até 1100px); 95% da largura no celular.
- Confirmações: sempre `ConfirmacaoService` (um `p-confirmDialog`). Avisos: o toast global (`AlertService`).
