// Todas as reservas, com filtros e exportação para planilha. RF22, RF25 e RF29.

import { REFEICOES, CATEGORIAS, FORMAS_PAGAMENTO, ADICIONAIS } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc, reais, toast } from '../ui.js';
import { ICONES, ORDEM_REFEICOES, SITUACOES, nomeDa, normalizar, pilula, textoExtras } from './comum.js';

const estado = { de: null, ate: null, refeicao: '', situacao: '', busca: '' };

const OPCOES_SITUACAO = [
  ['', 'Todas'],
  ['aguardando', 'Aguardando'],
  ['veio', 'Vieram'],
  ['falta', 'Faltas'],
  ['abonada', 'Faltas abonadas'],
  ['cancelada', 'Canceladas'],
  ['sem-reserva', 'Sem reserva'],
];

function filtradas(agora) {
  const usuarios = store.mapaUsuarios();
  const termo = normalizar(estado.busca);
  const codigo = termo.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return store.todasReservas()
    .filter((r) => r.data >= estado.de && r.data <= estado.ate)
    .filter((r) => !estado.refeicao || r.refeicao === estado.refeicao)
    .map((r) => ({ r, sit: store.situacao(r, agora), nome: nomeDa(r, usuarios), u: usuarios[r.email] }))
    .filter(({ r, sit }) => {
      if (!estado.situacao) return true;
      if (estado.situacao === 'sem-reserva') return r.semReserva;
      return !r.semReserva && sit === estado.situacao;
    })
    .filter(({ r, nome, u }) => !termo
      || normalizar(nome).includes(termo)
      || (u?.matricula && u.matricula.includes(termo))
      || (codigo.length >= 4 && r.codigo?.replace('-', '').includes(codigo)))
    .sort((a, b) => a.r.data.localeCompare(b.r.data)
      || ORDEM_REFEICOES.indexOf(a.r.refeicao) - ORDEM_REFEICOES.indexOf(b.r.refeicao)
      || normalizar(a.nome).localeCompare(normalizar(b.nome)));
}

function tabela() {
  const agora = t.now();
  const linhas = filtradas(agora);
  if (!linhas.length) return '<p class="vazio-curto">Nenhuma reserva com esses filtros.</p>';
  const total = linhas.filter(({ sit }) => sit !== 'cancelada').reduce((soma, { r }) => soma + r.valor, 0);

  return `<p class="dica">${linhas.length} ${linhas.length === 1 ? 'registro' : 'registros'} · ${reais(total)} sem as canceladas</p>
    <div class="tabela-moldura">
      <table class="tabela">
        <thead><tr><th>Data</th><th>Refeição</th><th>Nome</th><th>Perfil</th><th>Adicionais</th>
          <th class="num">Valor</th><th>Pagamento</th><th>Situação</th></tr></thead>
        <tbody>${linhas.map(({ r, sit, nome, u }) => `<tr>
          <td class="nowrap">${esc(t.dataCurta(r.data))}</td>
          <td>${REFEICOES[r.refeicao].nome}</td>
          <td>${r.email && u ? `<a href="#/pessoa/${encodeURIComponent(r.email)}">${esc(nome)}</a>` : esc(nome)}</td>
          <td>${esc(u ? store.perfilDe(u).nome : CATEGORIAS[r.categoria].nome)}</td>
          <td>${textoExtras(r.extras)}</td>
          <td class="num">${reais(r.valor)}</td>
          <td>${r.pagamento ? FORMAS_PAGAMENTO[r.pagamento.forma] : '—'}</td>
          <td>${pilula(r, sit)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function render() {
  const agora = t.now();
  if (!estado.de) {
    estado.de = t.isoDate(t.addDays(agora, -7));
    estado.ate = t.isoDate(t.addDays(agora, 7));
  }
  const opcao = (valor, texto, atual) => `<option value="${valor}" ${valor === atual ? 'selected' : ''}>${texto}</option>`;

  return `<header class="eq-topo">
      <h1>Reservas</h1>
      <div class="eq-controles">
        <button type="button" class="botao secundario" data-acao="rs-exportar">${ICONES.baixar} Exportar planilha</button>
      </div>
    </header>
    <form class="filtros" data-form="rs-nada" autocomplete="off">
      <label class="campo">De<input type="date" name="de" value="${estado.de}" data-mudanca="rs-filtro" required></label>
      <label class="campo">Até<input type="date" name="ate" value="${estado.ate}" data-mudanca="rs-filtro" required></label>
      <label class="campo">Refeição
        <select name="refeicao" data-mudanca="rs-filtro">
          ${opcao('', 'Todas', estado.refeicao)}
          ${ORDEM_REFEICOES.map((id) => opcao(id, REFEICOES[id].nome, estado.refeicao)).join('')}
        </select>
      </label>
      <label class="campo">Situação
        <select name="situacao" data-mudanca="rs-filtro">
          ${OPCOES_SITUACAO.map(([v, n]) => opcao(v, n, estado.situacao)).join('')}
        </select>
      </label>
      <label class="campo campo-busca">Busca
        <input type="search" name="busca" value="${esc(estado.busca)}" data-entrada="rs-filtro" placeholder="Nome, matrícula ou código">
      </label>
    </form>
    <div id="rs-tabela">${tabela()}</div>`;
}

// ---------- Planilha (CSV) ----------

function csv(valores) {
  return valores.map((v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';');
}

const decimal = (centavos) => (centavos / 100).toFixed(2).replace('.', ',');

function exportar() {
  const linhas = filtradas(t.now());
  if (!linhas.length) {
    toast('Nada para exportar com esses filtros.');
    return;
  }
  const cabecalho = ['Data', 'Refeição', 'Nome', 'E-mail', 'Perfil', 'Matrícula', 'Categoria',
    ...Object.values(ADICIONAIS).map((a) => a.nome), 'Valor', 'Situação', 'Pagamento', 'Entrada', 'Código'];
  const corpo = linhas.map(({ r, sit, nome, u }) => csv([
    r.data,
    REFEICOES[r.refeicao].nome,
    nome,
    r.email || '',
    u ? store.perfilDe(u).nome : '',
    u?.matricula || '',
    CATEGORIAS[r.categoria].nome,
    ...Object.keys(ADICIONAIS).map((id) => (r.extras.includes(id) ? 'Sim' : 'Não')),
    decimal(r.valor),
    r.semReserva ? 'Sem reserva' : SITUACOES[sit],
    r.pagamento ? FORMAS_PAGAMENTO[r.pagamento.forma] : '',
    r.checkinEm ? new Date(r.checkinEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    r.codigo || '',
  ]));
  // O BOM faz o Excel abrir os acentos corretamente.
  const blob = new Blob([`﻿${[csv(cabecalho), ...corpo].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reservas_${estado.de}_${estado.ate}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default {
  render,
  acoes: { 'rs-exportar': exportar },
  mudancas: {
    'rs-filtro': (el) => {
      if (el.type === 'date' && !el.value) return;
      estado[el.name] = el.value;
      if (estado.de > estado.ate) {
        if (el.name === 'de') estado.ate = estado.de; else estado.de = estado.ate;
        el.form.elements[el.name === 'de' ? 'ate' : 'de'].value = el.name === 'de' ? estado.ate : estado.de;
      }
      document.getElementById('rs-tabela').innerHTML = tabela();
    },
  },
  entradas: {
    'rs-filtro': (el) => {
      estado[el.name] = el.value;
      document.getElementById('rs-tabela').innerHTML = tabela();
    },
  },
  formularios: { 'rs-nada': () => {} },
};
