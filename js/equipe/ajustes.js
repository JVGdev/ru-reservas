// Valores, horários, dias de funcionamento, perfis e penalidade (RF30), e a demonstração.

import { CATEGORIAS, PERFIS, REFEICOES, ajustes, salvarAjustes, restaurarAjustes } from '../data.js';
import * as store from '../store.js';
import * as t from '../time.js';
import { esc, toast } from '../ui.js';
import { atualizar, confirmar, fecharDialogo } from './comum.js';
import { gerarExemplo } from './exemplo.js';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const PRECOS = [['estudante', 'Estudante'], ['funcionario', 'Funcionário'], ['demais', 'Demais clientes'], ['marmita', 'Marmita'], ['suco', 'Suco']];

const paraTexto = (centavos) => (centavos / 100).toFixed(2).replace('.', ',');

// "10,50", "10.50", "R$ 10" -> centavos. NaN se inválido.
function paraCentavos(texto) {
  let s = String(texto).replace(/R\$|\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

function render() {
  const a = ajustes();
  const agora = t.now();
  const exemplos = store.todasReservas().some((r) => r.exemplo);

  return `<header class="eq-topo"><h1>Ajustes</h1></header>
    <form class="aj-form" data-form="aj-salvar" novalidate>
      <section class="cartao aj-secao">
        <h2>Preços</h2>
        <div class="aj-campos">
          ${PRECOS.map(([id, nome]) => `<label class="campo">${nome}
            <span class="campo-moeda"><span aria-hidden="true">R$</span>
              <input name="preco-${id}" inputmode="decimal" value="${paraTexto(a.precos[id])}" required></span>
          </label>`).join('')}
        </div>
        <p class="dica">Os novos valores valem para as próximas reservas. As já feitas mantêm o valor da reserva.</p>
      </section>

      <section class="cartao aj-secao">
        <h2>Horários</h2>
        <div class="aj-campos">
          ${Object.entries(REFEICOES).map(([id, r]) => `
            <label class="campo">${r.nome}: reservar e cancelar até
              <input type="time" name="corte-${id}" value="${a.refeicoes[id].corte}" required></label>
            <label class="campo">${r.nome}: termina às
              <input type="time" name="fim-${id}" value="${a.refeicoes[id].fim}" required></label>`).join('')}
        </div>
        <p class="dica">Reserva sem entrada até o fim da refeição conta como falta.</p>
        <fieldset class="aj-dias">
          <legend>Dias de funcionamento</legend>
          ${DIAS.map((nome, i) => `<label class="caixa-marcar"><input type="checkbox" name="dias" value="${i}" ${a.dias.includes(i) ? 'checked' : ''}>${nome}</label>`).join('')}
        </fieldset>
      </section>

      <section class="cartao aj-secao">
        <h2>Penalidade</h2>
        <div class="aj-campos">
          <label class="campo">A partir de qual falta
            <input type="number" name="pen-faltas" min="1" max="50" value="${a.penalidade.faltas}" required></label>
        </div>
        <p class="dica">A partir dessa falta, cada falta tira o desconto de estudante da reserva seguinte, e só dela. Conta como falta não vir sem cancelar, ou cancelar depois do horário de corte.</p>
      </section>

      <section class="cartao aj-secao">
        <h2>Perfis</h2>
        <div class="tabela-moldura">
          <table class="tabela">
            <thead><tr><th>Perfil</th><th>Paga como</th></tr></thead>
            <tbody>${PERFIS.map((p) => `<tr><td>${esc(p.nome)}</td><td>
              <select name="perfil-${p.id}" aria-label="Preço de ${esc(p.nome)}">
                ${Object.entries(CATEGORIAS).map(([id, c]) => `<option value="${id}" ${a.perfis[p.id] === id ? 'selected' : ''}>${c.nome}</option>`).join('')}
              </select></td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>

      <p class="erro" id="aj-erro" hidden></p>
      <div class="linha-botoes aj-rodape">
        <button type="submit" class="botao primario">Salvar ajustes</button>
        <button type="button" class="botao texto" data-acao="aj-restaurar">Restaurar padrão</button>
      </div>
    </form>

    <section class="cartao aj-secao aj-demo">
      <h2>Demonstração</h2>
      <form class="aj-linha" data-form="aj-horario">
        <label class="campo">Horário simulado
          <input type="datetime-local" name="horario" value="${t.paraInputLocal(agora)}" required></label>
        <button type="submit" class="botao secundario">Aplicar</button>
        ${t.simulando() ? '<button type="button" class="botao texto" data-acao="aj-horario-real">Usar horário real</button>' : ''}
      </form>
      <div class="linha-botoes">
        <button type="button" class="botao secundario" data-acao="aj-exemplo">${exemplos ? 'Gerar de novo' : 'Gerar dados de exemplo'}</button>
        ${exemplos ? '<button type="button" class="botao texto" data-acao="aj-remover-exemplo">Remover dados de exemplo</button>' : ''}
        <button type="button" class="botao texto perigo-texto" data-acao="aj-apagar">Apagar todos os dados</button>
      </div>
      <p class="dica">Os dados de exemplo cobrem as últimas três semanas, a partir do horário do app. Os dados reais deste navegador não são apagados.</p>
    </section>`;
}

function erro(msg) {
  const el = document.getElementById('aj-erro');
  el.textContent = msg;
  el.hidden = false;
  el.scrollIntoView({ block: 'center' });
}

function salvar(dados) {
  const precos = {};
  for (const [id, nome] of PRECOS) {
    precos[id] = paraCentavos(dados.get(`preco-${id}`));
    if (!(precos[id] > 0)) return erro(`Preço inválido: ${nome}.`);
  }
  const refeicoes = {};
  for (const [id, r] of Object.entries(REFEICOES)) {
    const corte = String(dados.get(`corte-${id}`) || '');
    const fim = String(dados.get(`fim-${id}`) || '');
    if (!corte || !fim) return erro(`Preencha os horários do ${r.nome.toLowerCase()}.`);
    if (corte >= fim) return erro(`${r.nome}: o horário de reserva precisa ser antes do fim.`);
    refeicoes[id] = { corte, fim };
  }
  const dias = dados.getAll('dias').map(Number);
  if (!dias.length) return erro('Marque pelo menos um dia de funcionamento.');
  const penalidade = { faltas: Number(dados.get('pen-faltas')) };
  if (!(penalidade.faltas >= 1)) return erro('Penalidade: use um número a partir de 1.');
  const perfis = Object.fromEntries(PERFIS.map((p) => [p.id, dados.get(`perfil-${p.id}`)]));

  salvarAjustes({ precos, refeicoes, dias, penalidade, perfis });
  toast('Ajustes salvos');
  atualizar();
}

export default {
  render,
  acoes: {
    'aj-restaurar': () => confirmar({
      titulo: 'Restaurar os ajustes padrão?',
      texto: 'Preços, horários, dias, penalidade e perfis voltam aos valores iniciais.',
      botao: 'Restaurar',
      acao: 'aj-restaurar-ok',
    }),
    'aj-restaurar-ok': () => { fecharDialogo(); restaurarAjustes(); toast('Ajustes restaurados'); atualizar(); },
    'aj-horario-real': () => { t.usarHorarioReal(); toast('Usando o horário real'); atualizar(); },
    'aj-exemplo': () => {
      const { pessoas, reservas } = gerarExemplo();
      toast(`${pessoas} pessoas e ${reservas} registros de exemplo`);
      atualizar();
    },
    'aj-remover-exemplo': () => { store.removerExemplo(); toast('Dados de exemplo removidos'); atualizar(); },
    'aj-apagar': () => confirmar({
      titulo: 'Apagar todos os dados?',
      texto: 'Some tudo deste navegador: pessoas, reservas, cardápios, ajustes e a sessão de quem reserva.',
      botao: 'Apagar tudo',
      acao: 'aj-apagar-ok',
      perigo: true,
    }),
    'aj-apagar-ok': () => {
      fecharDialogo();
      store.apagarTudo();
      toast('Dados apagados');
      location.hash = '';
      atualizar();
    },
  },
  formularios: {
    'aj-salvar': salvar,
    'aj-horario': (dados) => {
      const data = new Date(String(dados.get('horario') || ''));
      if (Number.isNaN(data.getTime())) return;
      t.simularHorario(data);
      toast('Horário simulado aplicado');
      atualizar();
    },
  },
};
