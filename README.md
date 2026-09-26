# Enduro Remaster — Edição Brasileira

Remake do clássico **Enduro** (Activision, Atari 2600) com carros brasileiros: **Fusca**, **Kombi**, **Brasília** e **Uno**.

## Como jogar

Abra o `index.html` no navegador (duplo clique já funciona) ou sirva a pasta:

```
python -m http.server 8000
```

e acesse http://localhost:8000.

**Objetivo:** ultrapassar a quantidade de carros indicada no painel (bandeira vermelha) antes do dia acabar. Ser ultrapassado devolve carros ao contador. Bateu a meta, passa para o próximo dia — cada dia exige mais.

**Meta ajustável:** no menu, use `-` / `+` (ou Q / E, ou clique nas setas de META) para escolher quantos carros ultrapassar no 1º dia: 30, 60, 90, 120 (padrão), 150, 200, 250 ou 300. Cada dia seguinte pede +1/3 da meta, até 2,5x. O recorde é guardado separadamente para cada meta.

| Tecla | Ação |
|---|---|
| ← → / A D | Esterçar (no menu: escolher o carro) |
| ↑ ↓ no menu | Trocar a cor do carro |
| - + (ou Q E) no menu | Mudar a meta de ultrapassagens |
| ↑ / W / Espaço / Z | Acelerar |
| ↓ / S / X | Frear |
| P | Pausar |
| M | Som liga/desliga |
| Esc | Voltar ao menu |

**No celular:** o carro acelera sozinho. Use os botões **◀ ▶** (canto inferior esquerdo) para virar — dá para deslizar o dedo de um para o outro — e **FREAR** (canto inferior direito). O botão de pausa fica no canto superior direito. No menu, toque num carro para escolhê-lo e toque de novo nele para largar; na pausa, toque na parte de baixo da tela para voltar ao menu. Jogue de preferência com o celular deitado.

### Controle USB (estilo Super Nintendo ou outro)

Conecte o controle e aperte qualquer botão com o jogo aberto (o navegador só "enxerga" o controle depois disso). Teclado e controle funcionam juntos.

| Controle | Na corrida | No menu |
|---|---|---|
| Direcional ← → | Esterçar | Escolher o carro |
| Direcional ↑ ↓ | Acelerar / frear | Trocar a cor |
| B (ou A) | Acelerar | Largar |
| Y | Frear | — |
| L / R | — | Diminuir / aumentar a meta |
| Start | Pausar / continuar | Largar |
| Select | Voltar ao menu | Configurar o controle |

**Se algum botão não responder como esperado**, aperte **Select** no menu (ou **C** no teclado) para abrir **CONFIGURAR CONTROLE**: o jogo pede cada ação e você aperta o botão correspondente. A configuração fica salva para aquele controle. **Esc** cancela, **Del** volta ao mapeamento automático.

Controles no padrão Xbox/PlayStation também funcionam, com analógico e gatilhos. Se o controle tiver vibração, ele vibra nas batidas.

## Os carros

| | Vel. máx. | Ponto forte | Ponto fraco |
|---|---|---|---|
| **Fusca** | 130 km/h | Equilibrado, bom em tudo | — |
| **Kombi** | 110 km/h | Aguenta batidas, firme na lama e nas curvas | Lenta e pesada |
| **Brasília** | 150 km/h | A mais veloz, passa mais carros | Escorrega e perde muito nas batidas |
| **Uno** | 128 km/h | Melhor aceleração e controle | Leve e frágil: sofre nas batidas, nas curvas e na lama |

**Pintura:** no menu, use ↑ ↓ (ou clique nas amostras no topo do quadro do carro) para escolher entre 11 cores clássicas — vermelho, azul, amarelo, verde, branco, preto, bege, laranja, vinho, prata e azul calcinha. A escolha de cada carro fica salva no navegador.

## Fases do dia

Dia → Chuva **ou** Sol a pino (conforme a paisagem) → Entardecer → Noite (só lanternas visíveis) → Neblina → Amanhecer.

## Paisagens

A cada dia a estrada atravessa uma paisagem **sorteada** (até a do dia 1). O sorteio é feito de um "saco embaralhado": as 6 paisagens aparecem uma vez cada, em ordem aleatória, antes de qualquer uma voltar — então nenhuma repete em seguida e nenhuma fica de fora por muito tempo:

| | Paisagem | Beira da estrada | Horizonte | Clima |
|---|---|---|---|---|
| • | **Transamazônica** | castanheiras, palmeiras, samambaias, placa da BR, palafitas, caminhão atolado | copas da floresta com bruma | chuva |
| • | **Litoral** | coqueiros e casinhas | mar | chuva |
| • | **Favela carioca** | casas coloridas empilhadas com caixa d'água, postes com fios, orelhão | Corcovado com o Cristo, Pão de Açúcar e o morro coberto de casinhas (aceso à noite); pipas no céu | chuva |
| • | **Cidade** | prédios e postes de luz | silhueta de prédios (acesa à noite) | chuva |
| • | **Campo** | ipês amarelos e roxos, casinhas | morros suaves | chuva |
| • | **Sertão nordestino** | mandacarus, palmas, árvores da caatinga, cerca de arame, casas de taipa, cata-vento, placas de "gado na pista" | serrotes e chapadas marrom-alaranjados | sol a pino (miragem na pista) |

Na **chuva** a pista fica molhada (escorrega), as lanternas refletem no asfalto, os pneus levantam água e caem relâmpagos com trovão.

Na **Transamazônica** a pista é de **lama**, sem faixas pintadas: só ruas de pneu e poças. O carro acelera menos e escorrega mais (a Kombi, pesada, sofre menos; o Uno, leve, sofre mais), os pneus jogam lama, e há **buracos** espalhados pela estrada. Cair num buraco tira velocidade (a Kombi perde menos), joga o carro para o lado e sacode a tela — quanto maior o buraco, pior. À noite os buracos só aparecem no facho do farol.

No **sertão** o chão é seco e amarelado e a fase "SOL A PINO" ocupa o lugar da chuva, com o céu esbranquiçado e a miragem tremendo no asfalto. **Vacas e cavalos andam pela pista**: alguns atravessam devagar, vindos do acostamento, outros ficam parados no meio de uma faixa. Bater num animal derruba muito a velocidade (mais que uma batida de carro) e joga o carro para o lado, então é preciso desviar. Os carros do tráfego também desviam deles. À noite os animais só aparecem no facho do farol — de longe, só o brilho dos olhos.

## Compartilhar

`dist/enduro-brasil.html` é o jogo inteiro num único arquivo (scripts e fonte embutidos, ~100 KB): basta enviar para os amigos, que abrem com duplo clique — funciona até sem internet. Depois de mudar o jogo, gere de novo com:

```
python build.py
```

## Desenvolvimento

JavaScript puro + Canvas, sem dependências. Há um agente do Claude Code em `.claude/agents/enduro-game-dev.md` especializado neste projeto — use-o para novas features, sprites e balanceamento.
