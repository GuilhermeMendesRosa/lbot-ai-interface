# Simulador de Robô LBML - Estrutura Refatorada

## Estrutura de Arquivos

```
simulator/
├── index.html              # Arquivo HTML principal
├── css/
│   └── styles.css          # Estilos do simulador
├── js/
│   ├── main.js            # Arquivo principal - inicialização e coordenação
│   ├── utils.js           # Constantes, utilitários e parsing de comandos
│   ├── physics.js         # Configuração do motor de física
│   ├── scene.js           # Configuração da cena 3D e iluminação
│   ├── camera.js          # Classe FollowCamera para câmera que segue o robô
│   ├── labyrinth.js       # Classe Labyrinth - criação do ambiente
│   ├── robot.js           # Classe Robot - modelo e comportamento do robô
│   ├── ui.js              # Controles de interface e HUD
│   └── commands.js        # Execução de comandos LBML
└── assets/                # (futuro) Texturas, modelos 3D, etc.
```

## Módulos

### `main.js`
- **Responsabilidade**: Coordenação geral, inicialização, loop principal
- **Exports**: `executeCommandSequenceFromString`, `resetRobot`
- **Imports**: Todos os outros módulos

### `utils.js`
- **Responsabilidade**: Constantes, funções utilitárias, parsing LBML
- **Exports**: `CONSTANTS`, `easeInOutCubic`, `clamp`, `parseLBMLCommand`, `postAck`

### `physics.js`
- **Responsabilidade**: Configuração do mundo de física Cannon.js
- **Exports**: `initPhysics`

### `scene.js`
- **Responsabilidade**: Configuração da cena Three.js, luzes, câmera
- **Exports**: `setupScene`, `handleResize`

### `camera.js`
- **Responsabilidade**: Câmera que segue o robô suavemente
- **Exports**: `FollowCamera`
- **Imports**: `utils.js`

### `labyrinth.js`
- **Responsabilidade**: Construção do labirinto 3D com física
- **Exports**: `Labyrinth`
- **Imports**: `utils.js`

### `robot.js`
- **Responsabilidade**: Modelo 3D do robô e lógica de movimento
- **Exports**: `Robot`
- **Imports**: `utils.js`

### `ui.js`
- **Responsabilidade**: Interface do usuário, HUD, controles
- **Exports**: `updateHud`, `setIndicator`, `showError`, `updateCommandDisplay`, `toggleDebugCamera`

### `commands.js`
- **Responsabilidade**: Execução assíncrona de comandos LBML
- **Exports**: `executeCommandSequenceFromString`, `resetRobot`, `isExecuting`
- **Imports**: `utils.js`, `ui.js`

## Vantagens da Refatoração

1. **Modularidade**: Cada arquivo tem uma responsabilidade específica e bem definida
2. **Manutenibilidade**: Alterações em uma funcionalidade não afetam outras
3. **Reutilização**: Módulos podem ser importados independentemente
4. **Testabilidade**: Cada módulo pode ser testado isoladamente
5. **Legibilidade**: Código mais organizado e fácil de entender
6. **Escalabilidade**: Fácil adicionar novas funcionalidades sem bagunçar o código

## Como Usar

1. Abra `simulator/index.html` no navegador
2. Use os controles de teste na interface
3. Para integração, envie mensagens via `postMessage`:
   ```javascript
   iframe.contentWindow.postMessage({
     type: 'lbml-exec',
     payload: { command: 'DF5;RL90;DF3;' }
   }, '*');
   ```

## Dependências

- **Three.js**: Engine 3D para renderização
- **Cannon.js**: Motor de física
- **ES6 Modules**: Sistema de módulos moderno do JavaScript

## Comandos LBML Suportados

- `DF<n>`: Move para frente n metros
- `DB<n>`: Move para trás n metros  
- `DL<n>`: Move para esquerda n metros
- `DR<n>`: Move para direita n metros
- `RL<n>`: Rotaciona n graus para esquerda
- `RR<n>`: Rotaciona n graus para direita