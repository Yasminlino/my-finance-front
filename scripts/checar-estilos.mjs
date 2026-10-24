// Card #27: nenhuma tela define cor fixa. As cores vêm de src/styles/_tokens.scss (var(--mf-*)) ou do
// tema Lara. Falha (saída 1) listando arquivo:linha se algum SCSS de tela tiver cor hexadecimal.
//
// Uso: npm run checar:estilos

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const PASTAS = [join(RAIZ, 'src', 'app', 'views'), join(RAIZ, 'src', 'app', 'shared')];
// O apexcharts recebe as cores como texto; os gráficos ficam fora desta regra (spec do card #27).
const IGNORADOS = ['relatorio-gastos-mensais'];
const COR_HEX = /#[0-9a-fA-F]{3,8}\b/;

function* arquivosScss(pasta) {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) yield* arquivosScss(caminho);
    else if (nome.endsWith('.scss')) yield caminho;
  }
}

const achados = [];
for (const pasta of PASTAS) {
  for (const arquivo of arquivosScss(pasta)) {
    if (IGNORADOS.some(trecho => arquivo.split(sep).some(parte => parte.includes(trecho)))) continue;
    readFileSync(arquivo, 'utf8').split(/\r?\n/).forEach((linha, i) => {
      if (COR_HEX.test(linha)) achados.push(`${relative(RAIZ, arquivo)}:${i + 1}: ${linha.trim()}`);
    });
  }
}

if (achados.length) {
  console.error(`Cor fixa fora de src/styles/_tokens.scss (${achados.length}):`);
  for (const achado of achados) console.error(`  ${achado}`);
  console.error('Use var(--mf-*) ou uma variável do tema.');
  process.exit(1);
}
console.log('checar:estilos: nenhuma cor fixa nos SCSS de tela.');
