import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { coachMessage, greeting, victoryMessage, OUROBOROS_TEXT } from "../src/content.js";
import { quotes } from "../src/quotes.js";
import { renderRich, toggleCheckLine } from "../src/richtext.js";
import { ouroborosSvg } from "../src/ouroboros.js";
import { escapeHtml, hashString, pickBy, plural, truncate } from "../src/util.js";

test("frases: ids únicos, textos preenchidos e autores reais", () => {
  const ids = new Set(quotes.map((quote) => quote.id));
  assert.equal(ids.size, quotes.length);
  assert.ok(quotes.length >= 100);
  for (const quote of quotes) {
    assert.ok(quote.text.trim().length > 8, quote.id);
    assert.ok(quote.author.trim().length > 2, quote.id);
    assert.ok(["atribuída", "adaptada", undefined].includes(quote.note), `${quote.id}: nota inválida`);
  }
  const authors = new Set(quotes.map((quote) => quote.author));
  for (const expected of ["David Goggins", "Alexandre, o Grande", "Carl Jung"]) assert.ok(authors.has(expected), expected);
  assert.ok(quotes.some((quote) => quote.author.startsWith("Bíblia")));
});

test("Ouroboros usa exatamente as mensagens combinadas", () => {
  assert.equal(OUROBOROS_TEXT.line1, "Se renda à mudança ou sofra em um ciclo.");
  assert.equal(OUROBOROS_TEXT.line2, "Quebre o ciclo ou ele te quebrará.");
});

test("saudação segue a hora do dia", () => {
  assert.equal(greeting(8), "Bom dia");
  assert.equal(greeting(15, "Magno"), "Boa tarde, Magno");
  assert.equal(greeting(22), "Boa noite");
  assert.match(greeting(3), /Madrugada/);
});

test("provocações: estáveis, coerentes com o progresso e sem texto quebrado", () => {
  const empty = coachMessage({ hour: 9, total: 0, done: 0, dayKey: "2026-10-14" });
  assert.equal(empty.bucket, "empty");

  const pushing = coachMessage({ hour: 15, total: 4, done: 1, dayKey: "2026-10-14" });
  assert.equal(pushing.tone, "push");
  assert.deepEqual(pushing, coachMessage({ hour: 15, total: 4, done: 1, dayKey: "2026-10-14" }));

  const won = coachMessage({ hour: 20, total: 3, done: 3, streak: 5, dayKey: "2026-10-14" });
  assert.equal(won.tone, "win");

  for (const hour of [6, 13, 19, 22]) {
    for (const [total, done] of [[0, 0], [1, 0], [3, 1], [3, 3]]) {
      const message = coachMessage({ hour, total, done, streak: 1, dayKey: "2026-10-14" });
      assert.ok(message.text.length > 10);
      assert.doesNotMatch(message.text, /undefined|NaN|\{|\}/);
    }
  }
});

test("mensagem de vitória: marcos especiais e variação diária", () => {
  assert.equal(victoryMessage({ dayKey: "2026-10-14", streak: 7 }).milestone, true);
  const common = victoryMessage({ dayKey: "2026-10-14", streak: 4 });
  assert.equal(common.milestone, false);
  assert.ok(common.title && common.body);
});

test("utilitários", () => {
  assert.equal(escapeHtml(`<b onclick="x">'&\``), "&lt;b onclick=&quot;x&quot;&gt;&#039;&amp;&#096;");
  assert.equal(hashString("a"), hashString("a"));
  assert.equal(pickBy([], "x"), undefined);
  assert.equal(plural(1, "tarefa", "tarefas"), "1 tarefa");
  assert.equal(plural(2, "tarefa", "tarefas"), "2 tarefas");
  assert.equal(truncate("abcdef", 4), "abc…");
});

test("notas: formatação leve e proteção contra HTML", () => {
  const html = renderRich("# Título\n- um\n- **dois**\n\n[ ] fazer\n[x] feito\ntexto", "n1");
  assert.match(html, /<h4>Título<\/h4>/);
  assert.match(html, /<ul><li>um<\/li><li><strong>dois<\/strong><\/li><\/ul>/);
  assert.match(html, /data-line="4"/);
  assert.match(html, /rt-task done/);

  const evil = renderRich('<img src=x onerror="alert(1)"> **<script>x</script>**', "n1");
  assert.doesNotMatch(evil, /<img|<script/);
  assert.match(evil, /&lt;img/);
});

test("notas: alternar tarefa marca e desmarca só a linha pedida", () => {
  const text = "[ ] a\n[ ] b\n- [x] c";
  assert.equal(toggleCheckLine(text, 1), "[ ] a\n[x] b\n- [x] c");
  assert.equal(toggleCheckLine(text, 2), "[ ] a\n[ ] b\n- [ ] c");
  assert.equal(toggleCheckLine("texto", 0), "texto");
  assert.equal(toggleCheckLine(text, 99), text);
});

test("Ouroboros: SVG gerado é válido, acessível e sem estilos embutidos", () => {
  const svg = ouroborosSvg();
  assert.match(svg, /<svg[^>]+role="img"/);
  assert.match(svg, /aria-label="Ouroboros/);
  assert.doesNotMatch(svg, /style=|<script|onload=/);
  assert.doesNotMatch(svg, /NaN|undefined/);
  assert.equal(svg, ouroborosSvg());
});

// Proteção contra regressão: o app inteiro deve estar acentuado em português.
test("textos da interface estão acentuados", () => {
  const files = ["index.html", "src/main.js", "src/content.js", "src/quotes.js", "src/domain.js", "manifest.webmanifest"];
  const forbidden = [
    /\bHabitos\b/, /\bCalendario\b/, /\bmusculacao\b/i, /\bObservacoes\b/, /\bhidratacao\b/i, /\bSeries\b/,
    /\bExercicio\b/, /\bConteudo\b/, /\bTitulo\b/, /\bAmanha\b/, /\bagua\b/i, /(?<![-\w])acucar\b/i, /\bnao\b/i,
    /\bvoce\b/i, /\bfe\b(?!\w)/, /\btambem\b/i, /\bja\b(?=\s)/, /\bsequencia\b/i, /\bmudanca\b/i, /\bPlanejamento de amanha\b/,
    /\bnumero\b/i, /\bultima\b/i, /\bExcluir tarefa\b.*\bnao\b/
  ];

  for (const file of files) {
    const content = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(content, pattern, `${file} contém texto sem acento: ${pattern}`);
    }
  }
});
