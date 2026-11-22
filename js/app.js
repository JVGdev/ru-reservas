import {
  PERFIS, CATEGORIAS, ADICIONAIS, REFEICOES, TAGS, ACOMPANHAMENTO, FORMAS_PAGAMENTO,
  cardapioDo, semanasDoCalendario, semanaDe,
} from './data.js';
import * as store from './store.js';
import * as t from './time.js';
import { esc, reais, toast } from './ui.js';

const app = document.getElementById('app');
const ORDEM_REFEICOES = Object.keys(REFEICOES);
const DIAS_NO_INICIO = 5;

// Dia escolhido (compartilhado entre Início e Calendário) e se o cardápio completo está aberto.
const escolha = { dia: null, cardapioAberto: false };
// Folha de reserva rápida aberta.
const rapida = { dia: null, refeicao: null, extras: new Set() };
// Refeições marcadas na tela "Vários dias" ("2026-11-23|almoco") e adicionais escolhidos.
// `abertas`: semanas expandidas na tela (null = só a primeira, na primeira visita).
const varias = { selecao: new Set(), extras: new Set(), abertas: null };
// E-mail digitado na tela de login, mantido se a validação falhar.
let emailDigitado = '';

// ---------- Utilidades ----------

const minuscula = (s) => s.charAt(0).toLowerCase() + s.slice(1);

const ICONES = {
  inicio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
  bilhete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z"/><path d="M14 6v2M14 11v2M14 16v2"/></svg>',
  pessoa: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  voltar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  seta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  fechar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  relogio: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function ir(caminho, substituir = false) {
  if (location.hash === `#${caminho}`) return rota();
  if (substituir) location.replace(`#${caminho}`);
  else location.hash = caminho;
}

function primeiroNome(usuario) {
  return esc((usuario.nome || '').trim().split(/\s+/)[0]);
}

function situacao(iso, refeicao, agora) {
  const reserva = store.reservaVigente(iso, refeicao);
  if (reserva) return { tipo: 'reservado', reserva };
  const corte = t.at(iso, REFEICOES[refeicao].corte);
  return { tipo: agora < corte ? 'aberto' : 'fechado', corte };
}

function textoPrazo(iso, refeicao, agora) {
  const corte = t.hora(REFEICOES[refeicao].corte);
  const rel = t.relativo(iso, agora);
  if (rel === 'hoje') return `Fecha às ${corte}`;
  if (rel === 'amanhã') return `Até ${corte} de amanhã`;
  return `Até ${corte} do dia`;
}

function terminou(reserva, agora) {
  return agora >= t.at(reserva.data, REFEICOES[reserva.refeicao].fim);
}

// Dá para cancelar enquanto a refeição não terminou; depois do corte, conta como falta.
function podeCancelar(reserva, agora) {
  return reserva.status === 'ativa' && !terminou(reserva, agora);
}

function passouCorte(reserva, agora) {
  return agora >= t.at(reserva.data, REFEICOES[reserva.refeicao].corte);
}

const dataHora = (ms) => {
  const d = new Date(ms);
  return `${t.dataCurta(t.isoDate(d))}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const MOTIVO_FALTA = { 'nao-veio': 'Não veio', 'apos-corte': 'Cancelou depois do corte' };

function ordenar(a, b) {
  return a.data.localeCompare(b.data) || ORDEM_REFEICOES.indexOf(a.refeicao) - ORDEM_REFEICOES.indexOf(b.refeicao);
}

function proximasReservas(agora) {
  return store.reservasDoUsuario()
    .filter((r) => r.status === 'ativa' && !terminou(r, agora))
    .sort(ordenar);
}

function textoExtras(extras) {
  return extras.length ? extras.map((e) => ADICIONAIS[e].nome).join(' + ') : 'Sem adicionais';
}

function diasDisponiveis(agora) {
  const hoje = t.isoDate(agora);
  return semanasDoCalendario(agora).flat().filter((iso) => iso >= hoje && cardapioDo(iso, agora));
}

function diaPadrao(dias, agora) {
  return dias.find((iso) => ORDEM_REFEICOES.some((r) => situacao(iso, r, agora).tipo === 'aberto')) || dias[0] || null;
}

function temReserva(iso) {
  return ORDEM_REFEICOES.some((r) => store.reservaVigente(iso, r));
}

function qrSvg(texto) {
  const qr = window.qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
}

// "Vegano: almôndegas de lentilha", "Vegetariano: lasanha de berinjela".
function opcaoSemCarne(menu) {
  const prato = menu.pratos[1];
  if (!prato) return '';
  const rotulo = prato.tags.includes('vegano') ? 'Vegano' : prato.tags.includes('animal') ? 'Opção' : 'Vegetariano';
  return `${rotulo}: ${esc(minuscula(prato.nome))}`;
}

// ---------- Moldura ----------

// Barra da demonstração, fixa no topo de todas as telas: horário simulado (quando houver)
// e o atalho para a área da equipe.
function barraDemo() {
  let esquerda = '<span class="bd-rotulo">Protótipo</span>';
  if (t.simulando()) {
    const agora = t.now();
    const hh = String(agora.getHours()).padStart(2, '0');
    const mm = String(agora.getMinutes()).padStart(2, '0');
    const texto = `${ICONES.relogio}<span>Simulado: ${esc(t.dataCurta(t.isoDate(agora)))}, ${hh}:${mm}</span>`;
    esquerda = store.usuarioAtual()
      ? `<a class="bd-horario" href="#/perfil" aria-label="Horário simulado: ${esc(t.dataCurta(t.isoDate(agora)))}, ${hh}:${mm}">${texto}</a>`
      : `<span class="bd-horario">${texto}</span>`;
  }
  return `<div class="barra-demo">${esquerda}<a class="bd-equipe" href="equipe.html">Área da equipe ${ICONES.seta}</a></div>`;
}

function abas(atual) {
  const aba = (id, rotulo, icone) =>
    `<a href="#/${id}" class="aba${atual === id ? ' ativa' : ''}"${atual === id ? ' aria-current="page"' : ''}>${ICONES[icone]}<span>${rotulo}</span></a>`;
  return `<nav class="abas" aria-label="Navegação">
    ${aba('inicio', 'Início', 'inicio')}
    ${aba('reservas', 'Reservas', 'bilhete')}
    ${aba('perfil', 'Perfil', 'pessoa')}
  </nav>`;
}

function pagina(atual, conteudo) {
  app.innerHTML = `${barraDemo()}<main class="conteudo">${conteudo}</main>${abas(atual)}`;
}

function botaoVoltar() {
  return `<button type="button" class="voltar" data-acao="voltar" aria-label="Voltar">${ICONES.voltar}</button>`;
}

// ---------- Login ----------

function telaEntrar() {
  const pendente = store.codigoPendente();
  const marca = `<div class="marca">
      <img src="icon.svg" alt="" width="64" height="64">
      <h1>RU Reservas</h1>
      <p>Restaurante Universitário · UPF</p>
    </div>`;

  if (!pendente) {
    app.innerHTML = `${barraDemo()}<main class="conteudo entrada">${marca}
      <form class="cartao formulario" data-form="email" novalidate>
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" inputmode="email" autocomplete="email"
          placeholder="nome@exemplo.com" value="${esc(emailDigitado)}" required>
        <p class="erro" id="erro" hidden></p>
        <button class="botao primario" type="submit">Receber código</button>
      </form>
    </main>`;
    return;
  }

  app.innerHTML = `${barraDemo()}<main class="conteudo entrada">${marca}
    <form class="cartao formulario" data-form="codigo" novalidate>
      <p class="info">Enviamos um código de 6 dígitos para <strong>${esc(pendente.email)}</strong>.</p>
      <label for="codigo">Código</label>
      <input id="codigo" name="codigo" class="campo-codigo" inputmode="numeric" autocomplete="one-time-code"
        maxlength="6" pattern="[0-9]{6}" placeholder="000000" required>
      <p class="erro" id="erro" hidden></p>
      <button class="botao primario" type="submit">Entrar</button>
      <button class="botao texto" type="button" data-acao="outro-email">Usar outro e-mail</button>
    </form>
    <div class="nota-demo">
      <strong>Protótipo:</strong> nenhum e-mail é enviado. Use o código <span class="codigo-demo">${esc(pendente.codigo)}</span>
    </div>
  </main>`;
}

function mostrarErro(msg) {
  const el = document.getElementById('erro');
  el.textContent = msg;
  el.hidden = false;
}

// ---------- Cadastro (primeiro acesso e edição) ----------

function precoPerfil(perfil) {
  return `Valor por refeição: <strong>${reais(CATEGORIAS[perfil.categoria].preco)}</strong>`;
}

function telaCadastro() {
  const u = store.usuarioAtual() || {};
  const editando = Boolean(u.nome);
  const perfil = PERFIS.find((p) => p.id === u.perfil);

  const conteudo = `
    <header class="topo">
      ${editando ? botaoVoltar() : ''}
      <h1>${editando ? 'Editar dados' : 'Seus dados'}</h1>
    </header>
    <form class="cartao formulario" data-form="cadastro" novalidate>
      <label for="nome">Nome completo</label>
      <input id="nome" name="nome" autocomplete="name" placeholder="Nome e sobrenome" value="${esc(u.nome)}" required>

      <label for="perfil">Perfil</label>
      <select id="perfil" name="perfil" required>
        <option value="" disabled ${perfil ? '' : 'selected'}>Selecione</option>
        ${PERFIS.map((p) => `<option value="${p.id}" ${p.id === u.perfil ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
      </select>
      <p class="dica" id="preco-perfil">${perfil ? precoPerfil(perfil) : ''}</p>

      <div id="campo-matricula" ${perfil?.upf ? '' : 'hidden'}>
        <label for="matricula">Matrícula UPF</label>
        <input id="matricula" name="matricula" inputmode="numeric" placeholder="Número de matrícula" value="${esc(u.matricula)}">
      </div>

      <p class="erro" id="erro" hidden></p>
      <button class="botao primario" type="submit">${editando ? 'Salvar' : 'Continuar'}</button>
    </form>`;

  if (editando) pagina('perfil', conteudo);
  else app.innerHTML = `${barraDemo()}<main class="conteudo">${conteudo}</main>`;
}

// ---------- Peças do Início e do Calendário ----------

function cartaoProxima(agora) {
  const proximas = proximasReservas(agora);
  if (!proximas.length) {
    return `<section class="cartao sem-reserva">
      <p>Nenhuma reserva por enquanto. Escolha um dia abaixo para reservar.</p>
    </section>`;
  }

  const r = proximas[0];
  const ref = REFEICOES[r.refeicao];
  const menu = cardapioDo(r.data, agora);
  const quando = t.quando(r.data, agora);
  const cancelar = podeCancelar(r, agora)
    ? `<button type="button" class="link-claro" data-acao="pedir-cancelamento" data-id="${r.id}">
        ${quando === 'hoje' && !passouCorte(r, agora) ? `Cancelar até ${t.hora(ref.corte)}` : 'Cancelar'}</button>`
    : '';
  const mais = proximas.length - 1;

  return `<section class="proxima" aria-labelledby="proxima-titulo">
      <div class="proxima-topo">
        <div class="proxima-info">
          <p class="sobrelinha">Próxima reserva</p>
          <h2 id="proxima-titulo">${ref.nome}, ${esc(quando)}</h2>
          ${menu ? `<p>${esc(menu.pratos[0].nome)}</p>` : ''}
          <p>${r.extras.length ? `${textoExtras(r.extras)} · ` : ''}${reais(r.valor)} no balcão</p>
        </div>
        <a class="qr-mini" href="#/reserva/${r.id}" aria-label="Abrir QR Code">${qrSvg(`RU:${r.codigo}`)}</a>
      </div>
      <div class="proxima-acoes">
        <a class="botao destaque" href="#/reserva/${r.id}">Mostrar QR Code</a>
        ${cancelar}
      </div>
    </section>
    ${mais > 0 ? `<a class="link-mais" href="#/reservas">Mais ${mais} ${mais === 1 ? 'reserva' : 'reservas'} ${ICONES.seta}</a>` : ''}`;
}

function chipsDias(dias, agora) {
  const hoje = t.isoDate(agora);
  return `<div class="chips-dias" role="group" aria-label="Dias">
    ${dias.map((iso) => {
      const sel = iso === escolha.dia;
      const rotulo = `${t.dataLonga(iso)}${temReserva(iso) ? ', com reserva' : ''}`;
      return `<button type="button" class="chip-dia${sel ? ' selecionado' : ''}${temReserva(iso) ? ' com-reserva' : ''}"
        data-acao="dia" data-dia="${iso}" aria-pressed="${sel}" aria-label="${esc(rotulo)}">
        <span class="chip-sem">${iso === hoje ? 'Hoje' : t.diaSemana(iso)}</span>
        <span class="chip-num">${Number(iso.slice(8))}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function itemCardapio(item) {
  const tags = item.tags.map((tag) => `<span class="tag tag-${tag}">${TAGS[tag]}</span>`).join('');
  return `<li><span>${esc(item.nome)}</span>${tags ? `<span class="tags">${tags}</span>` : ''}</li>`;
}

function cardapioCompleto(menu) {
  return `<div class="cardapio">
    <h3>Prato do dia</h3>
    <ul>${[ACOMPANHAMENTO, ...menu.pratos].filter(Boolean).map(itemCardapio).join('')}</ul>
    ${menu.saladas.length ? `<h3>Saladas</h3><ul>${menu.saladas.map(itemCardapio).join('')}</ul>` : ''}
    ${menu.suco ? `<h3>Suco</h3><ul>${itemCardapio(menu.suco)}</ul>` : ''}
  </div>`;
}

function botaoRefeicao(iso, r, agora) {
  const s = situacao(iso, r, agora);
  const nome = REFEICOES[r].nome;
  if (s.tipo === 'reservado') {
    return `<a class="refeicao reservada" href="#/reserva/${s.reserva.id}">
      <span class="ref-nome">${ICONES.check}${nome}</span>
      <span class="ref-status">Reservado</span></a>`;
  }
  if (s.tipo === 'fechado') {
    return `<button type="button" class="refeicao fechada" disabled>
      <span class="ref-nome">${nome}</span>
      <span class="ref-status">Fechou às ${t.hora(REFEICOES[r].corte)}</span></button>`;
  }
  return `<button type="button" class="refeicao" data-acao="abrir-reserva" data-dia="${iso}" data-refeicao="${r}">
    <span class="ref-nome">${ICONES.mais}${nome}</span>
    <span class="ref-status">${textoPrazo(iso, r, agora)}</span></button>`;
}

function cartaoDia(iso, agora) {
  const menu = cardapioDo(iso, agora);
  return `<div class="cartao dia-card">
    <div class="dia-menu">
      <p class="prato">${esc(menu.pratos[0].nome)}</p>
      <p class="prato-opcao">${opcaoSemCarne(menu)}</p>
      <button type="button" class="link" data-acao="cardapio" aria-expanded="${escolha.cardapioAberto}">
        ${escolha.cardapioAberto ? 'Ocultar cardápio' : 'Cardápio completo'}</button>
      ${escolha.cardapioAberto ? cardapioCompleto(menu) : ''}
    </div>
    <div class="refeicoes">${ORDEM_REFEICOES.map((r) => botaoRefeicao(iso, r, agora)).join('')}</div>
  </div>`;
}

// ---------- Início ----------

function telaInicio() {
  const agora = t.now();
  const usuario = store.usuarioAtual();
  const dias = diasDisponiveis(agora).slice(0, DIAS_NO_INICIO);
  if (!dias.includes(escolha.dia)) {
    escolha.dia = diaPadrao(dias, agora);
    escolha.cardapioAberto = false;
  }

  pagina('inicio', `
    <header class="topo topo-inicio">
      <div>
        <p class="saudacao">${esc(t.dataLonga(t.isoDate(agora)))}</p>
        <h1>Olá, ${primeiroNome(usuario)}</h1>
      </div>
    </header>
    ${avisoFaltas(usuario, agora)}
    ${cartaoProxima(agora)}
    <section class="reservar" aria-labelledby="reservar-titulo">
      <div class="secao-topo">
        <h2 id="reservar-titulo">Reservar</h2>
        <span class="secao-links"><a href="#/varias">Vários dias</a><a href="#/calendario">Calendário</a></span>
      </div>
      ${escolha.dia
        ? `${chipsDias(dias, agora)}${cartaoDia(escolha.dia, agora)}`
        : '<p class="vazio-curto">Nenhum cardápio publicado para os próximos dias.</p>'}
    </section>`);
}

// ---------- Calendário ----------

function calendario(agora) {
  const semanas = semanasDoCalendario(agora);
  const hoje = t.isoDate(agora);
  const primeiro = semanas[0][0];
  const ultimo = semanas.at(-1).at(-1);
  const titulo = primeiro.slice(0, 7) === ultimo.slice(0, 7)
    ? t.mesAno(primeiro)
    : `${t.mesAno(primeiro).split(' ')[0]} – ${t.mesAno(ultimo)}`;

  const dias = semanas.flat().map((iso) => {
    const temCardapio = Boolean(cardapioDo(iso, agora));
    const ativo = temCardapio && iso >= hoje;
    const reservado = temReserva(iso);
    const classes = ['dia-cal', iso === hoje && 'hoje', iso === escolha.dia && 'selecionado', reservado && 'com-reserva']
      .filter(Boolean).join(' ');
    const rotulo = `${t.dataLonga(iso)}${reservado ? ', com reserva' : ''}${temCardapio ? '' : ', sem cardápio'}`;
    return `<button type="button" class="${classes}" data-acao="dia" data-dia="${iso}"
      ${ativo ? '' : 'disabled'} aria-pressed="${iso === escolha.dia}" aria-label="${esc(rotulo)}">${Number(iso.slice(8))}</button>`;
  }).join('');

  return `<section class="cartao calendario" aria-label="Calendário">
    <h2 class="cal-titulo">${esc(titulo)}</h2>
    <div class="cal-grade">
      ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => `<span class="cal-sem" aria-hidden="true">${d}</span>`).join('')}
      ${dias}
    </div>
  </section>`;
}

function telaCalendario() {
  const agora = t.now();
  const dias = diasDisponiveis(agora);
  if (!dias.includes(escolha.dia)) {
    escolha.dia = diaPadrao(dias, agora);
    escolha.cardapioAberto = false;
  }

  pagina('inicio', `
    <header class="topo">${botaoVoltar()}<h1>Calendário</h1></header>
    ${calendario(agora)}
    <a class="botao secundario" href="#/varias">Reservar vários dias de uma vez</a>
    ${escolha.dia
      ? `<section class="reservar"><h2 class="dia-titulo">${esc(t.dataLonga(escolha.dia))}</h2>${cartaoDia(escolha.dia, agora)}</section>`
      : '<p class="vazio-curto">Nenhum cardápio publicado para os próximos dias.</p>'}`);
}

// ---------- Vários dias (RF07) ----------

const chave = (iso, r) => `${iso}|${r}`;

// Refeições que ainda dá para reservar, na ordem do calendário.
function refeicoesAbertas(agora) {
  return diasDisponiveis(agora).flatMap((iso) =>
    ORDEM_REFEICOES.filter((r) => situacao(iso, r, agora).tipo === 'aberto').map((r) => chave(iso, r)));
}

// Tira da seleção o que fechou ou foi reservado enquanto a tela estava aberta.
function limparSelecao(agora) {
  const abertas = new Set(refeicoesAbertas(agora));
  [...varias.selecao].forEach((k) => { if (!abertas.has(k)) varias.selecao.delete(k); });
}

function totalVarias(agora) {
  const n = varias.selecao.size;
  const extras = [...varias.extras].reduce((soma, e) => soma + ADICIONAIS[e].preco, 0);
  const total = store.categoriasDasProximas(store.usuarioAtual(), n, agora)
    .reduce((soma, c) => soma + CATEGORIAS[c].preco + extras, 0);
  return { n, total };
}

function textoBotaoVarias(agora) {
  const { n, total } = totalVarias(agora);
  if (!n) return 'Marque as refeições';
  return `Reservar ${n} ${n === 1 ? 'refeição' : 'refeições'} · ${reais(total)}`;
}

function toggleRefeicao(iso, r, agora) {
  const s = situacao(iso, r, agora);
  const nome = REFEICOES[r].nome;
  if (s.tipo === 'reservado') {
    return `<a class="toggle reservada" href="#/reserva/${s.reserva.id}">${ICONES.check}${nome}<span>Reservado</span></a>`;
  }
  if (s.tipo === 'fechado') {
    return `<span class="toggle fechada" aria-disabled="true">${nome}<span>Fechou</span></span>`;
  }
  const marcado = varias.selecao.has(chave(iso, r));
  return `<button type="button" class="toggle${marcado ? ' marcado' : ''}" data-acao="marcar" data-chave="${chave(iso, r)}"
    aria-pressed="${marcado}" aria-label="${esc(`${nome}, ${t.dataLonga(iso)}`)}">${ICONES.check}${nome}<span>${textoPrazo(iso, r, agora)}</span></button>`;
}

function nomeSemana(semana, agora) {
  const atual = semanaDe(t.isoDate(agora));
  if (semana === atual) return 'Esta semana';
  if (semana === t.isoDate(t.addDays(t.parseISO(atual), 7))) return 'Próxima semana';
  return `Semana de ${semana.slice(8)}/${semana.slice(5, 7)}`;
}

// "2 marcadas" para o resumo da semana (vazio quando nada está marcado).
function textoMarcadas(semana) {
  const n = [...varias.selecao].filter((k) => semanaDe(k.split('|')[0]) === semana).length;
  return n ? `${n} ${n === 1 ? 'marcada' : 'marcadas'}` : '';
}

function telaVarias() {
  const agora = t.now();
  const usuario = store.usuarioAtual();
  limparSelecao(agora);
  const dias = diasDisponiveis(agora);

  const linha = (iso) => {
    const menu = cardapioDo(iso, agora);
    return `<li class="linha-dia">
      <div class="ld-info">
        <strong>${esc(t.quando(iso, agora).replace(/^./, (c) => c.toUpperCase()))}</strong>
        <span class="dica">${esc(menu.pratos[0].nome)}</span>
      </div>
      <div class="ld-refeicoes">${ORDEM_REFEICOES.map((r) => toggleRefeicao(iso, r, agora)).join('')}</div>
    </li>`;
  };

  // Uma seção recolhível por semana. Começa com a primeira aberta.
  const semanas = new Map();
  dias.forEach((iso) => {
    const s = semanaDe(iso);
    if (!semanas.has(s)) semanas.set(s, []);
    semanas.get(s).push(iso);
  });
  if (!varias.abertas) varias.abertas = new Set([...semanas.keys()].slice(0, 1));
  const ddmm = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;
  const secoes = [...semanas].map(([semana, ds]) => `
    <details class="semana-varias" data-semana="${semana}" ${varias.abertas.has(semana) ? 'open' : ''}>
      <summary>
        <span class="sv-titulo"><strong>${esc(nomeSemana(semana, agora))}</strong><span class="dica">${ddmm(ds[0])} a ${ddmm(ds.at(-1))}</span></span>
        <span class="sv-conta" data-conta="${semana}">${textoMarcadas(semana)}</span>
        <span class="sv-seta" aria-hidden="true">${ICONES.seta}</span>
      </summary>
      <ul class="lista-dias">${ds.map(linha).join('')}</ul>
    </details>`).join('');

  const extras = Object.entries(ADICIONAIS).map(([id, a]) => `
    <label class="opcao">
      <input type="checkbox" data-acao="extra-varias" data-extra="${id}" ${varias.extras.has(id) ? 'checked' : ''}>
      <span class="opcao-nome">${a.nome} em todas</span>
      <span class="opcao-preco">+ ${reais(a.preco)} cada</span>
    </label>`).join('');

  pagina('inicio', `
    <header class="topo">${botaoVoltar()}<h1>Vários dias</h1></header>
    ${dias.length ? `
      <div class="atalhos" role="group" aria-label="Marcar de uma vez">
        <span class="dica">Marcar todos:</span>
        <button type="button" class="botao secundario pequeno" data-acao="marcar-todos" data-refeicao="almoco">Almoços</button>
        <button type="button" class="botao secundario pequeno" data-acao="marcar-todos" data-refeicao="jantar">Jantares</button>
        <button type="button" class="botao texto pequeno" data-acao="limpar-varias">Limpar</button>
      </div>
      <div class="semanas-varias">${secoes}</div>
      <div class="opcoes">${extras}</div>
      <div class="barra-confirmar">
        <button type="button" class="botao primario grande" data-acao="confirmar-varias" id="confirmar-varias"
          ${varias.selecao.size ? '' : 'disabled'}>${textoBotaoVarias(agora)}</button>
        <p class="dica centro">${esc(textoCategoria(usuario, agora))} · pagamento no balcão</p>
      </div>`
    : '<p class="vazio-curto">Nenhum cardápio publicado para os próximos dias.</p>'}`);
}

// Atualiza só o botão de confirmar, sem redesenhar a tela (mantém o foco e a rolagem).
function atualizarBarraVarias() {
  const botao = document.getElementById('confirmar-varias');
  if (!botao) return;
  botao.textContent = textoBotaoVarias(t.now());
  botao.disabled = varias.selecao.size === 0;
  document.querySelectorAll('[data-conta]').forEach((el) => { el.textContent = textoMarcadas(el.dataset.conta); });
}

function confirmarVarias() {
  const agora = t.now();
  const pedidas = varias.selecao.size;
  limparSelecao(agora);
  const itens = [...varias.selecao].sort().map((k) => {
    const [data, refeicao] = k.split('|');
    return { data, refeicao, extras: Object.keys(ADICIONAIS).filter((e) => varias.extras.has(e)) };
  });
  if (!itens.length) {
    toast('Essas refeições fecharam. Escolha outras.');
    return rota();
  }
  store.criarReservas(itens, agora);
  varias.selecao.clear();
  varias.extras.clear();
  const n = itens.length;
  const fora = pedidas - n;
  toast(`${n} ${n === 1 ? 'refeição reservada' : 'refeições reservadas'}${fora ? ` (${fora} já tinha${fora === 1 ? '' : 'm'} fechado)` : ''}`);
  ir('/reservas');
}

// ---------- Folhas (reserva rápida e cancelamento) ----------

function abrirFolha(html, rotulo) {
  fecharFolha();
  const fundo = document.createElement('div');
  fundo.className = 'folha-fundo';
  fundo.innerHTML = `<div class="folha" role="dialog" aria-modal="true" aria-labelledby="${rotulo}">
    <div class="folha-alca" aria-hidden="true"></div>${html}</div>`;
  document.body.appendChild(fundo);
  requestAnimationFrame(() => fundo.classList.add('aberta'));
  return fundo;
}

function fecharFolha() {
  document.querySelectorAll('.folha-fundo').forEach((f) => f.remove());
}

function totalRapida() {
  return store.precoDe(store.usuarioAtual(), [...rapida.extras], t.now());
}

// Nome da categoria que vale agora, com o aviso de desconto bloqueado quando for o caso.
function textoCategoria(usuario, agora) {
  const s = store.situacaoFaltas(usuario, agora);
  if (s.aplica && s.pendentes) return s.pendentes === 1 ? 'Sem desconto nesta reserva (falta)' : `Sem desconto nas próximas ${s.pendentes} reservas (faltas)`;
  return CATEGORIAS[store.categoriaAplicada(usuario, agora)].nome;
}

function abrirReserva(dia, refeicao) {
  const agora = t.now();
  if (situacao(dia, refeicao, agora).tipo !== 'aberto') return rota();
  rapida.dia = dia;
  rapida.refeicao = refeicao;
  rapida.extras = new Set();

  const ref = REFEICOES[refeicao];
  const menu = cardapioDo(dia, agora);
  const usuario = store.usuarioAtual();
  const [principal, opcao, guarnicao] = menu.pratos;
  const tags = (item) => item.tags.map((tag) => `<span class="tag tag-${tag}">${TAGS[tag]}</span>`).join('');
  const rel = t.relativo(dia, agora);
  const prazo = `cancela até ${t.hora(ref.corte)}${rel === 'hoje' ? '' : rel === 'amanhã' ? ' de amanhã' : ' do dia'}`;

  const extras = Object.entries(ADICIONAIS).map(([id, a]) => `
    <label class="opcao">
      <input type="checkbox" data-acao="extra" data-extra="${id}">
      <span class="opcao-nome">${a.nome}</span>
      <span class="opcao-preco">+ ${reais(a.preco)}</span>
    </label>`).join('');

  const folha = abrirFolha(`
    <div class="folha-topo">
      <div>
        <h2 id="folha-titulo">${ref.nome}, ${esc(t.quando(dia, agora))}</h2>
        <p class="dica">${esc(t.dataLonga(dia))}</p>
      </div>
      <button type="button" class="fechar" data-acao="fechar-folha" aria-label="Fechar">${ICONES.fechar}</button>
    </div>
    <div class="resumo-menu">
      <div class="resumo-linha"><strong>${esc(principal.nome)}</strong><span class="tags">${tags(principal)}</span></div>
      ${opcao ? `<div class="resumo-linha"><span>${esc(opcao.nome)}</span><span class="tags">${tags(opcao)}</span></div>` : ''}
      <p class="dica">${[
        guarnicao && esc(guarnicao.nome),
        'arroz e feijão',
        menu.saladas.length && `${menu.saladas.length} ${menu.saladas.length === 1 ? 'salada' : 'saladas'}`,
        menu.suco && `suco de ${esc(minuscula(menu.suco.nome))}`,
      ].filter(Boolean).join(' · ')}</p>
    </div>
    <div class="opcoes">${extras}</div>
    <div class="folha-rodape">
      <button type="button" class="botao primario grande" data-acao="confirmar-reserva" id="confirmar-reserva">
        Confirmar · ${reais(totalRapida())}</button>
      <p class="dica centro">${esc(textoCategoria(usuario, agora))} · pagamento no balcão · ${prazo}</p>
    </div>`, 'folha-titulo');
  folha.querySelector('#confirmar-reserva').focus();
}

function confirmarReserva() {
  const { dia, refeicao } = rapida;
  const ref = REFEICOES[refeicao];
  fecharFolha();
  if (situacao(dia, refeicao, t.now()).tipo !== 'aberto') {
    toast(`As reservas para o ${ref.nome.toLowerCase()} fecharam às ${t.hora(ref.corte)}.`);
    return rota();
  }
  const extras = Object.keys(ADICIONAIS).filter((e) => rapida.extras.has(e));
  store.criarReserva({ data: dia, refeicao, extras }, t.now());
  toast(`${ref.nome} reservado`);
  rota();
}

// Texto do que acontece se a pessoa cancelar agora: nada, ou uma falta (e talvez o bloqueio).
function avisoCancelamento(r, agora) {
  const corte = t.hora(REFEICOES[r.refeicao].corte);
  if (!passouCorte(r, agora)) return `<p class="info">Sem penalidade: o prazo vai até ${corte}${t.relativo(r.data, agora) === 'hoje' ? '' : ' do dia'}.</p>`;
  const s = store.situacaoFaltas(store.usuarioAtual(), agora);
  const n = s.total + 1;
  const penaliza = s.aplica && n >= s.limite;
  return `<p class="alerta">Já passou das ${corte}. Cancelar agora conta como falta (${n}ª)${penaliza
    ? '<strong> e a sua próxima reserva fica sem o desconto de estudante</strong>' : ''}.</p>`;
}

function pedirCancelamento(id) {
  const r = store.buscarReserva(id);
  if (!r) return;
  const agora = t.now();
  const comFalta = passouCorte(r, agora);
  const folha = abrirFolha(`
    <h2 id="folha-titulo">Cancelar o ${REFEICOES[r.refeicao].nome.toLowerCase()} de ${esc(t.quando(r.data, agora))}?</h2>
    ${avisoCancelamento(r, agora)}
    <button class="botao perigo-cheio" type="button" data-acao="confirmar-cancelamento" data-id="${r.id}">
      ${comFalta ? 'Cancelar mesmo assim' : 'Cancelar reserva'}</button>
    <button class="botao secundario" type="button" data-acao="fechar-folha">Manter reserva</button>`, 'folha-titulo');
  folha.querySelector('[data-acao="fechar-folha"]').focus();
}

function confirmarCancelamento(id) {
  fecharFolha();
  const r = store.buscarReserva(id);
  if (!r) return;
  const agora = t.now();
  if (!podeCancelar(r, agora)) {
    toast('Essa refeição já terminou.');
    return rota();
  }
  store.cancelarReserva(id, agora);
  toast(passouCorte(r, agora) ? 'Reserva cancelada. Contou como falta.' : 'Reserva cancelada');
  rota();
}

// ---------- Minhas reservas ----------

function linhaReserva(r, agora) {
  let status = '';
  if (store.faltaDe(r, agora)) status = '<span class="status falta">Falta</span>';
  else if (r.status === 'cancelada') status = '<span class="status cancelada">Cancelada</span>';
  else if (r.status === 'utilizada') status = '<span class="status usada">Usada</span>';
  else if (terminou(r, agora)) status = '<span class="status encerrada">Encerrada</span>';
  else if (t.relativo(r.data, agora) === 'hoje') status = '<span class="status hoje">Hoje</span>';

  return `<li><a class="linha-reserva" href="#/reserva/${r.id}">
    <span class="lr-data"><strong>${esc(t.dataCurta(r.data))}</strong>${REFEICOES[r.refeicao].nome}</span>
    <span class="lr-info">${textoExtras(r.extras)} · ${reais(r.valor)}</span>
    ${status}
    <span class="lr-seta">${ICONES.seta}</span>
  </a></li>`;
}

function telaReservas() {
  const agora = t.now();
  const todas = store.reservasDoUsuario().sort(ordenar);
  const proximas = todas.filter((r) => r.status === 'ativa' && !terminou(r, agora));
  const anteriores = todas.filter((r) => !proximas.includes(r)).reverse();

  const conteudo = todas.length === 0
    ? `<div class="vazio">
        <p>As reservas que você fizer aparecem aqui, com o QR Code para a entrada.</p>
        <a class="botao primario" href="#/inicio">Reservar</a>
      </div>`
    : `${proximas.length
        ? `<h2 class="rotulo">Próximas</h2><ul class="lista">${proximas.map((r) => linhaReserva(r, agora)).join('')}</ul>`
        : '<p class="vazio-curto">Nenhuma reserva próxima. <a href="#/inicio">Reservar</a></p>'}
      ${anteriores.length
        ? `<h2 class="rotulo">Anteriores</h2><ul class="lista anteriores">${anteriores.map((r) => linhaReserva(r, agora)).join('')}</ul>`
        : ''}`;

  pagina('reservas', `<header class="topo"><h1>Minhas reservas</h1></header>${conteudo}`);
}

// ---------- Bilhete (QR Code) ----------

function telaBilhete(id) {
  const r = store.buscarReserva(id);
  if (!r) return ir('/reservas', true);
  const agora = t.now();
  const usuario = store.usuarioAtual();
  const refeicao = REFEICOES[r.refeicao];
  const ativa = r.status === 'ativa';
  const encerrada = ativa && terminou(r, agora);
  const cancelavel = podeCancelar(r, agora);
  const rel = t.relativo(r.data, agora);
  const quando = rel || t.dataLonga(r.data).split(',')[0].toLowerCase();
  const falta = store.faltaDe(r, agora);

  let estado = '';
  if (r.status === 'utilizada') estado = `<p class="selo usada">${ICONES.check}Check-in às ${dataHora(r.checkinEm).split(', ').at(-1)}</p>`;
  else if (falta === 'apos-corte') estado = '<p class="selo falta">Cancelada depois do corte: contou como falta</p>';
  else if (falta === 'nao-veio') estado = '<p class="selo falta">Falta: a refeição terminou sem check-in</p>';
  else if (!ativa) estado = '<p class="selo cancelada">Reserva cancelada</p>';
  else if (encerrada) estado = '<p class="selo encerrada">Refeição encerrada</p>';

  const qr = ativa && !encerrada
    ? `<div class="qr" role="img" aria-label="QR Code da reserva">${qrSvg(`RU:${r.codigo}`)}</div>
       <p class="codigo-reserva">${esc(r.codigo)}</p>
       <p class="qr-legenda">Apresente na entrada do RU</p>`
    : estado;

  pagina('reservas', `
    <header class="topo">
      ${botaoVoltar()}
      <div>
        <p class="saudacao">${esc(t.dataLonga(r.data))}</p>
        <h1>${refeicao.nome}</h1>
      </div>
    </header>
    <section class="cartao bilhete${ativa && !encerrada ? '' : ' inativo'}">
      ${qr}
      <dl class="detalhes">
        <div><dt>Nome</dt><dd>${esc(usuario.nome)}</dd></div>
        <div><dt>Perfil</dt><dd>${esc(store.perfilDe(usuario).nome)}</dd></div>
        <div><dt>Adicionais</dt><dd>${textoExtras(r.extras)}</dd></div>
        <div><dt>Valor</dt><dd><strong>${reais(r.valor)}</strong> · ${CATEGORIAS[r.categoria].nome}</dd></div>
        <div><dt>Pagamento</dt><dd>${r.pagamento ? `Pago · ${FORMAS_PAGAMENTO[r.pagamento.forma]}` : 'No balcão<br><span class="dica">dinheiro, PIX ou cartão</span>'}</dd></div>
      </dl>
    </section>
    ${cancelavel ? `
      <button class="botao perigo" type="button" data-acao="pedir-cancelamento" data-id="${r.id}">Cancelar reserva</button>
      <p class="dica centro">${passouCorte(r, agora)
        ? `O prazo terminou às ${t.hora(refeicao.corte)}. Cancelar agora conta como falta.`
        : `Dá para cancelar sem penalidade até ${t.hora(refeicao.corte)} de ${esc(quando)}.`}</p>` : ''}
    ${cancelavel && rel === 'hoje' ? `
      <section class="cartao demo">
        <h2>Demonstração</h2>
        <p class="dica">No sistema real, o caixa lê o QR Code. Aqui dá para simular a leitura; sem ela, a reserva vira falta às ${t.hora(refeicao.fim)}.</p>
        <button class="botao secundario" type="button" data-acao="checkin" data-id="${r.id}">Simular check-in</button>
      </section>` : ''}
  `);
}

// ---------- Perfil ----------

// Cartão de faltas (RF12): quantas faltas a pessoa tem e se a próxima reserva fica sem desconto.
function cartaoFaltas(u, agora) {
  const s = store.situacaoFaltas(u, agora);
  const pontos = Array.from({ length: s.limite }, (_, i) =>
    `<span class="ponto${i < s.total ? ' cheio' : ''}"></span>`).join('');

  let situacao;
  if (!s.aplica) situacao = 'Seu perfil não tem desconto de estudante, então as faltas não mudam o valor. Elas ficam registradas para o RU.';
  else if (s.pendentes) {
    situacao = `<strong>${s.pendentes === 1 ? 'Sua próxima reserva fica' : `Suas próximas ${s.pendentes} reservas ficam`} sem o desconto de estudante</strong> (${reais(CATEGORIAS.demais.preco)}).`;
  } else if (s.total >= s.limite) situacao = 'Cada nova falta tira o desconto de estudante da reserva seguinte.';
  else if (s.total === s.limite - 1) situacao = '<strong>Na próxima falta</strong>, a reserva seguinte fica sem o desconto de estudante.';
  else situacao = `A partir da ${s.limite}ª falta, cada falta tira o desconto de estudante da reserva seguinte.`;

  const lista = s.faltas.slice(0, 5).map((f) => `<li>
      <span><strong>${esc(t.dataCurta(f.reserva.data))}</strong> · ${REFEICOES[f.reserva.refeicao].nome}</span>
      <span class="dica">${MOTIVO_FALTA[f.tipo]}</span></li>`).join('');

  return `<section class="cartao faltas${s.pendentes && s.aplica ? ' bloqueado' : ''}" aria-labelledby="faltas-titulo">
    <div class="faltas-topo">
      <h2 id="faltas-titulo">Faltas</h2>
      <span class="faltas-conta" aria-label="${s.total} ${s.total === 1 ? 'falta' : 'faltas'}">${pontos}<span>${s.total}</span></span>
    </div>
    <p class="dica">${situacao}</p>
    <p class="dica">Conta como falta não vir sem cancelar, ou cancelar depois do corte.</p>
    ${lista ? `<ul class="lista-faltas">${lista}</ul>` : ''}
  </section>`;
}

// Aviso no Início quando a próxima reserva fica sem desconto ou falta uma falta para isso.
function avisoFaltas(u, agora) {
  const s = store.situacaoFaltas(u, agora);
  if (!s.aplica) return '';
  if (s.pendentes) {
    return `<a class="aviso-faltas bloqueado" href="#/perfil">Por causa das faltas, ${s.pendentes === 1 ? 'a próxima reserva fica' : `as próximas ${s.pendentes} reservas ficam`} sem o desconto de estudante.</a>`;
  }
  if (s.total === s.limite - 1) {
    return `<a class="aviso-faltas" href="#/perfil">Você tem ${s.total} faltas. Com mais uma, a reserva seguinte fica sem o desconto de estudante.</a>`;
  }
  return '';
}

function telaPerfil() {
  const u = store.usuarioAtual();
  const perfil = store.perfilDe(u);
  const agora = t.now();
  const categoria = CATEGORIAS[store.categoriaAplicada(u, agora)];

  pagina('perfil', `
    <header class="topo"><h1>Perfil</h1></header>
    <section class="cartao">
      <dl class="detalhes">
        <div><dt>Nome</dt><dd>${esc(u.nome)}</dd></div>
        <div><dt>E-mail</dt><dd>${esc(u.email)}</dd></div>
        <div><dt>Perfil</dt><dd>${esc(perfil.nome)}</dd></div>
        ${perfil.upf && u.matricula ? `<div><dt>Matrícula</dt><dd>${esc(u.matricula)}</dd></div>` : ''}
        <div><dt>Valor por refeição</dt><dd><strong>${reais(categoria.preco)}</strong> · ${esc(textoCategoria(u, agora))}</dd></div>
      </dl>
      <a class="botao secundario" href="#/cadastro">Editar dados</a>
    </section>
    ${cartaoFaltas(u, agora)}
    <button class="botao texto" type="button" data-acao="sair">Sair</button>

    <section class="cartao demo">
      <h2>Demonstração</h2>
      <p class="dica">Muda o relógio do app para testar os horários de corte.</p>
      <form class="formulario" data-form="horario">
        <label for="horario">Horário simulado</label>
        <input id="horario" name="horario" type="datetime-local" value="${t.paraInputLocal(agora)}" required>
        <div class="linha-botoes">
          <button class="botao secundario" type="submit">Aplicar</button>
          ${t.simulando() ? '<button class="botao texto" type="button" data-acao="horario-real">Usar horário real</button>' : ''}
        </div>
      </form>
      <button class="botao texto perigo-texto" type="button" data-acao="apagar-tudo">Apagar todos os dados</button>
    </section>
  `);
}

// ---------- Eventos ----------

const acoes = {
  'outro-email': () => { store.cancelarCodigo(); rota(); },
  voltar: () => {
    const nome = location.hash.slice(2).split('/')[0];
    ir({ calendario: '/inicio', varias: '/inicio', cadastro: '/perfil', reserva: origemBilhete }[nome] || '/inicio');
  },
  marcar: (el) => {
    const k = el.dataset.chave;
    if (varias.selecao.has(k)) varias.selecao.delete(k);
    else varias.selecao.add(k);
    const marcado = varias.selecao.has(k);
    el.classList.toggle('marcado', marcado);
    el.setAttribute('aria-pressed', String(marcado));
    atualizarBarraVarias();
  },
  'marcar-todos': (el) => {
    refeicoesAbertas(t.now()).filter((k) => k.endsWith(`|${el.dataset.refeicao}`)).forEach((k) => varias.selecao.add(k));
    rota();
  },
  'limpar-varias': () => { varias.selecao.clear(); rota(); },
  'confirmar-varias': confirmarVarias,
  checkin: (el) => {
    store.registrarCheckin(el.dataset.id, t.now());
    toast('Check-in registrado');
    rota();
  },
  dia: (el) => {
    if (escolha.dia !== el.dataset.dia) {
      escolha.dia = el.dataset.dia;
      escolha.cardapioAberto = false;
    }
    rota();
  },
  cardapio: () => { escolha.cardapioAberto = !escolha.cardapioAberto; rota(); },
  'abrir-reserva': (el) => abrirReserva(el.dataset.dia, el.dataset.refeicao),
  'confirmar-reserva': confirmarReserva,
  'pedir-cancelamento': (el) => pedirCancelamento(el.dataset.id),
  'confirmar-cancelamento': (el) => confirmarCancelamento(el.dataset.id),
  'fechar-folha': fecharFolha,
  sair: () => { store.sair(); escolha.dia = null; ir('/entrar'); },
  'horario-real': () => { t.usarHorarioReal(); escolha.dia = null; toast('Usando o horário real'); rota(); },
  'apagar-tudo': () => {
    store.apagarTudo();
    escolha.dia = null;
    toast('Dados apagados');
    ir('/entrar');
  },
};

document.addEventListener('click', (ev) => {
  if (ev.target.classList?.contains('folha-fundo')) return fecharFolha();
  const el = ev.target.closest('[data-acao]');
  if (!el || el.disabled || el.type === 'checkbox') return;
  const acao = acoes[el.dataset.acao];
  if (acao) { ev.preventDefault(); acao(el); }
});

// Lembra quais semanas estão abertas, para a tela redesenhar do mesmo jeito.
// O evento "toggle" não sobe pela árvore, então é ouvido na captura.
document.addEventListener('toggle', (ev) => {
  const el = ev.target;
  if (!el.matches?.('details.semana-varias') || !varias.abertas) return;
  if (el.open) varias.abertas.add(el.dataset.semana);
  else varias.abertas.delete(el.dataset.semana);
}, true);

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset.acao === 'extra') {
    if (el.checked) rapida.extras.add(el.dataset.extra);
    else rapida.extras.delete(el.dataset.extra);
    const botao = document.getElementById('confirmar-reserva');
    if (botao) botao.textContent = `Confirmar · ${reais(totalRapida())}`;
  }
  if (el.dataset.acao === 'extra-varias') {
    if (el.checked) varias.extras.add(el.dataset.extra);
    else varias.extras.delete(el.dataset.extra);
    atualizarBarraVarias();
  }
  if (el.id === 'perfil' && el.form?.dataset.form === 'cadastro') {
    const perfil = PERFIS.find((p) => p.id === el.value);
    document.getElementById('preco-perfil').innerHTML = precoPerfil(perfil);
    document.getElementById('campo-matricula').hidden = !perfil.upf;
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') fecharFolha();
});

const formularios = {
  email: (dados) => {
    const email = String(dados.get('email') || '').trim().toLowerCase();
    emailDigitado = email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mostrarErro('Digite um e-mail válido.');
    store.enviarCodigo(email);
    rota();
    document.getElementById('codigo')?.focus();
  },
  codigo: (dados) => {
    const codigo = String(dados.get('codigo') || '').replace(/\D/g, '');
    const resultado = store.verificarCodigo(codigo);
    if (resultado === 'errado') return mostrarErro('Código incorreto.');
    if (resultado === 'bloqueado') {
      store.cancelarCodigo();
      toast('Muitas tentativas. Peça um novo código.');
      return rota();
    }
    if (resultado === 'expirado') {
      toast('O código expirou. Peça um novo.');
      return rota();
    }
    ir(store.usuarioAtual() ? '/inicio' : '/cadastro', true);
  },
  cadastro: (dados) => {
    const nome = String(dados.get('nome') || '').trim();
    const perfilId = String(dados.get('perfil') || '');
    const perfil = PERFIS.find((p) => p.id === perfilId);
    const matricula = String(dados.get('matricula') || '').trim();
    if (!nome) return mostrarErro('Informe seu nome.');
    if (!perfil) return mostrarErro('Escolha um perfil.');
    if (perfil.upf && !matricula) return mostrarErro('Informe sua matrícula.');
    const editando = Boolean(store.usuarioAtual());
    store.salvarUsuario({ nome, perfil: perfilId, matricula: perfil.upf ? matricula : '' });
    if (editando) { toast('Dados salvos'); ir('/perfil'); } else ir('/inicio', true);
  },
  horario: (dados) => {
    const data = new Date(String(dados.get('horario') || ''));
    if (Number.isNaN(data.getTime())) return;
    t.simularHorario(data);
    escolha.dia = null;
    toast('Horário simulado aplicado');
    rota();
  },
};

document.addEventListener('submit', (ev) => {
  const fn = formularios[ev.target.dataset.form];
  if (!fn) return;
  ev.preventDefault();
  fn(new FormData(ev.target));
});

// Campo de código: só números.
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'codigo') ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 6);
});

// ---------- Rotas ----------

let rotaAnterior = '';
// Para onde o "voltar" do bilhete leva: a tela de onde ele foi aberto.
let origemBilhete = '/inicio';

function rota() {
  fecharFolha();
  const hash = location.hash.slice(2) || 'inicio';
  const [nome, param] = hash.split('/');

  if (!store.sessao()) {
    if (nome !== 'entrar') return ir('/entrar', true);
    telaEntrar();
  } else if (!store.usuarioAtual()) {
    if (nome !== 'cadastro') return ir('/cadastro', true);
    telaCadastro();
  } else {
    switch (nome) {
      case 'inicio': telaInicio(); break;
      case 'calendario': telaCalendario(); break;
      case 'varias': telaVarias(); break;
      case 'reservas': telaReservas(); break;
      case 'reserva': telaBilhete(param); break;
      case 'perfil': telaPerfil(); break;
      case 'cadastro': telaCadastro(); break;
      default: return ir('/inicio', true);
    }
  }

  if (hash !== rotaAnterior) {
    if (nome === 'reserva' && !rotaAnterior.startsWith('reserva')) origemBilhete = `/${rotaAnterior || 'inicio'}`;
    window.scrollTo(0, 0);
    rotaAnterior = hash;
  }
}

window.addEventListener('hashchange', rota);
rota();
