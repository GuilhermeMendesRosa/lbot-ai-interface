import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class RobotBuilderService {

  /**
   * Creates a complete 3D robot model
   * @returns THREE.Group containing all robot parts
   */
  createRobot(): THREE.Group {
    const robotGroup = new THREE.Group();

    // Chassis (base)
    const chassis = this.createChassis();
    robotGroup.add(chassis);

    // Main body
    const body = this.createBody();
    robotGroup.add(body);

    // Hood (front top)
    const hood = this.createHood();
    robotGroup.add(hood);

    // Windshield
    const windshield = this.createWindshield();
    robotGroup.add(windshield);

    // Headlights
    const headlights = this.createHeadlights();
    headlights.forEach(light => robotGroup.add(light));

    // Grill
    const grill = this.createGrill();
    robotGroup.add(grill);

    // Wheels
    const wheels = this.createWheels();
    wheels.forEach(wheel => robotGroup.add(wheel));

    // Antenna
    const antenna = this.createAntenna();
    robotGroup.add(antenna);

    // Antenna LED
    const antennaLed = this.createAntennaLed();
    robotGroup.add(antennaLed);

    // Direction arrow
    const arrow = this.createDirectionArrow();
    robotGroup.add(arrow);

    return robotGroup;
  }

  private createChassis(): THREE.Mesh {
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 30),
      new THREE.MeshStandardMaterial({ 
        color: 0x2C3E50, 
        metalness: 0.7, 
        roughness: 0.3 
      })
    );
    chassis.position.y = -4;
    chassis.castShadow = true;
    return chassis;
  }

  private createBody(): THREE.Mesh {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 25),
      new THREE.MeshStandardMaterial({ 
        color: 0x3498DB, 
        metalness: 0.6, 
        roughness: 0.4 
      })
    );
    body.position.y = 2;
    body.castShadow = true;
    return body;
  }

  private createHood(): THREE.Mesh {
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(16, 3, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0xE74C3C, 
        metalness: 0.5, 
        roughness: 0.3 
      })
    );
    hood.position.set(0, 6.5, 8);
    hood.castShadow = true;
    return hood;
  }

  private createWindshield(): THREE.Mesh {
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
    return windshield;
  }

  private createHeadlights(): THREE.Mesh[] {
    const headlightGeometry = new THREE.CylinderGeometry(2, 2, 1, 12);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5
    });

    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.rotation.z = Math.PI / 2;
    leftHeadlight.position.set(-6, 3, 15.5);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.rotation.z = Math.PI / 2;
    rightHeadlight.position.set(6, 3, 15.5);

    return [leftHeadlight, rightHeadlight];
  }

  private createGrill(): THREE.Mesh {
    const grill = new THREE.Mesh(
      new THREE.BoxGeometry(12, 4, 0.5),
      new THREE.MeshStandardMaterial({ 
        color: 0x2C3E50, 
        metalness: 0.8, 
        roughness: 0.2 
      })
    );
    grill.position.set(0, 1, 15.2);
    return grill;
  }

  private createWheels(): THREE.Mesh[] {
    const wheelGeometry = new THREE.CylinderGeometry(4, 4, 3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2C3E50, 
      metalness: 0.8, 
      roughness: 0.2 
    });

    const wheelDetailGeometry = new THREE.CylinderGeometry(2.5, 2.5, 3.5, 8);
    const wheelDetailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x95A5A6, 
      metalness: 0.9, 
      roughness: 0.1 
    });

    const wheelPositions = [
      { x: -11, z: 10 },  // front left
      { x: 11, z: 10 },   // front right
      { x: -11, z: -10 }, // rear left
      { x: 11, z: -10 }   // rear right
    ];

    const wheels: THREE.Mesh[] = [];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, -2, pos.z);
      wheel.castShadow = true;
      wheels.push(wheel);

      const wheelDetail = new THREE.Mesh(wheelDetailGeometry, wheelDetailMaterial);
      wheelDetail.rotation.z = Math.PI / 2;
      wheelDetail.position.set(pos.x, -2, pos.z);
      wheels.push(wheelDetail);
    });

    return wheels;
  }

  private createAntenna(): THREE.Mesh {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 6, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x95A5A6, 
        metalness: 0.8, 
        roughness: 0.2 
      })
    );
    antenna.position.set(0, 9, -5);
    return antenna;
  }

  private createAntennaLed(): THREE.Mesh {
    const antennaLed = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshStandardMaterial({ 
        color: 0xFF0000, 
        emissive: 0xFF0000, 
        emissiveIntensity: 0.4 
      })
    );
    antennaLed.position.set(0, 12, -5);
    return antennaLed;
  }

  private createDirectionArrow(): THREE.Mesh {
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
    return arrow;
  }

  /**
   * Gets the robot's dimensions for physics calculations
   */
  getRobotDimensions() {
    return {
      width: 20,
      height: 12,
      depth: 30,
      halfWidth: 10,
      halfHeight: 6,
      halfDepth: 15
    };
  }
}
