// Dados do protótipo, guardados no navegador (localStorage).
// Num sistema real, tudo isto fica no servidor.

import { CATEGORIAS, ADICIONAIS, PERFIS } from './data.js';

const memoria = {};

function ler(key, padrao) {
  try {
    const v = localStorage.getItem(key);
    return (v == null ? null : JSON.parse(v)) ?? padrao;
  } catch {
    return memoria[key] ?? padrao;
  }
}

function gravar(key, valor) {
  memoria[key] = valor;
  try { localStorage.setItem(key, JSON.stringify(valor)); } catch { /* fica só na memória */ }
}

const K = {
  usuarios: 'ru.usuarios',
  sessao: 'ru.sessao',
  codigo: 'ru.codigo',
  reservas: 'ru.reservas',
};

const DEZ_MIN = 10 * 60 * 1000;
const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;
const MAX_TENTATIVAS = 5;

// ---------- Login por código ----------

export function enviarCodigo(email) {
  const codigo = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  gravar(K.codigo, { email, codigo, expira: Date.now() + DEZ_MIN, tentativas: 0 });
  return codigo;
}

export function codigoPendente() {
  const c = ler(K.codigo, null);
  return c && c.expira > Date.now() ? c : null;
}

export function cancelarCodigo() {
  gravar(K.codigo, null);
}

// Retorna 'ok', 'errado', 'expirado' ou 'bloqueado'.
export function verificarCodigo(digitado) {
  const c = ler(K.codigo, null);
  if (!c || c.expira <= Date.now()) return 'expirado';
  if (c.tentativas >= MAX_TENTATIVAS) return 'bloqueado';
  if (digitado !== c.codigo) {
    gravar(K.codigo, { ...c, tentativas: c.tentativas + 1 });
    return c.tentativas + 1 >= MAX_TENTATIVAS ? 'bloqueado' : 'errado';
  }
  gravar(K.codigo, null);
  gravar(K.sessao, { email: c.email, expira: Date.now() + TRINTA_DIAS });
  return 'ok';
}

export function sessao() {
  const s = ler(K.sessao, null);
  return s && s.expira > Date.now() ? s : null;
}

export function sair() {
  gravar(K.sessao, null);
}

// ---------- Usuário ----------

export function usuarioAtual() {
  const s = sessao();
  if (!s) return null;
  return ler(K.usuarios, {})[s.email] || null;
}

export function salvarUsuario(dados) {
  const s = sessao();
  if (!s) return;
  const usuarios = ler(K.usuarios, {});
  usuarios[s.email] = { ...usuarios[s.email], ...dados, email: s.email };
  gravar(K.usuarios, usuarios);
}

export function perfilDe(usuario) {
  return PERFIS.find((p) => p.id === usuario.perfil) || PERFIS[0];
}

export function categoriaDe(usuario) {
  return CATEGORIAS[perfilDe(usuario).categoria];
}

// ---------- Reservas ----------

export function precoDe(usuario, extras) {
  return categoriaDe(usuario).preco + extras.reduce((t, e) => t + ADICIONAIS[e].preco, 0);
}

function codigoAleatorio() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function reservasDoUsuario() {
  const s = sessao();
  if (!s) return [];
  return ler(K.reservas, []).filter((r) => r.email === s.email);
}

export function reservaAtiva(data, refeicao) {
  return reservasDoUsuario().find((r) => r.data === data && r.refeicao === refeicao && r.status === 'ativa');
}

export function buscarReserva(id) {
  return reservasDoUsuario().find((r) => r.id === id) || null;
}

export function criarReserva({ data, refeicao, extras }) {
  const usuario = usuarioAtual();
  const reserva = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    codigo: codigoAleatorio(),
    email: usuario.email,
    data,
    refeicao,
    extras,
    categoria: perfilDe(usuario).categoria,
    valor: precoDe(usuario, extras),
    status: 'ativa',
    criadaEm: Date.now(),
  };
  gravar(K.reservas, [...ler(K.reservas, []), reserva]);
  return reserva;
}

export function cancelarReserva(id) {
  gravar(K.reservas, ler(K.reservas, []).map((r) =>
    r.id === id ? { ...r, status: 'cancelada', canceladaEm: Date.now() } : r));
}

export function apagarTudo() {
  Object.values(K).forEach((k) => gravar(k, null));
  try { localStorage.removeItem('ru.demoOffset'); } catch { /* sem armazenamento */ }
}
