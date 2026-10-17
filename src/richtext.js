// Formatação leve para as notas, no estilo "Notion simplificado".
//   # Título      ## Subtítulo      - item de lista
//   [ ] tarefa    [x] tarefa feita  **negrito**   `código`
//
// O texto é escapado ANTES de qualquer formatação, então nada digitado vira HTML.

import { escapeHtml } from "./util.js";

const CHECK_RE = /^(?:[-*]\s+)?\[( |x|X)\]\s?(.*)$/;
const BULLET_RE = /^[-*]\s+(.*)$/;

function inline(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/&#096;(.+?)&#096;/g, "<code>$1</code>");
}

export function renderRich(content, noteId = "") {
  const lines = String(content ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const check = trimmed.match(CHECK_RE);
    const bullet = trimmed.match(BULLET_RE);

    if (!trimmed) {
      closeList();
    } else if (check) {
      closeList();
      const done = check[1].toLowerCase() === "x";
      out.push(
        `<div class="rt-task${done ? " done" : ""}">` +
          `<button type="button" class="rt-check${done ? " on" : ""}" role="checkbox" aria-checked="${done}" ` +
          `aria-label="Marcar item" data-action="toggle-note-check" data-id="${escapeHtml(noteId)}" data-line="${index}"></button>` +
          `<span>${inline(escapeHtml(check[2]))}</span></div>`
      );
    } else if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(escapeHtml(bullet[1]))}</li>`);
    } else if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      closeList();
      out.push(`<h5>${inline(escapeHtml(trimmed.replace(/^#{2,3}\s+/, "")))}</h5>`);
    } else if (trimmed.startsWith("# ")) {
      closeList();
      out.push(`<h4>${inline(escapeHtml(trimmed.slice(2)))}</h4>`);
    } else {
      closeList();
      out.push(`<p>${inline(escapeHtml(trimmed))}</p>`);
    }
  });

  closeList();
  return out.join("");
}

// Alterna "[ ]" e "[x]" na linha indicada e devolve o texto novo (ou o mesmo, se a linha não for tarefa).
export function toggleCheckLine(content, lineIndex) {
  const lines = String(content ?? "").replace(/\r\n?/g, "\n").split("\n");
  const line = lines[lineIndex];
  if (line === undefined || !CHECK_RE.test(line.trim())) return lines.join("\n");
  lines[lineIndex] = /\[( )\]/.test(line) ? line.replace("[ ]", "[x]") : line.replace(/\[[xX]\]/, "[ ]");
  return lines.join("\n");
}
