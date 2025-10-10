import { Injectable } from '@angular/core';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { ObstacleData } from './arena-builder.service';

export interface PhysicsSetup {
  world: CANNON.World;
  robotBody: CANNON.Body;
}

@Injectable({
  providedIn: 'root'
})
export class PhysicsService {
  private readonly ARENA_LIMIT = 190;

  /**
   * Initializes the physics world
   */
  initWorld(): CANNON.World {
    const world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    this.setupContactMaterials(world);

    return world;
  }

  /**
   * Sets up contact materials for different surface interactions
   */
  private setupContactMaterials(world: CANNON.World): void {
    const defaultMaterial = new CANNON.Material('default');
    const robotMaterial = new CANNON.Material('robot');
    const groundMaterial = new CANNON.Material('ground');

    // Robot-ground contact
    const robotGroundContact = new CANNON.ContactMaterial(
      robotMaterial,
      groundMaterial,
      {
        friction: 0.9,
        restitution: 0.0,
      }
    );

    // Robot-obstacle contact
    const robotObstacleContact = new CANNON.ContactMaterial(
      robotMaterial,
      defaultMaterial,
      {
        friction: 0.8,
        restitution: 0.0,
      }
    );

    world.addContactMaterial(robotGroundContact);
    world.addContactMaterial(robotObstacleContact);
    world.defaultContactMaterial = robotObstacleContact;
  }

  /**
   * Creates physics bodies for static objects (ground, walls)
   */
  createStaticBodies(world: CANNON.World): void {
    // Ground
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.material = new CANNON.Material('ground');
    world.addBody(groundBody);

    // Arena walls
    this.createArenaWallsBodies(world);
  }

  /**
   * Creates physics bodies for arena boundary walls
   */
  private createArenaWallsBodies(world: CANNON.World): void {
    const wallThickness = 5;
    const arenaSize = 400;
    const wallHeight = 15;

    const walls = [
      { x: 0, z: arenaSize / 2 + wallThickness / 2, w: (arenaSize + wallThickness) / 2, d: wallThickness / 2 },
      { x: 0, z: -arenaSize / 2 - wallThickness / 2, w: (arenaSize + wallThickness) / 2, d: wallThickness / 2 },
      { x: arenaSize / 2 + wallThickness / 2, z: 0, w: wallThickness / 2, d: arenaSize / 2 },
      { x: -arenaSize / 2 - wallThickness / 2, z: 0, w: wallThickness / 2, d: arenaSize / 2 },
    ];

    walls.forEach(wall => {
      const shape = new CANNON.Box(new CANNON.Vec3(wall.w, wallHeight / 2, wall.d));
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(shape);
      body.position.set(wall.x, wallHeight / 2, wall.z);
      world.addBody(body);
    });
  }

  /**
   * Creates the robot physics body
   */
  createRobotBody(world: CANNON.World): CANNON.Body {
    const robotShape = new CANNON.Box(new CANNON.Vec3(10, 6, 15));
    const robotBody = new CANNON.Body({ mass: 100 });
    robotBody.addShape(robotShape);
    robotBody.position.set(0, 6, 0);
    robotBody.material = new CANNON.Material('robot');
    robotBody.linearDamping = 0.05;
    robotBody.angularDamping = 0.99;

    robotBody.addEventListener('collide', (e: any) => {
      console.log('Robô colidiu!');
    });

    world.addBody(robotBody);
    return robotBody;
  }

  /**
   * Steps the physics simulation forward
   */
  step(world: CANNON.World, timeStep: number = 1 / 60): void {
    world.step(timeStep);
  }

  /**
   * Stabilizes the robot body (prevents tipping, keeps upright)
   */
  stabilizeRobot(robotBody: CANNON.Body, isAnimating: boolean): void {
    if (isAnimating) return;

    // Force upright orientation
    const upVector = new CANNON.Vec3(0, 1, 0);
    const robotUp = new CANNON.Vec3(0, 1, 0);
    robotBody.quaternion.vmult(robotUp, robotUp);

    const dot = upVector.dot(robotUp);
    if (dot < 0.99) {
      const correctionTorque = upVector.cross(robotUp);
      correctionTorque.scale(200);
      robotBody.applyTorque(correctionTorque);
    }

    // Zero unwanted rotations
    robotBody.angularVelocity.x = 0;
    robotBody.angularVelocity.z = 0;

    // Limit upward velocity (prevent jumping)
    if (robotBody.velocity.y > 0.5) {
      robotBody.velocity.y = 0.5;
    }

    // Accelerate falling if robot is in the air
    if (robotBody.position.y > 7) {
      robotBody.velocity.y -= 2;
    }
  }

  /**
   * Syncs THREE.js object with physics body
   */
  syncVisualWithPhysics(visual: THREE.Group, body: CANNON.Body): void {
    visual.position.copy(body.position as any);
    visual.quaternion.copy(body.quaternion as any);
  }

  /**
   * Checks if a position is valid (no collisions, within boundaries)
   */
  isValidPosition(x: number, z: number, obstacles: ObstacleData[]): boolean {
    // Check arena boundaries
    if (x < -this.ARENA_LIMIT || x > this.ARENA_LIMIT || 
        z < -this.ARENA_LIMIT || z > this.ARENA_LIMIT) {
      return false;
    }

    // Check collision with obstacles
    const testPosition = new CANNON.Vec3(x, 0, z);
    const robotHalfWidth = 10;
    const robotHalfDepth = 15;

    for (const obstacle of obstacles) {
      const obstaclePos = new CANNON.Vec3(obstacle.body.position.x, 0, obstacle.body.position.z);
      const distance = testPosition.distanceTo(obstaclePos);

      let minDistance = 30;

      if (obstacle.body.shapes[0] instanceof CANNON.Box) {
        const boxShape = obstacle.body.shapes[0] as CANNON.Box;
        const obstacleRadius = Math.max(boxShape.halfExtents.x, boxShape.halfExtents.z);
        minDistance = robotHalfWidth + obstacleRadius + 5;
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

  /**
   * Finds the maximum valid position along a path
   */
  getMaxValidPosition(
    startX: number,
    startZ: number,
    targetX: number,
    targetZ: number,
    obstacles: ObstacleData[]
  ): { x: number; z: number; blocked: boolean } {
    if (this.isValidPosition(targetX, targetZ, obstacles)) {
      return { x: targetX, z: targetZ, blocked: false };
    }

    console.log(`Movimento bloqueado de (${startX.toFixed(1)}, ${startZ.toFixed(1)}) para (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);

    const stepSize = 5;
    const totalDistance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetZ - startZ, 2));
    const steps = Math.floor(totalDistance / stepSize);

    if (steps === 0) {
      return { x: startX, z: startZ, blocked: true };
    }

    for (let i = steps; i > 0; i--) {
      const progress = i / steps;
      const testX = startX + (targetX - startX) * progress;
      const testZ = startZ + (targetZ - startZ) * progress;

      if (this.isValidPosition(testX, testZ, obstacles)) {
        return { x: testX, z: testZ, blocked: true };
      }
    }

    return { x: startX, z: startZ, blocked: true };
  }

  /**
   * Resets robot body to initial position
   */
  resetRobotBody(robotBody: CANNON.Body): void {
    robotBody.position.set(0, 6, 0);
    robotBody.velocity.set(0, 0, 0);
    robotBody.angularVelocity.set(0, 0, 0);
    robotBody.quaternion.set(0, 0, 0, 1);
  }
}
