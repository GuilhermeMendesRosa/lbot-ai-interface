// Importar módulos locais
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CONSTANTS } from './utils.js';
import { FollowCamera } from './camera.js';
import { initPhysics } from './physics.js';
import { Labyrinth } from './labyrinth.js';
import { Robot } from './robot.js';
import { setupScene, handleResize } from './scene.js';
import { updateHud, toggleDebugCamera } from './ui.js';
import { executeCommandSequenceFromString, resetRobot } from './commands.js';

// Tornar THREE e CANNON disponíveis globalmente
window.THREE = THREE;
window.CANNON = CANNON;

// Variáveis globais do simulador
let renderer, scene, camera, world, materials, labyrinth, robot, cameraRig;
let orbitControls = null;

function animateLoop() {
  let lastTime;
  let accumulator = 0;

  const step = (time) => {
    if (lastTime === undefined) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, 1 / 30);
    lastTime = time;
    accumulator += dt;

    // Fixed timestep physics
    while (accumulator >= CONSTANTS.FIXED_TIMESTEP) {
      if (robot) robot.stepPrePhysics(CONSTANTS.FIXED_TIMESTEP);
      world.step(CONSTANTS.FIXED_TIMESTEP);
      if (robot) robot.stepPostPhysics(CONSTANTS.FIXED_TIMESTEP);
      accumulator -= CONSTANTS.FIXED_TIMESTEP;
    }

    // Atualiza HUD e câmera
    if (robot) updateHud(robot);
    if (cameraRig) cameraRig.update(dt);
    if (orbitControls) orbitControls.update();

    // Renderiza
    renderer.render(scene, camera);
    requestAnimationFrame(step);
  };

  if (cameraRig) cameraRig.snap();
  requestAnimationFrame(step);
}

function initialize() {
  console.log('Inicializando simulador...');
  
  // Configurar cena 3D
  ({ scene, camera, renderer } = setupScene());
  console.log('Cena configurada');
  
  // Inicializar física
  ({ world, materials } = initPhysics());
  console.log('Física inicializada');
  
  // Criar labirinto
  labyrinth = new Labyrinth(scene, world, materials);
  console.log('Labirinto criado, spawn position:', labyrinth.spawnPosition);
  
  // Criar robô
  robot = new Robot(scene, world, materials.robot, labyrinth.spawnPosition);
  console.log('Robô criado na posição:', robot.body.position);
  
  // Configurar câmera
  cameraRig = new FollowCamera(camera, robot);
  cameraRig.snap();
  console.log('Câmera configurada');

  // Iniciar loop de animação
  animateLoop();
  console.log('Loop de animação iniciado - simulador pronto!');

  // Event listeners
  window.addEventListener('resize', () => handleResize(camera, renderer));
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC') toggleDebugCamera(camera, renderer, orbitControls, FollowCamera, robot);
  });
}

// Funções globais para teste direto no browser
window.testCommand = function() {
  const input = document.getElementById('testCommand').value;
  console.log('Executando comando:', input);
  executeCommandSequenceFromString(input, robot)
    .then(() => console.log('Comando executado com sucesso'))
    .catch(err => console.error('Erro ao executar comando:', err));
};

window.resetCommand = function() {
  console.log('Resetando robô...');
  resetRobot(robot, labyrinth);
};

window.debugInfo = function() {
  console.log('=== DEBUG INFO ===');
  console.log('Robot exists:', !!robot);
  if (robot) {
    console.log('Robot position:', robot.body.position);
    console.log('Robot rotation:', robot.getYawDegrees());
    console.log('Robot velocity:', robot.body.velocity);
    console.log('Robot angular velocity:', robot.body.angularVelocity);
  }
  console.log('Labyrinth exists:', !!labyrinth);
  if (labyrinth) {
    console.log('Spawn position:', labyrinth.spawnPosition);
    console.log('Exit position:', labyrinth.exitPosition);
  }
  console.log('Scene children count:', scene.children.length);
  console.log('Camera position:', camera.position);
};

window.forceMove = function() {
  if (!robot) return;
  console.log('Forçando movimento direto...');
  const oldPos = {x: robot.body.position.x, z: robot.body.position.z};
  robot.body.position.x += 2;
  robot.body.position.z += 2;
  console.log('Posição antes:', oldPos);
  console.log('Nova posição:', robot.body.position);
  
  console.log('Massa:', robot.body.mass);
  console.log('Tipo:', robot.body.type);
  console.log('IsSleeping:', robot.body.sleepState);
};

window.testForce = function() {
  if (!robot) return;
  console.log('Testando com força ao invés de velocidade...');
  const force = new CANNON.Vec3(0, 0, 500);
  robot.body.applyForce(force);
  console.log('Força aplicada:', force);
};

// Message handler para comunicação com o parent frame
window.addEventListener('message', (event) => {
  const data = event.data || {};
  if (typeof data !== 'object') return;

  if (data.type === 'lbml-exec') {
    executeCommandSequenceFromString(data.payload?.command, robot);
  } else if (data.type === 'lbml-reset') {
    resetRobot(robot, labyrinth);
  }
});

// Inicializar quando o DOM e as bibliotecas estiverem prontos
function waitForLibraries() {
  if (typeof THREE !== 'undefined' && typeof CANNON !== 'undefined') {
    initialize();
  } else {
    setTimeout(waitForLibraries, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForLibraries);
} else {
  waitForLibraries();
}