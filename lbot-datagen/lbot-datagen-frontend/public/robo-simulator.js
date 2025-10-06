import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const PATH_WIDTH = 3;
const WALL_THICKNESS = 1;
const WALL_HEIGHT = 2;
const LABYRINTH_SIZE = 20;
const FLOOR_SIZE = 100;
const RAMP_ANGLE = THREE.MathUtils.degToRad(30);
const RAMP_LENGTH = 2.0;
const RAMP_HEIGHT = Math.sin(RAMP_ANGLE) * RAMP_LENGTH; // 1 metro
const PLATFORM_THICKNESS = 0.2;
const FIXED_TIMESTEP = 1 / 60;

const statusEls = {
  posX: document.getElementById('posX'),
  posZ: document.getElementById('posZ'),
  rotation: document.getElementById('rotation'),
  command: document.getElementById('currentCommand'),
};

const indicatorEl = document.getElementById('animationIndicator');
const errorEl = document.getElementById('errorMessage');

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class FollowCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.offset = new THREE.Vector3(0, 6, -10);
    this.lookAtOffset = new THREE.Vector3(0, 1.2, 0);
    this.current = new THREE.Vector3();
    this.enabled = true;
    this.smoothing = 6;
  }

  snap() {
    if (!this.target) return;
    const desired = this.calculateDesiredPosition();
    this.current.copy(desired);
    this.camera.position.copy(desired);
    this.camera.lookAt(this.getLookAt());
  }

  calculateDesiredPosition() {
    const targetPos = this.target.getVisualPosition();
    const rotatedOffset = this.offset
      .clone()
      .applyQuaternion(this.target.getVisualQuaternion());
    return targetPos.add(rotatedOffset);
  }

  getLookAt() {
    return this.target
      .getVisualPosition()
      .clone()
      .add(this.lookAtOffset);
  }

  update(dt) {
    if (!this.enabled || !this.target) return;
    const desired = this.calculateDesiredPosition();
    const lerpFactor = 1 - Math.exp(-this.smoothing * dt);
    this.current.lerp(desired, clamp(lerpFactor, 0, 1));
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.getLookAt());
  }
}

class Labyrinth {
  constructor(scene, world, materials) {
    this.scene = scene;
    this.world = world;
    this.materials = materials;
    this.columns = 5;
    this.rows = 5;
    this.cellSize = PATH_WIDTH + WALL_THICKNESS;
    this.floorStart = -LABYRINTH_SIZE / 2;
    this.staticBodies = [];
    this.cellElevation = Array.from({ length: this.columns }, () =>
      Array(this.rows).fill(0)
    );

    this.eastOpen = Array.from({ length: this.columns - 1 }, () =>
      Array(this.rows).fill(false)
    );
    this.northOpen = Array.from({ length: this.columns }, () =>
      Array(this.rows - 1).fill(false)
    );

    this.defineConnectivity();
    this.createFloor();
    this.buildWalls();
    this.buildElevations();
    this.buildRamps();
    this.buildObstacles();
    this.buildPortal();
  }

  cellCenter(i, j) {
    const x =
      this.floorStart + i * this.cellSize + PATH_WIDTH / 2 + i * 0; // clarity
    const z = this.floorStart + j * this.cellSize + PATH_WIDTH / 2;
    return new THREE.Vector3(x, 0, z);
  }

  defineConnectivity() {
    // Caminho principal até a saída
    this.northOpen[0][0] = true;
    this.northOpen[0][1] = true;
    this.eastOpen[0][2] = true;
    this.eastOpen[1][2] = true;
    this.northOpen[2][2] = true;
    this.eastOpen[2][3] = true;
    this.eastOpen[3][3] = true;
    this.northOpen[4][3] = true;

    // Corredores em U e L
    this.eastOpen[0][1] = true;
    this.northOpen[1][0] = true;
    this.eastOpen[1][1] = true;
    this.northOpen[2][1] = true;
    this.eastOpen[2][1] = true;
    this.northOpen[3][1] = true;
    this.eastOpen[2][2] = true;

    // Dead end superior esquerdo
    this.northOpen[0][2] = true;
    this.northOpen[0][3] = true;

    // Dead end inferior direito
    this.eastOpen[0][0] = true;
    this.eastOpen[1][0] = true;
    this.eastOpen[2][0] = true;

    // Ajuste de elevações para rampas
    this.cellElevation[2][3] = 1;
    this.cellElevation[3][3] = 1;
    this.cellElevation[4][3] = 1;
    this.cellElevation[4][4] = 2;
  }

  createFloor() {
    const texture = new THREE.TextureLoader().load(
      'data:image/svg+xml;base64,' +
        btoa(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#8ec07c"/>
          <path d="M0 32H64" stroke="#6ca76f" stroke-width="2" opacity="0.5"/>
          <path d="M32 0V64" stroke="#6ca76f" stroke-width="2" opacity="0.5"/>
        </svg>
      `)
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x9dcc8a, map: texture })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const groundBody = new CANNON.Body({
      mass: 0,
      material: this.materials.ground,
    });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.userData = { type: 'ground' };
    this.world.addBody(groundBody);

    const gridHelper = new THREE.GridHelper(FLOOR_SIZE, FLOOR_SIZE / 2, 0x335533, 0x88aa88);
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    const spawnCenter = this.cellCenter(0, 0);
    this.spawnPosition = new CANNON.Vec3(
      spawnCenter.x,
      0.35,
      this.floorStart + 0.8
    );

    const exitCenter = this.cellCenter(this.columns - 1, this.rows - 1);
    this.exitPosition = new THREE.Vector3(exitCenter.x, 0, exitCenter.z);
  }

  addStaticBox({ position, size, quaternion, meshMaterial, physicsMaterial, type }) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(
      geometry,
      meshMaterial ||
        new THREE.MeshStandardMaterial({ color: 0x5c6f7a, roughness: 0.7 })
    );
    mesh.position.copy(position);
    if (quaternion) {
      mesh.quaternion.copy(quaternion);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const body = new CANNON.Body({
      mass: 0,
      material: physicsMaterial || this.materials.wall,
    });
    body.addShape(new CANNON.Box(halfExtents));
    body.position.set(position.x, position.y, position.z);
    if (quaternion) {
      body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }
    body.userData = { type };
    this.world.addBody(body);
    this.staticBodies.push(body);
    return { mesh, body };
  }

  buildWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x566573,
      roughness: 0.8,
      metalness: 0.1,
    });
    const halfHeight = WALL_HEIGHT / 2;

    // West and East boundaries
    for (let j = 0; j < this.rows; j++) {
      const centerZ = this.floorStart + j * this.cellSize + PATH_WIDTH / 2;
      const westPos = new THREE.Vector3(
        this.floorStart - WALL_THICKNESS / 2,
        halfHeight,
        centerZ
      );
      this.addStaticBox({
        position: westPos,
        size: new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, PATH_WIDTH),
        meshMaterial: wallMat,
        physicsMaterial: this.materials.wall,
        type: 'wall',
      });

      const eastPos = new THREE.Vector3(
        this.floorStart + LABYRINTH_SIZE + WALL_THICKNESS / 2,
        halfHeight,
        centerZ
      );
      this.addStaticBox({
        position: eastPos,
        size: new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, PATH_WIDTH),
        meshMaterial: wallMat,
        physicsMaterial: this.materials.wall,
        type: 'wall',
      });
    }

    // South boundary with entrada no canto inferior esquerdo
    const southZ = this.floorStart - WALL_THICKNESS / 2;
    for (let i = 0; i < this.columns; i++) {
      if (i === 0) continue; // deixa abertura de entrada
      const centerX = this.floorStart + i * this.cellSize + PATH_WIDTH / 2;
      this.addStaticBox({
        position: new THREE.Vector3(centerX, halfHeight, southZ),
        size: new THREE.Vector3(PATH_WIDTH, WALL_HEIGHT, WALL_THICKNESS),
        meshMaterial: wallMat,
        physicsMaterial: this.materials.wall,
        type: 'wall',
      });
    }

    // North boundary com portal
    const northZ = this.floorStart + LABYRINTH_SIZE + WALL_THICKNESS / 2;
    for (let i = 0; i < this.columns; i++) {
      if (i === this.columns - 1) continue; // deixa abertura na saída
      const centerX = this.floorStart + i * this.cellSize + PATH_WIDTH / 2;
      this.addStaticBox({
        position: new THREE.Vector3(centerX, halfHeight, northZ),
        size: new THREE.Vector3(PATH_WIDTH, WALL_HEIGHT, WALL_THICKNESS),
        meshMaterial: wallMat,
        physicsMaterial: this.materials.wall,
        type: 'wall',
      });
    }

    // Paredes internas verticais
    for (let i = 0; i < this.columns - 1; i++) {
      const centerX =
        this.floorStart + i * this.cellSize + PATH_WIDTH + WALL_THICKNESS / 2;
      for (let j = 0; j < this.rows; j++) {
        if (this.eastOpen[i][j]) continue;
        const centerZ = this.floorStart + j * this.cellSize + PATH_WIDTH / 2;
        this.addStaticBox({
          position: new THREE.Vector3(centerX, halfHeight, centerZ),
          size: new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, PATH_WIDTH),
          meshMaterial: wallMat,
          physicsMaterial: this.materials.wall,
          type: 'wall',
        });
      }
    }

    // Paredes internas horizontais
    for (let i = 0; i < this.columns; i++) {
      const centerX = this.floorStart + i * this.cellSize + PATH_WIDTH / 2;
      for (let j = 0; j < this.rows - 1; j++) {
        if (this.northOpen[i][j]) continue;
        const centerZ =
          this.floorStart + j * this.cellSize + PATH_WIDTH + WALL_THICKNESS / 2;
        this.addStaticBox({
          position: new THREE.Vector3(centerX, halfHeight, centerZ),
          size: new THREE.Vector3(PATH_WIDTH, WALL_HEIGHT, WALL_THICKNESS),
          meshMaterial: wallMat,
          physicsMaterial: this.materials.wall,
          type: 'wall',
        });
      }
    }
  }

  buildElevations() {
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a7b4f,
      roughness: 0.6,
      metalness: 0.05,
    });

    for (let i = 0; i < this.columns; i++) {
      for (let j = 0; j < this.rows; j++) {
        const elevation = this.cellElevation[i][j];
        if (elevation <= 0) continue;
        const center = this.cellCenter(i, j);
        const y = elevation + PLATFORM_THICKNESS / 2;
        this.addStaticBox({
          position: new THREE.Vector3(center.x, y, center.z),
          size: new THREE.Vector3(PATH_WIDTH, PLATFORM_THICKNESS, PATH_WIDTH),
          meshMaterial: platformMaterial,
          physicsMaterial: this.materials.ground,
          type: 'platform',
        });
      }
    }
  }

  buildRamps() {
    const rampMaterial = new THREE.MeshStandardMaterial({
      color: 0xb79365,
      roughness: 0.5,
      metalness: 0.1,
    });
    const rampThickness = 0.25;
    const halfLength = RAMP_LENGTH / 2;

    const createRamp = (column, row, baseElevation) => {
      const lowerCenter = this.cellCenter(column, row);
      const upperCenter = this.cellCenter(column, row + 1);
      const centerX = lowerCenter.x;
      const centerZ = (lowerCenter.z + upperCenter.z) / 2;
      const centerY =
        baseElevation + Math.sin(RAMP_ANGLE) * halfLength + rampThickness / 2;

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(PATH_WIDTH, rampThickness, RAMP_LENGTH),
        rampMaterial
      );
      mesh.position.set(centerX, centerY, centerZ);
      mesh.rotation.x = -RAMP_ANGLE;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const body = new CANNON.Body({
        mass: 0,
        material: this.materials.ramp,
      });
      body.addShape(
        new CANNON.Box(
          new CANNON.Vec3(PATH_WIDTH / 2, rampThickness / 2, RAMP_LENGTH / 2)
        )
      );
      body.position.set(centerX, centerY, centerZ);
      body.quaternion.setFromEuler(-RAMP_ANGLE, 0, 0, 'XYZ');
      body.userData = { type: 'ramp' };
      this.world.addBody(body);

      return { mesh, body };
    };

    this.firstRamp = createRamp(2, 2, 0);
    this.secondRamp = createRamp(4, 3, 1);

    // Bloco no meio da segunda rampa
    const blockOffset = new THREE.Vector3(0, 0, 0);
    const rampCenter = this.secondRamp.body.position;
    const rampQuaternion = this.secondRamp.body.quaternion;
    const blockPosition = new CANNON.Vec3().copy(rampCenter);
    const forward = new CANNON.Vec3(0, 0, 0.2);
    rampQuaternion.vmult(forward, forward);
    blockPosition.vadd(forward, blockPosition);
    blockPosition.y += 0.35;

    const blockQuaternion = new THREE.Quaternion(
      rampQuaternion.x,
      rampQuaternion.y,
      rampQuaternion.z,
      rampQuaternion.w
    );

    this.addStaticBox({
      position: new THREE.Vector3(blockPosition.x, blockPosition.y, blockPosition.z),
      size: new THREE.Vector3(1, 1, 1),
      quaternion: blockQuaternion,
      meshMaterial: new THREE.MeshStandardMaterial({
        color: 0x8d6e63,
        roughness: 0.8,
      }),
      physicsMaterial: this.materials.wall,
      type: 'obstacle',
    });
  }

  buildObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4b382a,
      roughness: 0.9,
    });

    const addCube = (position) => {
      this.addStaticBox({
        position: new THREE.Vector3(position.x, position.y, position.z),
        size: new THREE.Vector3(1, 1, 1),
        meshMaterial: obstacleMaterial,
        physicsMaterial: this.materials.wall,
        type: 'obstacle',
      });
    };

    const cubes = [
      { i: 1, j: 1, offset: { x: -0.6, z: -0.4 } },
      { i: 3, j: 0, offset: { x: 0.5, z: 0.6 } },
      { i: 1, j: 3, offset: { x: 0.8, z: -0.2 } },
      { i: 2, j: 4, offset: { x: -0.7, z: -0.5 } },
    ];

    cubes.forEach(({ i, j, offset }) => {
      const center = this.cellCenter(i, j);
      addCube({
        x: center.x + (offset?.x || 0),
        y: this.cellElevation[i][j] + 0.5,
        z: center.z + (offset?.z || 0),
      });
    });

    // Corredor com 3 blocos em zigue-zague
    const zigPositions = [
      { xOffset: -0.9, zOffset: -0.8 },
      { xOffset: 0.9, zOffset: 0 },
      { xOffset: -0.6, zOffset: 0.9 },
    ];
    zigPositions.forEach((offset, idx) => {
      const baseCell = this.cellCenter(2 + idx, 3);
      addCube({
        x: baseCell.x + offset.xOffset,
        y: 1 + 0.5,
        z: baseCell.z + offset.zOffset,
      });
    });
  }

  buildPortal() {
    const portalGroup = new THREE.Group();
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x99d5ff,
      emissive: 0x1e88e5,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.3,
    });

    const columnGeometry = new THREE.BoxGeometry(0.6, 3, 0.4);
    const beamGeometry = new THREE.BoxGeometry(2.4, 0.4, 0.4);

    const exitCenter = this.cellCenter(this.columns - 1, this.rows - 1);
    const leftColumn = new THREE.Mesh(columnGeometry, beamMaterial);
    leftColumn.position.set(exitCenter.x - PATH_WIDTH / 2 + 0.3, 1.5, exitCenter.z + PATH_WIDTH / 2);
    const rightColumn = new THREE.Mesh(columnGeometry, beamMaterial);
    rightColumn.position.set(exitCenter.x + PATH_WIDTH / 2 - 0.3, 1.5, exitCenter.z + PATH_WIDTH / 2);
    const topBeam = new THREE.Mesh(beamGeometry, beamMaterial);
    topBeam.position.set(exitCenter.x, 2.9, exitCenter.z + PATH_WIDTH / 2);

    portalGroup.add(leftColumn, rightColumn, topBeam);
    portalGroup.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });

    this.scene.add(portalGroup);
    this.portal = portalGroup;
  }
}

class Robot {
  constructor(scene, world, material, spawnPosition) {
    this.scene = scene;
    this.world = world;
    this.material = material;
    this.spawnPosition = spawnPosition.clone();
    this.spawnQuaternion = new CANNON.Quaternion();
    this.moveSpeed = 2.2; // metros por segundo
    this.rotationSpeed = 110; // graus por segundo
    this.distanceTolerance = 0.08;
    this.pendingCollision = false;

    const { group, wheels } = this.buildMesh();
    this.group = group;
    this.wheelMeshes = wheels;
    this.scene.add(this.group);

    const halfExtents = new CANNON.Vec3(0.6, 0.35, 0.9);
    this.body = new CANNON.Body({
      mass: 18,
      material,
      position: this.spawnPosition.clone(),
    });
    this.body.addShape(new CANNON.Box(halfExtents));
    this.body.angularDamping = 0.6;
    this.body.linearDamping = 0.35;
    this.body.userData = { type: 'robot' };
    this.world.addBody(this.body);

    this.body.addEventListener('collide', (event) => {
      const other = event.body;
      if (!other || !other.userData) return;
      if (!this.movementTask) return;
      if (other.userData.type === 'ground') return;
      this.pendingCollision = true;
    });

    this.movementTask = null;
    this.rotationTask = null;
    this.wheelRadius = 4 * 0.05;
  }

  buildMesh() {
    const robotGroup = new THREE.Group();

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 30),
      new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    chassis.position.y = 6;
    chassis.castShadow = true;
    robotGroup.add(chassis);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 25),
      new THREE.MeshStandardMaterial({
        color: 0x3498db,
        metalness: 0.6,
        roughness: 0.4,
      })
    );
    body.position.y = 12;
    body.castShadow = true;
    robotGroup.add(body);

    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(16, 3, 8),
      new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        metalness: 0.5,
        roughness: 0.3,
      })
    );
    hood.position.set(0, 16.5, 8);
    hood.castShadow = true;
    robotGroup.add(hood);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(16, 6, 1),
      new THREE.MeshStandardMaterial({
        color: 0x87ceeb,
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7,
      })
    );
    windshield.position.set(0, 15, 4);
    windshield.rotation.x = -0.2;
    robotGroup.add(windshield);

    const headlightGeometry = new THREE.CylinderGeometry(2, 2, 1, 12);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5,
    });

    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.rotation.z = Math.PI / 2;
    leftHeadlight.position.set(-6, 13, 15.5);
    robotGroup.add(leftHeadlight);

    const rightHeadlight = leftHeadlight.clone();
    rightHeadlight.position.x = 6;
    robotGroup.add(rightHeadlight);

    const grill = new THREE.Mesh(
      new THREE.BoxGeometry(12, 4, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    grill.position.set(0, 11, 15.2);
    robotGroup.add(grill);

    const wheelGeometry = new THREE.CylinderGeometry(4, 4, 3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      metalness: 0.8,
      roughness: 0.2,
    });

    const wheelPositions = [
      [-11, 4, 10],
      [11, 4, 10],
      [-11, 4, -10],
      [11, 4, -10],
    ];

    const wheelMeshes = [];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      robotGroup.add(wheel);
      wheelMeshes.push(wheel);
    });

    const wheelDetailGeometry = new THREE.CylinderGeometry(2.5, 2.5, 3.5, 8);
    const wheelDetailMaterial = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      metalness: 0.9,
      roughness: 0.1,
    });

    wheelPositions.forEach(([x, y, z]) => {
      const detail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
      detail.rotation.z = Math.PI / 2;
      detail.position.set(x, y, z);
      robotGroup.add(detail);
    });

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 6, 8),
      new THREE.MeshStandardMaterial({
        color: 0x95a5a6,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    antenna.position.set(0, 19, -5);
    robotGroup.add(antenna);

    const antennaLed = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.4,
      })
    );
    antennaLed.position.set(0, 22, -5);
    robotGroup.add(antennaLed);

    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(2, 4, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffff00,
        metalness: 0.5,
        roughness: 0.3,
        emissive: 0xffff00,
        emissiveIntensity: 0.3,
      })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 17, 12);
    robotGroup.add(arrow);

    const scaleFactor = 0.05;
    robotGroup.scale.setScalar(scaleFactor);
    robotGroup.castShadow = true;

    return { group: robotGroup, wheels: wheelMeshes };
  }

  getVisualPosition() {
    return this.group.position.clone();
  }

  getVisualQuaternion() {
    return this.group.quaternion.clone();
  }

  reset(spawnPosition) {
    this.body.velocity.setZero();
    this.body.angularVelocity.setZero();
    this.body.position.set(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    );
    this.body.quaternion.copy(this.spawnQuaternion);
    this.group.position.set(
      spawnPosition.x,
      spawnPosition.y,
      spawnPosition.z
    );
    this.group.quaternion.set(0, 0, 0, 1);
    this.movementTask = null;
    this.rotationTask = null;
    this.pendingCollision = false;
  }

  getForwardVector() {
    const forward = new CANNON.Vec3(0, 0, 1);
    return this.body.quaternion.vmult(forward);
  }

  moveDistance(distance) {
    if (this.movementTask || this.rotationTask) {
      return Promise.reject(new Error('Robot busy'));
    }
    const direction = this.getForwardVector();
    direction.y = 0;
    direction.normalize();
    direction.scale(Math.sign(distance), direction);
    const start = this.body.position.clone();
    const targetDistance = Math.abs(distance);

    return new Promise((resolve) => {
      this.movementTask = {
        start,
        direction,
        distance: targetDistance,
        resolve,
      };
      this.pendingCollision = false;
    });
  }

  rotateDegrees(angleDegrees) {
    if (this.movementTask || this.rotationTask) {
      return Promise.reject(new Error('Robot busy'));
    }

    const duration = Math.abs(angleDegrees) / this.rotationSpeed;
    const startQuaternion = this.body.quaternion.clone();
    const targetQuaternion = startQuaternion.mult(
      new CANNON.Quaternion().setFromAxisAngle(
        new CANNON.Vec3(0, 1, 0),
        THREE.MathUtils.degToRad(angleDegrees)
      )
    );

    return new Promise((resolve) => {
      this.rotationTask = {
        startQuaternion,
        targetQuaternion,
        elapsed: 0,
        duration: Math.max(duration, 0.01),
        resolve,
      };
    });
  }

  stepPrePhysics(dt) {
    if (this.rotationTask) {
      this.rotationTask.elapsed += dt;
      const t = clamp(this.rotationTask.elapsed / this.rotationTask.duration, 0, 1);
      const eased = easeInOutCubic(t);
      const interpolated = new CANNON.Quaternion();
      CANNON.Quaternion.slerp(
        this.rotationTask.startQuaternion,
        this.rotationTask.targetQuaternion,
        interpolated,
        eased
      );
      this.body.quaternion.copy(interpolated);
      this.body.angularVelocity.setZero();
      if (t >= 1) {
        this.rotationTask.resolve();
        this.rotationTask = null;
      }
    }

    if (this.movementTask) {
      const desiredVelocity = this.movementTask.direction.scale(this.moveSpeed);
      this.body.velocity.x = desiredVelocity.x;
      this.body.velocity.z = desiredVelocity.z;
    } else {
      this.body.velocity.x *= 0.95;
      this.body.velocity.z *= 0.95;
    }
  }

  stepPostPhysics(dt) {
    if (this.movementTask) {
      const displacement = this.body.position.vsub(this.movementTask.start);
      const projected = displacement.dot(this.movementTask.direction);
      const completed = projected >= this.movementTask.distance - this.distanceTolerance;
      const blocked = this.pendingCollision && projected < this.movementTask.distance * 0.8;

      if (completed || blocked) {
        const clampedDistance = Math.min(
          Math.max(projected, 0),
          this.movementTask.distance
        );
        const finalPos = this.movementTask.start.vadd(
          this.movementTask.direction.scale(clampedDistance, new CANNON.Vec3())
        );
        this.body.position.set(finalPos.x, this.body.position.y, finalPos.z);
        this.body.velocity.x = 0;
        this.body.velocity.z = 0;
        this.movementTask.resolve({ blocked });
        this.movementTask = null;
        this.pendingCollision = false;
      }
    }

    this.group.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
    this.group.quaternion.set(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    );

    const forward = this.getForwardVector();
    const speed = this.body.velocity.length();
    const direction = Math.sign(this.body.velocity.dot(forward));
    const delta = (speed / Math.max(this.wheelRadius, 0.01)) * dt * direction;
    this.wheelMeshes.forEach((wheel) => {
      wheel.rotation.x += delta;
    });
  }

  getYawDegrees() {
    const euler = new CANNON.Vec3();
    this.body.quaternion.toEuler(euler, 'YZX');
    return THREE.MathUtils.radToDeg(euler.y);
  }
}

function initPhysics() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.allowSleep = true;
  world.broadphase = new CANNON.SAPBroadphase(world);

  const materials = {
    ground: new CANNON.Material('ground'),
    wall: new CANNON.Material('wall'),
    ramp: new CANNON.Material('ramp'),
    robot: new CANNON.Material('robot'),
  };

  const contactPairs = [
    [materials.robot, materials.ground, { friction: 0.9, restitution: 0.0 }],
    [materials.robot, materials.wall, { friction: 0.7, restitution: 0.0 }],
    [materials.robot, materials.ramp, { friction: 0.95, restitution: 0.0 }],
    [materials.wall, materials.wall, { friction: 0.6, restitution: 0.0 }],
  ];

  contactPairs.forEach(([matA, matB, props]) => {
    world.addContactMaterial(new CANNON.ContactMaterial(matA, matB, props));
  });

  return { world, materials };
}

function updateHud(robotInstance) {
  if (!robotInstance) return;
  const pos = robotInstance.body.position;
  statusEls.posX.textContent = pos.x.toFixed(2);
  statusEls.posZ.textContent = pos.z.toFixed(2);
  statusEls.rotation.textContent = `${Math.round(
    ((robotInstance.getYawDegrees() % 360) + 360) % 360
  )}°`;
}

function setIndicator(active) {
  indicatorEl.style.display = active ? 'block' : 'none';
}

function showError(message = 'Comando inválido!') {
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 2000);
}

function parseLBMLCommand(command) {
  const regex = /^([DR])(\d+)([FBLR]);$/;
  const match = command.match(regex);
  if (!match) return null;
  const [, type, value, direction] = match;
  const numValue = parseInt(value, 10);
  if (type === 'D' && !['F', 'B', 'L', 'R'].includes(direction)) return null;
  if (type === 'R' && !['L', 'R'].includes(direction)) return null;
  return { type, value: numValue, direction };
}

function postAck(type, payload) {
  try {
    parent.postMessage({ type, ...payload }, '*');
  } catch (error) {
    // ignore
  }
}

let renderer;
let scene;
let camera;
let world;
let materials;
let labyrinth;
let robot;
let cameraRig;
let orbitControls = null;
let executing = false;

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa7d8ff);
  scene.fog = new THREE.Fog(0xa7d8ff, 80, 240);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 12, -18);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

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

  const hemisphereLight = new THREE.HemisphereLight(0x94dfff, 0x2e7d32, 0.45);
  hemisphereLight.position.set(0, 60, 0);
  scene.add(hemisphereLight);
}

function toggleDebugCamera() {
  if (!camera || !renderer) return;
  if (orbitControls) {
    orbitControls.dispose();
    orbitControls = null;
    if (cameraRig) {
      cameraRig.enabled = true;
      cameraRig.snap();
    }
  } else {
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.1;
    orbitControls.screenSpacePanning = false;
    orbitControls.maxPolarAngle = Math.PI / 2;
    if (cameraRig) {
      cameraRig.enabled = false;
    }
  }
}

async function executeCommandSequenceFromString(input) {
  const commands = (input || '')
    .split(';')
    .map((cmd) => cmd.trim())
    .filter(Boolean);

  const parsedCommands = [];
  for (const cmd of commands) {
    const parsed = parseLBMLCommand(`${cmd};`);
    if (!parsed) {
      showError('Comando inválido!');
      return;
    }
    parsedCommands.push(parsed);
  }

  if (parsedCommands.length === 0 || executing) return;

  executing = true;
  setIndicator(true);

  try {
    for (const cmd of parsedCommands) {
      statusEls.command.textContent = `${cmd.type}${cmd.value}${cmd.direction}`;

      if (cmd.type === 'D') {
        if (cmd.direction === 'F') {
          const result = await robot.moveDistance(cmd.value);
          if (result.blocked) {
            showError('Colisão detectada!');
            break;
          }
        } else if (cmd.direction === 'B') {
          const result = await robot.moveDistance(-cmd.value);
          if (result.blocked) {
            showError('Colisão detectada!');
            break;
          }
        } else if (cmd.direction === 'L' || cmd.direction === 'R') {
          const angle = cmd.direction === 'L' ? 90 : -90;
          await robot.rotateDegrees(angle);
          const result = await robot.moveDistance(cmd.value);
          if (result.blocked) {
            showError('Colisão detectada!');
            break;
          }
        }
      } else if (cmd.type === 'R') {
        const angle = cmd.direction === 'L' ? cmd.value : -cmd.value;
        await robot.rotateDegrees(angle);
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } finally {
    statusEls.command.textContent = '-';
    setIndicator(false);
    executing = false;
  }
}

function resetRobot() {
  if (!robot || !labyrinth) return;
  robot.reset(labyrinth.spawnPosition);
  statusEls.command.textContent = '-';
  setIndicator(false);
  executing = false;
}

function animateLoop() {
  let lastTime;
  let accumulator = 0;

  const step = (time) => {
    if (lastTime === undefined) {
      lastTime = time;
    }
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    accumulator += delta;

    const maxAccum = 0.2;
    if (accumulator > maxAccum) accumulator = maxAccum;

    while (accumulator >= FIXED_TIMESTEP) {
      robot.stepPrePhysics(FIXED_TIMESTEP);
      world.step(FIXED_TIMESTEP);
      robot.stepPostPhysics(FIXED_TIMESTEP);
      accumulator -= FIXED_TIMESTEP;
    }

    if (!orbitControls && cameraRig) {
      cameraRig.update(clamp(delta, 0.0001, 0.05));
    } else if (orbitControls) {
      orbitControls.update();
    }

    updateHud(robot);
    renderer.render(scene, camera);
    requestAnimationFrame(step);
  };

  cameraRig.snap();
  requestAnimationFrame(step);
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initialize() {
  setupScene();
  ({ world, materials } = initPhysics());
  labyrinth = new Labyrinth(scene, world, materials);
  robot = new Robot(scene, world, materials.robot, labyrinth.spawnPosition);
  cameraRig = new FollowCamera(camera, robot);
  cameraRig.snap();

  animateLoop();

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'o') {
      toggleDebugCamera();
    }
  });
}

initialize();

window.addEventListener('message', (event) => {
  const data = event.data || {};
  if (typeof data !== 'object') return;

  if (data.type === 'lbml-exec') {
    executeCommandSequenceFromString(String(data.payload || ''))
      .then(() => postAck('lbml-exec-done', { ok: true }))
      .catch(() => postAck('lbml-exec-done', { ok: false }));
  } else if (data.type === 'lbml-reset') {
    resetRobot();
    postAck('lbml-reset-done', { ok: true });
  }
});

export { executeCommandSequenceFromString, resetRobot };
