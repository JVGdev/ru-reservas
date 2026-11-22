# RU Reservas: documento de requisitos

Versão 0.2 (rascunho) · 17/11/2026

## 1. Introdução

### 1.1 Propósito

Este documento reúne os requisitos do RU Reservas, sistema de reservas e pagamento do Restaurante Universitário da UPF. Serve de base para o desenvolvimento e para validar o escopo com o cliente.

### 1.2 Escopo

O sistema cobre o caminho da reserva até o pagamento, para quem come no RU, e a área da equipe para conferir reservas, registrar presença, receber pagamentos e acompanhar os números. O que fica de fora está na seção 6.

### 1.3 Definições

| Termo | Significado |
| --- | --- |
| Corte | Horário-limite para reservar ou cancelar a refeição do dia sem penalidade. |
| Check-in | Registro de que a pessoa veio comer (a "baixa" da reserva). |
| Falta | Reserva não usada: a pessoa não veio sem cancelar, ou cancelou depois do corte. |
| Perfil | Vínculo da pessoa com a UPF (aluno de graduação, funcionário, comunidade externa etc.). Define a categoria de preço. |
| Categoria de preço | Estudante ou demais clientes. |
| Consumer | Sistema de gestão usado pelo RU, onde hoje se lançam as notas de alimentos. Custa R$ 200 por mês. |

### 1.4 Referências

- `VISAO_GERAL.md`: visão geral do projeto.
- `README.md`: protótipo publicado e como rodar.
- Notas das reuniões com o cliente.

## 2. Descrição geral

### 2.1 Situação atual

- As reservas chegam por Google Forms. Filtrar as respostas é difícil, e o formulário não permite cancelar.
- A equipe usa uma lista de quem reservou e apaga o nome de quem veio. Cuidar das reservas toma de 30 minutos a 2 horas por dia.
- Muita gente reserva e não vem. No exemplo dado pelo RU, de 150 reservas, 50 pessoas não vieram (33%). Parte disso pode vir de não haver como cancelar.
- Sem saber quantas pessoas vêm, o RU desperdiça comida.
- No balcão, o caixa recebe em dinheiro e anota cada pagamento à mão. PIX presencial é demorado.
- As notas de alimentos são lançadas à mão no Consumer, separando os itens numa planilha.
- Volume estimado pelo grupo, não confirmado com o RU: mais de 500 refeições por dia, somando almoço e jantar.

### 2.2 Objetivos

| Objetivo | Hoje | Como medir |
| --- | --- | --- |
| Reduzir as faltas | 33% das reservas (50 de 150) | Reservas sem check-in ÷ reservas |
| Reduzir o desperdício de comida | Sem número; o RU aponta como problema grande | Porções que sobram por refeição |
| Reduzir o trabalho manual da equipe | 30 min a 2 h por dia | Tempo gasto com reservas e anotações |
| Automatizar o caminho da reserva até o pagamento | Formulário, lista apagada à mão, caixa anotado à mão | Refeições reservadas e pagas pelo sistema |

### 2.3 Usuários

| Usuário | O que faz no sistema |
| --- | --- |
| Cliente | Estudante ou não. Reserva, cancela, paga e apresenta o QR Code na entrada. |
| Caixa | Faz o check-in e recebe o pagamento no balcão, num computador com internet. Consulta a lista do dia. |
| Gerência do RU | Publica o cardápio, configura valores e horários, consulta relatórios, histórico e estoque. Decide pela adoção do sistema. |

### 2.4 Restrições

- Uso principal pelo celular, como site responsivo.
- Custo de operação de até R$ 200 por mês, o que o RU paga hoje pelo Consumer.
- Dados pessoais tratados conforme a LGPD.
- Horários no fuso de Brasília.
- Identidade visual do RU.

## 3. Requisitos funcionais

Prioridade: **Essencial** (pedido direto do cliente), **Desejável** (bem-vindo, mas não obrigatório) ou **A confirmar** (o cliente ficou em dúvida). A coluna Protótipo indica o que já existe na versão publicada.

### 3.1 Conta e acesso

| ID | Requisito | Prioridade | Protótipo |
| --- | --- | --- | --- |
| RF01 | Entrar com um código de uso único enviado ao e-mail. | Essencial | Simulado (o código aparece na tela) |
| RF02 | No primeiro acesso, informar nome, perfil e matrícula (esta só para perfis da UPF). | Essencial | Pronto |
| RF03 | Entrar com a conta da UPF. | Desejável | Falta |

### 3.2 Cardápio e reserva

| ID | Requisito | Prioridade | Protótipo |
| --- | --- | --- | --- |
| RF04 | Ver o cardápio da semana, com os símbolos de cada item (vegano, glúten, lactose etc.). | Essencial | Pronto (cardápios de exemplo) |
| RF05 | Escolher os dias num calendário. | Essencial | Pronto |
| RF06 | Reservar almoço, jantar ou ambos, com marmita e suco opcionais. | Essencial | Parcial (almoço e jantar são reservas separadas) |
| RF07 | Fazer várias reservas de uma vez, como a semana inteira. | Essencial | Pronto |
| RF08 | Ver o valor total, conforme o perfil, antes de confirmar. | Essencial | Pronto |
| RF09 | Ver as próprias reservas, ativas e anteriores. | Essencial | Pronto |
| RF10 | Cancelar uma reserva. Depois do corte, o cancelamento conta como falta (RN05). | Essencial | Pronto |
| RF11 | Gerar um QR Code único para cada reserva confirmada. | Essencial | Pronto |
| RF12 | Mostrar ao cliente quantas faltas ele tem e se está com o desconto bloqueado. | Essencial | Pronto (no Perfil) |

### 3.3 Pagamento

| ID | Requisito | Prioridade | Protótipo |
| --- | --- | --- | --- |
| RF13 | Registrar o pagamento em dinheiro no balcão, na mesma tela do check-in. | Essencial | Pronto |
| RF14 | Pagar antecipadamente por PIX online, no momento da reserva. | Desejável | Falta |

### 3.4 Atendimento

| ID | Requisito | Prioridade | Protótipo |
| --- | --- | --- | --- |
| RF15 | Listar as reservas do dia por refeição, com a marcação de quem veio. | Essencial | Pronto |
| RF16 | Fazer check-in pelo celular ou no computador do caixa, lendo o QR Code da reserva. | Essencial | Pronto (leitor USB, câmera no Chrome do Android e do Mac, ou digitação) |
| RF17 | Fazer check-in por busca de nome ou matrícula, sem QR Code. | Essencial | Pronto |
| RF18 | Registrar quem comeu sem reserva. | Essencial | Pronto |
| RF19 | Registrar falta quando a refeição termina sem check-in. | Essencial | Pronto |
| RF20 | Abonar uma falta. | Desejável | Pronto |

### 3.5 Gestão

| ID | Requisito | Prioridade | Protótipo |
| --- | --- | --- | --- |
| RF21 | Criar, editar e publicar o cardápio da semana. | Essencial | Pronto |
| RF22 | Filtrar reservas por data, refeição e situação. | Essencial | Pronto |
| RF23 | Ver num painel único as reservas, as presenças e as entradas de dinheiro. | Essencial | Pronto |
| RF24 | Mostrar os totais de cada refeição: reservas por perfil, sem reserva, marmitas, sucos, pagos e pendentes. | Essencial | Pronto |
| RF25 | Consultar o histórico de dias, pessoas e reservas. | Essencial | Pronto |
| RF26 | Registrar as entradas de dinheiro por forma de pagamento, no lugar das anotações à mão do caixa. | Essencial | Pronto |
| RF27 | Controlar o caixa físico. | A confirmar | Falta |
| RF28 | Controlar o estoque: quantidade, data e valor de cada item. | A confirmar | Falta |
| RF29 | Gerar o relatório de reservas para o Consumer. | Essencial | Parcial (planilha CSV; formato do Consumer a definir) |
| RF30 | Configurar valores, horários de corte e dias de funcionamento. | Essencial | Pronto |
| RF31 | Aplicar a penalidade da RN05 automaticamente. | Essencial | Pronto (regra "1 para 1") |

## 4. Regras de negócio

| ID | Regra |
| --- | --- |
| RN01 | Preço da refeição: R$ 10,00 para estudantes, R$ 15,00 para funcionários e R$ 20,00 para os demais. Marmita custa R$ 2,50 a mais, e suco R$ 3,00 a mais. |
| RN02 | A categoria de preço vem do perfil. Não é preciso comprovar vínculo de estudante para reservar: a diferença aparece no pagamento. |
| RN03 | Quem não é estudante também pode reservar. |
| RN04 | Corte: almoço até 10h e jantar até 16h do próprio dia. |
| RN05 | Conta como falta não vir sem cancelar, ou cancelar depois do corte. A partir da terceira falta, o cliente perde o desconto de estudante na sua próxima reserva. |
| RN06 | Cancelar até o corte não conta como falta. |
| RN07 | Cada QR Code vale para um único check-in. |
| RN08 | O pagamento em dinheiro no balcão é sempre aceito. |
| RN09 | Quem não reservou também é atendido. |
| RN10 | Fazer reembolso caso o cliente pague antecipado e cancele a reserva. |

## 5. Requisitos não funcionais

| ID | Categoria | Requisito |
| --- | --- | --- |
| RNF01 | Usabilidade | Telas pensadas para celular. Reservar em até 3 toques depois de entrar. |
| RNF02 | Identidade visual | Cores #E68138, #698746 e #F2E8BA; fontes Bolota, Century Gothic e Franklin Gothic Book. |
| RNF03 | Segurança | Código de login válido por 10 minutos. QR Code impossível de adivinhar. Área administrativa separada da área do cliente. |
| RNF04 | Privacidade | Coletar só nome, e-mail, perfil e matrícula, conforme a LGPD. |
| RNF05 | Confiabilidade | Corte validado no servidor, no fuso de Brasília. |
| RNF06 | Desempenho | Check-in em menos de 2 segundos por pessoa. |
| RNF07 | Acessibilidade | Contraste adequado e compatibilidade com leitor de tela. |
| RNF08 | Plataforma | Site responsivo que pode ser adicionado à tela inicial do celular. |
| RNF09 | Custo | Hospedagem e taxas somadas em até R$ 200 por mês. |

## 6. Fora do escopo

- Lançamento de notas de alimentos no Consumer.
- Cartão do RU: seria um extra complicado e teria que aceitar quem não é estudante.
- Vales: ideia levantada e descartada.

## 7. Pendências

| Assunto | Pergunta | Afeta |
| --- | --- | --- |
| Substituir o Consumer | O RU sugeriu deixar de usar o Consumer. Isso traria para o sistema o lançamento de notas, hoje fora do escopo. Decidir se entra no projeto ou fica como etapa futura, e levantar o que mais o Consumer faz. | Seção 6, RF28, RF29 |
| Penalidade | Por quanto tempo o desconto fica bloqueado e se a contagem de faltas zera. Ainda não decidido: o grupo pode propor. | RN05, RF31 |
| Cancelamento com PIX | O que acontece com o valor pago antecipadamente se a reserva for cancelada. | RF14 |
| Perfis e preços | Quais dos 8 perfis pagam preço de estudante; se funcionário paga R$ 15 ou R$ 20. | RN01, RN02 |
| Horários | Se os cortes de 10h e 16h servem para a cozinha, e se as reservas ficam abertas o dia todo ou só das 20h às 10h e das 13h30 às 16h. | RN04 |
| Leitura do QR Code | Se o computador do caixa tem câmera ou leitor de QR, ou se é preciso usar um celular. | RF16 |
| Atrasos | Se há tolerância depois do horário da refeição. | RF19 |
| Porções | Se há limite de porções por refeição, considerando quem vem sem reserva. | RF18 |
| Faltas justificadas | Quem decide abonar. | RF20 |
| Cardápio | Com quanta antecedência fica pronto. As anotações do grupo dizem "rotativo", mas o cliente disse que não pode ser. | RF21 |
| Login | Os slides mostram "Entrar com matrícula" e o protótipo usa código por e-mail. Alunos, professores e funcionários têm e-mails institucionais diferentes? | RF01, RF03 |
| Caixa físico | Se entra no sistema. | RF27 |
| Estoque | Até onde vai, ligado à decisão sobre o Consumer. | RF28 |
| Relatório para o Consumer | Formato e frequência. Deixa de existir se o Consumer for substituído. | RF29 |
| Volume | Quantas refeições o RU serve por dia. O grupo estima mais de 500. | Seção 2.1 |
| Manutenção | Quem mantém o sistema depois do semestre. Não foi conversado. | Proposta ao RU |
