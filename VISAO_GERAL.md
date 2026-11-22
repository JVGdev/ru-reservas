# RU Reservas: visão geral

Sistema de reservas do Restaurante Universitário da UPF: da reserva ao pagamento, mais a área da equipe para acompanhar quem reservou, quem veio e quanto entrou.

## Como funciona hoje

- As reservas chegam por Google Forms. Filtrar as respostas é difícil.
- A equipe usa uma lista de quem reservou e apaga o nome de quem veio.
- No balcão, PIX é demorado e o dinheiro em espécie é o meio principal.
- As notas fiscais de alimentos são lançadas à mão no Consumer: os itens de cada nota são separados numa planilha, e uma nota pode ter muitos itens. É a tarefa que mais consome tempo, mas fica fora deste projeto.

## Objetivo

Automatizar o caminho da reserva até o pagamento. A reserva serve para o RU planejar melhor e vender mais, ajudando o restaurante a se manter.

## Quem usa

- **Quem reserva:** estudantes e também quem não é estudante. Dados: nome, matrícula, data e refeição (almoço ou janta).
- **Equipe do RU:** confere reservas, registra presença, recebe pagamentos e acompanha os números.

## Escopo

### Quem reserva

- Calendário para tocar nos dias e reservar.
- Várias reservas de uma vez (por exemplo, a semana inteira).
- Cancelamento de reserva.
- Cardápio no site.
- Pagamento:
  - em dinheiro na hora: **essencial**;
  - antecipado, no momento da reserva: bem-vindo;
  - vales: precisam ser implementados.

### Equipe do RU

- Lista de quem reservou com marcação de presença, no lugar de apagar nomes.
- Filtros por reserva, data e refeição (almoço ou janta).
- Painel único com reservas, presenças e entradas de dinheiro.
- Histórico dos dias, das pessoas e das reservas.
- Registro das entradas de dinheiro. Controle de caixa físico talvez.
- Estoque: quantidade, data, valor.
- Relatório das reservas enviado para o Consumer.
- Punição: a partir da terceira vez, bloquear o desconto de estudante.

## Fora do escopo

- Lançamento de notas de alimentos no Consumer.
- Cartão do RU: seria um extra complicado e teria que aceitar quem não é estudante.

## Situação atual

O protótipo publicado ([README](README.md)) tem as duas áreas, com os dados no navegador e sem servidor:

- **Quem reserva:** login por código, reserva de um dia por vez, cardápio, cancelamento até o horário de corte, QR Code da reserva e faltas no Perfil.
- **Equipe:** atendimento no balcão (QR Code, busca, entrada com pagamento em dinheiro ou PIX, sem reserva), painel do dia, reservas com filtros e planilha, pessoas com faltas e abono, caixa, cardápio com publicação e ajustes.

Ainda falta:

- reserva de vários dias de uma vez;
- pagamento antecipado (PIX online);
- caixa físico e estoque, que dependem de resposta do RU;
- servidor, para as reservas dos celulares chegarem ao computador da equipe.

## Em aberto

- **Vales:** como funcionam hoje (quem emite, valor, se substituem o pagamento inteiro).
- **Pagamento antecipado:** por qual meio (PIX online, cartão) e o que acontece com o valor se a reserva for cancelada.
- **Punição:** o que conta como uma vez (faltar sem cancelar? cancelar depois do corte?), por quanto tempo o desconto fica bloqueado e se a contagem zera.
- **Caixa físico:** se entra no sistema ou não.
- **Estoque:** até onde vai, já que o lançamento de notas fica de fora.
- **Relatório para o Consumer:** formato e frequência.
