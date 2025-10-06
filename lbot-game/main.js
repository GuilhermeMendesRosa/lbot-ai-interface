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
let initialRobotPosition = { x: -60, y: 5, z: 0 };
let initialRobotRotation = 0;

// Variáveis para controle de câmera
let mouseX = 0, mouseY = 0;
let isMouseDown = false;
let cameraDistance = 100; // Reduzido de 350 para 100
let cameraHeight = 50;    // Reduzido de 200 para 50

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
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 200, 800);

    // Configurar câmera (terceira pessoa)
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1500
    );
    // Posição inicial mais próxima para melhor visualização
    camera.position.set(50, 60, 80);
    camera.lookAt(0, 0, 0);

    // Configurar renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Iluminação similar ao simulador LBML
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -400;
    directionalLight.shadow.camera.right = 400;
    directionalLight.shadow.camera.top = 400;
    directionalLight.shadow.camera.bottom = -400;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.6);
    scene.add(hemisphereLight);

    // Event listeners para controle de mouse
    setupMouseControls();
    
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
    const groundGeometry = new THREE.PlaneGeometry(800, 800);
    const groundTexture = createGrassTexture();
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        map: groundTexture,
        color: 0x90EE90,
        side: THREE.DoubleSide 
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Adicionar grid helper similar ao simulador LBML
    const gridHelper = new THREE.GridHelper(800, 80, 0x4CAF50, 0x90EE90);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

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

// Criar textura procedural de grama similar ao simulador LBML
function createGrassTexture() {
    // Usar SVG similar ao do HTML para criar uma textura mais realista
    const svg = `
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grass" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#228B22"/>
              <path d="M2,8 Q2,6 1,4 Q2,2 3,0" stroke="#32CD32" stroke-width="0.5" fill="none"/>
              <path d="M4,8 Q4,6 5,4 Q4,2 3,0" stroke="#32CD32" stroke-width="0.5" fill="none"/>
              <path d="M6,8 Q6,6 7,4 Q6,2 5,0" stroke="#32CD32" stroke-width="0.5" fill="none"/>
              <circle cx="1" cy="7" r="0.3" fill="#90EE90"/>
              <circle cx="5" cy="6" r="0.2" fill="#90EE90"/>
              <circle cx="7" cy="7" r="0.25" fill="#90EE90"/>
            </pattern>
          </defs>
          <rect width="64" height="64" fill="url(#grass)"/>
        </svg>
    `;

    // Converter SVG para data URL
    const dataUrl = 'data:image/svg+xml;base64,' + btoa(svg);
    
    // Criar textura
    const loader = new THREE.TextureLoader();
    const texture = loader.load(dataUrl);
    
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100);
    
    return texture;
}

// ==========================================
// CRIAR ROBÔ
// ==========================================

function createRobot() {
    // Grupo para o robô
    robot = new THREE.Group();

    // Chassis (base do carrinho)
    const chassisGeometry = new THREE.BoxGeometry(5, 1, 7.5);
    const chassisMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2C3E50, 
        metalness: 0.7, 
        roughness: 0.3 
    });
    const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
    chassis.position.y = 1.5;
    chassis.castShadow = true;
    robot.add(chassis);

    // Corpo principal
    const bodyGeometry = new THREE.BoxGeometry(4.5, 2, 6.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3498DB, 
        metalness: 0.6, 
        roughness: 0.4 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 3;
    body.castShadow = true;
    robot.add(body);

    // Capô do carrinho
    const hoodGeometry = new THREE.BoxGeometry(4, 0.75, 2);
    const hoodMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xE74C3C, 
        metalness: 0.5, 
        roughness: 0.3 
    });
    const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
    hood.position.set(0, 4.125, 2);
    hood.castShadow = true;
    robot.add(hood);

    // Para-brisa
    const windshieldGeometry = new THREE.BoxGeometry(4, 1.5, 0.25);
    const windshieldMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87CEEB, 
        metalness: 0.1, 
        roughness: 0.1, 
        transparent: true, 
        opacity: 0.7 
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 3.75, 1);
    windshield.rotation.x = -0.2;
    robot.add(windshield);

    // Faróis
    const headlightGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.25, 12);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        emissive: 0xffffaa, 
        emissiveIntensity: 0.5 
    });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.rotation.z = Math.PI / 2;
    leftHeadlight.position.set(-1.5, 3.25, 3.875);
    robot.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.rotation.z = Math.PI / 2;
    rightHeadlight.position.set(1.5, 3.25, 3.875);
    robot.add(rightHeadlight);

    // Grade frontal
    const grillGeometry = new THREE.BoxGeometry(3, 1, 0.125);
    const grillMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2C3E50, 
        metalness: 0.8, 
        roughness: 0.2 
    });
    const grill = new THREE.Mesh(grillGeometry, grillMaterial);
    grill.position.set(0, 2.75, 3.8);
    robot.add(grill);

    // Rodas
    const wheelGeometry = new THREE.CylinderGeometry(1, 1, 0.75, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2C3E50, 
        metalness: 0.8, 
        roughness: 0.2 
    });

    // Roda dianteira esquerda
    const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontLeftWheel.rotation.z = Math.PI / 2;
    frontLeftWheel.position.set(-2.75, 1, 2.5);
    frontLeftWheel.castShadow = true;
    robot.add(frontLeftWheel);

    // Roda dianteira direita
    const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontRightWheel.rotation.z = Math.PI / 2;
    frontRightWheel.position.set(2.75, 1, 2.5);
    frontRightWheel.castShadow = true;
    robot.add(frontRightWheel);

    // Roda traseira esquerda
    const rearLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rearLeftWheel.rotation.z = Math.PI / 2;
    rearLeftWheel.position.set(-2.75, 1, -2.5);
    rearLeftWheel.castShadow = true;
    robot.add(rearLeftWheel);

    // Roda traseira direita
    const rearRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rearRightWheel.rotation.z = Math.PI / 2;
    rearRightWheel.position.set(2.75, 1, -2.5);
    rearRightWheel.castShadow = true;
    robot.add(rearRightWheel);

    // Detalhes das rodas
    const wheelDetailGeometry = new THREE.CylinderGeometry(0.625, 0.625, 0.875, 8);
    const wheelDetailMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x95A5A6, 
        metalness: 0.9, 
        roughness: 0.1 
    });

    const frontLeftWheelDetail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
    frontLeftWheelDetail.rotation.z = Math.PI / 2;
    frontLeftWheelDetail.position.set(-2.75, 1, 2.5);
    robot.add(frontLeftWheelDetail);

    const frontRightWheelDetail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
    frontRightWheelDetail.rotation.z = Math.PI / 2;
    frontRightWheelDetail.position.set(2.75, 1, 2.5);
    robot.add(frontRightWheelDetail);

    const rearLeftWheelDetail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
    rearLeftWheelDetail.rotation.z = Math.PI / 2;
    rearLeftWheelDetail.position.set(-2.75, 1, -2.5);
    robot.add(rearLeftWheelDetail);

    const rearRightWheelDetail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
    rearRightWheelDetail.rotation.z = Math.PI / 2;
    rearRightWheelDetail.position.set(2.75, 1, -2.5);
    robot.add(rearRightWheelDetail);

    // Antena
    const antennaGeometry = new THREE.CylinderGeometry(0.075, 0.075, 1.5, 8);
    const antennaMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x95A5A6, 
        metalness: 0.8, 
        roughness: 0.2 
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 4.75, -1.25);
    robot.add(antenna);

    // LED da antena
    const antennaLedGeometry = new THREE.SphereGeometry(0.25, 8, 6);
    const antennaLedMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF0000, 
        emissive: 0xFF0000, 
        emissiveIntensity: 0.4 
    });
    const antennaLed = new THREE.Mesh(antennaLedGeometry, antennaLedMaterial);
    antennaLed.position.set(0, 5.5, -1.25);
    robot.add(antennaLed);

    // Indicador de direção (seta amarela)
    const arrowGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFF00, 
        metalness: 0.5, 
        roughness: 0.3, 
        emissive: 0xFFFF00, 
        emissiveIntensity: 0.3 
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 4.25, 3);
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
    // Paredes da arena (reduzidas para altura baixa)
    createWall(-75, 0, 0, 2, 8, 150, 0x8B4513); // Parede esquerda
    createWall(75, 0, 0, 2, 8, 150, 0x8B4513);  // Parede direita
    createWall(0, 0, -75, 150, 8, 2, 0x8B4513); // Parede traseira
    createWall(0, 0, 75, 150, 8, 2, 0x8B4513);  // Parede frontal

    // Obstáculos de madeira baixos
    createWoodenObstacle(-30, 2, 0, 8, 4, 8);     // Caixa de madeira 1
    createWoodenObstacle(15, 2, -30, 10, 4, 10);  // Caixa de madeira 2
    createWoodenObstacle(35, 1.5, 35, 6, 3, 6);   // Caixa de madeira 3
    createWoodenObstacle(-50, 3, -30, 12, 6, 8);  // Caixa de madeira grande
    createWoodenObstacle(50, 2, 20, 8, 4, 12);    // Caixa de madeira 4

    // Barris de madeira (mantidos - já são baixos)
    createWoodenBarrel(-40, 4, 30, 4, 8);
    createWoodenBarrel(40, 4, -35, 4, 8);
    createWoodenBarrel(0, 4, -60, 4, 8);
    createWoodenBarrel(-15, 4, 55, 4, 8);

    // Cercas de madeira baixas
    createWoodenFence(-10, 0, -15, 20, 3, 1);   // Reduzida de 6 para 3
    createWoodenFence(30, 0, 10, 1, 3, 20);     // Reduzida de 6 para 3
    createWoodenFence(-35, 0, 50, 25, 3, 1);    // Reduzida de 6 para 3

    // Rampas de madeira baixas (mantidas - já são baixas)
    createWoodenRamp(0, 1, 0, 20, 0.5, 15, Math.PI / 8);      // Altura reduzida
    createWoodenRamp(-40, 1, 40, 15, 0.5, 10, -Math.PI / 12); // Altura reduzida
    createWoodenRamp(45, 1, -20, 18, 0.5, 12, Math.PI / 15);  // Altura reduzida

    // Plataformas de madeira baixas
    createWoodenPlatform(45, 3, -50, 15, 1, 15);  // Altura reduzida de 8 para 3
    createWoodenPlatform(-45, 2.5, -20, 20, 1, 12); // Altura reduzida de 6 para 2.5
    createWoodenPlatform(20, 4, 60, 12, 1, 18);   // Altura reduzida de 10 para 4

    // Obstáculos adicionais baixos para compensar
    createWoodenObstacle(-20, 1.5, -25, 6, 3, 6);
    createWoodenObstacle(25, 1.5, 25, 6, 3, 6);
    createWoodenObstacle(-10, 2, 40, 8, 4, 4);
    createWoodenObstacle(10, 2, -40, 8, 4, 4);
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
// ELEMENTOS DE MADEIRA
// ==========================================

// Criar textura de madeira procedural
function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base marrom
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 256, 256);

    // Adicionar textura de madeira
    for (let i = 0; i < 50; i++) {
        const y = Math.random() * 256;
        const darkness = 0.2 + Math.random() * 0.3;
        ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
        ctx.fillRect(0, y, 256, 2 + Math.random() * 3);
    }

    // Adicionar nós na madeira
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const radius = 5 + Math.random() * 10;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Material de madeira
function getWoodMaterial() {
    const woodTexture = createWoodTexture();
    return new THREE.MeshPhongMaterial({
        map: woodTexture,
        color: 0xCD853F,
        shininess: 10,
        specular: 0x222222
    });
}

// Obstáculo de madeira
function createWoodenObstacle(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = getWoodMaterial();
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

// Pilar de madeira
function createWoodenPillar(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = getWoodMaterial();
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

// Barril de madeira
function createWoodenBarrel(x, y, z, radius, height) {
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.8, height, 16);
    const material = getWoodMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Adicionar aros metálicos
    for (let i = 0; i < 3; i++) {
        const ringGeometry = new THREE.TorusGeometry(radius + 0.1, 0.1, 8, 16);
        const ringMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(x, y + (i - 1) * height * 0.3, z);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
    }

    // Física
    const shape = new CANNON.Cylinder(radius * 0.8, radius, height, 8);
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y, z);
    world.add(body);
}

// Cerca de madeira
function createWoodenFence(x, y, z, width, height, depth) {
    // Base da cerca
    const baseGeometry = new THREE.BoxGeometry(width, height * 0.2, depth);
    const baseMaterial = getWoodMaterial();
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, y + height * 0.1, z);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    // Ripas verticais
    const ripWidth = Math.max(width, depth) > 15 ? 2 : 1;
    const ripCount = Math.floor(Math.max(width, depth) / 3);
    for (let i = 0; i < ripCount; i++) {
        const ripGeometry = new THREE.BoxGeometry(
            width > depth ? ripWidth : width,
            height * 0.8,
            depth > width ? ripWidth : depth
        );
        const rip = new THREE.Mesh(ripGeometry, baseMaterial);
        
        if (width > depth) {
            rip.position.set(x - width/2 + (i + 0.5) * width/ripCount, y + height * 0.5, z);
        } else {
            rip.position.set(x, y + height * 0.5, z - depth/2 + (i + 0.5) * depth/ripCount);
        }
        
        rip.castShadow = true;
        rip.receiveShadow = true;
        scene.add(rip);
    }

    // Física (apenas a base)
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y + height/2, z);
    world.add(body);
}

// Rampa de madeira
function createWoodenRamp(x, y, z, width, height, depth, rotation) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = getWoodMaterial();
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

// Plataforma de madeira
function createWoodenPlatform(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = getWoodMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Suportes da plataforma
    const supportCount = Math.floor(Math.max(width, depth) / 8);
    for (let i = 0; i < supportCount; i++) {
        const supportGeometry = new THREE.BoxGeometry(2, y, 2);
        const support = new THREE.Mesh(supportGeometry, material);
        
        if (width > depth) {
            support.position.set(x - width/2 + (i + 0.5) * width/supportCount, y/2, z);
        } else {
            support.position.set(x, y/2, z - depth/2 + (i + 0.5) * depth/supportCount);
        }
        
        support.castShadow = true;
        support.receiveShadow = true;
        scene.add(support);
    }

    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y, z);
    world.add(body);
}

// Torre de madeira
function createWoodenTower(x, y, z, width, height, depth) {
    // Base da torre
    const baseGeometry = new THREE.BoxGeometry(width, height * 0.7, depth);
    const material = getWoodMaterial();
    const base = new THREE.Mesh(baseGeometry, material);
    base.position.set(x, y + height * 0.35, z);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    // Topo da torre (pirâmide)
    const roofGeometry = new THREE.ConeGeometry(width * 0.7, height * 0.4, 8);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(x, y + height * 0.9, z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);

    // Janelas
    const windowGeometry = new THREE.BoxGeometry(1, 3, 0.5);
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    for (let i = 0; i < 4; i++) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        const angle = (i / 4) * Math.PI * 2;
        window.position.set(
            x + Math.cos(angle) * width * 0.51,
            y + height * 0.5,
            z + Math.sin(angle) * depth * 0.51
        );
        scene.add(window);
    }

    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
    const body = new CANNON.Body({
        mass: 0,
        shape: shape
    });
    body.position.set(x, y + height/2, z);
    world.add(body);
}

// Ponte de madeira
function createWoodenBridge(x, y, z, width, height, depth) {
    // Deck da ponte
    const deckGeometry = new THREE.BoxGeometry(width, height, depth);
    const material = getWoodMaterial();
    const deck = new THREE.Mesh(deckGeometry, material);
    deck.position.set(x, y, z);
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    // Corrimãos
    const railHeight = 4;
    const railGeometry = new THREE.BoxGeometry(
        width > depth ? width : 0.5,
        railHeight,
        depth > width ? depth : 0.5
    );
    
    // Corrimão esquerdo
    const leftRail = new THREE.Mesh(railGeometry, material);
    if (width > depth) {
        leftRail.position.set(x, y + railHeight/2, z - depth/2);
    } else {
        leftRail.position.set(x - width/2, y + railHeight/2, z);
    }
    leftRail.castShadow = true;
    scene.add(leftRail);

    // Corrimão direito
    const rightRail = new THREE.Mesh(railGeometry, material);
    if (width > depth) {
        rightRail.position.set(x, y + railHeight/2, z + depth/2);
    } else {
        rightRail.position.set(x + width/2, y + railHeight/2, z);
    }
    rightRail.castShadow = true;
    scene.add(rightRail);

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
    startPoint.position.set(-60, 0.25, 0);
    scene.add(startPoint);

    // Texto "A"
    createTextSprite("A", -60, 8, 0, 0x4CAF50);

    // Ponto B (Fim)
    const endGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 32);
    const endMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xF44336,
        emissive: 0xC62828,
        emissiveIntensity: 0.5
    });
    endPoint = new THREE.Mesh(endGeometry, endMaterial);
    endPoint.position.set(60, 0.25, 0);
    scene.add(endPoint);

    // Texto "B"
    createTextSprite("B", 60, 8, 0, 0xF44336);
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

    // Para comandos L e R, primeiro rotacionar 90 graus
    if (direction === 'L') {
        await rotateRobot(90, 'L');
        direction = 'F'; // Após girar à esquerda, mover para frente
    } else if (direction === 'R') {
        await rotateRobot(90, 'R');
        direction = 'F'; // Após girar à direita, mover para frente
    }

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

    // Resetar câmera para posição inicial mais próxima
    camera.position.set(50, 60, 80);
    camera.lookAt(0, 0, 0);
    mouseX = 0;
    mouseY = 0;
    isMouseDown = false;

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

    // Atualizar câmera orbital
    updateOrbitalCamera();

    // Atualizar posição na interface
    if (!isExecuting) {
        updatePosition();
    }

    // Renderizar cena
    renderer.render(scene, camera);
}

// Configurar controles de mouse para câmera orbital
function setupMouseControls() {
    document.addEventListener('mousedown', (e) => {
        isMouseDown = true;
    });
    
    document.addEventListener('mouseup', (e) => {
        isMouseDown = false;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        }
    });
    
    // Controle de zoom com scroll do mouse (distâncias mais próximas)
    document.addEventListener('wheel', (e) => {
        cameraDistance += e.deltaY * 0.05; // Reduzir sensibilidade
        cameraDistance = Math.max(20, Math.min(200, cameraDistance)); // Limites mais próximos
    });
}

// Atualizar câmera orbital similar ao simulador LBML
function updateOrbitalCamera() {
    if (isMouseDown) {
        // Controle orbital baseado no mouse
        camera.position.x = cameraDistance * Math.cos(mouseX * Math.PI);
        camera.position.z = cameraDistance * Math.sin(mouseX * Math.PI);
        camera.position.y = cameraHeight + mouseY * 100;
        camera.lookAt(robot.position);
    } else {
        // Posição padrão seguindo o robô suavemente (mais próxima)
        const targetX = robot.position.x + 40;  // Reduzido de 150 para 40
        const targetY = robot.position.y + 50;  // Reduzido de 200 para 50
        const targetZ = robot.position.z + 60;  // Reduzido de 300 para 60
        
        // Interpolação suave
        const lerpFactor = 0.05;
        camera.position.x += (targetX - camera.position.x) * lerpFactor;
        camera.position.y += (targetY - camera.position.y) * lerpFactor;
        camera.position.z += (targetZ - camera.position.z) * lerpFactor;
        
        camera.lookAt(robot.position);
    }
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