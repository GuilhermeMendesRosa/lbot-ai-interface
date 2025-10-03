import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CONSTANTS } from './utils.js';

export class Labyrinth {
  constructor(scene, world, materials) {
    this.scene = scene;
    this.world = world;
    this.materials = materials;
    this.columns = 5;
    this.rows = 5;
    this.cellSize = CONSTANTS.PATH_WIDTH + CONSTANTS.WALL_THICKNESS;
    this.floorStart = -CONSTANTS.LABYRINTH_SIZE / 2;
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
    const x = this.floorStart + i * this.cellSize + CONSTANTS.PATH_WIDTH / 2 + i * 0;
    const z = this.floorStart + j * this.cellSize + CONSTANTS.PATH_WIDTH / 2;
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
      new THREE.PlaneGeometry(CONSTANTS.FLOOR_SIZE, CONSTANTS.FLOOR_SIZE),
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

    const gridHelper = new THREE.GridHelper(
      CONSTANTS.FLOOR_SIZE, 
      CONSTANTS.FLOOR_SIZE / 2, 
      0x335533, 
      0x88aa88
    );
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    const spawnCenter = this.cellCenter(0, 0);
    this.spawnPosition = new CANNON.Vec3(
      spawnCenter.x,
      1.0,
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
    const halfHeight = CONSTANTS.WALL_HEIGHT / 2;

    // West and East boundaries
    for (let j = 0; j < this.rows; j++) {
      const centerY = this.cellCenter(0, j).z;
      
      // West wall
      this.addStaticBox({
        position: new THREE.Vector3(
          this.floorStart - CONSTANTS.WALL_THICKNESS / 2,
          halfHeight,
          centerY
        ),
        size: new THREE.Vector3(
          CONSTANTS.WALL_THICKNESS,
          CONSTANTS.WALL_HEIGHT,
          this.cellSize
        ),
        meshMaterial: wallMat,
        type: 'wall'
      });

      // East wall
      this.addStaticBox({
        position: new THREE.Vector3(
          this.floorStart + CONSTANTS.LABYRINTH_SIZE + CONSTANTS.WALL_THICKNESS / 2,
          halfHeight,
          centerY
        ),
        size: new THREE.Vector3(
          CONSTANTS.WALL_THICKNESS,
          CONSTANTS.WALL_HEIGHT,
          this.cellSize
        ),
        meshMaterial: wallMat,
        type: 'wall'
      });
    }

    // South boundary with entrada no canto inferior esquerdo
    const southZ = this.floorStart - CONSTANTS.WALL_THICKNESS / 2;
    for (let i = 0; i < this.columns; i++) {
      if (i === 0) continue; // Entrada
      
      const centerX = this.cellCenter(i, 0).x;
      this.addStaticBox({
        position: new THREE.Vector3(centerX, halfHeight, southZ),
        size: new THREE.Vector3(
          this.cellSize,
          CONSTANTS.WALL_HEIGHT,
          CONSTANTS.WALL_THICKNESS
        ),
        meshMaterial: wallMat,
        type: 'wall'
      });
    }

    // North boundary com portal
    const northZ = this.floorStart + CONSTANTS.LABYRINTH_SIZE + CONSTANTS.WALL_THICKNESS / 2;
    for (let i = 0; i < this.columns; i++) {
      if (i === this.columns - 1) continue; // Portal
      
      const centerX = this.cellCenter(i, 0).x;
      this.addStaticBox({
        position: new THREE.Vector3(centerX, halfHeight, northZ),
        size: new THREE.Vector3(
          this.cellSize,
          CONSTANTS.WALL_HEIGHT,
          CONSTANTS.WALL_THICKNESS
        ),
        meshMaterial: wallMat,
        type: 'wall'
      });
    }

    // Paredes internas verticais
    for (let i = 0; i < this.columns - 1; i++) {
      for (let j = 0; j < this.rows; j++) {
        if (this.eastOpen[i][j]) continue;
        
        const pos = this.cellCenter(i, j);
        const wallX = pos.x + CONSTANTS.PATH_WIDTH / 2 + CONSTANTS.WALL_THICKNESS / 2;
        this.addStaticBox({
          position: new THREE.Vector3(wallX, halfHeight, pos.z),
          size: new THREE.Vector3(
            CONSTANTS.WALL_THICKNESS,
            CONSTANTS.WALL_HEIGHT,
            CONSTANTS.PATH_WIDTH
          ),
          meshMaterial: wallMat,
          type: 'wall'
        });
      }
    }

    // Paredes internas horizontais
    for (let i = 0; i < this.columns; i++) {
      for (let j = 0; j < this.rows - 1; j++) {
        if (this.northOpen[i][j]) continue;
        
        const pos = this.cellCenter(i, j);
        const wallZ = pos.z + CONSTANTS.PATH_WIDTH / 2 + CONSTANTS.WALL_THICKNESS / 2;
        this.addStaticBox({
          position: new THREE.Vector3(pos.x, halfHeight, wallZ),
          size: new THREE.Vector3(
            CONSTANTS.PATH_WIDTH,
            CONSTANTS.WALL_HEIGHT,
            CONSTANTS.WALL_THICKNESS
          ),
          meshMaterial: wallMat,
          type: 'wall'
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
        if (elevation === 0) continue;
        
        const center = this.cellCenter(i, j);
        this.addStaticBox({
          position: new THREE.Vector3(
            center.x,
            elevation - CONSTANTS.PLATFORM_THICKNESS / 2,
            center.z
          ),
          size: new THREE.Vector3(
            CONSTANTS.PATH_WIDTH,
            CONSTANTS.PLATFORM_THICKNESS,
            CONSTANTS.PATH_WIDTH
          ),
          meshMaterial: platformMaterial,
          type: 'platform'
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
    const halfLength = CONSTANTS.RAMP_LENGTH / 2;

    const createRamp = (column, row, baseElevation) => {
      const center = this.cellCenter(column, row);
      const rampY = baseElevation + CONSTANTS.RAMP_HEIGHT / 2;
      
      const geometry = new THREE.BoxGeometry(
        CONSTANTS.RAMP_LENGTH,
        rampThickness,
        CONSTANTS.PATH_WIDTH
      );
      const mesh = new THREE.Mesh(geometry, rampMaterial);
      mesh.position.set(center.x, rampY, center.z);
      mesh.rotation.x = CONSTANTS.RAMP_ANGLE;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const halfExtents = new CANNON.Vec3(
        halfLength,
        rampThickness / 2,
        CONSTANTS.PATH_WIDTH / 2
      );
      const body = new CANNON.Body({
        mass: 0,
        material: this.materials.ramp,
      });
      body.addShape(new CANNON.Box(halfExtents));
      body.position.set(center.x, rampY, center.z);
      body.quaternion.setFromEuler(CONSTANTS.RAMP_ANGLE, 0, 0);
      body.userData = { type: 'ramp' };
      this.world.addBody(body);
      this.staticBodies.push(body);
      
      return { mesh, body };
    };

    this.firstRamp = createRamp(2, 2, 0);
    this.secondRamp = createRamp(4, 3, 1);

    // Bloco no meio da segunda rampa
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
        position,
        size: new THREE.Vector3(0.8, 0.8, 0.8),
        meshMaterial: obstacleMaterial,
        type: 'obstacle'
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
      const cubePos = new THREE.Vector3(
        center.x + offset.x,
        0.4,
        center.z + offset.z
      );
      addCube(cubePos);
    });

    // Corredor com 3 blocos em zigue-zague
    const zigPositions = [
      { xOffset: -0.9, zOffset: -0.8 },
      { xOffset: 0.9, zOffset: 0 },
      { xOffset: -0.6, zOffset: 0.9 },
    ];
    zigPositions.forEach((offset) => {
      const center = this.cellCenter(3, 2);
      const cubePos = new THREE.Vector3(
        center.x + offset.xOffset,
        0.4,
        center.z + offset.zOffset
      );
      addCube(cubePos);
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
    leftColumn.position.set(
      exitCenter.x - CONSTANTS.PATH_WIDTH / 2 + 0.3,
      1.5,
      exitCenter.z + CONSTANTS.PATH_WIDTH / 2
    );
    const rightColumn = new THREE.Mesh(columnGeometry, beamMaterial);
    rightColumn.position.set(
      exitCenter.x + CONSTANTS.PATH_WIDTH / 2 - 0.3,
      1.5,
      exitCenter.z + CONSTANTS.PATH_WIDTH / 2
    );
    const topBeam = new THREE.Mesh(beamGeometry, beamMaterial);
    topBeam.position.set(exitCenter.x, 2.9, exitCenter.z + CONSTANTS.PATH_WIDTH / 2);

    portalGroup.add(leftColumn, rightColumn, topBeam);
    portalGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(portalGroup);
    this.portal = portalGroup;
  }
}