// Utilitários puros, sem acesso a DOM, para poderem ser testados no Node.

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#096;");
}

// FNV-1a: hash determinístico e sem sinal. Serve para escolher frases e mensagens
// de forma estável ao longo do dia, sem sorteio a cada renderização.
export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickBy(list, seed) {
  if (!list.length) return undefined;
  return list[hashString(String(seed)) % list.length];
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function truncate(text, max) {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
