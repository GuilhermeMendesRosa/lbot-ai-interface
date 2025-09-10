# L-Bot Socket Control - Controle via Socket

Este módulo do projeto L-Bot demonstra como controlar um robô E-Puck na simulação Enki através de comandos enviados via socket TCP. O sistema é composto por dois programas:

1. **lbot-socket-control** - Programa C++ que executa a simulação gráfica
2. **robot_controller.py** - Script Python para enviar comandos de controle

## Funcionalidades

- ✅ Visualização gráfica em tempo real do robô E-Puck
- ✅ Controle remoto via socket TCP (porta 9999)
- ✅ Comandos simples de movimento (frente, virar, parar)
- ✅ Modo interativo e modo demonstração
- ✅ Feedback de status em tempo real
- ✅ Integração com o projeto L-Bot

## Pré-requisitos

1. **Enki Robotics Simulator** deve estar compilado:
```bash
cd /Users/guilherme.mendesrosa/code/enki
mkdir -p build
cd build
cmake ..
make
```

2. **Qt5** deve estar instalado:
```bash
# macOS
brew install qt5

# Ubuntu/Debian
sudo apt-get install qt5-default qtbase5-dev qttools5-dev-tools
```

## Como Compilar

1. Navegue até o diretório do projeto:
```bash
cd /Users/guilherme.mendesrosa/code/mestrado/projeto-lbot/lbot-socket-control
```

2. Crie o diretório de build:
```bash
mkdir -p build
cd build
```

3. Configure e compile:
```bash
cmake ..
make
```

## Como Usar

### Passo 1: Executar a Simulação

No diretório `build`, execute:
```bash
./lbot-socket-control
```

Isso abrirá uma janela gráfica mostrando:
- Um robô E-Puck verde no centro
- Ambiente de simulação 120x120 unidades
- Servidor TCP aguardando conexões na porta 9999

### Passo 2: Conectar o Controlador Python

Em outro terminal, execute o script Python:

**Modo Interativo:**
```bash
cd /Users/guilherme.mendesrosa/code/mestrado/projeto-lbot/lbot-socket-control
python3 robot_controller.py
```

**Modo Demonstração:**
```bash
python3 robot_controller.py demo
```

## Comandos Disponíveis

### Formato de Movimento por Sequência
O sistema aceita comandos no formato `XF;YB;ZL;WR` onde:
- `X`, `Y`, `Z`, `W` são números (distâncias/ângulos)
- `F` = Forward (frente), `B` = Backward (trás)
- `L` = Left (esquerda), `R` = Right (direita)

### Exemplos de Comandos

| Comando | Descrição |
|---------|-----------|
| `10F` | Move 10 unidades para frente |
| `5B` | Move 5 unidades para trás |
| `30R` | Vira 30 graus à direita |
| `45L` | Vira 45 graus à esquerda |
| `10F;30R` | Move 10 para frente e vira 30° direita |
| `5B;15L;8F` | Move 5 trás, vira 15° esquerda, move 8 frente |
| `stop` | Para o robô |
| `status` | Mostra posição atual |
| `quit` | Encerra conexão |

## Exemplo de Sessão

```
🤖 CONTROLE INTERATIVO DO L-BOT E-PUCK
Digite um comando (ou 'help' para ajuda): status
🤖 STATUS: Robot at position (60.00, 60.00), angle: 0.00°

Digite um comando: 10F
🤖 OK: Executing movement sequence: 10F

Digite um comando: 45R;5F
🤖 OK: Executing movement sequence: 45R;5F

Digite um comando: stop
🤖 OK: Robot stopped
```

## Arquitetura do Sistema

```
┌─────────────────────┐    TCP Socket    ┌──────────────────────┐
│  robot_controller.py │ ◄──────────────► │  lbot-socket-control │
│  (Cliente Python)   │    Port 9999     │  (Servidor C++/Qt)   │
└─────────────────────┘                  └──────────────────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────────┐
                                         │   Enki Physics       │
                                         │   Engine + Viewer    │
                                         └──────────────────────┘
```

## Integração com L-Bot

Este módulo faz parte do projeto L-Bot e pode ser integrado com:

- **lbot-datagen**: Para coleta de dados de movimento
- **lbot-natural-language-controller**: Para controle por linguagem natural
- Outros módulos de controle e navegação

## Troubleshooting

**Erro "Connection refused":**
- Certifique-se de que o programa lbot-socket-control está rodando
- Verifique se a porta 9999 está livre

**Erro de compilação:**
- Verifique se Qt5 está instalado e no PATH
- Verifique se o Enki está compilado em `/Users/guilherme.mendesrosa/code/enki/build`
- Ajuste o caminho `ENKI_ROOT_DIR` no CMakeLists.txt se necessário

**Robô não se move:**
- Envie comando `status` para verificar se os comandos estão chegando
- Verifique se não há erro de sintaxe nos comandos de movimento

## Personalização

Para modificar o comportamento:

1. **Alterar porta:** Modifique a porta 9999 em ambos os arquivos
2. **Adicionar sensores:** Use os sensores IR do E-Puck no código C++
3. **Novos comandos:** Adicione casos no método `processCommand()`
4. **Obstáculos:** Adicione objetos físicos no mundo da simulação
5. **Múltiplos robôs:** Estenda para controlar vários robôs simultaneamente

## Dependências

- **C++:** Enki, Qt5 (Core, Widgets, OpenGL, Xml, Network), OpenGL
- **Python:** Socket (biblioteca padrão)

## Estrutura de Arquivos

```
lbot-socket-control/
├── CMakeLists.txt          # Configuração de build
├── README.md               # Este arquivo
├── enkiSocketControl.cpp   # Implementação principal
├── enkiSocketControl.h     # Headers
└── robot_controller.py     # Cliente Python
```

## Próximos Passos

Este módulo serve como base para:
- Controle avançado de robôs
- Algoritmos de navegação
- Integração com sensores
- Controle por linguagem natural (integração com lbot-natural-language-controller)
- Coleta de dados para treinamento (integração com lbot-datagen)

````

## Troubleshooting

**Erro "Connection refused":**
- Certifique-se de que o programa enkiSocketControl está rodando
- Verifique se a porta 9999 está livre

**Erro de compilação:**
- Verifique se Qt5 está instalado: `brew install qt5` (macOS)
- Verifique se o caminho do Qt está correto no CMAKE

**Robô não se move:**
- Envie comando `status` para verificar se os comandos estão chegando
- Verifique se não há erro de sintaxe nos comandos

## Personalização

Para modificar o comportamento:

1. **Alterar porta:** Modifique a porta 9999 em ambos os arquivos
2. **Adicionar sensores:** Use os sensores IR do E-Puck no código C++
3. **Novos comandos:** Adicione casos no método `processCommand()`
4. **Obstáculos:** Adicione objetos físicos no mundo da simulação

## Dependências

- **C++:** Enki, Qt5 (Core, Widgets, OpenGL, Xml, Network)
- **Python:** Socket (biblioteca padrão)

Este exemplo serve como base para projetos mais complexos de robótica e pode ser estendido com sensores, múltiplos robôs, algoritmos de navegação, etc.
