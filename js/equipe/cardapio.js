// Cardápio da semana: editar cada dia e publicar a semana para quem reserva. RF21.

import { TAGS, menuDo, semanaDe, semanaPublicada, salvarCardapio, publicarSemana, diaDeFuncionamento } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc, toast } from '../ui.js';
import { ICONES, atualizar, confirmar, fecharDialogo } from './comum.js';

const estado = { semana: null, dia: null };

const CAMPOS = {
  pratos: [['prato0', 'Prato principal'], ['prato1', 'Segunda opção'], ['prato2', 'Guarnição']],
  saladas: [['salada0', 'Salada 1'], ['salada1', 'Salada 2'], ['salada2', 'Salada 3']],
  suco: [['suco', 'Suco']],
};

function diasDaSemana() {
  return Array.from({ length: 7 }, (_, i) => t.isoDate(t.addDays(t.parseISO(estado.semana), i)))
    .filter(diaDeFuncionamento);
}

function rotuloSemana() {
  const inicio = t.parseISO(estado.semana);
  const fmt = (d) => `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(inicio)} a ${fmt(t.addDays(inicio, 6))}`;
}

function campoItem(nome, rotulo, item) {
  return `<div class="cd-item">
    <label class="cd-rotulo" for="cd-${nome}">${rotulo}</label>
    <input id="cd-${nome}" name="${nome}" value="${esc(item?.nome)}" autocomplete="off"${nome === 'prato0' ? ' required' : ''}>
    <div class="cd-tags" role="group" aria-label="Símbolos de ${rotulo.toLowerCase()}">
      ${Object.entries(TAGS).map(([id, tag]) => `<label class="cd-tag">
        <input type="checkbox" name="${nome}-tags" value="${id}" ${item?.tags.includes(id) ? 'checked' : ''}>
        <span>${tag}</span></label>`).join('')}
    </div>
  </div>`;
}

function formDia(agora) {
  const menu = menuDo(estado.dia, agora);
  const item = { prato0: menu?.pratos[0], prato1: menu?.pratos[1], prato2: menu?.pratos[2],
    salada0: menu?.saladas[0], salada1: menu?.saladas[1], salada2: menu?.saladas[2], suco: menu?.suco };
  const grupo = (titulo, campos) => `<fieldset><legend>${titulo}</legend>
    ${campos.map(([nome, rotulo]) => campoItem(nome, rotulo, item[nome])).join('')}</fieldset>`;

  return `<form class="cartao cd-form" data-form="cd-salvar" autocomplete="off">
    <div class="cd-form-topo">
      <h2>${esc(t.dataLonga(estado.dia))}</h2>
      ${menu ? '' : '<span class="pilula aguardando">Sem cardápio</span>'}
    </div>
    ${grupo('Pratos', CAMPOS.pratos)}
    ${grupo('Saladas', CAMPOS.saladas)}
    ${grupo('Suco', CAMPOS.suco)}
    <div class="linha-botoes">
      <button type="submit" class="botao primario">Salvar dia</button>
      ${menu ? '<button type="button" class="botao texto perigo-texto" data-acao="cd-limpar">Deixar sem cardápio</button>' : ''}
    </div>
  </form>`;
}

function render() {
  const agora = t.now();
  if (!estado.semana) estado.semana = semanaDe(t.isoDate(agora));
  const dias = diasDaSemana();
  if (!dias.includes(estado.dia)) estado.dia = dias.find((d) => d >= t.isoDate(agora)) || dias[0] || null;

  const publicada = semanaPublicada(estado.semana, agora);
  const comCardapio = dias.filter((d) => menuDo(d, agora));
  const reservasNaSemana = store.todasReservas()
    .filter((r) => dias.includes(r.data) && r.status === 'ativa' && !r.semReserva).length;

  const topo = `<header class="eq-topo">
    <div class="eq-titulo">
      <div><h1>Cardápio</h1><p class="eq-sub">Semana de ${rotuloSemana()}</p></div>
      <span class="pilula ${publicada ? 'veio' : 'aguardando'}">${publicada ? 'Publicada' : 'Rascunho'}</span>
    </div>
    <div class="eq-controles">
      <button type="button" class="botao secundario icone" data-acao="cd-semana" data-passo="-7" aria-label="Semana anterior">${ICONES.anterior}</button>
      <button type="button" class="botao secundario icone" data-acao="cd-semana" data-passo="7" aria-label="Próxima semana">${ICONES.proximo}</button>
      ${publicada
        ? `<button type="button" class="botao texto" data-acao="cd-despublicar" data-reservas="${reservasNaSemana}">Voltar para rascunho</button>`
        : `<button type="button" class="botao primario" data-acao="cd-publicar" ${comCardapio.length ? '' : 'disabled'}>Publicar semana</button>`}
    </div>
  </header>`;

  if (!dias.length) return `${topo}<p class="vazio-curto">Nenhum dia de funcionamento nesta semana.</p>`;

  const chips = `<div class="cd-dias" role="group" aria-label="Dias">
    ${dias.map((d) => {
      const menu = menuDo(d, agora);
      return `<button type="button" class="cd-dia" data-acao="cd-dia" data-dia="${d}" aria-pressed="${d === estado.dia}">
        <span class="cd-dia-nome">${t.diaSemana(d)} ${Number(d.slice(8))}</span>
        <span class="cd-dia-prato">${menu ? esc(menu.pratos[0].nome) : 'Sem cardápio'}</span>
      </button>`;
    }).join('')}
  </div>`;

  return `${topo}
    ${publicada ? '' : '<p class="dica">Quem reserva só vê a semana depois de publicada.</p>'}
    ${chips}
    ${formDia(agora)}`;
}

function lerItem(dados, nome) {
  const texto = String(dados.get(nome) || '').trim();
  return texto ? { nome: texto, tags: dados.getAll(`${nome}-tags`) } : null;
}

export default {
  render,
  acoes: {
    'cd-semana': (el) => {
      estado.semana = t.isoDate(t.addDays(t.parseISO(estado.semana), Number(el.dataset.passo)));
      estado.dia = null;
      atualizar();
    },
    'cd-dia': (el) => { estado.dia = el.dataset.dia; atualizar(); },
    'cd-publicar': () => {
      publicarSemana(estado.semana, true);
      toast('Semana publicada');
      atualizar();
    },
    'cd-despublicar': (el) => {
      const n = Number(el.dataset.reservas);
      confirmar({
        titulo: 'Voltar a semana para rascunho?',
        texto: `Quem reserva deixa de ver esta semana.${n ? ` As ${n} reservas já feitas continuam valendo.` : ''}`,
        botao: 'Voltar para rascunho',
        acao: 'cd-despublicar-ok',
      });
    },
    'cd-despublicar-ok': () => {
      fecharDialogo();
      publicarSemana(estado.semana, false);
      toast('Semana em rascunho');
      atualizar();
    },
    'cd-limpar': () => {
      salvarCardapio(estado.dia, null);
      toast('Dia sem cardápio');
      atualizar();
    },
  },
  formularios: {
    'cd-salvar': (dados) => {
      const principal = lerItem(dados, 'prato0');
      if (!principal) {
        toast('Preencha o prato principal.');
        return;
      }
      salvarCardapio(estado.dia, {
        pratos: [principal, lerItem(dados, 'prato1'), lerItem(dados, 'prato2')],
        saladas: CAMPOS.saladas.map(([nome]) => lerItem(dados, nome)).filter(Boolean),
        suco: lerItem(dados, 'suco'),
      });
      toast('Cardápio salvo');
      atualizar();
    },
  },
};
