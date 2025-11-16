import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MouseState, CameraState } from '../models/robot-state.model';

/**
 * Service responsible for camera control and view modes in the 3D simulator.
 * Supports both free-look (mouse drag) and third-person follow modes.
 */
@Injectable({
  providedIn: 'root'
})
export class CameraControllerService {
  // Camera animation constants
  private static readonly CAMERA_TRANSITION_DURATION_MS = 1000;
  private static readonly CAMERA_LERP_FACTOR = 0.1;

  // Third-person camera constants
  private static readonly THIRD_PERSON_DISTANCE = 60;
  private static readonly THIRD_PERSON_HEIGHT = 30;

  // Free-look camera constants
  private static readonly FREE_LOOK_BASE_DISTANCE_X = 160;
  private static readonly FREE_LOOK_BASE_DISTANCE_Z = 280;
  private static readonly FREE_LOOK_BASE_HEIGHT = 160;
  private static readonly FREE_LOOK_Y_MULTIPLIER = 80;

  // Default camera position
  private static readonly DEFAULT_CAMERA_POSITION = { x: 120, y: 160, z: 240 };

  // State
  private mouseState: MouseState = { x: 0, y: 0, isDown: false };
  private cameraState: CameraState = { isThirdPersonView: false };

  /**
   * Sets up event listeners for camera controls (mouse and resize).
   * @param canvas - The canvas element to attach mouse events to
   * @param camera - The camera (unused, kept for API compatibility)
   * @param renderer - The renderer (unused, kept for API compatibility)
   * @param onResize - Callback function for window resize events
   */
  public setupEventListeners(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    onResize: () => void
  ): void {
    this.setupMouseControls(canvas);
    this.setupResizeHandler(onResize);
  }

  /**
   * Sets up mouse event listeners for camera drag control.
   */
  private setupMouseControls(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', () => {
      this.mouseState.isDown = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mouseState.isDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      if (!this.mouseState.isDown) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      this.mouseState.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseState.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });
  }

  /**
   * Sets up window resize event listener.
   */
  private setupResizeHandler(onResize: () => void): void {
    window.addEventListener('resize', onResize);
  }

  /**
   * Updates camera position for free look mode (mouse drag).
   * @param camera - The camera to update
   * @param robotPosition - The robot's position to look at
   */
  public updateFreeLookCamera(camera: THREE.PerspectiveCamera, robotPosition: THREE.Vector3): void {
    if (!this.mouseState.isDown || this.cameraState.isThirdPersonView) {
      return;
    }

    const angle = this.mouseState.x * Math.PI;
    camera.position.x = CameraControllerService.FREE_LOOK_BASE_DISTANCE_X * Math.cos(angle);
    camera.position.z = CameraControllerService.FREE_LOOK_BASE_DISTANCE_Z * Math.sin(angle);
    camera.position.y = CameraControllerService.FREE_LOOK_BASE_HEIGHT + 
                        this.mouseState.y * CameraControllerService.FREE_LOOK_Y_MULTIPLIER;
    camera.lookAt(robotPosition);
  }

  /**
   * Updates camera position for third-person view (follows robot smoothly).
   * @param camera - The camera to update
   * @param robotBody - The robot's physics body
   */
  public updateThirdPersonCamera(camera: THREE.PerspectiveCamera, robotBody: CANNON.Body): void {
    if (!this.cameraState.isThirdPersonView) {
      return;
    }

    const robotPosition = { x: robotBody.position.x, z: robotBody.position.z };
    const robotRotation = this.extractRotationFromBody(robotBody);
    const targetPosition = this.calculateThirdPersonPosition(robotPosition, robotRotation);

    this.smoothlyMoveCamera(camera, targetPosition);
    camera.lookAt(robotPosition.x, 0, robotPosition.z);
  }

  /**
   * Extracts Y-axis rotation from physics body.
   */
  private extractRotationFromBody(body: CANNON.Body): number {
    const euler = new CANNON.Vec3();
    body.quaternion.toEuler(euler);
    return euler.y;
  }

  /**
   * Calculates the target camera position for third-person view.
   */
  private calculateThirdPersonPosition(
    robotPosition: { x: number; z: number },
    robotRotation: number
  ): { x: number; y: number; z: number } {
    const distance = CameraControllerService.THIRD_PERSON_DISTANCE;
    const height = CameraControllerService.THIRD_PERSON_HEIGHT;

    return {
      x: robotPosition.x - Math.sin(robotRotation) * distance,
      y: height,
      z: robotPosition.z - Math.cos(robotRotation) * distance
    };
  }

  /**
   * Smoothly interpolates camera position towards target.
   */
  private smoothlyMoveCamera(
    camera: THREE.PerspectiveCamera,
    target: { x: number; y: number; z: number }
  ): void {
    const lerpFactor = CameraControllerService.CAMERA_LERP_FACTOR;
    camera.position.x += (target.x - camera.position.x) * lerpFactor;
    camera.position.y += (target.y - camera.position.y) * lerpFactor;
    camera.position.z += (target.z - camera.position.z) * lerpFactor;
  }

  /**
   * Toggles between normal and third-person camera mode.
   * @returns True if switched to third-person, false if switched to normal
   */
  public toggleCameraMode(): boolean {
    this.cameraState.isThirdPersonView = !this.cameraState.isThirdPersonView;
    return this.cameraState.isThirdPersonView;
  }

  /**
   * Animates camera smoothly back to the default normal view.
   * @param camera - The camera to animate
   */
  public animateCameraToNormal(camera: THREE.PerspectiveCamera): void {
    const targetPos = CameraControllerService.DEFAULT_CAMERA_POSITION;
    const startPos = { ...camera.position };
    const startTime = Date.now();

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(
        elapsed / CameraControllerService.CAMERA_TRANSITION_DURATION_MS,
        1
      );
      const easeProgress = this.easeOutCubic(progress);

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
   * Easing function for smooth animation (ease-out cubic).
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Gets current camera mode state.
   * @returns True if in third-person view, false otherwise
   */
  public isThirdPersonView(): boolean {
    return this.cameraState.isThirdPersonView;
  }

  /**
   * Resets camera controller state to defaults.
   */
  public reset(): void {
    this.mouseState = { x: 0, y: 0, isDown: false };
    this.cameraState = { isThirdPersonView: false };
  }
}
