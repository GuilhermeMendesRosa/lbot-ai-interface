// Elementos da UI
const statusEls = {
  posX: document.getElementById('posX'),
  posZ: document.getElementById('posZ'),
  rotation: document.getElementById('rotation'),
  command: document.getElementById('currentCommand'),
};

const indicatorEl = document.getElementById('animationIndicator');
const errorEl = document.getElementById('errorMessage');

export function updateHud(robotInstance) {
  if (!robotInstance) return;
  
  const pos = robotInstance.body.position;
  statusEls.posX.textContent = pos.x.toFixed(2);
  statusEls.posZ.textContent = pos.z.toFixed(2);
  statusEls.rotation.textContent = `${Math.round(
    ((robotInstance.getYawDegrees() % 360) + 360) % 360
  )}°`;
}

export function setIndicator(active) {
  indicatorEl.style.display = active ? 'block' : 'none';
}

export function showError(message = 'Comando inválido!') {
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 2000);
}

export function updateCommandDisplay(command) {
  statusEls.command.textContent = command || '-';
}

// Funções de controle da câmera
export function toggleDebugCamera(camera, renderer, orbitControls, FollowCamera, robot) {
  if (!camera || !renderer) return;
  
  if (orbitControls) {
    // Desativa controles de órbita
    orbitControls.dispose();
    orbitControls = null;
    
    // Reativa câmera de seguimento
    const cameraRig = new FollowCamera(camera, robot);
    cameraRig.snap();
    return null;
  } else {
    // Ativa controles de órbita
    import('three/addons/controls/OrbitControls.js').then(({ OrbitControls }) => {
      orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      return orbitControls;
    });
  }
}