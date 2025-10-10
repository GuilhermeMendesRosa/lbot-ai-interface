import { Injectable, ElementRef } from '@angular/core';
import * as THREE from 'three';

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

@Injectable({
  providedIn: 'root'
})
export class ThreeSceneService {

  /**
   * Initializes the complete THREE.js scene with camera and renderer
   */
  initScene(container: ElementRef<HTMLDivElement>): SceneSetup {
    const scene = this.createScene();
    const camera = this.createCamera(container);
    const renderer = this.createRenderer(container);
    
    this.setupLighting(scene);
    
    return { scene, camera, renderer };
  }

  /**
   * Creates and configures the THREE.js scene
   */
  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 200, 800);
    return scene;
  }

  /**
   * Creates and configures the perspective camera
   */
  private createCamera(container: ElementRef<HTMLDivElement>): THREE.PerspectiveCamera {
    const width = container.nativeElement.clientWidth;
    const height = container.nativeElement.clientHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1500);
    camera.position.set(120, 160, 240);
    camera.lookAt(0, 0, 0);
    
    return camera;
  }

  /**
   * Creates and configures the WebGL renderer
   */
  private createRenderer(container: ElementRef<HTMLDivElement>): THREE.WebGLRenderer {
    const width = container.nativeElement.clientWidth;
    const height = container.nativeElement.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    container.nativeElement.appendChild(renderer.domElement);
    
    return renderer;
  }

  /**
   * Sets up all lighting in the scene
   */
  private setupLighting(scene: THREE.Scene): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Directional light (sun)
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
    scene.add(directionalLight);

    // Hemisphere light (sky/ground)
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.6);
    scene.add(hemisphereLight);
  }

  /**
   * Handles window resize events
   */
  handleResize(
    container: ElementRef<HTMLDivElement>,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ): void {
    const width = container.nativeElement.clientWidth;
    const height = container.nativeElement.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  /**
   * Gets default camera position
   */
  getDefaultCameraPosition() {
    return { x: 120, y: 160, z: 240 };
  }
}
