import * as THREE from 'three';
import * as CANNON from 'cannon';
import { easeInOutCubic } from './utils.js';

export class Robot {
  constructor(scene, world, material, spawnPosition) {
    this.scene = scene;
    this.world = world;
    this.material = material;
    this.spawnPosition = spawnPosition.clone();
    this.spawnQuaternion = new CANNON.Quaternion();
    this.moveSpeed = 1.0; // metros por segundo (mais realista)
    this.rotationSpeed = 90; // graus por segundo (mais suave)
    this.distanceTolerance = 0.2;
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
      type: CANNON.Body.DYNAMIC,
      fixedRotation: false
    });
    this.body.addShape(new CANNON.Box(halfExtents));
    this.body.angularDamping = 0.2;
    this.body.linearDamping = 0.05;
    this.body.allowSleep = false;
    this.body.userData = { type: 'robot' };
    this.world.addBody(this.body);

    this.body.addEventListener('collide', (event) => {
      const contact = event.contact;
      const other = event.target === this.body ? event.contact.bi : event.contact.bj;
      if (other.userData && (other.userData.type === 'wall' || other.userData.type === 'obstacle')) {
        this.pendingCollision = true;
      }
    });

    this.movementTask = null;
    this.rotationTask = null;
    this.wheelRadius = 4 * 0.05;
  }

  buildMesh() {
    const robotGroup = new THREE.Group();

    // Chassis
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

    // Corpo principal
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

    // Capô
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

    // Para-brisa
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
    windshield.castShadow = true;
    robotGroup.add(windshield);

    // Rodas
    const wheelGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 2, 12);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.2,
      roughness: 0.9,
    });

    const wheels = [];
    const wheelPositions = [
      [-8, 2, -12], // Frente esquerda
      [8, 2, -12],  // Frente direita
      [-8, 2, 12],  // Traseira esquerda
      [8, 2, 12],   // Traseira direita
    ];

    wheelPositions.forEach((pos, index) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      robotGroup.add(wheel);
      wheels.push(wheel);
    });

    // Faróis
    const headlightGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffff99,
      emissiveIntensity: 0.5,
    });

    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-6, 12, 13);
    leftHeadlight.castShadow = true;
    robotGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(6, 12, 13);
    rightHeadlight.castShadow = true;
    robotGroup.add(rightHeadlight);

    // Antena
    const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 6);
    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2,
    });

    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 22, -5);
    antenna.castShadow = true;
    robotGroup.add(antenna);

    // Escala para centímetros (Three.js usa metros)
    robotGroup.scale.setScalar(0.05);

    return { group: robotGroup, wheels };
  }

  getVisualPosition() {
    return new THREE.Vector3().copy(this.body.position);
  }

  getVisualQuaternion() {
    return new THREE.Quaternion(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    );
  }

  reset(spawnPosition) {
    this.body.position.copy(spawnPosition);
    this.body.quaternion.copy(this.spawnQuaternion);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    
    this.movementTask = null;
    this.rotationTask = null;
    this.pendingCollision = false;
    
    this.group.position.copy(this.body.position);
    this.group.quaternion.copy(this.body.quaternion);
  }

  getForwardVector() {
    // No Three.js/Cannon.js, Z positivo geralmente é "para frente"
    const forward = new CANNON.Vec3(0, 0, 1);
    this.body.quaternion.vmult(forward, forward);
    console.log('Vetor forward calculado:', forward);
    return forward;
  }

  getLeftVector() {
    // X negativo é esquerda
    const left = new CANNON.Vec3(-1, 0, 0);
    this.body.quaternion.vmult(left, left);
    console.log('Vetor left calculado:', left);
    return left;
  }

  getRightVector() {
    // X positivo é direita
    const right = new CANNON.Vec3(1, 0, 0);
    this.body.quaternion.vmult(right, right);
    console.log('Vetor right calculado:', right);
    return right;
  }

  moveDistance(distance, direction = 'F') {
    if (this.movementTask) return Promise.reject(new Error('Já está em movimento'));
    
    const startPosition = this.body.position.clone();
    let moveVector;
    
    console.log(`Iniciando movimento: ${distance}m na direção ${direction}`);
    console.log('Posição inicial:', startPosition);
    console.log('Rotação atual:', this.getYawDegrees(), 'graus');
    
    // Calcular vetor de movimento baseado na direção
    switch (direction) {
      case 'F': // Frente
        moveVector = this.getForwardVector();
        break;
      case 'B': // Trás
        moveVector = this.getForwardVector().scale(-1);
        break;
      case 'L': // Esquerda (relativo ao robô)
        moveVector = this.getLeftVector();
        break;
      case 'R': // Direita (relativo ao robô)
        moveVector = this.getRightVector();
        break;
      default:
        return Promise.reject(new Error(`Direção inválida: ${direction}`));
    }
    
    console.log('Vetor de movimento:', moveVector);
    const targetPosition = startPosition.vadd(moveVector.scale(distance));
    console.log('Posição alvo:', targetPosition);
    
    const startTime = performance.now();
    const duration = Math.abs(distance) / this.moveSpeed * 1000;
    console.log(`Duração do movimento: ${duration}ms para ${distance}m a ${this.moveSpeed}m/s`);
    
    return new Promise((resolve, reject) => {
      this.movementTask = {
        type: 'move',
        startPosition,
        targetPosition,
        distance,
        direction,
        moveVector: moveVector.clone(), // Clonar para evitar mutação
        startTime,
        duration,
        resolve,
        reject
      };
    });
  }

  rotateDegrees(angleDegrees) {
    if (this.rotationTask) return Promise.reject(new Error('Já está rotacionando'));
    
    const startAngle = this.getYawDegrees();
    const targetAngle = startAngle + angleDegrees;
    
    const startTime = performance.now();
    const duration = Math.abs(angleDegrees) / this.rotationSpeed * 1000;
    
    return new Promise((resolve, reject) => {
      this.rotationTask = {
        type: 'rotate',
        startAngle,
        targetAngle,
        angleDegrees,
        startTime,
        duration,
        resolve,
        reject
      };
    });
  }

  stepPrePhysics(dt) {
    // Processa tarefas de movimento
    if (this.movementTask) {
      const task = this.movementTask;
      const elapsed = performance.now() - task.startTime;
      const progress = Math.min(elapsed / task.duration, 1);
      
      // Usar interpolação direta de posição ao invés de velocidade
      const currentPosition = new CANNON.Vec3().copy(task.startPosition);
      const targetOffset = task.moveVector.scale(task.distance * progress);
      currentPosition.vadd(targetOffset, currentPosition);
      
      // Aplicar a posição diretamente
      this.body.position.copy(currentPosition);
      
      // Zerar velocidade para evitar movimentos indesejados
      this.body.velocity.set(0, 0, 0);
      
      // Log apenas nos primeiros frames para evitar spam
      if (elapsed < 100) {
        console.log(`Progresso: ${(progress * 100).toFixed(1)}%`);
        console.log('Posição calculada:', currentPosition);
        console.log('Offset aplicado:', targetOffset);
      }
      
      if (progress >= 1 || this.pendingCollision) {
        console.log('Movimento finalizado. Posição final:', this.body.position);
        const actualDistance = this.body.position.distanceTo(task.startPosition);
        console.log(`Distância real percorrida: ${actualDistance.toFixed(3)}m (esperado: ${task.distance}m)`);
        
        if (this.pendingCollision) {
          task.reject(new Error('Colisão detectada'));
          this.pendingCollision = false;
        } else {
          task.resolve();
        }
        this.movementTask = null;
      }
    }
    
    // Processa tarefas de rotação
    if (this.rotationTask) {
      const task = this.rotationTask;
      const elapsed = performance.now() - task.startTime;
      const progress = Math.min(elapsed / task.duration, 1);
      
      const angularSpeed = (task.angleDegrees * Math.PI / 180) / (task.duration / 1000);
      this.body.angularVelocity.y = angularSpeed * (1 - progress + 0.1);
      
      if (progress >= 1) {
        this.body.angularVelocity.set(0, 0, 0);
        task.resolve();
        this.rotationTask = null;
      }
    }
  }

  stepPostPhysics(dt) {
    // Atualiza posição visual
    this.group.position.copy(this.body.position);
    this.group.quaternion.copy(this.body.quaternion);
    
    // Simula rotação das rodas baseada na velocidade
    if (this.movementTask) {
      const linearVel = this.body.velocity.length();
      const angularVel = linearVel / this.wheelRadius;
      
      this.wheelMeshes.forEach((wheel, index) => {
        if (index < 2) { // Rodas dianteiras
          wheel.rotation.x += angularVel * dt;
        } else { // Rodas traseiras
          wheel.rotation.x += angularVel * dt;
        }
      });
    }
    
    // Simula rotação das rodas durante curvas
    if (this.rotationTask) {
      const turnRate = Math.abs(this.body.angularVelocity.y);
      this.wheelMeshes.forEach((wheel, index) => {
        const side = index % 2 === 0 ? -1 : 1; // esquerda/direita
        const direction = Math.sign(this.rotationTask.angleDegrees);
        wheel.rotation.x += side * direction * turnRate * dt * this.wheelRadius;
      });
    }
  }

  getYawDegrees() {
    const euler = new THREE.Euler().setFromQuaternion(this.getVisualQuaternion(), 'YXZ');
    return THREE.MathUtils.radToDeg(euler.y);
  }
}