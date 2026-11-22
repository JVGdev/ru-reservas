// Utilidades de tela usadas pela área de quem reserva e pela área da equipe.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const reais = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visivel'), 2800);
}
