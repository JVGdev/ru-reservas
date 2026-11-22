// Peças usadas por várias telas da área da equipe.

import { REFEICOES, ADICIONAIS, CATEGORIAS, FORMAS_PAGAMENTO, diaDeFuncionamento } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc } from '../ui.js';

export const ORDEM_REFEICOES = Object.keys(REFEICOES);

const svg = (corpo) => `<svg viewBox="0 0 24 24" aria-hidden="true">${corpo}</svg>`;

export const ICONES = {
  painel: svg('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="4" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="14" width="7" height="6" rx="1.5"/>'),
  atendimento: svg('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>'),
  reservas: svg('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
  pessoas: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.5 2.4 3.5 5.2"/>'),
  caixa: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>'),
  cardapio: svg('<path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2 1-3 4-3 7h3"/>'),
  ajustes: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
  baixar: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  sair: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>'),
  anterior: svg('<path d="M15 5l-7 7 7 7"/>'),
  proximo: svg('<path d="M9 5l7 7-7 7"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
};

// A tela principal registra aqui a função que redesenha a página.
let redesenhar = () => {};
export function definirAtualizar(fn) { redesenhar = fn; }
export function atualizar() { redesenhar(); }

// ---------- Textos ----------

const pad = (n) => String(n).padStart(2, '0');

// 12h05
export function hhmm(ms) {
  const d = new Date(ms);
  return `${d.getHours()}h${pad(d.getMinutes())}`;
}

export function textoExtras(extras) {
  return extras.length ? extras.map((e) => ADICIONAIS[e].nome).join(' + ') : '—';
}

export function nomeDa(r, usuarios) {
  const u = r.email ? usuarios[r.email] : null;
  return r.nome || u?.nome || (r.semReserva ? 'Sem nome' : r.email);
}

// Sem acentos e em minúsculas, para a busca.
export function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export const SITUACOES = {
  aguardando: 'Aguardando',
  veio: 'Veio',
  falta: 'Falta',
  abonada: 'Falta abonada',
  cancelada: 'Cancelada',
};

export function pilula(r, sit) {
  if (r.semReserva) return '<span class="pilula sem">Sem reserva</span>';
  return `<span class="pilula ${sit}">${SITUACOES[sit]}</span>`;
}

export function porcentagem(parte, todo) {
  return todo ? `${Math.round((parte / todo) * 100)}%` : '—';
}

export function metrica(rotulo, valor, nota = '', classe = '') {
  return `<div class="metrica ${classe}">
    <span class="metrica-rotulo">${rotulo}</span>
    <span class="metrica-valor">${valor}</span>
    ${nota ? `<span class="metrica-nota">${nota}</span>` : ''}
  </div>`;
}

// ---------- Datas ----------

// A refeição em andamento ou a próxima, a partir de agora.
export function proximaRefeicao(agora) {
  for (let d = 0; d < 14; d++) {
    const iso = t.isoDate(t.addDays(agora, d));
    if (!diaDeFuncionamento(iso)) continue;
    const r = ORDEM_REFEICOES.find((id) => d > 0 || agora < t.at(iso, REFEICOES[id].fim));
    if (r) return { data: iso, refeicao: r };
  }
  return { data: t.isoDate(agora), refeicao: ORDEM_REFEICOES[0] };
}

export function encerrou(data, refeicao, agora) {
  return agora >= t.at(data, REFEICOES[refeicao].fim);
}

export function campoData(acao, valor, rotulo = 'Data') {
  return `<input type="date" class="campo-data" data-mudanca="${acao}" value="${valor}" aria-label="${rotulo}" required>`;
}

export function segmento(acao, opcoes, atual, rotulo) {
  return `<div class="segmento" role="group" aria-label="${rotulo}">
    ${opcoes.map(([valor, texto]) => `<button type="button" data-acao="${acao}" data-valor="${valor}"
      aria-pressed="${valor === atual}">${texto}</button>`).join('')}
  </div>`;
}

// ---------- Números de uma lista de reservas ----------

export function resumo(lista, agora) {
  const s = {
    reservas: 0, vieram: 0, aguardando: 0, faltas: 0, abonadas: 0,
    canceladas: 0, semReserva: 0, encerradas: 0, marmitas: 0, sucos: 0,
    pagos: 0, valorPago: 0, pendentes: 0, valorPendente: 0,
    porCategoria: Object.fromEntries(Object.keys(CATEGORIAS).map((c) => [c, 0])),
    porForma: Object.fromEntries(Object.keys(FORMAS_PAGAMENTO).map((f) => [f, 0])),
  };
  for (const r of lista) {
    const sit = store.situacao(r, agora);
    if (sit === 'cancelada') { s.canceladas++; continue; }
    if (r.semReserva) s.semReserva++;
    else {
      s.reservas++;
      s.porCategoria[r.categoria] = (s.porCategoria[r.categoria] || 0) + 1;
      if (sit === 'veio') s.vieram++;
      else if (sit === 'aguardando') s.aguardando++;
      else if (sit === 'falta') s.faltas++;
      else if (sit === 'abonada') s.abonadas++;
      if (encerrou(r.data, r.refeicao, agora)) s.encerradas++;
    }
    if (sit === 'veio' || sit === 'aguardando') {
      if (r.extras.includes('marmita')) s.marmitas++;
      if (r.extras.includes('suco')) s.sucos++;
    }
    if (r.pagamento) {
      s.pagos++;
      s.valorPago += r.pagamento.valor;
      s.porForma[r.pagamento.forma] = (s.porForma[r.pagamento.forma] || 0) + r.pagamento.valor;
    } else if (sit === 'aguardando') {
      s.pendentes++;
      s.valorPendente += r.valor;
    }
  }
  return s;
}

// Botões de pagamento: a forma principal (dinheiro) em destaque, com o total, e as outras abaixo.
// atributos(forma) devolve os atributos de cada botão (data-acao ou name/value de formulário).
export function botoesPagamento(total, atributos) {
  const [principal, ...outras] = Object.keys(FORMAS_PAGAMENTO);
  return `<div class="pagar">
    <button ${atributos(principal)} class="botao primario grande">${FORMAS_PAGAMENTO[principal]} · ${total}</button>
    <div class="pagar-outras">
      ${outras.map((f) => `<button ${atributos(f)} class="botao secundario">${FORMAS_PAGAMENTO[f]}</button>`).join('')}
    </div>
  </div>`;
}

// ---------- Janela (diálogo) ----------

export function dialogo(html, aoFechar) {
  fecharDialogo();
  const d = document.createElement('dialog');
  d.className = 'janela';
  d.setAttribute('aria-labelledby', 'janela-titulo');
  d.innerHTML = `<div class="janela-corpo">${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => { aoFechar?.(); d.remove(); });
  // Clique fora do conteúdo fecha.
  d.addEventListener('click', (ev) => { if (ev.target === d) d.close(); });
  d.showModal();
  return d;
}

export function fecharDialogo() {
  document.querySelectorAll('dialog.janela[open]').forEach((d) => d.close());
}

export function topoDialogo(titulo, sub = '') {
  return `<div class="janela-topo">
    <div><h2 id="janela-titulo">${titulo}</h2>${sub ? `<p class="dica">${sub}</p>` : ''}</div>
    <button type="button" class="fechar" data-acao="fechar-dialogo" aria-label="Fechar">${ICONES.fechar}</button>
  </div>`;
}

// Pede confirmação numa janela. acao é o data-acao do botão de confirmar.
export function confirmar({ titulo, texto = '', botao, acao, perigo = false, dados = {} }) {
  const attrs = Object.entries(dados).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  const d = dialogo(`${topoDialogo(titulo)}
    ${texto ? `<p>${texto}</p>` : ''}
    <div class="linha-botoes fim">
      <button type="button" class="botao secundario" data-acao="fechar-dialogo">Voltar</button>
      <button type="button" class="botao ${perigo ? 'perigo-cheio' : 'primario'}" data-acao="${acao}"${attrs}>${botao}</button>
    </div>`);
  d.querySelector('[data-acao="fechar-dialogo"].botao').focus();
}
