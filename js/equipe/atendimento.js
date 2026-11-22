// Atendimento no balcão: leitura do QR Code ou busca, entrada, pagamento e quem veio sem reserva.
// RF13, RF15 a RF18.

import { REFEICOES, ADICIONAIS, CATEGORIAS, FORMAS_PAGAMENTO, diaDeFuncionamento } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc, reais, toast } from '../ui.js';
import {
  ICONES, ORDEM_REFEICOES, atualizar, nomeDa, normalizar, pilula, textoExtras, hhmm, metrica,
  proximaRefeicao, encerrou, campoData, segmento, resumo, dialogo, fecharDialogo, topoDialogo, botoesPagamento,
} from './comum.js';

const estado = { data: null, refeicao: null, busca: '', id: null, filtro: 'todos' };
// O que recebe o foco depois de redesenhar: 'busca' ou 'acao' (o primeiro botão do cartão).
let foco = 'busca';
const temCamera = 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia);

function daRefeicao() {
  return store.todasReservas().filter((r) => r.data === estado.data && r.refeicao === estado.refeicao);
}

// ---------- Busca ----------

function procurar(texto) {
  const termo = normalizar(texto);
  if (!termo) return { reservas: [], pessoas: [] };
  const usuarios = store.mapaUsuarios();
  const codigo = termo.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const lista = daRefeicao().filter((r) => r.status === 'ativa');
  const reservas = lista.filter((r) => {
    const u = usuarios[r.email];
    return normalizar(nomeDa(r, usuarios)).includes(termo)
      || (u?.matricula && u.matricula.includes(termo))
      || (codigo.length >= 4 && r.codigo?.replace('-', '').includes(codigo));
  });
  const comReserva = new Set(lista.map((r) => r.email));
  const pessoas = Object.values(usuarios).filter((u) => !comReserva.has(u.email)
    && (normalizar(u.nome).includes(termo) || (u.matricula && u.matricula.includes(termo))));
  return { reservas: reservas.slice(0, 8), pessoas: pessoas.slice(0, 5) };
}

function resultadosBusca() {
  const { reservas, pessoas } = procurar(estado.busca);
  if (!reservas.length && !pessoas.length) {
    return `<p class="at-vazio">Nada encontrado para “${esc(estado.busca)}” nesta refeição.</p>`;
  }
  const usuarios = store.mapaUsuarios();
  const agora = t.now();
  return `<ul class="at-resultados">
    ${reservas.map((r) => `<li><button type="button" class="at-linha" data-acao="at-escolher" data-id="${r.id}">
      <span class="at-nome">${esc(nomeDa(r, usuarios))}</span>
      <span class="at-info">${textoExtras(r.extras)} · ${reais(r.valor)}</span>
      ${pilula(r, store.situacao(r, agora))}
    </button></li>`).join('')}
    ${pessoas.map((u) => `<li><button type="button" class="at-linha" data-acao="at-sem-reserva" data-email="${esc(u.email)}">
      <span class="at-nome">${esc(u.nome)}</span>
      <span class="at-info">${esc(store.perfilDe(u).nome)}${u.matricula ? ` · ${esc(u.matricula)}` : ''}</span>
      <span class="pilula aguardando">Sem reserva aqui</span>
    </button></li>`).join('')}
  </ul>`;
}

// ---------- Cartão da pessoa ----------

function cartaoReserva(r) {
  const agora = t.now();
  const usuarios = store.mapaUsuarios();
  const u = r.email ? usuarios[r.email] : null;
  const sit = store.situacao(r, agora);
  const ref = REFEICOES[r.refeicao];
  const outraRefeicao = r.data !== estado.data || r.refeicao !== estado.refeicao;
  const doDia = r.data === t.isoDate(agora);

  let acoes = '';
  if (outraRefeicao) {
    acoes = `<p class="at-alerta">Esta reserva é do ${ref.nome.toLowerCase()} de ${esc(t.quando(r.data, agora))}.</p>`;
  } else if (sit === 'cancelada') {
    acoes = '';
  } else if (sit === 'veio') {
    acoes = `<div class="at-feito">
      <span>${ICONES.relogio} Check-in às ${hhmm(r.checkinEm)} · ${FORMAS_PAGAMENTO[r.pagamento?.forma] || 'sem pagamento'}</span>
      <button type="button" class="link" data-acao="at-desfazer" data-id="${r.id}">Desfazer</button>
    </div>`;
  } else if (!doDia) {
    acoes = '<p class="dica at-aviso">O check-in só pode ser feito no dia da refeição.</p>';
  } else if (r.pagamento) {
    acoes = `<div class="at-pagar um">
      <button type="button" class="botao primario grande" data-acao="at-entrada" data-id="${r.id}">Fazer check-in</button>
    </div>
    <p class="dica">Já pago · ${FORMAS_PAGAMENTO[r.pagamento.forma]}</p>`;
  } else {
    acoes = botoesPagamento(reais(r.valor),
      (forma) => `type="button" data-acao="at-entrada" data-id="${r.id}" data-forma="${forma}"`);
  }

  const perfil = u ? store.perfilDe(u).nome : CATEGORIAS[r.categoria].nome;
  return `<article class="cartao at-cartao" aria-live="polite">
    <div class="at-cartao-topo">
      <div>
        <h2>${esc(nomeDa(r, usuarios))}</h2>
        <p class="dica">${esc(perfil)}${u?.matricula ? ` · ${esc(u.matricula)}` : ''}</p>
      </div>
      ${pilula(r, sit)}
    </div>
    <dl class="detalhes">
      <div><dt>Refeição</dt><dd>${ref.nome}, ${esc(t.quando(r.data, agora))}</dd></div>
      <div><dt>Adicionais</dt><dd>${textoExtras(r.extras)}</dd></div>
      <div><dt>Valor</dt><dd><strong>${reais(r.valor)}</strong> · ${CATEGORIAS[r.categoria].nome}</dd></div>
      ${r.codigo ? `<div><dt>Código</dt><dd class="mono">${esc(r.codigo)}</dd></div>` : ''}
    </dl>
    ${acoes}
  </article>`;
}

function painelBalcao() {
  if (estado.id) {
    const r = store.todasReservas().find((x) => x.id === estado.id);
    if (r) return cartaoReserva(r);
    estado.id = null;
  }
  if (estado.busca.trim()) return resultadosBusca();
  return '<p class="at-vazio">Leia o QR Code da reserva ou busque pelo nome.</p>';
}

// ---------- Lista da refeição ----------

const FILTROS = {
  todos: () => true,
  aguardando: (r, sit) => sit === 'aguardando',
  vieram: (r, sit) => sit === 'veio' && !r.semReserva,
  sem: (r) => r.semReserva,
  faltas: (r, sit) => sit === 'falta' || sit === 'abonada',
};

function listaRefeicao(lista, agora) {
  const usuarios = store.mapaUsuarios();
  const itens = lista
    .map((r) => [r, store.situacao(r, agora)])
    .filter(([, sit]) => sit !== 'cancelada')
    .filter(([r, sit]) => FILTROS[estado.filtro](r, sit))
    .sort(([a], [b]) => normalizar(nomeDa(a, usuarios)).localeCompare(normalizar(nomeDa(b, usuarios))));

  if (!itens.length) return '<p class="at-vazio">Ninguém aqui.</p>';
  return `<ul class="at-itens">${itens.map(([r, sit]) => `<li>
    <button type="button" class="at-linha${r.id === estado.id ? ' selecionada' : ''}" data-acao="at-escolher" data-id="${r.id}">
      <span class="at-nome">${esc(nomeDa(r, usuarios))}</span>
      ${infoLinha(r)}
      ${pilula(r, sit)}
    </button></li>`).join('')}</ul>`;
}

function infoLinha(r) {
  const partes = [r.extras.length && textoExtras(r.extras), r.checkinEm && hhmm(r.checkinEm)].filter(Boolean);
  return partes.length ? `<span class="at-info">${partes.join(' · ')}</span>` : '';
}

// ---------- Tela ----------

function render() {
  const agora = t.now();
  if (!estado.data) Object.assign(estado, proximaRefeicao(agora));
  const { data, refeicao } = estado;
  const hoje = data === t.isoDate(agora);

  const topo = `<header class="eq-topo">
    <div>
      <h1>Atendimento</h1>
      <p class="eq-sub">${esc(t.dataLonga(data))}${hoje ? ' · hoje' : ''}</p>
    </div>
    <div class="eq-controles">
      ${segmento('at-refeicao', ORDEM_REFEICOES.map((id) => [id, REFEICOES[id].nome]), refeicao, 'Refeição')}
      ${campoData('at-data', data)}
      ${hoje && proximaRefeicao(agora).data === data ? '' : '<button type="button" class="botao texto" data-acao="at-agora">Agora</button>'}
    </div>
  </header>`;

  if (!diaDeFuncionamento(data)) {
    return `${topo}<p class="vazio-curto">Sem refeição neste dia. <button type="button" class="link" data-acao="at-agora">Ir para a próxima</button></p>`;
  }

  const lista = daRefeicao();
  const s = resumo(lista, agora);
  const acabou = encerrou(data, refeicao, agora);
  const contagem = (f) => lista.filter((r) => {
    const sit = store.situacao(r, agora);
    return sit !== 'cancelada' && FILTROS[f](r, sit);
  }).length;
  const filtros = [['todos', 'Todos'], ['aguardando', 'Aguardando'], ['vieram', 'Vieram'], ['sem', 'Sem reserva']];
  if (acabou) filtros.push(['faltas', 'Faltas']);

  return `${topo}
    <div class="metricas">
      ${metrica('Reservas', s.reservas)}
      ${metrica('Vieram', s.vieram)}
      ${acabou ? metrica('Faltas', s.faltas, '', s.faltas ? 'alerta' : '') : metrica('Aguardando', s.aguardando)}
      ${metrica('Sem reserva', s.semReserva)}
      ${metrica('Recebido', reais(s.valorPago))}
    </div>
    <div class="at-grade">
      <section class="at-balcao" aria-label="Balcão">
        <form class="at-busca" data-form="at-buscar" autocomplete="off">
          <input id="at-campo" type="search" data-entrada="at-busca" value="${esc(estado.busca)}"
            placeholder="Código, nome ou matrícula" aria-label="Código, nome ou matrícula">
          ${temCamera ? `<button type="button" class="botao secundario" data-acao="at-camera" aria-label="Ler com a câmera">${ICONES.camera}</button>` : ''}
        </form>
        <div id="at-painel">${painelBalcao()}</div>
        <button type="button" class="botao secundario" data-acao="at-sem-reserva">${ICONES.mais} Sem reserva</button>
      </section>
      <section class="cartao at-lista" aria-label="Lista da refeição">
        ${segmento('at-filtro', filtros.map(([id, nome]) => [id, `${nome} <span class="n">${contagem(id)}</span>`]), estado.filtro, 'Filtro')}
        ${listaRefeicao(lista, agora)}
      </section>
    </div>`;
}

function depois() {
  if (foco === 'acao') document.querySelector('#at-painel .botao')?.focus();
  else if (foco === 'busca') document.getElementById('at-campo')?.focus();
  foco = 'busca';
}

function escolher(id) {
  estado.id = id;
  estado.busca = '';
  foco = 'acao';
  atualizar();
}

function lerTexto(texto) {
  const porCodigo = store.buscarCodigo(texto);
  if (porCodigo) return escolher(porCodigo.id);
  const { reservas, pessoas } = procurar(texto);
  if (reservas.length === 1 && !pessoas.length) return escolher(reservas[0].id);
  if (!reservas.length && pessoas.length === 1) return abrirSemReserva(pessoas[0].email);
  estado.busca = texto;
  estado.id = null;
  atualizar();
}

// ---------- Sem reserva ----------

function totalSemReserva(form) {
  const dados = new FormData(form);
  const categoria = dados.get('categoria');
  const extras = dados.getAll('extras');
  return CATEGORIAS[categoria].preco + extras.reduce((soma, e) => soma + ADICIONAIS[e].preco, 0);
}

function abrirSemReserva(email) {
  const agora = t.now();
  if (estado.data !== t.isoDate(agora)) {
    toast('Só dá para registrar no dia da refeição.');
    return;
  }
  const u = email ? store.usuarioPorEmail(email) : null;
  const categoria = u ? store.categoriaAplicada(u, agora) : 'estudante';
  const semDesconto = u && categoria !== store.perfilDe(u).categoria;

  const quem = u
    ? `<input type="hidden" name="email" value="${esc(u.email)}">
       <input type="hidden" name="categoria" value="${categoria}">
       <p><strong>${esc(u.nome)}</strong> · ${esc(store.perfilDe(u).nome)}</p>
       <p class="dica">${semDesconto ? 'Sem desconto (penalidade por falta)' : CATEGORIAS[categoria].nome} · ${reais(CATEGORIAS[categoria].preco)}</p>`
    : `<label for="sr-nome">Nome <span class="dica">(opcional)</span></label>
       <input id="sr-nome" name="nome" autocomplete="off">
       <fieldset class="opcoes">
         <legend class="sr-only">Preço</legend>
         ${Object.entries(CATEGORIAS).map(([id, c]) => `<label class="opcao">
           <input type="radio" name="categoria" value="${id}" data-mudanca="at-sr-total" ${id === categoria ? 'checked' : ''}>
           <span class="opcao-nome">${c.nome}</span><span class="opcao-preco">${reais(c.preco)}</span>
         </label>`).join('')}
       </fieldset>`;

  const d = dialogo(`${topoDialogo('Sem reserva', `${REFEICOES[estado.refeicao].nome}, ${t.quando(estado.data, agora)}`)}
    <form class="formulario" data-form="at-sem-reserva">
      ${quem}
      <div class="opcoes">
        ${Object.entries(ADICIONAIS).map(([id, a]) => `<label class="opcao">
          <input type="checkbox" name="extras" value="${id}" data-mudanca="at-sr-total">
          <span class="opcao-nome">${a.nome}</span><span class="opcao-preco">+ ${reais(a.preco)}</span>
        </label>`).join('')}
      </div>
      ${botoesPagamento('<span data-total></span>', (forma) => `type="submit" name="forma" value="${forma}"`)}
    </form>`);
  const form = d.querySelector('form');
  d.querySelector('[data-total]').textContent = reais(totalSemReserva(form));
  (d.querySelector('#sr-nome') || d.querySelector('[type="submit"]')).focus();
}

// ---------- Câmera ----------

async function abrirCamera() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch {
    toast('Não foi possível abrir a câmera.');
    return;
  }
  const d = dialogo(`${topoDialogo('Ler QR Code')}<video class="camera" playsinline muted></video>`,
    () => stream.getTracks().forEach((faixa) => faixa.stop()));
  const video = d.querySelector('video');
  video.srcObject = stream;
  await video.play().catch(() => {});
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  const procurarQr = async () => {
    if (!d.open) return;
    try {
      const [achado] = await detector.detect(video);
      if (achado) {
        fecharDialogo();
        lerTexto(achado.rawValue);
        return;
      }
    } catch { /* quadro ainda não disponível */ }
    setTimeout(procurarQr, 200);
  };
  procurarQr();
}

// ---------- Eventos ----------

export default {
  render,
  depois,
  acoes: {
    'at-refeicao': (el) => { estado.refeicao = el.dataset.valor; estado.id = null; atualizar(); },
    'at-filtro': (el) => { estado.filtro = el.dataset.valor; foco = 'nenhum'; atualizar(); },
    'at-agora': () => { Object.assign(estado, proximaRefeicao(t.now()), { id: null, busca: '' }); atualizar(); },
    'at-escolher': (el) => escolher(el.dataset.id),
    'at-entrada': (el) => {
      const r = store.registrarCheckin(el.dataset.id, t.now(), el.dataset.forma);
      toast(`Check-in: ${nomeDa(r, store.mapaUsuarios())}`);
      atualizar();
    },
    'at-desfazer': (el) => {
      const r = store.todasReservas().find((x) => x.id === el.dataset.id);
      store.desfazerCheckin(el.dataset.id);
      if (r?.semReserva) estado.id = null;
      toast('Check-in desfeito');
      foco = 'acao';
      atualizar();
    },
    'at-sem-reserva': (el) => abrirSemReserva(el.dataset.email),
    'at-camera': abrirCamera,
  },
  mudancas: {
    'at-data': (el) => {
      if (!el.value) return;
      estado.data = el.value;
      estado.id = null;
      atualizar();
    },
    'at-sr-total': (el) => {
      el.form.querySelector('[data-total]').textContent = reais(totalSemReserva(el.form));
    },
  },
  entradas: {
    'at-busca': (el) => {
      estado.busca = el.value;
      estado.id = null;
      document.getElementById('at-painel').innerHTML = painelBalcao();
    },
  },
  formularios: {
    'at-buscar': (dados) => {
      const texto = String(dados.get('busca') ?? document.getElementById('at-campo').value).trim();
      if (texto) lerTexto(texto);
    },
    'at-sem-reserva': (dados) => {
      const registro = store.registrarSemReserva({
        data: estado.data,
        refeicao: estado.refeicao,
        email: dados.get('email'),
        nome: String(dados.get('nome') || '').trim(),
        categoria: dados.get('categoria'),
        extras: dados.getAll('extras'),
        forma: dados.get('forma'),
      }, t.now());
      fecharDialogo();
      estado.id = registro.id;
      estado.busca = '';
      toast('Registrado sem reserva');
      atualizar();
    },
  },
};
