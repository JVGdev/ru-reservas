// Pessoas cadastradas, faltas e desconto suspenso. RF25, RF20 e RF31.

import { REFEICOES, CATEGORIAS, PENALIDADE, FORMAS_PAGAMENTO } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc, reais, toast } from '../ui.js';
import { ICONES, atualizar, metrica, normalizar, pilula, textoExtras, ORDEM_REFEICOES } from './comum.js';

const estado = { busca: '', suspensos: false };

function regra() {
  return `A partir da ${PENALIDADE.faltas}ª falta, cada falta tira o desconto de estudante da reserva seguinte.`;
}

function pilulaDesconto(s) {
  if (!s.aplica || !s.pendentes) return '';
  return `<span class="pilula suspenso">${s.pendentes === 1 ? 'Próxima sem desconto' : `Próximas ${s.pendentes} sem desconto`}</span>`;
}

// ---------- Lista ----------

function linhas() {
  const agora = t.now();
  const termo = normalizar(estado.busca);
  const todas = store.todasReservas();
  const pessoas = Object.values(store.mapaUsuarios())
    .filter((u) => !termo || normalizar(u.nome).includes(termo) || normalizar(u.email).includes(termo)
      || (u.matricula && u.matricula.includes(termo)))
    .map((u) => ({
      u,
      reservas: todas.filter((r) => r.email === u.email && !r.semReserva).length,
      faltas: store.situacaoFaltas(u, agora),
    }))
    .filter((p) => !estado.suspensos || (p.faltas.aplica && p.faltas.pendentes))
    .sort((a, b) => normalizar(a.u.nome).localeCompare(normalizar(b.u.nome)));

  if (!pessoas.length) return '<p class="vazio-curto">Ninguém encontrado.</p>';
  return `<p class="dica">${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'} · ${regra()}</p>
    <div class="tabela-moldura">
      <table class="tabela">
        <thead><tr><th>Nome</th><th>Perfil</th><th>Matrícula</th><th class="num">Reservas</th>
          <th class="num">Faltas</th><th>Desconto</th></tr></thead>
        <tbody>${pessoas.map(({ u, reservas, faltas }) => `<tr>
          <td><a href="#/pessoa/${encodeURIComponent(u.email)}">${esc(u.nome)}</a></td>
          <td>${esc(store.perfilDe(u).nome)}</td>
          <td>${esc(u.matricula || '—')}</td>
          <td class="num">${reservas}</td>
          <td class="num">${faltas.total || '—'}</td>
          <td>${pilulaDesconto(faltas)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function render() {
  return `<header class="eq-topo"><h1>Pessoas</h1></header>
    <form class="filtros" data-form="ps-nada" autocomplete="off">
      <label class="campo campo-busca">Busca
        <input type="search" name="busca" value="${esc(estado.busca)}" data-entrada="ps-busca" placeholder="Nome, e-mail ou matrícula">
      </label>
      <label class="caixa-marcar"><input type="checkbox" data-mudanca="ps-suspensos" ${estado.suspensos ? 'checked' : ''}>
        Só com penalidade pendente</label>
    </form>
    <div id="ps-lista">${linhas()}</div>`;
}

// ---------- Uma pessoa ----------

function renderPessoa(email) {
  const u = store.usuarioPorEmail(email);
  const voltar = `<a class="voltar" href="#/pessoas" aria-label="Voltar">${ICONES.anterior}</a>`;
  if (!u) return `<header class="eq-topo"><div class="eq-titulo">${voltar}<h1>Pessoa não encontrada</h1></div></header>`;

  const agora = t.now();
  const perfil = store.perfilDe(u);
  const faltas = store.situacaoFaltas(u, agora);
  const categoria = CATEGORIAS[store.categoriaAplicada(u, agora)];
  const semDesconto = faltas.aplica && faltas.pendentes;
  const historico = store.todasReservas()
    .filter((r) => r.email === u.email)
    .map((r) => ({ r, sit: store.situacao(r, agora) }))
    .sort((a, b) => b.r.data.localeCompare(a.r.data)
      || ORDEM_REFEICOES.indexOf(b.r.refeicao) - ORDEM_REFEICOES.indexOf(a.r.refeicao));
  const conta = (sit) => historico.filter((h) => !h.r.semReserva && h.sit === sit).length;

  const acao = ({ r, sit }) => {
    if (sit === 'falta') return `<button type="button" class="link" data-acao="ps-abonar" data-id="${r.id}">Abonar</button>`;
    if (sit === 'abonada') return `<button type="button" class="link" data-acao="ps-desabonar" data-id="${r.id}">Desfazer abono</button>`;
    return '';
  };

  return `<header class="eq-topo">
      <div class="eq-titulo">${voltar}
        <div><h1>${esc(u.nome)}</h1><p class="eq-sub">${esc(perfil.nome)}</p></div>
      </div>
      ${semDesconto ? pilulaDesconto(faltas).replace('pilula suspenso', 'pilula suspenso grande') : ''}
    </header>
    <div class="ps-grade">
      <section class="cartao">
        <dl class="detalhes">
          <div><dt>E-mail</dt><dd>${esc(u.email)}</dd></div>
          ${u.matricula ? `<div><dt>Matrícula</dt><dd>${esc(u.matricula)}</dd></div>` : ''}
          <div><dt>Próxima reserva</dt><dd><strong>${reais(categoria.preco)}</strong> · ${semDesconto ? 'sem desconto (falta)' : categoria.nome}</dd></div>
          <div><dt>Faltas</dt><dd>${faltas.total}</dd></div>
        </dl>
        ${perfil.categoria === 'estudante' ? `<p class="dica">${regra()} Abonar uma falta tira ela da conta.</p>` : ''}
      </section>
      <div class="metricas">
        ${metrica('Reservas', historico.filter((h) => !h.r.semReserva).length)}
        ${metrica('Vieram', conta('veio'))}
        ${metrica('Faltas', conta('falta'), conta('abonada') ? `${conta('abonada')} abonadas` : '')}
        ${metrica('Canceladas', conta('cancelada'))}
      </div>
    </div>
    <h2 class="eq-secao">Histórico</h2>
    ${historico.length ? `<div class="tabela-moldura">
      <table class="tabela">
        <thead><tr><th>Data</th><th>Refeição</th><th>Adicionais</th><th class="num">Valor</th>
          <th>Pagamento</th><th>Situação</th><th></th></tr></thead>
        <tbody>${historico.map((h) => `<tr>
          <td class="nowrap">${esc(t.dataCurta(h.r.data))}</td>
          <td>${REFEICOES[h.r.refeicao].nome}</td>
          <td>${textoExtras(h.r.extras)}</td>
          <td class="num">${reais(h.r.valor)} <span class="dica">${h.r.penalizada ? 'Sem desconto (falta)' : CATEGORIAS[h.r.categoria].nome}</span></td>
          <td>${h.r.pagamento ? FORMAS_PAGAMENTO[h.r.pagamento.forma] : '—'}</td>
          <td>${pilula(h.r, h.sit)}</td>
          <td>${acao(h)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : '<p class="vazio-curto">Nenhuma reserva ainda.</p>'}`;
}

export const pessoa = {
  render: renderPessoa,
  acoes: {
    'ps-abonar': (el) => { store.abonarFalta(el.dataset.id, true); toast('Falta abonada'); atualizar(); },
    'ps-desabonar': (el) => { store.abonarFalta(el.dataset.id, false); toast('Abono desfeito'); atualizar(); },
  },
};

export default {
  render,
  mudancas: {
    'ps-suspensos': (el) => { estado.suspensos = el.checked; document.getElementById('ps-lista').innerHTML = linhas(); },
  },
  entradas: {
    'ps-busca': (el) => { estado.busca = el.value; document.getElementById('ps-lista').innerHTML = linhas(); },
  },
  formularios: { 'ps-nada': () => {} },
};
