// Dados de exemplo para demonstrar a área da equipe: pessoas e reservas das últimas três semanas.
// Ficam marcados com exemplo: true e podem ser removidos sem afetar os dados reais.

import { PERFIS, CATEGORIAS, ADICIONAIS, REFEICOES, PENALIDADE, diaDeFuncionamento } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';

const NOMES = ['Ana', 'Bruno', 'Camila', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João',
  'Larissa', 'Lucas', 'Mariana', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Thiago', 'Vitória',
  'Gustavo', 'Beatriz', 'Leonardo', 'Júlia', 'Caio', 'Letícia', 'Vinícius', 'Amanda', 'Rodrigo', 'Bianca', 'André'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Rodrigues', 'Almeida',
  'Carvalho', 'Ribeiro', 'Martins', 'Rocha', 'Ferreira', 'Gomes', 'Barbosa', 'Schneider', 'Becker', 'Zanella',
  'Bortolini', 'Machado', 'Dal Pai', 'Rossi', 'Webber'];
const PESOS_PERFIL = { graduacao: 50, pos: 8, creati: 3, integrado: 6, rede: 5, residente: 4, funcionario: 12, externo: 12 };

const PESSOAS = 90;
const DIAS_ATRAS = 21;
const DIAS_A_FRENTE = 6;
// Algumas pessoas faltam bem mais, para a penalidade aparecer.
const FALTOSOS = 6;
const CHANCE_FALTA = 0.2;
const CHANCE_FALTA_FALTOSO = 0.6;

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
const chance = (p) => Math.random() < p;
const inteiro = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}


function extrasSorteados() {
  const extras = [];
  if (chance(0.15)) extras.push('marmita');
  if (chance(0.3)) extras.push('suco');
  return extras;
}

const valorDe = (categoria, extras) => CATEGORIAS[categoria].preco + extras.reduce((s, e) => s + ADICIONAIS[e].preco, 0);
const PESOS_FORMA = { dinheiro: 55, pix: 20, debito: 15, credito: 10 };

function sorteioPonderado(pesos) {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  let n = Math.random() * total;
  for (const [id, peso] of Object.entries(pesos)) {
    n -= peso;
    if (n < 0) return id;
  }
  return Object.keys(pesos)[0];
}

const pagamento = (valor, em) => ({ forma: sorteioPonderado(PESOS_FORMA), valor, em });

function gerarPessoas() {
  const usados = new Set();
  return Array.from({ length: PESSOAS }, () => {
    const nome = `${sortear(NOMES)} ${sortear(SOBRENOMES)}`;
    const base = semAcento(nome).toLowerCase().replace(/\s+/g, '.');
    let email = `${base}@exemplo.com`;
    for (let n = 2; usados.has(email); n++) email = `${base}${n}@exemplo.com`;
    usados.add(email);
    const perfil = sorteioPonderado(PESOS_PERFIL);
    const upf = PERFIS.find((p) => p.id === perfil).upf;
    return { email, nome, perfil, matricula: upf ? String(inteiro(100000, 199999)) : '', exemplo: true };
  });
}

export function gerarExemplo(agora = t.now()) {
  const pessoas = gerarPessoas();
  const faltosos = new Set(pessoas.slice(0, FALTOSOS).map((p) => p.email));
  const limite = agora.getTime();
  const reservas = [];

  // Penalidade "1 para 1", aplicada conforme as reservas vão sendo criadas, em ordem de data.
  const faltas = new Map();
  const usadas = new Map();
  const categoriaDe = (u) => {
    const base = PERFIS.find((p) => p.id === u.perfil).categoria;
    if (base !== 'estudante') return { categoria: base };
    const pendentes = Math.max(0, (faltas.get(u.email) || 0) - (PENALIDADE.faltas - 1)) - (usadas.get(u.email) || 0);
    if (pendentes <= 0) return { categoria: base };
    usadas.set(u.email, (usadas.get(u.email) || 0) + 1);
    return { categoria: 'demais', penalizada: true };
  };

  for (let d = -DIAS_ATRAS; d <= DIAS_A_FRENTE; d++) {
    const iso = t.isoDate(t.addDays(agora, d));
    if (!diaDeFuncionamento(iso)) continue;

    for (const [refeicao, ref] of Object.entries(REFEICOES)) {
      const corte = t.at(iso, ref.corte).getTime();
      const fim = t.at(iso, ref.fim).getTime();
      // O atendimento começa duas horas e meia antes do fim.
      const inicio = fim - 150 * 60000;
      const almoco = refeicao === 'almoco';
      const escolhidos = embaralhar(pessoas).slice(0, almoco ? inteiro(30, 42) : inteiro(12, 20));
      const faltaram = [];

      for (const u of escolhidos) {
        const criadaEm = corte - inteiro(1, 72) * 3600000;
        if (criadaEm > limite) continue;
        const extras = extrasSorteados();
        const preco = categoriaDe(u);
        const valor = valorDe(preco.categoria, extras);
        const r = {
          id: store.novoId(), v: store.VERSAO, codigo: store.novoCodigo(), email: u.email, data: iso, refeicao,
          extras, ...preco, valor, status: 'ativa', criadaEm, exemplo: true,
        };
        const canceladaEm = criadaEm + Math.random() * (corte - criadaEm);
        if (chance(0.06) && canceladaEm <= limite) {
          r.status = 'cancelada';
          r.canceladaEm = Math.round(canceladaEm);
        } else if (!chance(faltosos.has(u.email) ? CHANCE_FALTA_FALTOSO : CHANCE_FALTA)) {
          const checkin = Math.round(inicio + Math.random() * (fim - inicio));
          if (checkin <= limite) {
            r.status = 'utilizada';
            r.checkinEm = checkin;
            r.pagamento = pagamento(valor, checkin);
          }
        }
        if (r.status === 'ativa' && fim <= limite) faltaram.push(u.email);
        reservas.push(r);
      }

      const quemReservou = new Set(escolhidos.map((u) => u.email));
      const avulsos = almoco ? inteiro(4, 10) : inteiro(2, 5);
      for (let i = 0; i < avulsos; i++) {
        const em = Math.round(inicio + Math.random() * (fim - inicio));
        if (em > limite) continue;
        const conhecido = chance(0.3) ? sortear(pessoas.filter((p) => !quemReservou.has(p.email))) : null;
        const extras = extrasSorteados();
        const preco = conhecido ? categoriaDe(conhecido) : { categoria: sortear(['estudante', 'estudante', 'funcionario', 'demais']) };
        const valor = valorDe(preco.categoria, extras);
        if (conhecido) quemReservou.add(conhecido.email);
        reservas.push({
          id: store.novoId(), v: store.VERSAO, codigo: null, email: conhecido?.email || null,
          nome: conhecido || chance(0.5) ? '' : `${sortear(NOMES)} ${sortear(SOBRENOMES)}`,
          data: iso, refeicao, extras, ...preco, valor, status: 'utilizada', semReserva: true,
          criadaEm: em, checkinEm: em, pagamento: pagamento(valor, em), exemplo: true,
        });
      }

      faltaram.forEach((email) => faltas.set(email, (faltas.get(email) || 0) + 1));
    }
  }

  store.importarExemplo({ usuarios: pessoas, reservas });
  return { pessoas: pessoas.length, reservas: reservas.length };
}
