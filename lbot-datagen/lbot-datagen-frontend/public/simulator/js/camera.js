import * as THREE from 'three';
import { clamp } from './utils.js';

export class FollowCamera {
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