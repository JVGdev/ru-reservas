# RU Reservas — protótipo

Site para celular onde se reserva almoço ou jantar no Restaurante Universitário da UPF, e a área da equipe do RU, para o computador do balcão e da gerência.

**Abrir no celular:** https://jvgdev.github.io/ru-reservas/
**Área da equipe:** https://jvgdev.github.io/ru-reservas/equipe (ou o link “Área da equipe do RU” na tela de login)

<img src="qr-link.svg" alt="QR Code do link do protótipo" width="160">

## Testar

1. Entre com qualquer e-mail. O código de login aparece na própria tela.
2. Preencha nome e perfil. O perfil define o preço (estudante R$ 10, funcionário R$ 15, demais R$ 20).
3. No Início, escolha um dia e toque em Almoço ou Jantar.

No navegador do celular, "Adicionar à tela inicial" instala o site como app.

### Área da equipe

1. Abra `equipe.html` (ou o link na tela de login) e entre como **Gerência** (vê tudo) ou **Caixa** (só Atendimento e Caixa). Não há senha.
2. Em **Ajustes › Demonstração**, gere os dados de exemplo: 90 pessoas e três semanas de reservas, com faltas, pagamentos e gente sem reserva.
3. Hoje é fim de semana? Simule um horário de dia útil, por exemplo segunda às 12h30, para ver o almoço em andamento.
4. Em **Atendimento**, digite ou leia o código de uma reserva e aperte Enter duas vezes: a primeira abre a reserva, a segunda registra a entrada com pagamento em dinheiro.

A equipe vê as reservas feitas **neste navegador**: reservando em uma aba e abrindo a equipe em outra, a reserva aparece na hora.

Cada pessoa vê só as próprias reservas: os dados ficam no navegador de quem está usando.
Em **Perfil › Demonstração** dá para simular outro horário (por exemplo, 11h para mostrar que o almoço de hoje fechou) e apagar tudo para recomeçar.

## Alterar

Todo push na branch `main` atualiza o site em cerca de um minuto.

- Preços, perfis, horários de corte e cardápios: `js/data.js` (valores padrão; a equipe muda em Ajustes). O que depende de resposta do Pedro está marcado com `A CONFIRMAR`.
- Telas e textos: `js/app.js` (quem reserva) e `js/equipe/` (equipe). Visual: `css/styles.css` e `css/equipe.css`.

## Rodar no computador

Não tem build. Sirva a pasta com qualquer servidor estático. Os módulos JS não funcionam abrindo o `index.html` direto.

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

Para testar no celular, use o IP do computador na mesma rede (ex.: `http://192.168.0.10:8000`).

## O que funciona

### Quem reserva

- **Login por código:** o e-mail não é enviado de verdade e o código aparece na tela. Vale por 10 minutos e aceita até 5 tentativas. A sessão dura 30 dias.
- **Primeiro acesso:** nome, perfil (os 8 do formulário atual) e matrícula para perfis da UPF.
- **Início:** a próxima reserva aparece no topo, com o QR Code e o botão de cancelar. Abaixo ficam os próximos 5 dias com cardápio, o prato do dia (com o cardápio completo ao tocar) e os botões de almoço e jantar.
- **Reserva rápida:** tocar em almoço ou jantar abre uma folha com o resumo do cardápio, marmita e suco, e o total no botão de confirmar.
- **Calendário:** as duas semanas de cardápio publicado, com o mesmo cartão do dia.
- **Horário de corte por refeição:** almoço até 10h e jantar até 16h do próprio dia. Refeições futuras ficam sempre abertas.
- **Vários dias:** marca várias refeições de uma vez (ou todos os almoços/jantares) e reserva tudo num toque.
- **Minhas reservas:** a reserva mostra o QR Code (`RU:<código>`) e os dados que o atendente precisa ver. Dá para cancelar até a refeição terminar; depois do corte, o cancelamento conta como falta.
- **Faltas:** o Perfil mostra as faltas e quando a próxima reserva fica sem o desconto de estudante. Na tela da reserva de hoje, **Simular check-in** faz o papel do caixa.
- **Demonstração (tela Perfil):** simula outro horário para testar os cortes e apaga todos os dados.

### Equipe

- **Atendimento:** escolhe a refeição (abre na que está acontecendo), lê o QR Code por leitor USB, câmera (Chrome no Android e no Mac) ou digitação, e busca por nome ou matrícula. O check-in e o pagamento (dinheiro, PIX, débito ou crédito) são registrados no mesmo clique, e dá para desfazer. Quem vem sem reserva é registrado à parte, com ou sem cadastro.
- **Painel:** reservas, presenças, faltas, sem reserva, marmitas, sucos, pagos e a receber de cada refeição, entradas do dia e os últimos dez dias com a taxa de faltas.
- **Reservas:** todas as reservas com filtros (datas, refeição, situação, busca) e exportação em planilha CSV, que serve de relatório para o Consumer até o formato ser definido.
- **Pessoas:** cadastro, faltas e quem está com a próxima reserva sem desconto. Na ficha de cada pessoa, o histórico e o botão de abonar falta.
- **Caixa:** pagamentos do dia por forma (dinheiro, PIX, débito, crédito) e por refeição.
- **Cardápio:** edita cada dia com os símbolos (vegano, glúten etc.) e publica a semana. Quem reserva só vê semanas publicadas.
- **Ajustes:** preços, quais perfis pagam como estudante, horários de corte e de fim, dias de funcionamento e regra da penalidade.

**Faltas (RN05):** uma reserva sem check-in até o fim da refeição vira falta, e cancelar depois do corte também conta. A partir da 3ª falta, cada falta tira o desconto de estudante da reserva seguinte, e só dela ("1 para 1"). Se essa reserva for cancelada dentro do prazo, a penalidade passa para a próxima. A equipe pode abonar faltas. O número 3 muda em Ajustes.

Os dados ficam no `localStorage` do navegador. Não há servidor.

## Onde mexer

| Arquivo | Conteúdo |
| --- | --- |
| `js/data.js` | Valores padrão (preços, perfis, horários, penalidade), ajustes salvos e cardápios. Itens pendentes com o Pedro estão marcados com `A CONFIRMAR`. |
| `js/store.js` | Login, usuário, reservas, faltas e operações da equipe (simula o servidor). |
| `js/armazem.js` | Leitura e gravação no `localStorage`. |
| `js/time.js` | Relógio (com horário simulado) e formatação de datas. |
| `js/ui.js` | Utilidades de tela comuns às duas áreas. |
| `js/app.js` | Área de quem reserva: telas, rotas e eventos. |
| `equipe.html`, `js/equipe/app.js` | Área da equipe: menu, rotas e eventos. |
| `js/equipe/*.js` | Uma tela por arquivo (`atendimento.js`, `painel.js`, `reservas.js`, `pessoas.js`, `caixa.js`, `cardapio.js`, `ajustes.js`), as peças comuns (`comum.js`) e os dados de exemplo (`exemplo.js`). |
| `css/styles.css` | Visual: paleta e fontes do RU. |
| `css/equipe.css` | Visual próprio da área da equipe (menu lateral, tabelas, métricas). |
| `vendor/qrcode.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4, licença MIT. |
