// Configuração e dados simulados do protótipo.
// Tudo que depende de resposta do Pedro está marcado com "A CONFIRMAR".
// Os valores abaixo são o padrão. A tela Ajustes da equipe pode mudá-los (chave ru.ajustes).

import { isoDate, addDays, startOfWeek, parseISO } from './time.js';
import { ler, gravar } from './armazem.js';

// Valores em centavos, para evitar erro de arredondamento.
// RN01: R$ 10 para estudantes, R$ 15 para funcionários e R$ 20 para os demais.
export const CATEGORIAS = {
  estudante: { nome: 'Estudante', preco: 1000 },
  funcionario: { nome: 'Funcionário', preco: 1500 },
  demais: { nome: 'Demais clientes', preco: 2000 },
};

// Os 8 perfis do formulário atual.
// A CONFIRMAR: quais perfis pagam preço de estudante.
export const PERFIS = [
  { id: 'graduacao', nome: 'Aluno de graduação', categoria: 'estudante', upf: true },
  { id: 'pos', nome: 'Aluno de pós-graduação', categoria: 'estudante', upf: true },
  { id: 'creati', nome: 'Aluno Creati', categoria: 'estudante', upf: true },
  { id: 'integrado', nome: 'Aluno Integrado', categoria: 'estudante', upf: true },
  { id: 'rede', nome: 'Estudante da rede municipal/estadual', categoria: 'estudante', upf: false },
  { id: 'residente', nome: 'Residente multiprofissional', categoria: 'demais', upf: true },
  { id: 'funcionario', nome: 'Funcionário UPF', categoria: 'funcionario', upf: true },
  { id: 'externo', nome: 'Professor ou comunidade externa', categoria: 'demais', upf: false },
];

export const ADICIONAIS = {
  marmita: { nome: 'Marmita', preco: 250 },
  suco: { nome: 'Suco', preco: 300 },
};

// corte: até quando dá para reservar ou cancelar a refeição do dia.
// fim: quando a refeição termina. Reserva sem check-in até esse horário vira falta.
// A CONFIRMAR: os cortes repetem os fechamentos do formulário (10h e 16h); o fim é suposição.
export const REFEICOES = {
  almoco: { nome: 'Almoço', corte: '10:00', fim: '14:00' },
  jantar: { nome: 'Jantar', corte: '16:00', fim: '20:00' },
};

// Dias da semana com refeição (0 = domingo).
export const FUNCIONAMENTO = { dias: [1, 2, 3, 4, 5] };

// Penalidade por falta (RN05). Conta como falta não vir sem cancelar, ou cancelar depois do corte.
// Regra "1 para 1": a partir da falta número `faltas`, cada falta tira o desconto de estudante
// da reserva seguinte, e só dela. Só vale para quem paga preço de estudante.
// A CONFIRMAR: se a contagem de faltas zera em algum momento (hoje não zera).
export const PENALIDADE = { faltas: 3 };

// A primeira é a principal no balcão (botão maior no Atendimento).
export const FORMAS_PAGAMENTO = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito' };

// Os seis símbolos da legenda do cardápio.
export const TAGS = {
  vegano: 'Vegano',
  animal: 'Origem animal',
  lactose: 'Lactose',
  suino: 'Suíno',
  gluten: 'Glúten',
  ovo: 'Ovo',
};

export const ACOMPANHAMENTO = { nome: 'Arroz branco, arroz integral e feijão', tags: ['vegano'] };

// ---------- Ajustes (tela Ajustes da equipe) ----------

const K_AJUSTES = 'ru.ajustes';

export function ajustes() {
  return {
    precos: {
      estudante: CATEGORIAS.estudante.preco,
      funcionario: CATEGORIAS.funcionario.preco,
      demais: CATEGORIAS.demais.preco,
      marmita: ADICIONAIS.marmita.preco,
      suco: ADICIONAIS.suco.preco,
    },
    perfis: Object.fromEntries(PERFIS.map((p) => [p.id, p.categoria])),
    refeicoes: Object.fromEntries(Object.entries(REFEICOES).map(([id, r]) => [id, { corte: r.corte, fim: r.fim }])),
    dias: [...FUNCIONAMENTO.dias],
    penalidade: { ...PENALIDADE },
  };
}

const PADRAO = ajustes();

function aplicar(a) {
  CATEGORIAS.estudante.preco = a.precos.estudante;
  CATEGORIAS.funcionario.preco = a.precos.funcionario;
  CATEGORIAS.demais.preco = a.precos.demais;
  ADICIONAIS.marmita.preco = a.precos.marmita;
  ADICIONAIS.suco.preco = a.precos.suco;
  PERFIS.forEach((p) => { p.categoria = a.perfis[p.id] || p.categoria; });
  Object.entries(a.refeicoes).forEach(([id, r]) => { if (REFEICOES[id]) Object.assign(REFEICOES[id], r); });
  FUNCIONAMENTO.dias = [...a.dias];
  Object.assign(PENALIDADE, a.penalidade);
}

function comPadrao(salvo) {
  const refeicoes = Object.fromEntries(Object.entries(PADRAO.refeicoes)
    .map(([id, r]) => [id, { ...r, ...salvo.refeicoes?.[id] }]));
  return {
    precos: { ...PADRAO.precos, ...salvo.precos },
    perfis: { ...PADRAO.perfis, ...salvo.perfis },
    refeicoes,
    dias: salvo.dias || PADRAO.dias,
    penalidade: { ...PADRAO.penalidade, ...salvo.penalidade },
  };
}

export function carregarAjustes() {
  const salvo = ler(K_AJUSTES, null);
  aplicar(salvo ? comPadrao(salvo) : PADRAO);
}

export function salvarAjustes(a) {
  gravar(K_AJUSTES, a);
  carregarAjustes();
}

export function restaurarAjustes() {
  gravar(K_AJUSTES, null);
  carregarAjustes();
}

carregarAjustes();

// ---------- Cardápios ----------

const p = (nome, ...tags) => ({ nome, tags });

// Cardápios de exemplo. Cada dia útil recebe um deles, sem ciclo fixo por dia da semana.
const MODELOS = [
  { pratos: [p('Frango assado com ervas', 'animal'), p('Lentilha ao curry', 'vegano'), p('Batata sauté', 'vegano')],
    saladas: [p('Alface americana', 'vegano'), p('Tomate com cebola', 'vegano'), p('Beterraba ralada', 'vegano')],
    suco: p('Laranja', 'vegano') },
  { pratos: [p('Strogonoff de carne', 'animal', 'lactose'), p('Strogonoff de grão-de-bico', 'vegano'), p('Batata palha', 'vegano')],
    saladas: [p('Rúcula', 'vegano'), p('Cenoura ralada', 'vegano'), p('Pepino', 'vegano')],
    suco: p('Uva', 'vegano') },
  { pratos: [p('Feijoada', 'animal', 'suino'), p('Tofu acebolado', 'vegano'), p('Couve refogada', 'vegano')],
    saladas: [p('Repolho roxo', 'vegano'), p('Tomate', 'vegano'), p('Laranja em rodelas', 'vegano')],
    suco: p('Abacaxi com hortelã', 'vegano') },
  { pratos: [p('Lasanha à bolonhesa', 'animal', 'lactose', 'gluten'), p('Lasanha de berinjela', 'lactose', 'gluten'), p('Legumes no vapor', 'vegano')],
    saladas: [p('Mix de folhas', 'vegano'), p('Chuchu', 'vegano'), p('Milho e ervilha', 'vegano')],
    suco: p('Maracujá', 'vegano') },
  { pratos: [p('Peixe ao molho de tomate', 'animal'), p('Escondidinho de mandioca com legumes', 'vegano'), p('Purê de abóbora', 'vegano')],
    saladas: [p('Alface crespa', 'vegano'), p('Beterraba cozida', 'vegano'), p('Brócolis', 'vegano')],
    suco: p('Limão', 'vegano') },
  { pratos: [p('Carne de panela com legumes', 'animal'), p('Almôndegas de lentilha', 'vegano', 'gluten'), p('Polenta frita', 'vegano')],
    saladas: [p('Agrião', 'vegano'), p('Cenoura cozida', 'vegano'), p('Tomate cereja', 'vegano')],
    suco: p('Acerola', 'vegano') },
  { pratos: [p('Panqueca de frango', 'animal', 'lactose', 'gluten', 'ovo'), p('Panqueca de espinafre', 'lactose', 'gluten', 'ovo'), p('Arroz com brócolis', 'vegano')],
    saladas: [p('Alface americana', 'vegano'), p('Pepino', 'vegano'), p('Grão-de-bico', 'vegano')],
    suco: p('Manga', 'vegano') },
  { pratos: [p('Lombo suíno assado', 'animal', 'suino'), p('Grão-de-bico com abóbora', 'vegano'), p('Aipim cozido', 'vegano')],
    saladas: [p('Rúcula', 'vegano'), p('Repolho verde', 'vegano'), p('Beterraba ralada', 'vegano')],
    suco: p('Morango', 'vegano') },
  { pratos: [p('Galinhada', 'animal'), p('Risoto de cogumelos', 'lactose'), p('Abobrinha refogada', 'vegano')],
    saladas: [p('Mix de folhas', 'vegano'), p('Tomate com manjericão', 'vegano'), p('Cenoura ralada', 'vegano')],
    suco: p('Goiaba', 'vegano') },
  { pratos: [p('Omelete de legumes', 'animal', 'ovo'), p('Hambúrguer de feijão', 'vegano', 'gluten'), p('Macarrão alho e óleo', 'vegano', 'gluten')],
    saladas: [p('Alface crespa', 'vegano'), p('Vagem', 'vegano'), p('Milho', 'vegano')],
    suco: p('Caju', 'vegano') },
];

// Sem nada salvo, a semana atual e a seguinte usam os cardápios de exemplo e já saem publicadas.
const SEMANAS_DE_EXEMPLO = 2;
export const SEMANAS_NO_CALENDARIO = 3;

const K_CARDAPIOS = 'ru.cardapios';
const K_PUBLICACAO = 'ru.publicacao';

export function diaDeFuncionamento(iso) {
  return FUNCIONAMENTO.dias.includes(parseISO(iso).getDay());
}

// Domingo da semana do dia, em ISO.
export function semanaDe(iso) {
  return isoDate(startOfWeek(parseISO(iso)));
}

function semanaDeExemplo(iso, hoje) {
  const inicio = startOfWeek(hoje);
  const data = parseISO(iso);
  return data >= inicio && data < addDays(inicio, SEMANAS_DE_EXEMPLO * 7);
}

function exemploDo(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const n = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return structuredClone(MODELOS[n % MODELOS.length]);
}

// Cardápio do dia, publicado ou não. null quando o dia não tem cardápio.
// pratos: [principal, segunda opção, guarnição]; as duas últimas podem ser null. suco pode ser null.
export function menuDo(iso, hoje) {
  if (!diaDeFuncionamento(iso)) return null;
  const salvos = ler(K_CARDAPIOS, {});
  if (iso in salvos) return salvos[iso];
  return semanaDeExemplo(iso, hoje) ? exemploDo(iso) : null;
}

export function semanaPublicada(semana, hoje) {
  const publicacao = ler(K_PUBLICACAO, {});
  return semana in publicacao ? publicacao[semana] : semanaDeExemplo(semana, hoje);
}

// O que quem reserva vê: só cardápios de semanas publicadas.
export function cardapioDo(iso, hoje) {
  return semanaPublicada(semanaDe(iso), hoje) ? menuDo(iso, hoje) : null;
}

// menu null deixa o dia sem cardápio.
export function salvarCardapio(iso, menu) {
  gravar(K_CARDAPIOS, { ...ler(K_CARDAPIOS, {}), [iso]: menu });
}

export function publicarSemana(semana, publicada) {
  gravar(K_PUBLICACAO, { ...ler(K_PUBLICACAO, {}), [semana]: publicada });
}

// Semanas (domingo a sábado) mostradas no calendário, a partir da semana atual.
export function semanasDoCalendario(hoje) {
  const inicio = startOfWeek(hoje);
  return Array.from({ length: SEMANAS_NO_CALENDARIO }, (_, s) =>
    Array.from({ length: 7 }, (_, i) => isoDate(addDays(inicio, s * 7 + i))));
}
