// Configuração e dados simulados do protótipo.
// Tudo que depende de resposta do Pedro está marcado com "A CONFIRMAR".

import { isoDate, addDays, startOfWeek } from './time.js';

// Valores em centavos, para evitar erro de arredondamento.
export const CATEGORIAS = {
  estudante: { nome: 'Estudante', preco: 1000 },
  demais: { nome: 'Demais clientes', preco: 2000 },
};

// Os 8 perfis do formulário atual.
// A CONFIRMAR: quais perfis pagam preço de estudante, e se funcionário paga R$ 15.
export const PERFIS = [
  { id: 'graduacao', nome: 'Aluno de graduação', categoria: 'estudante', upf: true },
  { id: 'pos', nome: 'Aluno de pós-graduação', categoria: 'estudante', upf: true },
  { id: 'creati', nome: 'Aluno Creati', categoria: 'estudante', upf: true },
  { id: 'integrado', nome: 'Aluno Integrado', categoria: 'estudante', upf: true },
  { id: 'rede', nome: 'Estudante da rede municipal/estadual', categoria: 'estudante', upf: false },
  { id: 'residente', nome: 'Residente multiprofissional', categoria: 'demais', upf: true },
  { id: 'funcionario', nome: 'Funcionário UPF', categoria: 'demais', upf: true },
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

// Penalidade por falta (RN05). Conta como falta não vir sem cancelar, ou cancelar depois do corte.
// Ao chegar em `faltas` faltas dentro de `janelaDias`, o desconto de estudante fica bloqueado
// por `diasBloqueio` dias e a contagem recomeça do zero.
// A CONFIRMAR: os números são a proposta do grupo; a regra só vale para quem paga preço de estudante.
export const PENALIDADE = { faltas: 3, janelaDias: 30, diasBloqueio: 7 };

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

// Semanas publicadas: a atual e a próxima. A terceira semana do calendário fica sem cardápio.
export const SEMANAS_PUBLICADAS = 2;
export const SEMANAS_NO_CALENDARIO = 3;

function diaUtil(data) {
  const d = data.getDay();
  return d >= 1 && d <= 5;
}

export function cardapioDo(iso, hoje) {
  const inicio = startOfWeek(hoje);
  const limite = addDays(inicio, SEMANAS_PUBLICADAS * 7);
  const [y, m, d] = iso.split('-').map(Number);
  const data = new Date(y, m - 1, d);
  if (!diaUtil(data) || data < inicio || data >= limite) return null;
  const n = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return MODELOS[n % MODELOS.length];
}

// Semanas (domingo a sábado) mostradas no calendário, a partir da semana atual.
export function semanasDoCalendario(hoje) {
  const inicio = startOfWeek(hoje);
  return Array.from({ length: SEMANAS_NO_CALENDARIO }, (_, s) =>
    Array.from({ length: 7 }, (_, i) => isoDate(addDays(inicio, s * 7 + i))));
}
