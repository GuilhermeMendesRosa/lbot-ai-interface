import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SimulatorBridgeService, SimulatorCommand } from '../../services/simulator-bridge.service';
import { Subscription } from 'rxjs';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

interface RobotState {
  x: number;
  z: number;
  rotation: number;
  isAnimating: boolean;
}

interface ParsedCommand {
  type: string;
  value: number;
  direction: string;
}

@Component({
  selector: 'app-robo-simulator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="simulator-container" #canvasContainer>
      <div class="status">
        <div class="status-item">
          <span class="status-label">Posição X:</span>
          <span class="status-value" [textContent]="robotState.x.toFixed(1)"></span>
        </div>
        <div class="status-item">
          <span class="status-label">Posição Z:</span>
          <span class="status-value" [textContent]="robotState.z.toFixed(1)"></span>
        </div>
        <div class="status-item">
          <span class="status-label">Rotação:</span>
          <span class="status-value" [textContent]="getRotationDisplay()"></span>
        </div>
        <div class="status-item">
          <span class="status-label">Comando:</span>
          <span class="status-value" [textContent]="currentCommand"></span>
        </div>
      </div>
      <div class="buttons-container">
        <button class="reset-button" (click)="resetRobot()" [disabled]="robotState.isAnimating">
          🔄 Resetar Posição
        </button>
        <button class="camera-button" (click)="toggleCameraMode()" [disabled]="robotState.isAnimating">
          📹 {{ isThirdPersonView ? 'Vista Normal' : '3ª Pessoa' }}
        </button>
      </div>
      <div class="indicator" [style.display]="robotState.isAnimating ? 'block' : 'none'">
        EXECUTANDO...
      </div>
      <div class="error" [style.display]="errorMessage ? 'block' : 'none'" [textContent]="errorMessage">
      </div>
      <div class="debug" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; font-size: 12px;">
        <div>🎯 Obstáculos: {{obstacles.length}}</div>
        <div>📍 Posição: ({{robotState.x.toFixed(1)}}, {{robotState.z.toFixed(1)}})</div>
        <div>⚡ Física: ATIVA</div>
        <div>🌍 Gravidade: -9.82 m/s²</div>
        <div>⚖️ Massa: 10kg</div>
      </div>
    </div>
  `,
  styleUrls: ['./robo-simulator.css']
})
export class RoboSimulatorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;
  
  private sub?: Subscription;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private robotGroup!: THREE.Group;
  private animationId?: number;
  
  // Physics world
  private world!: CANNON.World;
  private robotBody!: CANNON.Body;
  obstacles: Array<{mesh: THREE.Mesh, body: CANNON.Body}> = []; // Public para debug
  private timeStep = 1/60;
  
  // Robot configuration constants
  private readonly ROBOT_SPEED = 30; // units per second
  private readonly ROTATION_SPEED = 90; // degrees per second
  private readonly ARENA_LIMIT = 190; // arena boundaries

  // Component state
  robotState: RobotState = { x: 0, z: 0, rotation: 0, isAnimating: false };
  currentCommand = '-';
  errorMessage = '';
  isThirdPersonView = false;

  // Throttle para atualizações do estado
  private lastStateUpdate = 0;
  private stateUpdateInterval = 100; // Atualizar a cada 100ms

  // Mouse interaction state
  private mouseX = 0;
  private mouseY = 0;
  private isMouseDown = false;

  constructor(
    private bridge: SimulatorBridgeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  getRotationDisplay(): string {
    return Math.round(this.robotState.rotation % 360) + '°';
  }

  ngOnInit(): void {
    this.sub = this.bridge.commands$.subscribe(cmd => this.handleCommand(cmd));
  }

  ngAfterViewInit(): void {
    // Só inicializar no lado do cliente
    if (isPlatformBrowser(this.platformId)) {
      this.initThreeJS();
      this.initPhysics();
      this.createPhysicsObjects();
      this.createObstacles();
      this.startRenderLoop();
      this.setupEventListeners();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThreeJS(): void {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 200, 800);

    // Get container dimensions
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1500);
    this.camera.position.set(120, 160, 240);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.canvasContainer.nativeElement.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.createGround();
    this.createArenaWalls();
    this.createRobot();
  }

  private initPhysics(): void {
    // Create physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.81, 0); // Gravidade da Terra (9.81 m/s²)
    this.world.broadphase = new CANNON.NaiveBroadphase();
    
    // Configure contact material
    const defaultMaterial = new CANNON.Material('default');
    const robotMaterial = new CANNON.Material('robot');
    const groundMaterial = new CANNON.Material('ground');
    
    // Robot-ground contact
    const robotGroundContact = new CANNON.ContactMaterial(
      robotMaterial,
      groundMaterial,
      {
        friction: 0.9,  // Alta tração = não desliza
        restitution: 0.0, // Zero bounce = não quica
      }
    );
    
    // Robot-obstacle contact
    const robotObstacleContact = new CANNON.ContactMaterial(
      robotMaterial,
      defaultMaterial,
      {
        friction: 0.8,
        restitution: 0.0, // Sem bounce em obstáculos
      }
    );
    
    this.world.addContactMaterial(robotGroundContact);
    this.world.addContactMaterial(robotObstacleContact);
    this.world.defaultContactMaterial = robotObstacleContact;
  }

  private createPhysicsObjects(): void {
    // Create ground physics body
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.material = new CANNON.Material('ground');
    this.world.addBody(groundBody);

    // Create arena walls physics bodies
    const wallThickness = 5;
    const arenaSize = 400;
    const wallHeight = 15;

    // North wall
    const northWallShape = new CANNON.Box(new CANNON.Vec3((arenaSize + wallThickness) / 2, wallHeight / 2, wallThickness / 2));
    const northWallBody = new CANNON.Body({ mass: 0 });
    northWallBody.addShape(northWallShape);
    northWallBody.position.set(0, wallHeight / 2, arenaSize / 2 + wallThickness / 2);
    this.world.addBody(northWallBody);

    // South wall
    const southWallShape = new CANNON.Box(new CANNON.Vec3((arenaSize + wallThickness) / 2, wallHeight / 2, wallThickness / 2));
    const southWallBody = new CANNON.Body({ mass: 0 });
    southWallBody.addShape(southWallShape);
    southWallBody.position.set(0, wallHeight / 2, -arenaSize / 2 - wallThickness / 2);
    this.world.addBody(southWallBody);

    // East wall
    const eastWallShape = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallHeight / 2, arenaSize / 2));
    const eastWallBody = new CANNON.Body({ mass: 0 });
    eastWallBody.addShape(eastWallShape);
    eastWallBody.position.set(arenaSize / 2 + wallThickness / 2, wallHeight / 2, 0);
    this.world.addBody(eastWallBody);

    // West wall
    const westWallShape = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallHeight / 2, arenaSize / 2));
    const westWallBody = new CANNON.Body({ mass: 0 });
    westWallBody.addShape(westWallShape);
    westWallBody.position.set(-arenaSize / 2 - wallThickness / 2, wallHeight / 2, 0);
    this.world.addBody(westWallBody);

    // Create robot physics body
    const robotShape = new CANNON.Box(new CANNON.Vec3(10, 6, 15)); // Altura média
    this.robotBody = new CANNON.Body({ mass: 100 }); // Massa bem alta = cai rápido
    this.robotBody.addShape(robotShape);
    this.robotBody.position.set(0, 6, 0); // Centro do corpo físico - altura da caixa
    this.robotBody.material = new CANNON.Material('robot');
    
    // Amortecimento mínimo para queda natural
    this.robotBody.linearDamping = 0.05; // Baixo = cai naturalmente rápido
    this.robotBody.angularDamping = 0.99; // Alto = não gira
    
    this.world.addBody(this.robotBody);
    
    // Adicionar restrições para manter robô estavel (mas não rígido)
    this.robotBody.addEventListener('collide', (e: any) => {
      console.log('Robô colidiu com:', e.target === this.robotBody ? e.body : e.target);
    });
  }

  private createObstacles(): void {
    const woodMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xD2691E,
      roughness: 0.85,
      metalness: 0.1
    });
    
    const darkWoodMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.05
    });

    const lightWoodMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xDEB887,
      roughness: 0.8,
      metalness: 0.1
    });

    // ==== LABIRINTO DE PAREDES (SIMPLIFICADO) ====
    const mazeWalls = [
      // Paredes criando zonas
      { x: -100, z: 80, width: 6, height: 18, depth: 100 },
      { x: 100, z: 80, width: 6, height: 18, depth: 100 },
      { x: -100, z: -80, width: 6, height: 18, depth: 100 },
      { x: 100, z: -80, width: 6, height: 18, depth: 100 },
      
      // Paredes horizontais
      { x: 0, z: 100, width: 80, height: 18, depth: 6 },
      { x: 0, z: -100, width: 80, height: 18, depth: 6 },
    ];

    mazeWalls.forEach(wall => {
      const geometry = new THREE.BoxGeometry(wall.width, wall.height, wall.depth);
      const mesh = new THREE.Mesh(geometry, woodMaterial);
      
      mesh.position.set(wall.x, wall.height / 2, wall.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Physics
      const shape = new CANNON.Box(new CANNON.Vec3(wall.width / 2, wall.height / 2, wall.depth / 6));
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(shape);
      body.position.set(wall.x, wall.height / 2, wall.z);
      this.world.addBody(body);
      
      this.obstacles.push({ mesh, body });
    });

    // ==== RAMPAS NAS BORDAS ====
    const ramps = [
      // Rampa superior esquerda
      { x: -110, z: 130, width: 40, height: 3, depth: 50, rotation: 0, angle: Math.PI / 8 },
      
      // Rampa superior direita
      { x: 110, z: 130, width: 40, height: 3, depth: 50, rotation: 0, angle: Math.PI / 8 },
      
      // Rampa inferior esquerda
      { x: -110, z: -130, width: 40, height: 3, depth: 50, rotation: 0, angle: Math.PI / 9 },
      
      // Rampa inferior direita
      { x: 110, z: -130, width: 40, height: 3, depth: 50, rotation: 0, angle: Math.PI / 9 },
    ];

    ramps.forEach(ramp => {
      const geometry = new THREE.BoxGeometry(ramp.width, ramp.height, ramp.depth);
      const mesh = new THREE.Mesh(geometry, lightWoodMaterial);
      
      const yOffset = Math.sin(ramp.angle) * ramp.depth / 4;
      mesh.position.set(ramp.x, ramp.height / 2 + yOffset, ramp.z);
      mesh.rotation.y = ramp.rotation;
      mesh.rotation.x = ramp.angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Physics
      const shape = new CANNON.Box(new CANNON.Vec3(ramp.width / 2, ramp.height / 2, ramp.depth / 2));
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(shape);
      body.position.set(ramp.x, ramp.height / 2 + yOffset, ramp.z);
      body.quaternion.setFromEuler(ramp.angle, ramp.rotation, 0);
      this.world.addBody(body);
      
      this.obstacles.push({ mesh, body });
    });

    // ==== ALGUNS CAIXOTES ====
    const crates = [
      { x: -130, z: 0, size: 15 },
      { x: 130, z: 0, size: 15 },
      { x: 0, z: 50, size: 12 },
      { x: 0, z: -50, size: 12 },
    ];

    crates.forEach((crate, index) => {
      const geometry = new THREE.BoxGeometry(crate.size, crate.size, crate.size);
      const material = index % 2 === 0 ? darkWoodMaterial : woodMaterial;
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(crate.x, crate.size / 2, crate.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Physics
      const shape = new CANNON.Box(new CANNON.Vec3(crate.size / 2, crate.size / 2, crate.size / 2));
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(shape);
      body.position.set(crate.x, crate.size / 2, crate.z);
      this.world.addBody(body);
      
      this.obstacles.push({ mesh, body });
    });
    
    console.log('🌲 Arena simplificada com', this.obstacles.length, 'obstáculos');
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Directional light
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
    this.scene.add(directionalLight);

    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.6);
    this.scene.add(hemisphereLight);
  }

  private createGround(): void {
    // Create grass texture
    const grassTexture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(`
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
    `));
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(100, 100);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshLambertMaterial({ map: grassTexture, color: 0x90EE90 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(800, 80, 0x4CAF50, 0x90EE90);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  private createArenaWalls(): void {
    const woodMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513, 
      roughness: 0.85, 
      metalness: 0.1 
    });
    const wallHeight = 15;
    const wallThickness = 8;
    const arenaSize = 400;

    // Create wooden plank texture for walls
    const createWoodenWall = (width: number, height: number, depth: number, x: number, y: number, z: number, rotationY = 0) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        woodMaterial
      );
      wall.position.set(x, y, z);
      wall.rotation.y = rotationY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      
      // Add planks detail
      const plankCount = Math.floor(height / 3);
      for (let i = 0; i < plankCount; i++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.98, 0.5, depth + 0.5),
          new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
        );
        plank.position.set(x, y - height/2 + i * 3 + 1.5, z);
        plank.rotation.y = rotationY;
        this.scene.add(plank);
      }
      
      return wall;
    };

    // North wall
    const northWall = createWoodenWall(
      arenaSize + wallThickness, wallHeight, wallThickness,
      0, wallHeight/2, arenaSize/2 + wallThickness/2
    );
    this.scene.add(northWall);

    // South wall
    const southWall = createWoodenWall(
      arenaSize + wallThickness, wallHeight, wallThickness,
      0, wallHeight/2, -arenaSize/2 - wallThickness/2
    );
    this.scene.add(southWall);

    // East wall
    const eastWall = createWoodenWall(
      wallThickness, wallHeight, arenaSize,
      arenaSize/2 + wallThickness/2, wallHeight/2, 0
    );
    this.scene.add(eastWall);

    // West wall
    const westWall = createWoodenWall(
      wallThickness, wallHeight, arenaSize,
      -arenaSize/2 - wallThickness/2, wallHeight/2, 0
    );
    this.scene.add(westWall);
  }

  private createRobot(): void {
    this.robotGroup = new THREE.Group();

    // Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 30),
      new THREE.MeshStandardMaterial({ color: 0x2C3E50, metalness: 0.7, roughness: 0.3 })
    );
    chassis.position.y = -4; // Posicionar no chão (corpo físico está em Y=6, então chassis vai para Y=2)
    chassis.castShadow = true;
    this.robotGroup.add(chassis);

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 25),
      new THREE.MeshStandardMaterial({ color: 0x3498DB, metalness: 0.6, roughness: 0.4 })
    );
    body.position.y = 2; // Acima do chassis
    body.castShadow = true;
    this.robotGroup.add(body);

    // Hood
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(16, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0xE74C3C, metalness: 0.5, roughness: 0.3 })
    );
    hood.position.set(0, 6.5, 8);
    hood.castShadow = true;
    this.robotGroup.add(hood);

    // Windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(16, 6, 1),
      new THREE.MeshStandardMaterial({ 
        color: 0x87CEEB, 
        metalness: 0.1, 
        roughness: 0.1, 
        transparent: true, 
        opacity: 0.7 
      })
    );
    windshield.position.set(0, 5, 4);
    windshield.rotation.x = -0.2;
    this.robotGroup.add(windshield);

    // Headlights
    const headlightGeometry = new THREE.CylinderGeometry(2, 2, 1, 12);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: 0xffffaa, 
      emissiveIntensity: 0.5 
    });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.rotation.z = Math.PI / 2;
    leftHeadlight.position.set(-6, 3, 15.5);
    this.robotGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.rotation.z = Math.PI / 2;
    rightHeadlight.position.set(6, 3, 15.5);
    this.robotGroup.add(rightHeadlight);

    // Grill
    const grill = new THREE.Mesh(
      new THREE.BoxGeometry(12, 4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2C3E50, metalness: 0.8, roughness: 0.2 })
    );
    grill.position.set(0, 1, 15.2);
    this.robotGroup.add(grill);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(4, 4, 3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x2C3E50, metalness: 0.8, roughness: 0.2 });

    const wheelPositions = [
      { x: -11, z: 10 },  // front left
      { x: 11, z: 10 },   // front right
      { x: -11, z: -10 }, // rear left
      { x: 11, z: -10 }   // rear right
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, -2, pos.z);
      wheel.castShadow = true;
      this.robotGroup.add(wheel);

      // Wheel details
      const wheelDetailGeometry = new THREE.CylinderGeometry(2.5, 2.5, 3.5, 8);
      const wheelDetailMaterial = new THREE.MeshStandardMaterial({ color: 0x95A5A6, metalness: 0.9, roughness: 0.1 });
      const wheelDetail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
      wheelDetail.rotation.z = Math.PI / 2;
      wheelDetail.position.set(pos.x, -2, pos.z);
      this.robotGroup.add(wheelDetail);
    });

    // Antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x95A5A6, metalness: 0.8, roughness: 0.2 })
    );
    antenna.position.set(0, 9, -5);
    this.robotGroup.add(antenna);

    // Antenna LED
    const antennaLed = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.4 })
    );
    antennaLed.position.set(0, 12, -5);
    this.robotGroup.add(antennaLed);

    // Direction arrow
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(2, 4, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0xFFFF00, 
        metalness: 0.5, 
        roughness: 0.3, 
        emissive: 0xFFFF00, 
        emissiveIntensity: 0.3 
      })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 7, 12);
    this.robotGroup.add(arrow);

    this.scene.add(this.robotGroup);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', () => this.isMouseDown = true);
    canvas.addEventListener('mouseup', () => this.isMouseDown = false);
    canvas.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        const rect = canvas.getBoundingClientRect();
        this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }
    });

    window.addEventListener('resize', () => {
      const container = this.canvasContainer.nativeElement;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private startRenderLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);

        // Step physics simulation
        this.world.step(this.timeStep);
        
        // Estabilização e controle de física
        if (!this.robotState.isAnimating) {
          // Forçar orientação vertical
          const upVector = new CANNON.Vec3(0, 1, 0);
          const robotUp = new CANNON.Vec3(0, 1, 0);
          this.robotBody.quaternion.vmult(robotUp, robotUp);
          
          const dot = upVector.dot(robotUp);
          if (dot < 0.99) {
            const correctionTorque = upVector.cross(robotUp);
            correctionTorque.scale(200); // Força muito alta para correção instantânea
            this.robotBody.applyTorque(correctionTorque);
          }
          
          // Zerar rotações indesejadas completamente
          this.robotBody.angularVelocity.x = 0;
          this.robotBody.angularVelocity.z = 0;
          
          // Limitar velocidade vertical para cima (evitar saltos), mas permitir queda rápida
          if (this.robotBody.velocity.y > 0.5) {
            this.robotBody.velocity.y = 0.5;
          }
          
          // Forçar robô para baixo rapidamente se estiver no ar
          if (this.robotBody.position.y > 7) {
            this.robotBody.velocity.y -= 2; // Acelerar queda
          }
        }

        // Sync robot visual with physics body
        this.robotGroup.position.copy(this.robotBody.position as any);
        this.robotGroup.quaternion.copy(this.robotBody.quaternion as any);

        // Throttled state update para evitar ExpressionChangedAfterItHasBeenCheckedError
        const now = Date.now();
        if (now - this.lastStateUpdate > this.stateUpdateInterval) {
          this.ngZone.run(() => {
            // Update robot state from physics body
            this.robotState.x = this.robotBody.position.x;
            this.robotState.z = this.robotBody.position.z;
            
            // Calcular rotação Y a partir do quaternion
            const euler = new CANNON.Vec3();
            this.robotBody.quaternion.toEuler(euler);
            this.robotState.rotation = euler.y * 180 / Math.PI;
            
            // Forçar detecção de mudanças
            this.cdr.detectChanges();
          });
          this.lastStateUpdate = now;
        }

        // Camera controls
        if (this.isThirdPersonView) {
          // Atualizar câmera em terceira pessoa para seguir o robô
          this.updateCameraToThirdPerson();
        } else if (this.isMouseDown) {
          this.camera.position.x = 160 * Math.cos(this.mouseX * Math.PI);
          this.camera.position.z = 280 * Math.sin(this.mouseX * Math.PI);
          this.camera.position.y = 160 + this.mouseY * 80;
          this.camera.lookAt(this.robotGroup.position);
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private handleCommand(cmd: SimulatorCommand): void {
    if (cmd.type === 'lbml-exec') {
      this.executeCommandSequenceFromString(cmd.payload || '');
    } else if (cmd.type === 'lbml-reset') {
      this.resetRobot();
    }
  }

  private async executeCommandSequenceFromString(input: string): Promise<void> {
    const commands = (input || '').split(';').filter(cmd => cmd.trim());
    const parsedCommands: ParsedCommand[] = [];

    for (const cmd of commands) {
      const parsed = this.parseLBMLCommand(cmd.trim() + ';');
      if (!parsed) {
        this.showError();
        return;
      }
      parsedCommands.push(parsed);
    }

    if (parsedCommands.length === 0) return;
    if (this.robotState.isAnimating) return;

    this.ngZone.run(() => {
      this.robotState.isAnimating = true;
      this.cdr.detectChanges();
    });

    for (const cmd of parsedCommands) {
      await this.executeCommand(cmd);
      await new Promise(r => setTimeout(r, 300));
    }

    this.ngZone.run(() => {
      this.robotState.isAnimating = false;
      this.currentCommand = '-';
      this.cdr.detectChanges();
    });
  }

  private parseLBMLCommand(command: string): ParsedCommand | null {
    const regex = /^([DR])(\d+)([FBLR]);$/;
    const match = command.match(regex);
    if (!match) return null;

    const [, prefix, value, direction] = match;
    const numValue = parseInt(value);

    if (prefix === 'D' && !['F', 'B', 'L', 'R'].includes(direction)) return null;
    if (prefix === 'R' && !['L', 'R'].includes(direction)) return null;

    return { type: prefix, value: numValue, direction };
  }

  private async executeCommand(cmd: ParsedCommand): Promise<void> {
    if (!cmd) return;
    
    this.ngZone.run(() => {
      this.currentCommand = `${cmd.type}${cmd.value}${cmd.direction}`;
      this.cdr.detectChanges();
    });

    if (cmd.type === 'D') {
      const distance = cmd.value;
      switch(cmd.direction) {
        case 'F':
          const radF = this.robotState.rotation * Math.PI / 180;
          const targetXF = this.robotState.x + Math.sin(radF) * distance;
          const targetZF = this.robotState.z + Math.cos(radF) * distance;
          console.log(`Movendo para frente: de (${this.robotState.x.toFixed(1)}, ${this.robotState.z.toFixed(1)}) para (${targetXF.toFixed(1)}, ${targetZF.toFixed(1)})`);
          await this.animateMovement(targetXF, targetZF, distance);
          break;

        case 'B':
          const radB = this.robotState.rotation * Math.PI / 180;
          const targetXB = this.robotState.x - Math.sin(radB) * distance;
          const targetZB = this.robotState.z - Math.cos(radB) * distance;
          await this.animateMovement(targetXB, targetZB, distance);
          break;

        case 'L':
          const targetRotationL = this.robotState.rotation + 90;
          await this.animateRotation(targetRotationL, 90);
          const radL = this.robotState.rotation * Math.PI / 180;
          const targetXL = this.robotState.x + Math.sin(radL) * distance;
          const targetZL = this.robotState.z + Math.cos(radL) * distance;
          await this.animateMovement(targetXL, targetZL, distance);
          break;

        case 'R':
          const targetRotationR = this.robotState.rotation - 90;
          await this.animateRotation(targetRotationR, 90);
          const radR = this.robotState.rotation * Math.PI / 180;
          const targetXR = this.robotState.x + Math.sin(radR) * distance;
          const targetZR = this.robotState.z + Math.cos(radR) * distance;
          await this.animateMovement(targetXR, targetZR, distance);
          break;
      }
    } else if (cmd.type === 'R') {
      const angle = cmd.value;
      const targetRotation = this.robotState.rotation + (cmd.direction === 'R' ? -angle : angle);
      await this.animateRotation(targetRotation, angle);
    }
  }

  private isValidPosition(x: number, z: number): boolean {
    // Check arena boundaries
    if (x < -this.ARENA_LIMIT || x > this.ARENA_LIMIT || z < -this.ARENA_LIMIT || z > this.ARENA_LIMIT) {
      return false;
    }
    
    // Check collision with obstacles using physics
    const testPosition = new CANNON.Vec3(x, 0, z);
    
    // Robot size (half extents)
    const robotHalfWidth = 10;
    const robotHalfDepth = 15;
    
    // Check collision with each obstacle
    for (const obstacle of this.obstacles) {
      // Get obstacle position (on ground level for comparison)
      const obstaclePos = new CANNON.Vec3(obstacle.body.position.x, 0, obstacle.body.position.z);
      
      // Calculate distance between robot center and obstacle center
      const distance = testPosition.distanceTo(obstaclePos);
      
      // Determine minimum safe distance based on obstacle shape
      let minDistance = 30; // Default safe distance
      
      // Get obstacle dimensions from the shape
      if (obstacle.body.shapes[0] instanceof CANNON.Box) {
        const boxShape = obstacle.body.shapes[0] as CANNON.Box;
        const obstacleRadius = Math.max(boxShape.halfExtents.x, boxShape.halfExtents.z);
        minDistance = robotHalfWidth + obstacleRadius + 5; // Robot radius + obstacle radius + safety margin
      } else if (obstacle.body.shapes[0] instanceof CANNON.Cylinder) {
        const cylinderShape = obstacle.body.shapes[0] as CANNON.Cylinder;
        minDistance = robotHalfWidth + cylinderShape.radiusTop + 5;
      }
      
      if (distance < minDistance) {
        console.log(`Colisão detectada! Distância: ${distance.toFixed(1)}, Mínimo: ${minDistance.toFixed(1)}`);
        return false;
      }
    }
    
    return true;
  }

  private getMaxValidPosition(startX: number, startZ: number, targetX: number, targetZ: number) {
    // First check if target position is completely valid
    if (this.isValidPosition(targetX, targetZ)) {
      return { x: targetX, z: targetZ, blocked: false };
    }
    
    console.log(`Movimento bloqueado de (${startX.toFixed(1)}, ${startZ.toFixed(1)}) para (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
    
    // If not valid, try to find the closest valid position along the path
    const stepSize = 5; // Check every 5 units
    const totalDistance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetZ - startZ, 2));
    const steps = Math.floor(totalDistance / stepSize);
    
    if (steps === 0) {
      // Target is too close, stay at current position
      return { x: startX, z: startZ, blocked: true };
    }
    
    // Check intermediate positions
    for (let i = steps; i > 0; i--) {
      const progress = i / steps;
      const testX = startX + (targetX - startX) * progress;
      const testZ = startZ + (targetZ - startZ) * progress;
      
      if (this.isValidPosition(testX, testZ)) {
        return { x: testX, z: testZ, blocked: true };
      }
    }
    
    // If no valid intermediate position found, stay at start
    return { x: startX, z: startZ, blocked: true };
  }

  private animateMovement(targetX: number, targetZ: number, distance: number): Promise<void> {
    return new Promise(resolve => {
      const startTime = Date.now();
      const duration = (distance / this.ROBOT_SPEED) * 1000;
      
      // Abordagem híbrida: mover diretamente mas aplicar forças para simular física
      const startPos = this.robotBody.position.clone();
      const targetPos = new CANNON.Vec3(targetX, this.robotBody.position.y, targetZ);
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress < 0.5 ? 
          2 * progress * progress : 
          1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolar posição diretamente (mais confiável)
        const currentPos = new CANNON.Vec3(
          startPos.x + (targetPos.x - startPos.x) * easeProgress,
          this.robotBody.position.y, // Manter Y atual (física controla altura)
          startPos.z + (targetPos.z - startPos.z) * easeProgress
        );
        
        this.robotBody.position.x = currentPos.x;
        this.robotBody.position.z = currentPos.z;
        
        // Limpar velocidades horizontais excessivas
        this.robotBody.velocity.x *= 0.8;
        this.robotBody.velocity.z *= 0.8;
        
        // Estabilizar rotação
        this.robotBody.angularVelocity.x *= 0.5;
        this.robotBody.angularVelocity.z *= 0.5;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Parar completamente
          this.robotBody.velocity.x = 0;
          this.robotBody.velocity.z = 0;
          resolve();
        }
      };
      
      animate();
    });
  }

  private animateRotation(targetRotation: number, angle: number): Promise<void> {
    return new Promise(resolve => {
      const duration = (Math.abs(angle) / this.ROTATION_SPEED) * 1000;
      const startTime = Date.now();
      const startRotation = this.robotState.rotation;
      
      const applyRotation = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
          // Rotação direta via quaternion - sem torque
          const currentRotation = startRotation + (targetRotation - startRotation) * progress;
          const quaternion = new CANNON.Quaternion();
          quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), currentRotation * Math.PI / 180);
          this.robotBody.quaternion.copy(quaternion);
          
          // Zerar velocidades angulares indesejadas
          this.robotBody.angularVelocity.x = 0;
          this.robotBody.angularVelocity.z = 0;
          this.robotBody.angularVelocity.y *= 0.8;
          
          requestAnimationFrame(applyRotation);
        } else {
          this.robotState.rotation = targetRotation;
          this.robotBody.angularVelocity.set(0, 0, 0);
          setTimeout(resolve, 100);
        }
      };
      
      applyRotation();
    });
  }

  resetRobot(): void {
    // Reset physics body
    this.robotBody.position.set(0, 6, 0); // Posicionar no chão
    this.robotBody.velocity.set(0, 0, 0);
    this.robotBody.angularVelocity.set(0, 0, 0);
    this.robotBody.quaternion.set(0, 0, 0, 1);
    
    // Atualizar estado de forma controlada
    this.ngZone.run(() => {
      this.robotState.x = 0;
      this.robotState.z = 0;
      this.robotState.rotation = 0;
      this.currentCommand = '-';
      this.cdr.detectChanges();
    });
  }

  toggleCameraMode(): void {
    this.isThirdPersonView = !this.isThirdPersonView;
    
    if (!this.isThirdPersonView) {
      // Retornar para vista normal com transição suave
      this.animateCameraToNormal();
    }
    // Para terceira pessoa, a animação acontece no render loop
  }

  private animateCameraToNormal(): void {
    const targetPos = { x: 120, y: 160, z: 240 };
    const startPos = { 
      x: this.camera.position.x, 
      y: this.camera.position.y, 
      z: this.camera.position.z 
    };
    
    const duration = 1000; // 1 segundo
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      this.camera.position.x = startPos.x + (targetPos.x - startPos.x) * easeProgress;
      this.camera.position.y = startPos.y + (targetPos.y - startPos.y) * easeProgress;
      this.camera.position.z = startPos.z + (targetPos.z - startPos.z) * easeProgress;
      
      this.camera.lookAt(0, 0, 0);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  private updateCameraToThirdPerson(): void {
    // Usar posição direta do corpo físico para evitar inconsistências
    const robotX = this.robotBody.position.x;
    const robotZ = this.robotBody.position.z;
    
    // Calcular rotação Y a partir do quaternion
    const euler = new CANNON.Vec3();
    this.robotBody.quaternion.toEuler(euler);
    const robotRotation = euler.y;
    
    const distance = 60; // Distância atrás do robô
    const height = 30; // Altura da câmera
    
    // Calcular posição atrás do robô
    const targetX = robotX - Math.sin(robotRotation) * distance;
    const targetZ = robotZ - Math.cos(robotRotation) * distance;
    const targetY = height;
    
    // Interpolar suavemente para a nova posição (para movimento mais fluido)
    const lerpFactor = 0.1;
    this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor;
    this.camera.position.y += (targetY - this.camera.position.y) * lerpFactor;
    this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor;
    
    // Sempre olhar para o robô
    this.camera.lookAt(this.robotGroup.position);
  }

  private showError(message = 'Comando inválido!'): void {
    this.ngZone.run(() => {
      this.errorMessage = message;
      this.cdr.detectChanges();
    });
    console.log('Erro no simulador:', message);
    setTimeout(() => {
      this.ngZone.run(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      });
    }, 2000);
  }
}