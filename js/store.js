// Dados do protótipo, guardados no navegador (localStorage).
// Num sistema real, tudo isto fica no servidor.

import { CATEGORIAS, ADICIONAIS, PERFIS, REFEICOES, PENALIDADE, carregarAjustes } from './data.js';
import { ler, gravar, apagarDados } from './armazem.js';
import { at } from './time.js';

const K = {
  usuarios: 'ru.usuarios',
  sessao: 'ru.sessao',
  codigo: 'ru.codigo',
  reservas: 'ru.reservas',
  equipe: 'ru.equipe',
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

// Reservas criadas antes desta versão do protótipo não tinham check-in; elas nunca contam como falta.
export const VERSAO = 2;

// Falta sem considerar abono: null, 'nao-veio' (terminou a refeição sem check-in)
// ou 'apos-corte' (cancelou depois do corte).
function faltaBruta(r, agora) {
  if (r.v !== VERSAO || r.semReserva) return null;
  if (r.status === 'cancelada') return r.falta === 'apos-corte' ? 'apos-corte' : null;
  if (r.status === 'ativa' && agora >= at(r.data, REFEICOES[r.refeicao].fim)) return 'nao-veio';
  return null;
}

// A falta que conta: falta abonada pela equipe não conta.
export function faltaDe(r, agora) {
  return r.abonada ? null : faltaBruta(r, agora);
}

function momentoDaFalta(r, tipo) {
  return tipo === 'apos-corte' ? r.canceladaEm : at(r.data, REFEICOES[r.refeicao].fim).getTime();
}

// Reservas (e registros sem reserva) que pagaram sem desconto por causa da penalidade.
// Se a pessoa cancela dentro do prazo, a penalidade volta para a próxima reserva.
function penalizadas(email) {
  return ler(K.reservas, []).filter((r) => r.email === email && r.penalizada
    && !(r.status === 'cancelada' && r.falta !== 'apos-corte')).length;
}

// Faltas da pessoa e quantas das próximas reservas ficam sem desconto.
// Regra "1 para 1": a partir da falta número `PENALIDADE.faltas`, cada falta tira o desconto
// de estudante da reserva seguinte, e só dela. A contagem não zera (A CONFIRMAR em data.js).
export function situacaoFaltas(usuario, agora) {
  const ms = agora.getTime();
  const faltas = ler(K.reservas, [])
    .filter((r) => r.email === usuario.email)
    .map((r) => ({ reserva: r, tipo: faltaDe(r, agora) }))
    .filter((f) => f.tipo)
    .map((f) => ({ ...f, em: momentoDaFalta(f.reserva, f.tipo) }))
    .filter((f) => f.em <= ms)
    .sort((a, b) => b.em - a.em);

  const geradas = Math.max(0, faltas.length - (PENALIDADE.faltas - 1));
  return {
    faltas,
    total: faltas.length,
    limite: PENALIDADE.faltas,
    pendentes: Math.max(0, geradas - penalizadas(usuario.email)),
    // A regra só tira o desconto de quem tem desconto.
    aplica: perfilDe(usuario).categoria === 'estudante',
  };
}

// Categorias de preço das próximas n reservas, em ordem: as primeiras pagam como "demais"
// enquanto houver penalidade pendente.
export function categoriasDasProximas(usuario, n, agora) {
  const s = situacaoFaltas(usuario, agora);
  const base = perfilDe(usuario).categoria;
  const sem = s.aplica ? s.pendentes : 0;
  return Array.from({ length: n }, (_, i) => (i < sem ? 'demais' : base));
}

// Categoria de preço da próxima reserva.
export function categoriaAplicada(usuario, agora) {
  return categoriasDasProximas(usuario, 1, agora)[0];
}

// ---------- Reservas ----------

const somaExtras = (extras) => extras.reduce((t, e) => t + ADICIONAIS[e].preco, 0);

export function precoDe(usuario, extras, agora) {
  return CATEGORIAS[categoriaAplicada(usuario, agora)].preco + somaExtras(extras);
}

export function novoCodigo() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

// Só as reservas feitas pela pessoa (sem os registros de "sem reserva" do balcão).
export function reservasDoUsuario() {
  const s = sessao();
  if (!s) return [];
  return ler(K.reservas, []).filter((r) => r.email === s.email && !r.semReserva);
}

export function buscarReserva(id) {
  return reservasDoUsuario().find((r) => r.id === id) || null;
}

// Reserva ativa ou já usada naquela refeição (a que aparece como "Reservado").
export function reservaVigente(data, refeicao) {
  return reservasDoUsuario().find((r) => r.data === data && r.refeicao === refeicao
    && (r.status === 'ativa' || r.status === 'utilizada'));
}

const ordemRefeicoes = Object.keys(REFEICOES);
const porData = (a, b) => a.data.localeCompare(b.data)
  || ordemRefeicoes.indexOf(a.refeicao) - ordemRefeicoes.indexOf(b.refeicao);

// Cria várias reservas de uma vez (RF07). Todas guardam o mesmo `pedido`, o que permite
// um pagamento só para o grupo quando houver PIX. O preço fica fixado na hora da reserva;
// a penalidade pendente cai nas refeições mais próximas.
export function criarReservas(itens, agora) {
  const usuario = usuarioAtual();
  const ordenados = [...itens].sort(porData);
  const categorias = categoriasDasProximas(usuario, ordenados.length, agora);
  const base = perfilDe(usuario).categoria;
  const pedido = novoId();
  const novas = ordenados.map(({ data, refeicao, extras }, i) => ({
    id: novoId(),
    v: VERSAO,
    pedido,
    codigo: novoCodigo(),
    email: usuario.email,
    data,
    refeicao,
    extras,
    categoria: categorias[i],
    valor: CATEGORIAS[categorias[i]].preco + somaExtras(extras),
    ...(categorias[i] !== base ? { penalizada: true } : {}),
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

function alterarReserva(id, fn) {
  let alterada = null;
  gravar(K.reservas, ler(K.reservas, []).map((r) => (r.id === id ? (alterada = fn(r)) : r)));
  return alterada;
}

// Check-in no balcão (o caixa lê o QR Code ou busca o nome). Com `forma`, registra o
// pagamento junto, se a reserva ainda não estava paga. Sem `forma`, só a entrada.
export function registrarCheckin(id, agora, forma) {
  const em = agora.getTime();
  return alterarReserva(id, (r) => ({
    ...r,
    status: 'utilizada',
    checkinEm: em,
    ...(r.pagamento || !forma ? {} : { pagamento: { forma, valor: r.valor, em } }),
  }));
}

export function apagarTudo() {
  apagarDados();
  carregarAjustes();
}

// ---------- Equipe ----------

export function sessaoEquipe() {
  return ler(K.equipe, null);
}

export function entrarEquipe(papel) {
  gravar(K.equipe, { papel });
}

export function sairEquipe() {
  gravar(K.equipe, null);
}

export const todasReservas = () => ler(K.reservas, []);
export const mapaUsuarios = () => ler(K.usuarios, {});
export const usuarioPorEmail = (email) => ler(K.usuarios, {})[email] || null;

// Situação para a equipe: 'aguardando', 'veio', 'falta', 'abonada' (falta perdoada) ou 'cancelada'.
export function situacao(r, agora) {
  if (faltaBruta(r, agora)) return r.abonada ? 'abonada' : 'falta';
  if (r.status === 'cancelada') return 'cancelada';
  if (r.status === 'utilizada') return 'veio';
  return 'aguardando';
}

// Aceita "RU:ABCD-EFGH" (o conteúdo do QR Code), "ABCD-EFGH" ou "abcdefgh".
export function buscarCodigo(texto) {
  const limpo = String(texto).toUpperCase().replace(/^\s*RU:/, '').replace(/[^A-Z0-9]/g, '');
  if (limpo.length !== 8) return null;
  return todasReservas().find((r) => r.codigo && r.codigo.replace('-', '') === limpo) || null;
}

// Desfaz o check-in e o pagamento feito junto com ele. Um registro sem reserva é apagado.
export function desfazerCheckin(id) {
  const r = todasReservas().find((x) => x.id === id);
  if (!r) return;
  if (r.semReserva) {
    gravar(K.reservas, todasReservas().filter((x) => x.id !== id));
    return;
  }
  alterarReserva(id, ({ checkinEm, pagamento, ...resto }) => ({
    ...resto,
    status: 'ativa',
    ...(pagamento && pagamento.em !== checkinEm ? { pagamento } : {}),
  }));
}

// Quem comeu sem reserva (RN09). Com `email`, liga o registro a uma pessoa cadastrada:
// o preço segue o perfil dela, e uma penalidade pendente é aplicada aqui também.
export function registrarSemReserva({ data, refeicao, email, nome, categoria, extras, forma }, agora) {
  const em = agora.getTime();
  const usuario = email ? usuarioPorEmail(email) : null;
  const cat = usuario ? categoriaAplicada(usuario, agora) : categoria;
  const valor = CATEGORIAS[cat].preco + somaExtras(extras);
  const registro = {
    id: novoId(),
    v: VERSAO,
    codigo: null,
    email: usuario ? email : null,
    nome: usuario ? '' : nome || '',
    data,
    refeicao,
    extras,
    categoria: cat,
    valor,
    ...(usuario && cat !== perfilDe(usuario).categoria ? { penalizada: true } : {}),
    status: 'utilizada',
    semReserva: true,
    criadaEm: em,
    checkinEm: em,
    pagamento: { forma, valor, em },
  };
  gravar(K.reservas, [...todasReservas(), registro]);
  return registro;
}

export function abonarFalta(id, abonada) {
  return alterarReserva(id, (r) => ({ ...r, abonada }));
}

// Troca os dados de exemplo anteriores pelos novos e mantém os demais.
export function importarExemplo({ usuarios, reservas }) {
  removerExemplo();
  const atuais = ler(K.usuarios, {});
  usuarios.forEach((u) => { atuais[u.email] = u; });
  gravar(K.usuarios, atuais);
  gravar(K.reservas, [...todasReservas(), ...reservas]);
}

export function removerExemplo() {
  gravar(K.usuarios, Object.fromEntries(Object.entries(ler(K.usuarios, {})).filter(([, u]) => !u.exemplo)));
  gravar(K.reservas, todasReservas().filter((r) => !r.exemplo));
}
