// Painel do dia: reservas, presenças e entradas de dinheiro de cada refeição. RF23 e RF24.

import { REFEICOES, PERFIS, CATEGORIAS, FORMAS_PAGAMENTO, diaDeFuncionamento } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc, reais } from '../ui.js';
import { ORDEM_REFEICOES, atualizar, metrica, porcentagem, resumo, encerrou, campoData } from './comum.js';

const estado = { data: null };
const DIAS_NO_HISTORICO = 10;

// "29 estudante · 4 funcionário · 5 demais", só com as categorias que aparecem.
function porCategoria(s) {
  return Object.entries(CATEGORIAS)
    .filter(([id]) => s.porCategoria[id])
    .map(([id, c]) => `${s.porCategoria[id]} ${id === 'demais' ? 'demais' : c.nome.toLowerCase()}`)
    .join(' · ');
}

function cartaoRefeicao(refeicao, lista, agora) {
  const ref = REFEICOES[refeicao];
  const s = resumo(lista, agora);
  const acabou = encerrou(estado.data, refeicao, agora);
  const usuarios = store.mapaUsuarios();

  const porPerfil = PERFIS.map((p) => {
    const doPerfil = lista.filter((r) => !r.semReserva && r.status !== 'cancelada' && usuarios[r.email]?.perfil === p.id);
    return { nome: p.nome, reservas: doPerfil.length, vieram: doPerfil.filter((r) => r.status === 'utilizada').length };
  }).filter((p) => p.reservas);

  return `<section class="cartao pn-refeicao" aria-labelledby="pn-${refeicao}">
    <div class="pn-topo">
      <h2 id="pn-${refeicao}">${ref.nome}</h2>
      <span class="dica">Reservas até ${t.hora(ref.corte)} · termina ${t.hora(ref.fim)}</span>
    </div>
    <div class="metricas">
      ${metrica('Reservas', s.reservas, porCategoria(s))}
      ${metrica('Vieram', s.vieram, s.reservas ? `${porcentagem(s.vieram, s.reservas)} das reservas` : '')}
      ${acabou
        ? metrica('Faltas', s.faltas, `${porcentagem(s.faltas, s.encerradas)} das reservas${s.abonadas ? ` · ${s.abonadas} abonadas` : ''}`, s.faltas ? 'alerta' : '')
        : metrica('Aguardando', s.aguardando)}
      ${metrica('Sem reserva', s.semReserva)}
      ${metrica('Marmitas', s.marmitas)}
      ${metrica('Sucos', s.sucos)}
      ${metrica('Pago', reais(s.valorPago), `${s.pagos} ${s.pagos === 1 ? 'pagamento' : 'pagamentos'}`)}
      ${metrica('A receber', reais(s.valorPendente), `${s.pendentes} ${s.pendentes === 1 ? 'reserva' : 'reservas'}`)}
    </div>
    ${porPerfil.length ? `<details class="pn-perfis">
      <summary>Por perfil</summary>
      <table class="tabela compacta">
        <thead><tr><th>Perfil</th><th class="num">Reservas</th><th class="num">Vieram</th></tr></thead>
        <tbody>${porPerfil.map((p) => `<tr><td>${esc(p.nome)}</td><td class="num">${p.reservas}</td><td class="num">${p.vieram}</td></tr>`).join('')}</tbody>
      </table>
    </details>` : ''}
  </section>`;
}

function historico(todas, agora) {
  const dias = [];
  for (let d = 0; dias.length < DIAS_NO_HISTORICO && d < 60; d++) {
    const iso = t.isoDate(t.addDays(t.parseISO(estado.data), -d));
    if (diaDeFuncionamento(iso)) dias.push(iso);
  }
  const linhas = dias.map((iso) => {
    const s = resumo(todas.filter((r) => r.data === iso), agora);
    return `<tr${iso === estado.data ? ' class="atual"' : ''}>
      <td><button type="button" class="link" data-acao="pn-dia" data-dia="${iso}">${esc(t.dataCurta(iso))}</button></td>
      <td class="num">${s.reservas}</td>
      <td class="num">${s.vieram}</td>
      <td class="num">${s.encerradas ? s.faltas : '—'}</td>
      <td class="num">${porcentagem(s.faltas, s.encerradas)}</td>
      <td class="num">${s.semReserva}</td>
      <td class="num">${reais(s.valorPago)}</td>
    </tr>`;
  }).join('');

  return `<section aria-labelledby="pn-hist">
    <h2 id="pn-hist" class="eq-secao">Últimos dias</h2>
    <div class="tabela-moldura">
      <table class="tabela">
        <thead><tr><th>Dia</th><th class="num">Reservas</th><th class="num">Vieram</th><th class="num">Faltas</th>
          <th class="num">% faltas</th><th class="num">Sem reserva</th><th class="num">Entradas</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  </section>`;
}

function render() {
  const agora = t.now();
  const hoje = t.isoDate(agora);
  if (!estado.data) estado.data = hoje;
  const todas = store.todasReservas();
  const doDia = todas.filter((r) => r.data === estado.data);
  const s = resumo(doDia, agora);

  const topo = `<header class="eq-topo">
    <div>
      <h1>Painel</h1>
      <p class="eq-sub">${esc(t.dataLonga(estado.data))}${estado.data === hoje ? ' · hoje' : ''}</p>
    </div>
    <div class="eq-controles">
      ${campoData('pn-data', estado.data)}
      ${estado.data === hoje ? '' : '<button type="button" class="botao texto" data-acao="pn-hoje">Hoje</button>'}
    </div>
  </header>`;

  if (!todas.length) {
    return `${topo}<div class="cartao vazio">
      <p>Ainda não há reservas neste navegador. Gere dados de exemplo para ver o painel funcionando.</p>
      <button type="button" class="botao primario" data-acao="aj-exemplo">Gerar dados de exemplo</button>
    </div>`;
  }

  const refeicoes = diaDeFuncionamento(estado.data)
    ? `<div class="pn-refeicoes">${ORDEM_REFEICOES.map((r) =>
      cartaoRefeicao(r, doDia.filter((x) => x.refeicao === r), agora)).join('')}</div>`
    : '<p class="vazio-curto">Sem refeição neste dia.</p>';

  return `${topo}
    ${refeicoes}
    ${diaDeFuncionamento(estado.data) ? `<section class="cartao pn-entradas" aria-label="Entradas do dia">
      ${Object.entries(FORMAS_PAGAMENTO).map(([f, nome]) => metrica(nome, reais(s.porForma[f]))).join('')}
      ${metrica('Total do dia', reais(s.valorPago))}
      <a class="link" href="#/caixa/${estado.data}">Ver entradas</a>
    </section>` : ''}
    ${historico(todas, agora)}`;
}

export default {
  render,
  acoes: {
    'pn-hoje': () => { estado.data = null; atualizar(); },
    'pn-dia': (el) => { estado.data = el.dataset.dia; atualizar(); window.scrollTo(0, 0); },
  },
  mudancas: {
    'pn-data': (el) => { if (el.value) { estado.data = el.value; atualizar(); } },
  },
};
