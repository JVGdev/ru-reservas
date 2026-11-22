// Leitura e gravação no navegador (localStorage).
// Se o navegador bloquear o armazenamento, os dados ficam só na memória da página.

const memoria = {};

export function ler(key, padrao) {
  try {
    const v = localStorage.getItem(key);
    return (v == null ? null : JSON.parse(v)) ?? padrao;
  } catch {
    return memoria[key] ?? padrao;
  }
}

export function gravar(key, valor) {
  memoria[key] = valor;
  try { localStorage.setItem(key, JSON.stringify(valor)); } catch { /* fica só na memória */ }
}

// Apaga todas as chaves do protótipo (as que começam com "ru.").
export function apagarDados() {
  Object.keys(memoria).forEach((k) => delete memoria[k]);
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('ru.')).forEach((k) => localStorage.removeItem(k));
  } catch { /* sem armazenamento */ }
}
