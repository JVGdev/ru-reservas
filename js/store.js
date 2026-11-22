// Dados do protótipo, guardados no navegador (localStorage).
// Num sistema real, tudo isto fica no servidor.

import { CATEGORIAS, ADICIONAIS, PERFIS, REFEICOES, PENALIDADE } from './data.js';
import { at } from './time.js';

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

// ---------- Faltas e penalidade (RN05) ----------

const DIA = 24 * 60 * 60 * 1000;

// Reservas criadas antes desta versão do protótipo não tinham check-in; elas nunca contam como falta.
const VERSAO = 2;

// null, 'nao-veio' (terminou a refeição sem check-in) ou 'apos-corte' (cancelou depois do corte).
export function faltaDe(r, agora) {
  if (r.v !== VERSAO) return null;
  if (r.status === 'cancelada') return r.falta === 'apos-corte' ? 'apos-corte' : null;
  if (r.status === 'ativa' && agora >= at(r.data, REFEICOES[r.refeicao].fim)) return 'nao-veio';
  return null;
}

function momentoDaFalta(r, tipo) {
  return tipo === 'apos-corte' ? r.canceladaEm : at(r.data, REFEICOES[r.refeicao].fim).getTime();
}

// Faltas do usuário e situação do desconto no instante `agora`.
// A cada falta, contam as anteriores dentro da janela e depois do último bloqueio;
// ao chegar no limite, o desconto fica bloqueado e a contagem recomeça.
export function situacaoFaltas(usuario, agora) {
  const ms = agora.getTime();
  const faltas = reservasDoUsuario()
    .map((r) => ({ reserva: r, tipo: faltaDe(r, agora) }))
    .filter((f) => f.tipo)
    .map((f) => ({ ...f, em: momentoDaFalta(f.reserva, f.tipo) }))
    .filter((f) => f.em <= ms)
    .sort((a, b) => a.em - b.em);

  const janela = PENALIDADE.janelaDias * DIA;
  let zeradoEm = -Infinity;
  let bloqueio = null;
  for (const f of faltas) {
    const contando = faltas.filter((g) => g.em <= f.em && g.em > Math.max(zeradoEm, f.em - janela));
    if (contando.length >= PENALIDADE.faltas) {
      bloqueio = { desde: f.em, ate: f.em + PENALIDADE.diasBloqueio * DIA };
      zeradoEm = f.em;
    }
  }

  return {
    faltas: faltas.slice().reverse(),
    contando: faltas.filter((f) => f.em > Math.max(zeradoEm, ms - janela)).length,
    limite: PENALIDADE.faltas,
    bloqueadoAte: bloqueio && ms < bloqueio.ate ? bloqueio.ate : null,
    // A regra só tira o desconto de quem tem desconto.
    aplica: perfilDe(usuario).categoria === 'estudante',
  };
}

// Categoria de preço que vale agora: a do perfil, ou "demais" durante o bloqueio.
export function categoriaAplicada(usuario, agora) {
  const s = situacaoFaltas(usuario, agora);
  return s.aplica && s.bloqueadoAte ? 'demais' : perfilDe(usuario).categoria;
}

// ---------- Reservas ----------

export function precoDe(usuario, extras, agora) {
  return CATEGORIAS[categoriaAplicada(usuario, agora)].preco + extras.reduce((t, e) => t + ADICIONAIS[e].preco, 0);
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

// Reserva ativa ou já usada naquela refeição (a que aparece como "Reservado").
export function reservaVigente(data, refeicao) {
  return reservasDoUsuario().find((r) => r.data === data && r.refeicao === refeicao
    && (r.status === 'ativa' || r.status === 'utilizada'));
}

const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

// Cria várias reservas de uma vez (RF07). Todas guardam o mesmo `pedido`, o que permite
// um pagamento só para o grupo quando houver PIX. O preço fica fixado na hora da reserva.
export function criarReservas(itens, agora) {
  const usuario = usuarioAtual();
  const categoria = categoriaAplicada(usuario, agora);
  const pedido = novoId();
  const novas = itens.map(({ data, refeicao, extras }) => ({
    id: novoId(),
    v: VERSAO,
    pedido,
    codigo: codigoAleatorio(),
    email: usuario.email,
    data,
    refeicao,
    extras,
    categoria,
    valor: precoDe(usuario, extras, agora),
    status: 'ativa',
    criadaEm: agora.getTime(),
  }));
  gravar(K.reservas, [...ler(K.reservas, []), ...novas]);
  return novas;
}

export function criarReserva(item, agora) {
  return criarReservas([item], agora)[0];
}

// Depois do corte, cancelar conta como falta (RF10, RN05).
export function cancelarReserva(id, agora) {
  gravar(K.reservas, ler(K.reservas, []).map((r) => {
    if (r.id !== id) return r;
    const aposCorte = agora >= at(r.data, REFEICOES[r.refeicao].corte);
    return { ...r, status: 'cancelada', canceladaEm: agora.getTime(), ...(aposCorte ? { falta: 'apos-corte' } : {}) };
  }));
}

// No sistema real quem faz isto é o caixa, lendo o QR Code. No protótipo serve para testar as faltas.
export function registrarCheckin(id, agora) {
  gravar(K.reservas, ler(K.reservas, []).map((r) =>
    r.id === id ? { ...r, status: 'utilizada', checkinEm: agora.getTime() } : r));
}

export function apagarTudo() {
  Object.values(K).forEach((k) => gravar(k, null));
  try { localStorage.removeItem('ru.demoOffset'); } catch { /* sem armazenamento */ }
}
