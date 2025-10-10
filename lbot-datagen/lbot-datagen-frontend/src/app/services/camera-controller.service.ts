import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MouseState, CameraState } from '../models/robot-state.model';

@Injectable({
  providedIn: 'root'
})
export class CameraControllerService {
  private mouseState: MouseState = { x: 0, y: 0, isDown: false };
  private cameraState: CameraState = { isThirdPersonView: false };

  /**
   * Sets up event listeners for camera controls
   */
  setupEventListeners(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    onResize: () => void
  ): void {
    // Mouse controls
    canvas.addEventListener('mousedown', () => {
      this.mouseState.isDown = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mouseState.isDown = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.mouseState.isDown) {
        const rect = canvas.getBoundingClientRect();
        this.mouseState.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseState.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }
    });

    // Window resize
    window.addEventListener('resize', onResize);
  }

  /**
   * Updates camera position for free look mode (mouse drag)
   */
  updateFreeLookCamera(camera: THREE.PerspectiveCamera, robotPosition: THREE.Vector3): void {
    if (!this.mouseState.isDown || this.cameraState.isThirdPersonView) return;

    camera.position.x = 160 * Math.cos(this.mouseState.x * Math.PI);
    camera.position.z = 280 * Math.sin(this.mouseState.x * Math.PI);
    camera.position.y = 160 + this.mouseState.y * 80;
    camera.lookAt(robotPosition);
  }

  /**
   * Updates camera position for third-person view (follows robot)
   */
  updateThirdPersonCamera(camera: THREE.PerspectiveCamera, robotBody: CANNON.Body): void {
    if (!this.cameraState.isThirdPersonView) return;

    const robotX = robotBody.position.x;
    const robotZ = robotBody.position.z;

    // Calculate rotation from quaternion
    const euler = new CANNON.Vec3();
    robotBody.quaternion.toEuler(euler);
    const robotRotation = euler.y;

    const distance = 60;
    const height = 30;

    // Calculate position behind the robot
    const targetX = robotX - Math.sin(robotRotation) * distance;
    const targetZ = robotZ - Math.cos(robotRotation) * distance;
    const targetY = height;

    // Smooth interpolation
    const lerpFactor = 0.1;
    camera.position.x += (targetX - camera.position.x) * lerpFactor;
    camera.position.y += (targetY - camera.position.y) * lerpFactor;
    camera.position.z += (targetZ - camera.position.z) * lerpFactor;

    // Look at robot
    camera.lookAt(robotX, 0, robotZ);
  }

  /**
   * Toggles between normal and third-person camera mode
   */
  toggleCameraMode(): boolean {
    this.cameraState.isThirdPersonView = !this.cameraState.isThirdPersonView;
    return this.cameraState.isThirdPersonView;
  }

  /**
   * Animates camera back to normal/default view
   */
  animateCameraToNormal(camera: THREE.PerspectiveCamera): void {
    const targetPos = { x: 120, y: 160, z: 240 };
    const startPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };

    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      camera.position.x = startPos.x + (targetPos.x - startPos.x) * easeProgress;
      camera.position.y = startPos.y + (targetPos.y - startPos.y) * easeProgress;
      camera.position.z = startPos.z + (targetPos.z - startPos.z) * easeProgress;

      camera.lookAt(0, 0, 0);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Gets current camera mode state
   */
  isThirdPersonView(): boolean {
    return this.cameraState.isThirdPersonView;
  }

  /**
   * Resets camera state
   */
  reset(): void {
    this.mouseState = { x: 0, y: 0, isDown: false };
    this.cameraState = { isThirdPersonView: false };
  }
}
