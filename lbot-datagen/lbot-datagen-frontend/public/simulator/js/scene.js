import * as THREE from 'three';

export function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa7d8ff);
  scene.fog = new THREE.Fog(0xa7d8ff, 80, 240);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 12, -18);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Luz ambiente
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Luz direcional (sol)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(30, 40, -20);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.left = -60;
  directionalLight.shadow.camera.right = 60;
  directionalLight.shadow.camera.top = 60;
  directionalLight.shadow.camera.bottom = -60;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 200;
  scene.add(directionalLight);

  // Luz hemisférica (céu/terra)
  const hemisphereLight = new THREE.HemisphereLight(0x94dfff, 0x2e7d32, 0.45);
  hemisphereLight.position.set(0, 60, 0);
  scene.add(hemisphereLight);

  return { scene, camera, renderer };
}

export function handleResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}