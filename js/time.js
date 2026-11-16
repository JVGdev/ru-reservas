// Relógio do app. Para a demonstração dá para simular outro horário (tela Perfil);
// o relógio continua andando a partir do horário escolhido.

const KEY = 'ru.demoOffset';

function offset() {
  try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; }
}

export function now() {
  return new Date(Date.now() + offset());
}

export function simulando() {
  return offset() !== 0;
}

export function simularHorario(data) {
  try { localStorage.setItem(KEY, String(data.getTime() - Date.now())); } catch { /* sem armazenamento */ }
}

export function usarHorarioReal() {
  try { localStorage.removeItem(KEY); } catch { /* sem armazenamento */ }
}

const pad = (n) => String(n).padStart(2, '0');

export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeek(d) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - r.getDay());
  return r;
}

// Data ISO + "HH:MM" -> Date no horário local.
export function at(iso, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = parseISO(iso);
  d.setHours(h, m, 0, 0);
  return d;
}

export function hora(hhmm) {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

const fmtLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtCurto = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const fmtMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const dataLonga = (iso) => capitalizar(fmtLongo.format(parseISO(iso)));
export const dataCurta = (iso) => capitalizar(fmtCurto.format(parseISO(iso)).replace('.', ''));
export const mesAno = (iso) => capitalizar(fmtMes.format(parseISO(iso)));

// "hoje", "amanhã" ou null.
export function relativo(iso, ref) {
  const hoje = isoDate(ref);
  if (iso === hoje) return 'hoje';
  if (iso === isoDate(addDays(ref, 1))) return 'amanhã';
  return null;
}

const fmtSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

// "Qua", "Qui"...
export const diaSemana = (iso) => capitalizar(fmtSemana.format(parseISO(iso)).replace('.', ''));

// "hoje", "amanhã" ou "qui 19/11".
export function quando(iso, ref) {
  return relativo(iso, ref) || `${diaSemana(iso).toLowerCase()} ${iso.slice(8)}/${iso.slice(5, 7)}`;
}

export function paraInputLocal(d) {
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
