import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
      <div class="indicator" [style.display]="robotState.isAnimating ? 'block' : 'none'">
        EXECUTANDO...
      </div>
      <div class="error" [style.display]="errorMessage ? 'block' : 'none'" [textContent]="errorMessage">
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
  private obstacles: Array<{mesh: THREE.Mesh, body: CANNON.Body}> = [];
  private timeStep = 1/60;
  
  // Robot configuration constants
  private readonly ROBOT_SPEED = 30; // units per second
  private readonly ROTATION_SPEED = 90; // degrees per second
  private readonly ARENA_LIMIT = 190; // arena boundaries

  // Component state
  robotState: RobotState = { x: 0, z: 0, rotation: 0, isAnimating: false };
  currentCommand = '-';
  errorMessage = '';

  // Mouse interaction state
  private mouseX = 0;
  private mouseY = 0;
  private isMouseDown = false;

  constructor(private bridge: SimulatorBridgeService) {}

  getRotationDisplay(): string {
    return Math.round(this.robotState.rotation % 360) + '°';
  }

  ngOnInit(): void {
    this.sub = this.bridge.commands$.subscribe(cmd => this.handleCommand(cmd));
  }

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.initPhysics();
    this.createPhysicsObjects();
    this.createObstacles();
    this.startRenderLoop();
    this.setupEventListeners();
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
    this.camera.position.set(150, 200, 300);
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
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    
    // Configure contact material
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.4,
        restitution: 0.3,
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;
  }

  private createPhysicsObjects(): void {
    // Create ground physics body
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
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
    const robotShape = new CANNON.Box(new CANNON.Vec3(10, 10, 15));
    this.robotBody = new CANNON.Body({ mass: 5 });
    this.robotBody.addShape(robotShape);
    this.robotBody.position.set(0, 10, 0);
    this.robotBody.material = new CANNON.Material('robot');
    this.world.addBody(this.robotBody);

    // Lock robot rotation on X and Z axes (only allow Y rotation)
    this.robotBody.fixedRotation = true;
    this.robotBody.updateMassProperties();
  }

  private createObstacles(): void {
    const obstacleConfigs = [
      { x: 50, z: 50, type: 'box', size: { x: 15, y: 20, z: 15 }, color: 0xFF6B6B },
      { x: -70, z: 80, type: 'cylinder', size: { radius: 12, height: 25 }, color: 0x4ECDC4 },
      { x: 100, z: -60, type: 'box', size: { x: 20, y: 15, z: 25 }, color: 0x45B7D1 },
      { x: -40, z: -100, type: 'box', size: { x: 10, y: 30, z: 10 }, color: 0x96CEB4 },
      { x: -120, z: 20, type: 'cylinder', size: { radius: 8, height: 20 }, color: 0xFCEAA6 },
      { x: 80, z: 120, type: 'box', size: { x: 25, y: 18, z: 15 }, color: 0xDDA0DD },
      { x: 0, z: -150, type: 'cylinder', size: { radius: 15, height: 22 }, color: 0xF4A460 },
      { x: -150, z: -50, type: 'box', size: { x: 12, y: 25, z: 18 }, color: 0x98D8C8 }
    ];

    obstacleConfigs.forEach(config => {
      let geometry: THREE.BufferGeometry;
      let shape: CANNON.Shape;

      if (config.type === 'box') {
        const { x, y, z } = config.size as { x: number, y: number, z: number };
        geometry = new THREE.BoxGeometry(x, y, z);
        shape = new CANNON.Box(new CANNON.Vec3(x / 2, y / 2, z / 2));
      } else {
        const { radius, height } = config.size as { radius: number, height: number };
        geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
        shape = new CANNON.Cylinder(radius, radius, height, 8);
      }

      // Create Three.js mesh
      const material = new THREE.MeshStandardMaterial({ 
        color: config.color,
        metalness: 0.3,
        roughness: 0.7
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(config.x, (config.size as any).y ? (config.size as any).y / 2 : (config.size as any).height / 2, config.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Create Cannon.js body
      const body = new CANNON.Body({ mass: 0 }); // Static obstacles
      body.addShape(shape);
      body.position.set(config.x, (config.size as any).y ? (config.size as any).y / 2 : (config.size as any).height / 2, config.z);
      this.world.addBody(body);

      this.obstacles.push({ mesh, body });
    });
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
    const concreteMaterial = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.9, metalness: 0.2 });
    const wallHeight = 15;
    const wallThickness = 5;
    const arenaSize = 400;

    // North wall
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(arenaSize + wallThickness, wallHeight, wallThickness),
      concreteMaterial
    );
    northWall.position.set(0, wallHeight/2, arenaSize/2 + wallThickness/2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    this.scene.add(northWall);

    // South wall
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(arenaSize + wallThickness, wallHeight, wallThickness),
      concreteMaterial
    );
    southWall.position.set(0, wallHeight/2, -arenaSize/2 - wallThickness/2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    this.scene.add(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize),
      concreteMaterial
    );
    eastWall.position.set(arenaSize/2 + wallThickness/2, wallHeight/2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    this.scene.add(eastWall);

    // West wall
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize),
      concreteMaterial
    );
    westWall.position.set(-arenaSize/2 - wallThickness/2, wallHeight/2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    this.scene.add(westWall);
  }

  private createRobot(): void {
    this.robotGroup = new THREE.Group();

    // Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 30),
      new THREE.MeshStandardMaterial({ color: 0x2C3E50, metalness: 0.7, roughness: 0.3 })
    );
    chassis.position.y = 6;
    chassis.castShadow = true;
    this.robotGroup.add(chassis);

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 25),
      new THREE.MeshStandardMaterial({ color: 0x3498DB, metalness: 0.6, roughness: 0.4 })
    );
    body.position.y = 12;
    body.castShadow = true;
    this.robotGroup.add(body);

    // Hood
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(16, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0xE74C3C, metalness: 0.5, roughness: 0.3 })
    );
    hood.position.set(0, 16.5, 8);
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
    windshield.position.set(0, 15, 4);
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
    leftHeadlight.position.set(-6, 13, 15.5);
    this.robotGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.rotation.z = Math.PI / 2;
    rightHeadlight.position.set(6, 13, 15.5);
    this.robotGroup.add(rightHeadlight);

    // Grill
    const grill = new THREE.Mesh(
      new THREE.BoxGeometry(12, 4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2C3E50, metalness: 0.8, roughness: 0.2 })
    );
    grill.position.set(0, 11, 15.2);
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
      wheel.position.set(pos.x, 4, pos.z);
      wheel.castShadow = true;
      this.robotGroup.add(wheel);

      // Wheel details
      const wheelDetailGeometry = new THREE.CylinderGeometry(2.5, 2.5, 3.5, 8);
      const wheelDetailMaterial = new THREE.MeshStandardMaterial({ color: 0x95A5A6, metalness: 0.9, roughness: 0.1 });
      const wheelDetail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
      wheelDetail.rotation.z = Math.PI / 2;
      wheelDetail.position.set(pos.x, 4, pos.z);
      this.robotGroup.add(wheelDetail);
    });

    // Antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x95A5A6, metalness: 0.8, roughness: 0.2 })
    );
    antenna.position.set(0, 19, -5);
    this.robotGroup.add(antenna);

    // Antenna LED
    const antennaLed = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.4 })
    );
    antennaLed.position.set(0, 22, -5);
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
    arrow.position.set(0, 17, 12);
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
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Step physics simulation
      this.world.step(this.timeStep);

      // Sync robot visual with physics body
      this.robotGroup.position.copy(this.robotBody.position as any);
      this.robotGroup.quaternion.copy(this.robotBody.quaternion as any);

      // Update robot state from physics body
      this.robotState.x = this.robotBody.position.x;
      this.robotState.z = this.robotBody.position.z;

      // Camera controls
      if (this.isMouseDown) {
        this.camera.position.x = 200 * Math.cos(this.mouseX * Math.PI);
        this.camera.position.z = 350 * Math.sin(this.mouseX * Math.PI);
        this.camera.position.y = 200 + this.mouseY * 100;
        this.camera.lookAt(this.robotGroup.position);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
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

    this.robotState.isAnimating = true;

    for (const cmd of parsedCommands) {
      await this.executeCommand(cmd);
      await new Promise(r => setTimeout(r, 300));
    }

    this.robotState.isAnimating = false;
    this.currentCommand = '-';
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
    
    this.currentCommand = `${cmd.type}${cmd.value}${cmd.direction}`;

    if (cmd.type === 'D') {
      const distance = cmd.value;
      switch(cmd.direction) {
        case 'F':
          const radF = this.robotState.rotation * Math.PI / 180;
          const targetXF = this.robotState.x + Math.sin(radF) * distance;
          const targetZF = this.robotState.z + Math.cos(radF) * distance;
          const resultF = this.getMaxValidPosition(this.robotState.x, this.robotState.z, targetXF, targetZF);
          const actualDistanceF = Math.sqrt(Math.pow(resultF.x - this.robotState.x, 2) + Math.pow(resultF.z - this.robotState.z, 2));
          await this.animateMovement(resultF.x, resultF.z, actualDistanceF);
          if (resultF.blocked) this.showError('Barreira atingida!');
          break;

        case 'B':
          const radB = this.robotState.rotation * Math.PI / 180;
          const targetXB = this.robotState.x - Math.sin(radB) * distance;
          const targetZB = this.robotState.z - Math.cos(radB) * distance;
          const resultB = this.getMaxValidPosition(this.robotState.x, this.robotState.z, targetXB, targetZB);
          const actualDistanceB = Math.sqrt(Math.pow(resultB.x - this.robotState.x, 2) + Math.pow(resultB.z - this.robotState.z, 2));
          await this.animateMovement(resultB.x, resultB.z, actualDistanceB);
          if (resultB.blocked) this.showError('Barreira atingida!');
          break;

        case 'L':
          const targetRotationL = this.robotState.rotation + 90;
          await this.animateRotation(targetRotationL, 90);
          const radL = this.robotState.rotation * Math.PI / 180;
          const targetXL = this.robotState.x + Math.sin(radL) * distance;
          const targetZL = this.robotState.z + Math.cos(radL) * distance;
          const resultL = this.getMaxValidPosition(this.robotState.x, this.robotState.z, targetXL, targetZL);
          const actualDistanceL = Math.sqrt(Math.pow(resultL.x - this.robotState.x, 2) + Math.pow(resultL.z - this.robotState.z, 2));
          await this.animateMovement(resultL.x, resultL.z, actualDistanceL);
          if (resultL.blocked) this.showError('Barreira atingida!');
          break;

        case 'R':
          const targetRotationR = this.robotState.rotation - 90;
          await this.animateRotation(targetRotationR, 90);
          const radR = this.robotState.rotation * Math.PI / 180;
          const targetXR = this.robotState.x + Math.sin(radR) * distance;
          const targetZR = this.robotState.z + Math.cos(radR) * distance;
          const resultR = this.getMaxValidPosition(this.robotState.x, this.robotState.z, targetXR, targetZR);
          const actualDistanceR = Math.sqrt(Math.pow(resultR.x - this.robotState.x, 2) + Math.pow(resultR.z - this.robotState.z, 2));
          await this.animateMovement(resultR.x, resultR.z, actualDistanceR);
          if (resultR.blocked) this.showError('Barreira atingida!');
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
    const testBody = new CANNON.Body({ mass: 0 });
    const testShape = new CANNON.Box(new CANNON.Vec3(10, 10, 15));
    testBody.addShape(testShape);
    testBody.position.set(x, 10, z);
    
    // Simple collision check with obstacles
    for (const obstacle of this.obstacles) {
      const distance = testBody.position.distanceTo(obstacle.body.position);
      const minDistance = 25; // Minimum safe distance
      if (distance < minDistance) {
        return false;
      }
    }
    
    return true;
  }

  private getMaxValidPosition(startX: number, startZ: number, targetX: number, targetZ: number) {
    if (this.isValidPosition(targetX, targetZ)) {
      return { x: targetX, z: targetZ, blocked: false };
    }
    
    const maxX = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, targetX));
    const maxZ = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, targetZ));
    
    return { x: maxX, z: maxZ, blocked: true };
  }

  private animateMovement(targetX: number, targetZ: number, distance: number): Promise<void> {
    return new Promise(resolve => {
      const startTime = Date.now();
      const duration = (distance / this.ROBOT_SPEED) * 1000;
      
      const startPos = this.robotBody.position.clone();
      const targetPos = new CANNON.Vec3(targetX, this.robotBody.position.y, targetZ);
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress < 0.5 ? 
          4 * progress * progress * progress : 
          1 - Math.pow(-2 * progress + 2, 3) / 2;

        // Interpolate position
        const currentPos = new CANNON.Vec3(
          startPos.x + (targetPos.x - startPos.x) * easeProgress,
          startPos.y,
          startPos.z + (targetPos.z - startPos.z) * easeProgress
        );
        
        this.robotBody.position.copy(currentPos);
        this.robotBody.velocity.set(0, 0, 0); // Stop any residual velocity

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  }

  private animateRotation(targetRotation: number, angle: number): Promise<void> {
    return new Promise(resolve => {
      const startRotation = this.robotState.rotation;
      const duration = (Math.abs(angle) / this.ROTATION_SPEED) * 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress < 0.5 ? 
          4 * progress * progress * progress : 
          1 - Math.pow(-2 * progress + 2, 3) / 2;

        this.robotState.rotation = startRotation + (targetRotation - startRotation) * easeProgress;
        
        // Update physics body rotation
        const quaternion = new CANNON.Quaternion();
        quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.robotState.rotation * Math.PI / 180);
        this.robotBody.quaternion.copy(quaternion);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  }

  private resetRobot(): void {
    this.robotState.x = 0;
    this.robotState.z = 0;
    this.robotState.rotation = 0;
    
    // Reset physics body
    this.robotBody.position.set(0, 10, 0);
    this.robotBody.velocity.set(0, 0, 0);
    this.robotBody.angularVelocity.set(0, 0, 0);
    this.robotBody.quaternion.set(0, 0, 0, 1);
    
    this.currentCommand = '-';
  }

  private showError(message = 'Comando inválido!'): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 2000);
  }
}