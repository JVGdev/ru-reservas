# RU Reservas — protótipo

Site para celular onde se reserva almoço ou jantar no Restaurante Universitário da UPF.
Esta versão cobre só o fluxo de quem reserva. A área da equipe (cardápio, contagem, leitor de QR) fica para depois.

**Abrir no celular:** https://jvgdev.github.io/ru-reservas/

<img src="qr-link.svg" alt="QR Code do link do protótipo" width="160">

## Testar

1. Entre com qualquer e-mail. O código de login aparece na própria tela.
2. Preencha nome e perfil. O perfil define o preço (estudante R$ 10, demais R$ 20).
3. No Início, escolha um dia e toque em Almoço ou Jantar.

No navegador do celular, "Adicionar à tela inicial" instala o site como app.

Cada pessoa vê só as próprias reservas: os dados ficam no navegador de quem está usando.
Em **Perfil › Demonstração** dá para simular outro horário (por exemplo, 11h para mostrar que o almoço de hoje fechou) e apagar tudo para recomeçar.

## Alterar

Todo push na branch `main` atualiza o site em cerca de um minuto.

- Preços, perfis, horários de corte e cardápios: `js/data.js`. O que depende de resposta do Pedro está marcado com `A CONFIRMAR`.
- Telas e textos: `js/app.js`. Visual: `css/styles.css`.

## Rodar no computador

Não tem build. Sirva a pasta com qualquer servidor estático. Os módulos JS não funcionam abrindo o `index.html` direto.

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

Para testar no celular, use o IP do computador na mesma rede (ex.: `http://192.168.0.10:8000`).

## O que funciona

- **Login por código:** o e-mail não é enviado de verdade e o código aparece na tela. Vale por 10 minutos e aceita até 5 tentativas. A sessão dura 30 dias.
- **Primeiro acesso:** nome, perfil (os 8 do formulário atual) e matrícula para perfis da UPF.
- **Início:** a próxima reserva aparece no topo, com o QR Code e o botão de cancelar. Abaixo ficam os próximos 5 dias com cardápio, o prato do dia (com o cardápio completo ao tocar) e os botões de almoço e jantar.
- **Reserva rápida:** tocar em almoço ou jantar abre uma folha com o resumo do cardápio, marmita e suco, e o total no botão de confirmar.
- **Calendário:** as duas semanas de cardápio publicado, com o mesmo cartão do dia.
- **Horário de corte por refeição:** almoço até 10h e jantar até 16h do próprio dia. Refeições futuras ficam sempre abertas.
- **Minhas reservas:** a reserva mostra o QR Code (`RU:<código>`) e os dados que o atendente precisa ver, e dá para cancelar até o corte.
- **Demonstração (tela Perfil):** simula outro horário para testar os cortes e apaga todos os dados.

Os dados ficam no `localStorage` do navegador. Não há servidor.

## Onde mexer

| Arquivo | Conteúdo |
| --- | --- |
| `js/data.js` | Preços, perfis, horários de corte, cardápios de exemplo. Itens pendentes com o Pedro estão marcados com `A CONFIRMAR`. |
| `js/store.js` | Login, usuário e reservas (simula o servidor). |
| `js/time.js` | Relógio (com horário simulado) e formatação de datas. |
| `js/app.js` | Telas, rotas e eventos. |
| `css/styles.css` | Visual: paleta e fontes do RU. |
| `vendor/qrcode.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4, licença MIT. |
