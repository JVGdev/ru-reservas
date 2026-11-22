// Entradas de dinheiro do dia, por forma de pagamento. RF26.

import { REFEICOES, FORMAS_PAGAMENTO } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc, reais } from '../ui.js';
import { atualizar, metrica, nomeDa, hhmm, campoData, ORDEM_REFEICOES } from './comum.js';

const estado = { data: null };

function render(param) {
  const agora = t.now();
  const hoje = t.isoDate(agora);
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) estado.data = param;
  if (!estado.data) estado.data = hoje;

  const usuarios = store.mapaUsuarios();
  const entradas = store.todasReservas()
    .filter((r) => r.pagamento && t.isoDate(new Date(r.pagamento.em)) === estado.data)
    .sort((a, b) => b.pagamento.em - a.pagamento.em);

  const soma = (lista) => lista.reduce((s, r) => s + r.pagamento.valor, 0);
  const daForma = (forma) => entradas.filter((r) => r.pagamento.forma === forma);
  const plural = (n) => `${n} ${n === 1 ? 'pagamento' : 'pagamentos'}`;

  const porRefeicao = ORDEM_REFEICOES.map((id) => {
    const lista = entradas.filter((r) => r.refeicao === id && r.data === estado.data);
    return `<tr><td>${REFEICOES[id].nome}</td>
      ${Object.keys(FORMAS_PAGAMENTO).map((f) => `<td class="num">${reais(soma(lista.filter((r) => r.pagamento.forma === f)))}</td>`).join('')}
      <td class="num"><strong>${reais(soma(lista))}</strong></td></tr>`;
  }).join('');

  return `<header class="eq-topo">
      <div>
        <h1>Caixa</h1>
        <p class="eq-sub">${esc(t.dataLonga(estado.data))}${estado.data === hoje ? ' · hoje' : ''}</p>
      </div>
      <div class="eq-controles">
        ${campoData('cx-data', estado.data)}
        ${estado.data === hoje ? '' : '<button type="button" class="botao texto" data-acao="cx-hoje">Hoje</button>'}
      </div>
    </header>
    <div class="metricas">
      ${Object.entries(FORMAS_PAGAMENTO).map(([f, nome]) => metrica(nome, reais(soma(daForma(f))), plural(daForma(f).length))).join('')}
      ${metrica('Total', reais(soma(entradas)), plural(entradas.length))}
    </div>
    ${entradas.length ? `
      <div class="tabela-moldura cx-resumo">
        <table class="tabela">
          <thead><tr><th>Refeição</th>${Object.values(FORMAS_PAGAMENTO).map((n) => `<th class="num">${n}</th>`).join('')}<th class="num">Total</th></tr></thead>
          <tbody>${porRefeicao}</tbody>
        </table>
      </div>
      <h2 class="eq-secao">Pagamentos</h2>
      <div class="tabela-moldura">
        <table class="tabela">
          <thead><tr><th>Hora</th><th>Nome</th><th>Refeição</th><th>Tipo</th><th>Forma</th><th class="num">Valor</th></tr></thead>
          <tbody>${entradas.map((r) => `<tr>
            <td class="nowrap">${hhmm(r.pagamento.em)}</td>
            <td>${esc(nomeDa(r, usuarios))}</td>
            <td>${REFEICOES[r.refeicao].nome}${r.data === estado.data ? '' : ` de ${esc(t.dataCurta(r.data))}`}</td>
            <td>${r.semReserva ? 'Sem reserva' : 'Reserva'}</td>
            <td>${FORMAS_PAGAMENTO[r.pagamento.forma]}</td>
            <td class="num">${reais(r.pagamento.valor)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>` : '<p class="vazio-curto">Nenhum pagamento neste dia.</p>'}`;
}

export default {
  render,
  acoes: {
    'cx-hoje': () => { estado.data = null; location.hash = '#/caixa'; atualizar(); },
  },
  mudancas: {
    'cx-data': (el) => {
      if (!el.value) return;
      estado.data = el.value;
      if (location.hash !== '#/caixa') location.hash = '#/caixa';
      else atualizar();
    },
  },
};
