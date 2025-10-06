// ==========================================
// JOGO 3D - ROBÔ CONTROLADO POR LBML
// ==========================================

// Variáveis globais
let scene, camera, renderer;
let world;
let robot, robotBody;
let ground, groundBody;
let obstacles = [];
let startPoint, endPoint;
let isExecuting = false;
let initialRobotPosition = { x: -40, y: 5, z: 0 };
let initialRobotRotation = 0;

// Configurações
const UNIT_SCALE = 1; // 1 unidade = 1 cm
const ROBOT_SPEED = 0.1; // Velocidade de movimento
const ROTATION_SPEED = 0.05; // Velocidade de rotação

// ==========================================
// INICIALIZAÇÃO
// ==========================================

function init() {
    // Configurar Three.js
    setupThreeJS();

    // Configurar Cannon.js (física)
    setupPhysics();

    // Criar ambiente
    createEnvironment();

    // Criar robô
    createRobot();

    // Criar arena com obstáculos
    createArena();

    // Criar pontos de início e fim
    createStartEndPoints();

    // Iniciar loop de animação
    animate();
}

// ==========================================
// CONFIGURAÇÃO THREE.JS
// ==========================================

function setupThreeJS() {
    // Criar cena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

    // Configurar câmera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 80, 100);
    camera.lookAt(0, 0, 0);

    // Configurar renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Ajustar ao redimensionar
    window.addEventListener('resize', onWindowResize);
}

// ==========================================
// CONFIGURAÇÃO FÍSICA (CANNON.JS)
// ==========================================

function setupPhysics() {
    // Criar mundo físico
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    // Material de contato
    world.defaultContactMaterial.friction = 0.4;
    world.defaultContactMaterial.restitution = 0.3;
}

// ==========================================
// CRIAR AMBIENTE
// ==========================================

function createEnvironment() {
    // Criar chão com textura de grama
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundTexture = createGrassTexture();
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        map: groundTexture,
        side: THREE.DoubleSide 
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Adicionar física ao chão
    const groundShape = new CANNON.Plane();
    groundBody = new CANNON.Body({
        mass: 0, // Massa 0 = estático
        shape: groundShape
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);

    // Criar skybox simples
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

// Criar textura procedural de grama
function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fundo verde
    ctx.fillStyle = '#4a7c4e';
    ctx.fillRect(0, 0, 512, 512);

    // Adicionar variação
    for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = `rgba(${50 + Math.random() * 30}, ${100 + Math.random() * 55}, ${50 + Math.random() * 30}, 0.3)`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
}

// ==========================================
// CRIAR ROBÔ
// ==========================================

function createRobot() {
    // Grupo para o robô
    robot = new THREE.Group();

    // Corpo principal (cubo)
    const bodyGeometry = new THREE.BoxGeometry(4, 4, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2196F3,
        emissive: 0x1565C0,
        emissiveIntensity: 0.2
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    robot.add(bodyMesh);

    // Cabeça (esfera)
    const headGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFF5722,
        emissive: 0xE64A19,
        emissiveIntensity: 0.3
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = 3;
    headMesh.castShadow = true;
    robot.add(headMesh);

    // Olhos (esferas pequenas)
    const eyeGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.5, 3, 1.3);
    robot.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.5, 3, 1.3);
    robot.add(rightEye);

    // Indicador de direção (cone)
    const arrowGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const arrowMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.z = 3;
    robot.add(arrow);

    // Posicionar robô
    robot.position.set(initialRobotPosition.x, initialRobotPosition.y, initialRobotPosition.z);
    scene.add(robot);

    // Adicionar física ao robô
    const robotShape = new CANNON.Box(new CANNON.Vec3(2, 2, 2));
    robotBody = new CANNON.Body({
        mass: 5,
        shape: robotShape,
        linearDamping: 0.4,
        angularDamping: 0.4
    });
    robotBody.position.set(initialRobotPosition.x, initialRobotPosition.y, initialRobotPosition.z);
    world.add(robotBody);
}

// ==========================================
// CRIAR ARENA COM OBSTÁCULOS
// ==========================================

function createArena() {
    // Paredes da arena
    createWall(-50, 0, 0, 2, 20, 100, 0x8B4513); // Parede esquerda
    createWall(50, 0, 0, 2, 20, 100, 0x8B4513);  // Parede direita
    createWall(0, 0, -50, 100, 20, 2, 0x8B4513); // Parede traseira
    createWall(0, 0, 50, 100, 20, 2, 0x8B4513);  // Parede frontal

    // Obstáculos
    createObstacle(-20, 5, 0, 8, 10, 8, 0xFF9800);  // Obstáculo 1
    createObstacle(10, 5, -20, 10, 10, 10, 0x9C27B0); // Obstáculo 2
    createObstacle(20, 3, 20, 6, 6, 6, 0x00BCD4);    // Obstáculo 3

    // Rampas
    createRamp(0, 2, 0, 20, 0.5, 15, Math.PI / 6, 0x4CAF50);
    createRamp(-25, 2, 25, 15, 0.5, 10, -Math.PI / 8, 0xFFC107);

    // Plataforma elevada
    createPlatform(30, 8, -10, 15, 1, 15, 0x795548);
}

// Criar parede
function createWall(x, y, z, width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y + height/2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y + height/2, z);
    world.add(body);
}

// Criar obstáculo
function createObstacle(x, y, z, width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);

    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y, z);
    world.add(body);
}

// Criar rampa
function createRamp(x, y, z, width, height, depth, rotation, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y, z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rotation);
    world.add(body);
}

// Criar plataforma
function createPlatform(x, y, z, width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y, z);
    world.add(body);
}

// ==========================================
// CRIAR PONTOS DE INÍCIO E FIM
// ==========================================

function createStartEndPoints() {
    // Ponto A (Início)
    const startGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 32);
    const startMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4CAF50,
        emissive: 0x2E7D32,
        emissiveIntensity: 0.5
    });
    startPoint = new THREE.Mesh(startGeometry, startMaterial);
    startPoint.position.set(-40, 0.25, 0);
    scene.add(startPoint);

    // Texto "A"
    createTextSprite("A", -40, 8, 0, 0x4CAF50);

    // Ponto B (Fim)
    const endGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 32);
    const endMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xF44336,
        emissive: 0xC62828,
        emissiveIntensity: 0.5
    });
    endPoint = new THREE.Mesh(endGeometry, endMaterial);
    endPoint.position.set(40, 0.25, 0);
    scene.add(endPoint);

    // Texto "B"
    createTextSprite("B", 40, 8, 0, 0xF44336);
}

// Criar sprite de texto
function createTextSprite(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');

    context.fillStyle = '#' + color.toString(16).padStart(6, '0');
    context.font = 'Bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z);
    sprite.scale.set(5, 5, 1);
    scene.add(sprite);
}

// ==========================================
// INTERPRETADOR DE COMANDOS LBML
// ==========================================

function parseLBMLCommands(input) {
    const commands = [];
    const commandStrings = input.split(';').filter(cmd => cmd.trim());

    for (let cmdStr of commandStrings) {
        cmdStr = cmdStr.trim();
        if (!cmdStr) continue;

        // Regex para capturar: Prefixo + Valor + Direção
        const match = cmdStr.match(/^([DR])(\d+)([FBLR])$/);

        if (!match) {
            console.error(`Comando inválido: ${cmdStr}`);
            continue;
        }

        const [, prefix, value, direction] = match;
        const numValue = parseInt(value);

        // Validar comando
        if (prefix === 'D' && ['F', 'B', 'L', 'R'].includes(direction)) {
            commands.push({
                type: 'move',
                value: numValue,
                direction: direction
            });
        } else if (prefix === 'R' && ['L', 'R'].includes(direction)) {
            commands.push({
                type: 'rotate',
                value: numValue,
                direction: direction
            });
        } else {
            console.error(`Comando inválido: ${cmdStr}`);
        }
    }

    return commands;
}

// ==========================================
// EXECUÇÃO DE COMANDOS
// ==========================================

async function executeCommands() {
    if (isExecuting) return;

    const input = document.getElementById('command-input').value;
    if (!input.trim()) {
        updateStatus('Por favor, digite comandos LBML!', 'error');
        return;
    }

    const commands = parseLBMLCommands(input);
    if (commands.length === 0) {
        updateStatus('Nenhum comando válido encontrado!', 'error');
        return;
    }

    isExecuting = true;
    document.getElementById('execute-btn').disabled = true;
    updateStatus('Executando comandos...', 'info');

    // Executar comandos sequencialmente
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        updateStatus(`Executando: ${cmd.type} ${cmd.value} ${cmd.direction}`, 'info');

        if (cmd.type === 'move') {
            await moveRobot(cmd.value, cmd.direction);
        } else if (cmd.type === 'rotate') {
            await rotateRobot(cmd.value, cmd.direction);
        }

        // Pequena pausa entre comandos
        await sleep(200);
    }

    // Verificar vitória
    checkVictory();

    isExecuting = false;
    document.getElementById('execute-btn').disabled = false;
    updateStatus('Comandos executados!', 'success');
}

// Mover robô
async function moveRobot(distance, direction) {
    const steps = Math.ceil(distance / ROBOT_SPEED);
    const stepDistance = distance / steps * UNIT_SCALE;

    for (let i = 0; i < steps; i++) {
        const angle = robot.rotation.y;
        let dx = 0, dz = 0;

        switch(direction) {
            case 'F': // Frente
                dx = Math.sin(angle) * stepDistance;
                dz = Math.cos(angle) * stepDistance;
                break;
            case 'B': // Trás
                dx = -Math.sin(angle) * stepDistance;
                dz = -Math.cos(angle) * stepDistance;
                break;
            case 'L': // Esquerda
                dx = Math.sin(angle - Math.PI/2) * stepDistance;
                dz = Math.cos(angle - Math.PI/2) * stepDistance;
                break;
            case 'R': // Direita
                dx = Math.sin(angle + Math.PI/2) * stepDistance;
                dz = Math.cos(angle + Math.PI/2) * stepDistance;
                break;
        }

        // Aplicar movimento na física
        robotBody.position.x += dx;
        robotBody.position.z += dz;

        await sleep(20);
    }
}

// Rotacionar robô
async function rotateRobot(degrees, direction) {
    const radians = (degrees * Math.PI) / 180;
    const steps = Math.ceil(Math.abs(radians) / ROTATION_SPEED);
    const stepRotation = radians / steps;

    for (let i = 0; i < steps; i++) {
        if (direction === 'L') {
            robot.rotation.y += stepRotation;
            robotBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), robot.rotation.y);
        } else if (direction === 'R') {
            robot.rotation.y -= stepRotation;
            robotBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), robot.rotation.y);
        }

        await sleep(20);
    }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = `Status: ${message}`;

    // Cores baseadas no tipo
    const colors = {
        info: '#2196F3',
        success: '#4CAF50',
        error: '#F44336'
    };
    statusEl.style.color = colors[type] || '#333';
}

function updatePosition() {
    const distance = Math.sqrt(
        Math.pow(robot.position.x - endPoint.position.x, 2) +
        Math.pow(robot.position.z - endPoint.position.z, 2)
    );

    const positionEl = document.getElementById('position');
    if (distance < 5) {
        positionEl.textContent = 'Posição: B (Fim) - VITÓRIA! 🎉';
        positionEl.style.color = '#4CAF50';
    } else {
        positionEl.textContent = `Posição: ${distance.toFixed(1)}cm do objetivo`;
        positionEl.style.color = '#333';
    }
}

function checkVictory() {
    const distance = Math.sqrt(
        Math.pow(robot.position.x - endPoint.position.x, 2) +
        Math.pow(robot.position.z - endPoint.position.z, 2)
    );

    if (distance < 5) {
        updateStatus('🎉 VITÓRIA! Você chegou ao ponto B!', 'success');
        // Animação de vitória
        endPoint.material.emissiveIntensity = 1;
        setTimeout(() => {
            endPoint.material.emissiveIntensity = 0.5;
        }, 1000);
    }
}

function resetGame() {
    // Resetar posição do robô
    robot.position.set(initialRobotPosition.x, initialRobotPosition.y, initialRobotPosition.z);
    robot.rotation.y = initialRobotRotation;

    // Resetar física do robô
    robotBody.position.set(initialRobotPosition.x, initialRobotPosition.y, initialRobotPosition.z);
    robotBody.velocity.set(0, 0, 0);
    robotBody.angularVelocity.set(0, 0, 0);
    robotBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), initialRobotRotation);

    // Limpar interface
    document.getElementById('command-input').value = '';
    updateStatus('Jogo resetado! Aguardando comandos...', 'info');
    updatePosition();

    isExecuting = false;
    document.getElementById('execute-btn').disabled = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// LOOP DE ANIMAÇÃO
// ==========================================

function animate() {
    requestAnimationFrame(animate);

    // Atualizar física
    world.step(1/60);

    // Sincronizar robô visual com corpo físico
    robot.position.copy(robotBody.position);
    robot.quaternion.copy(robotBody.quaternion);

    // Manter robô na vertical (evitar tombar)
    const euler = new THREE.Euler();
    euler.setFromQuaternion(robot.quaternion);
    euler.x = 0;
    euler.z = 0;
    robot.rotation.setFromVector3(euler.toVector3());

    // Atualizar posição na interface
    if (!isExecuting) {
        updatePosition();
    }

    // Renderizar cena
    renderer.render(scene, camera);
}

// ==========================================
// INICIAR JOGO
// ==========================================

// Aguardar carregamento do DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expor funções globais para os botões
window.executeCommands = executeCommands;
window.resetGame = resetGame;