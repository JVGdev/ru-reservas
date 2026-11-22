// Área da equipe do RU: moldura, rotas e eventos. Cada tela fica no próprio arquivo desta pasta.

import { carregarAjustes } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc } from '../ui.js';
import { ICONES, definirAtualizar, fecharDialogo } from './comum.js';
import painel from './painel.js';
import atendimento from './atendimento.js';
import reservas from './reservas.js';
import pessoas, { pessoa } from './pessoas.js';
import caixa from './caixa.js';
import cardapio from './cardapio.js';
import ajustes from './ajustes.js';

const app = document.getElementById('app');

const PAPEIS = {
  caixa: { nome: 'Caixa', descricao: 'Atendimento no balcão e entradas do dia' },
  gerencia: { nome: 'Gerência', descricao: 'Painel, reservas, pessoas, cardápio e ajustes' },
};

// [rota, nome no menu, papéis que veem]
const MENU = [
  ['painel', 'Painel', ['gerencia']],
  ['atendimento', 'Atendimento', ['caixa', 'gerencia']],
  ['reservas', 'Reservas', ['gerencia']],
  ['pessoas', 'Pessoas', ['gerencia']],
  ['caixa', 'Caixa', ['caixa', 'gerencia']],
  ['cardapio', 'Cardápio', ['gerencia']],
  ['ajustes', 'Ajustes', ['gerencia']],
];

const TELAS = { painel, atendimento, reservas, pessoas, pessoa, caixa, cardapio, ajustes };
// A tela de uma pessoa fica sob "Pessoas" no menu.
const SECAO = { pessoa: 'pessoas' };

const todas = Object.values(TELAS);
const juntar = (campo) => Object.assign({}, ...todas.map((tela) => tela[campo] || {}));
const ACOES = juntar('acoes');
const MUDANCAS = juntar('mudancas');
const ENTRADAS = juntar('entradas');
const FORMULARIOS = juntar('formularios');

// ---------- Entrada ----------

function telaEntrar() {
  app.innerHTML = `<main class="eq-entrada">
    <div class="marca">
      <img src="icon.svg" alt="" width="64" height="64">
      <h1>RU Equipe</h1>
      <p>Restaurante Universitário · UPF</p>
    </div>
    <div class="eq-papeis">
      ${Object.entries(PAPEIS).map(([id, p]) => `<button type="button" class="cartao eq-papel" data-acao="entrar" data-papel="${id}">
        <strong>${p.nome}</strong><span>${p.descricao}</span>
      </button>`).join('')}
    </div>
    <p class="nota-demo"><strong>Protótipo:</strong> sem senha. A equipe vê as reservas feitas neste navegador.</p>
    <a class="botao secundario" href="./">${ICONES.celular} Ver como cliente</a>
  </main>`;
}

// ---------- Moldura ----------

function avisoSimulacao(papel) {
  if (!t.simulando()) return '';
  const agora = t.now();
  const frase = `Horário simulado: ${t.dataCurta(t.isoDate(agora))}, ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  // No celular só o ícone aparece; o rótulo e o title mantêm o texto.
  const attrs = `class="eq-simulado" aria-label="${esc(frase)}" title="${esc(frase)}"`;
  const texto = `${ICONES.relogio}<span aria-hidden="true">${esc(frase)}</span>`;
  return papel === 'gerencia'
    ? `<a ${attrs} href="#/ajustes">${texto}</a>`
    : `<p ${attrs} role="note">${texto}</p>`;
}

function moldura(papel, secao, conteudo) {
  const itens = MENU.filter(([, , papeis]) => papeis.includes(papel));
  app.innerHTML = `<div class="eq">
    <aside class="eq-lateral">
      <a class="eq-marca" href="#/${itens[0][0]}"><img src="icon.svg" alt="" width="32" height="32"><span>RU Equipe</span></a>
      <nav class="eq-nav" aria-label="Seções">
        ${itens.map(([id, nome]) => `<a href="#/${id}"${id === secao ? ' class="ativa" aria-current="page"' : ''}>${ICONES[id]}<span>${nome}</span></a>`).join('')}
      </nav>
      <div class="eq-rodape">
        ${avisoSimulacao(papel)}
        <a class="eq-cliente" href="./" aria-label="Ver como cliente">${ICONES.celular}<span>Ver como cliente</span></a>
        <span class="eq-quem">${PAPEIS[papel].nome}</span>
        <button type="button" class="eq-sair" data-acao="sair">${ICONES.sair}<span>Sair</span></button>
      </div>
    </aside>
    <main class="eq-main" id="principal">${conteudo}</main>
  </div>`;
}

// ---------- Rotas ----------

let rotaAnterior = null;

function rota() {
  const hash = location.hash.slice(2);
  const [nome, ...resto] = hash.split('/');
  const param = resto.length ? decodeURIComponent(resto.join('/')) : undefined;
  const s = store.sessaoEquipe();

  if (!s || !PAPEIS[s.papel]) {
    rotaAnterior = null;
    telaEntrar();
    return;
  }

  const permitidas = MENU.filter(([, , papeis]) => papeis.includes(s.papel)).map(([id]) => id);
  const secao = SECAO[nome] || nome;
  if (!TELAS[nome] || !permitidas.includes(secao)) {
    location.replace(`#/${permitidas[0]}`);
    return;
  }

  const tela = TELAS[nome];
  moldura(s.papel, secao, tela.render(param));
  if (hash !== rotaAnterior) {
    window.scrollTo(0, 0);
    rotaAnterior = hash;
  }
  tela.depois?.(param);
}

definirAtualizar(rota);

// ---------- Eventos ----------

Object.assign(ACOES, {
  entrar: (el) => { store.entrarEquipe(el.dataset.papel); location.hash = ''; rota(); },
  sair: () => { store.sairEquipe(); location.hash = ''; rota(); },
  'fechar-dialogo': fecharDialogo,
});

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-acao]');
  if (!el || el.disabled) return;
  const acao = ACOES[el.dataset.acao];
  if (acao) { ev.preventDefault(); acao(el); }
});

document.addEventListener('change', (ev) => {
  const nome = ev.target.dataset?.mudanca;
  if (nome && MUDANCAS[nome]) MUDANCAS[nome](ev.target);
});

document.addEventListener('input', (ev) => {
  const nome = ev.target.dataset?.entrada;
  if (nome && ENTRADAS[nome]) ENTRADAS[nome](ev.target);
});

document.addEventListener('submit', (ev) => {
  const form = ev.target;
  const fn = FORMULARIOS[form.dataset.form];
  if (!fn) return;
  ev.preventDefault();
  fn(new FormData(form, ev.submitter), form);
});

// Reservas feitas em outra aba (a área de quem reserva) aparecem sem recarregar,
// a não ser que alguém esteja digitando ou com uma janela aberta.
window.addEventListener('storage', (ev) => {
  if (ev.key && !ev.key.startsWith('ru.')) return;
  carregarAjustes();
  const ativo = document.activeElement;
  const digitando = ativo?.matches('input:not([type="checkbox"]):not([type="radio"]), select, textarea') && ativo.value;
  if (document.querySelector('dialog[open]') || digitando) return;
  rota();
});

window.addEventListener('hashchange', rota);
rota();
