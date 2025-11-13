import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SimulatorBridgeService, SimulatorCommand } from '../../services/simulator-bridge.service';
import { ThreeSceneService } from '../../services/three-scene.service';
import { PhysicsService } from '../../services/physics.service';
import { RobotBuilderService } from '../../services/robot-builder.service';
import { ArenaBuilderService, ObstacleData } from '../../services/arena-builder.service';
import { CameraControllerService } from '../../services/camera-controller.service';
import { LbmlParserService } from '../../services/lbml-parser.service';
import { RobotState } from '../../models/robot-state.model';
import { ParsedCommand } from '../../models/lbml-command.model';
import { Subscription } from 'rxjs';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

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
        <div class="status-item distance-item">
          <span class="status-label">Distância até B:</span>
          <span class="status-value" [textContent]="getDistanceToGoal().toFixed(1)"></span>
        </div>
      </div>
      <div class="buttons-container">
        <button class="reset-button" (click)="resetRobot()" [disabled]="robotState.isAnimating">
          🔄 Resetar Posição
        </button>
        <button class="camera-button" (click)="toggleCameraMode()" [disabled]="robotState.isAnimating">
          📹 {{ cameraController.isThirdPersonView() ? 'Vista Normal' : '3ª Pessoa' }}
        </button>
        <button class="goal-button" (click)="randomizeGoal()" [disabled]="robotState.isAnimating">
          🎯 Nova Posição B
        </button>
      </div>
      <div class="indicator" [style.display]="robotState.isAnimating ? 'block' : 'none'">
        EXECUTANDO...
      </div>
      <div class="victory" [style.display]="hasWon ? 'block' : 'none'">
        🎉 PARABÉNS! Você chegou ao ponto B! 🎉
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

  // Physics
  private world!: CANNON.World;
  private robotBody!: CANNON.Body;
  private obstacles: ObstacleData[] = [];
  private timeStep = 1 / 60;

  // Robot configuration constants
  private readonly ROBOT_SPEED = 30;
  private readonly ROTATION_SPEED = 90;

  // Component state
  robotState: RobotState = { x: 0, z: 0, rotation: 0, isAnimating: false };
  currentCommand = '-';
  errorMessage = '';
  
  // Game state
  startPoint = { x: -80, z: -80 };
  goalPoint = { x: 80, z: 80 };
  hasWon = false;
  private startMarker!: THREE.Mesh;
  private goalMarker!: THREE.Mesh;
  private readonly WIN_DISTANCE = 15;

  // Throttle para atualizações do estado
  private lastStateUpdate = 0;
  private stateUpdateInterval = 100;

  constructor(
    private bridge: SimulatorBridgeService,
    private threeScene: ThreeSceneService,
    private physics: PhysicsService,
    private robotBuilder: RobotBuilderService,
    private arenaBuilder: ArenaBuilderService,
    public cameraController: CameraControllerService,
    private lbmlParser: LbmlParserService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  getRotationDisplay(): string {
    return Math.round(this.robotState.rotation % 360) + '°';
  }
  
  getDistanceToGoal(): number {
    const dx = this.goalPoint.x - this.robotState.x;
    const dz = this.goalPoint.z - this.robotState.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  ngOnInit(): void {
    this.sub = this.bridge.commands$.subscribe(cmd => this.handleCommand(cmd));
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeSimulator();
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

  private initializeSimulator(): void {
    // Initialize THREE.js
    const sceneSetup = this.threeScene.initScene(this.canvasContainer);
    this.scene = sceneSetup.scene;
    this.camera = sceneSetup.camera;
    this.renderer = sceneSetup.renderer;

    // Create ground and arena
    this.scene.add(this.arenaBuilder.createGround());
    this.scene.add(this.arenaBuilder.createGridHelper());
    const walls = this.arenaBuilder.createArenaWalls(this.scene);
    walls.forEach(wall => this.scene.add(wall));

    // Create robot
    this.robotGroup = this.robotBuilder.createRobot();
    this.scene.add(this.robotGroup);

    // Initialize physics
    this.world = this.physics.initWorld();
    this.physics.createStaticBodies(this.world);
    this.robotBody = this.physics.createRobotBody(this.world);

    // Create obstacles
    this.obstacles = this.arenaBuilder.createObstacles(this.scene, this.world);
    
    // Create game markers
    this.createGameMarkers();

    // Setup camera controls
    this.cameraController.setupEventListeners(
      this.renderer.domElement,
      this.camera,
      this.renderer,
      () => this.threeScene.handleResize(this.canvasContainer, this.camera, this.renderer)
    );

    // Start render loop
    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);

        // Step physics simulation
        this.physics.step(this.world, this.timeStep);

        // Stabilize robot
        this.physics.stabilizeRobot(this.robotBody, this.robotState.isAnimating);

        // Sync robot visual with physics
        this.physics.syncVisualWithPhysics(this.robotGroup, this.robotBody);

        // Throttled state update
        const now = Date.now();
        if (now - this.lastStateUpdate > this.stateUpdateInterval) {
          this.ngZone.run(() => {
            this.robotState.x = this.robotBody.position.x;
            this.robotState.z = this.robotBody.position.z;

            const euler = new CANNON.Vec3();
            this.robotBody.quaternion.toEuler(euler);
            this.robotState.rotation = euler.y * 180 / Math.PI;
            
            // Check win condition
            this.checkWinCondition();

            this.cdr.detectChanges();
          });
          this.lastStateUpdate = now;
        }

        // Update camera
        this.cameraController.updateThirdPersonCamera(this.camera, this.robotBody);
        this.cameraController.updateFreeLookCamera(this.camera, this.robotGroup.position);

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
    const parsedCommands = this.lbmlParser.parseCommandSequence(input);
    
    if (!parsedCommands) {
      this.showError('Comando inválido!');
      return;
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

  private async executeCommand(cmd: ParsedCommand): Promise<void> {
    if (!cmd) return;

    this.ngZone.run(() => {
      this.currentCommand = this.lbmlParser.formatCommand(cmd);
      this.cdr.detectChanges();
    });

    if (cmd.type === 'D') {
      await this.executeDistanceCommand(cmd);
    } else if (cmd.type === 'R') {
      const angle = cmd.value;
      const targetRotation = this.robotState.rotation + (cmd.direction === 'R' ? -angle : angle);
      await this.animateRotation(targetRotation, angle);
    }
  }

  private async executeDistanceCommand(cmd: ParsedCommand): Promise<void> {
    const distance = cmd.value;
    let targetX = this.robotState.x;
    let targetZ = this.robotState.z;
    const radians = this.robotState.rotation * Math.PI / 180;

    switch (cmd.direction) {
      case 'F':
        targetX += Math.sin(radians) * distance;
        targetZ += Math.cos(radians) * distance;
        break;
      case 'B':
        targetX -= Math.sin(radians) * distance;
        targetZ -= Math.cos(radians) * distance;
        break;
      case 'L':
        await this.animateRotation(this.robotState.rotation + 90, 90);
        const radL = this.robotState.rotation * Math.PI / 180;
        targetX += Math.sin(radL) * distance;
        targetZ += Math.cos(radL) * distance;
        break;
      case 'R':
        await this.animateRotation(this.robotState.rotation - 90, 90);
        const radR = this.robotState.rotation * Math.PI / 180;
        targetX += Math.sin(radR) * distance;
        targetZ += Math.cos(radR) * distance;
        break;
    }

    await this.animateMovement(targetX, targetZ, distance);
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
          2 * progress * progress :
          1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentPos = new CANNON.Vec3(
          startPos.x + (targetPos.x - startPos.x) * easeProgress,
          this.robotBody.position.y,
          startPos.z + (targetPos.z - startPos.z) * easeProgress
        );

        this.robotBody.position.x = currentPos.x;
        this.robotBody.position.z = currentPos.z;

        this.robotBody.velocity.x *= 0.8;
        this.robotBody.velocity.z *= 0.8;
        this.robotBody.angularVelocity.x *= 0.5;
        this.robotBody.angularVelocity.z *= 0.5;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
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
          const currentRotation = startRotation + (targetRotation - startRotation) * progress;
          const quaternion = new CANNON.Quaternion();
          quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), currentRotation * Math.PI / 180);
          this.robotBody.quaternion.copy(quaternion);

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
    this.robotBody.position.set(this.startPoint.x, 0.5, this.startPoint.z);
    this.robotBody.velocity.set(0, 0, 0);
    this.robotBody.angularVelocity.set(0, 0, 0);
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
    this.robotBody.quaternion.copy(quaternion);

    this.ngZone.run(() => {
      this.robotState.x = this.startPoint.x;
      this.robotState.z = this.startPoint.z;
      this.robotState.rotation = 0;
      this.currentCommand = '-';
      this.hasWon = false;
      this.cdr.detectChanges();
    });
  }

  toggleCameraMode(): void {
    const isThirdPerson = this.cameraController.toggleCameraMode();
    
    if (!isThirdPerson) {
      this.cameraController.animateCameraToNormal(this.camera);
    }
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
  
  private createGameMarkers(): void {
    // Criar marcador de início (ponto A) - verde
    const startGeometry = new THREE.CylinderGeometry(8, 8, 2, 32);
    const startMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.7
    });
    this.startMarker = new THREE.Mesh(startGeometry, startMaterial);
    this.startMarker.position.set(this.startPoint.x, 0.1, this.startPoint.z);
    this.startMarker.castShadow = true;
    this.startMarker.receiveShadow = true;
    this.scene.add(this.startMarker);
    
    // Adicionar texto 'A' no marcador de início
    const startTextSprite = this.createTextSprite('A', 0x00ff00);
    startTextSprite.position.set(this.startPoint.x, 10, this.startPoint.z);
    this.scene.add(startTextSprite);
    
    // Criar marcador de objetivo (ponto B) - vermelho
    const goalGeometry = new THREE.CylinderGeometry(8, 8, 2, 32);
    const goalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.7
    });
    this.goalMarker = new THREE.Mesh(goalGeometry, goalMaterial);
    this.goalMarker.position.set(this.goalPoint.x, 0.1, this.goalPoint.z);
    this.goalMarker.castShadow = true;
    this.goalMarker.receiveShadow = true;
    this.scene.add(this.goalMarker);
    
    // Adicionar texto 'B' no marcador de objetivo
    const goalTextSprite = this.createTextSprite('B', 0xff0000);
    goalTextSprite.position.set(this.goalPoint.x, 10, this.goalPoint.z);
    this.scene.add(goalTextSprite);
  }
  
  private createTextSprite(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 128;
    canvas.height = 128;
    
    context.fillStyle = '#' + color.toString(16).padStart(6, '0');
    context.font = 'bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(20, 20, 1);
    
    return sprite;
  }
  
  private checkWinCondition(): void {
    if (!this.hasWon && !this.robotState.isAnimating) {
      const distance = this.getDistanceToGoal();
      if (distance < this.WIN_DISTANCE) {
        this.hasWon = true;
        this.celebrateVictory();
      }
    }
  }
  
  private celebrateVictory(): void {
    // Animação de pulsação no marcador B
    let scale = 1;
    let growing = true;
    const pulseInterval = setInterval(() => {
      if (growing) {
        scale += 0.1;
        if (scale >= 1.5) growing = false;
      } else {
        scale -= 0.1;
        if (scale <= 1) growing = true;
      }
      this.goalMarker.scale.set(scale, scale, scale);
    }, 50);
    
    setTimeout(() => {
      clearInterval(pulseInterval);
      this.goalMarker.scale.set(1, 1, 1);
    }, 3000);
  }
  
  randomizeGoal(): void {
    // Gera nova posição aleatória para o ponto B
    const range = 150;
    this.goalPoint.x = (Math.random() - 0.5) * range;
    this.goalPoint.z = (Math.random() - 0.5) * range;
    
    // Atualiza a posição do marcador
    this.goalMarker.position.set(this.goalPoint.x, 0.1, this.goalPoint.z);
    
    // Atualiza o sprite de texto
    const sprites = this.scene.children.filter(child => child instanceof THREE.Sprite);
    const goalSprite = sprites[sprites.length - 1] as THREE.Sprite;
    if (goalSprite) {
      goalSprite.position.set(this.goalPoint.x, 10, this.goalPoint.z);
    }
    
    this.hasWon = false;
    this.cdr.detectChanges();
  }
}
