import { Injectable, ElementRef } from '@angular/core';
import * as THREE from 'three';

/**
 * Configuration object returned after scene initialization.
 */
export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

/**
 * Service responsible for creating and configuring the THREE.js 3D scene.
 * Handles scene initialization, camera setup, renderer configuration, and lighting.
 */
@Injectable({
  providedIn: 'root'
})
export class ThreeSceneService {
  // Scene configuration constants
  private static readonly SKY_COLOR = 0x87CEEB;
  private static readonly FOG_NEAR = 200;
  private static readonly FOG_FAR = 800;

  // Camera configuration constants
  private static readonly CAMERA_FOV = 75;
  private static readonly CAMERA_NEAR = 0.1;
  private static readonly CAMERA_FAR = 1500;
  private static readonly CAMERA_DEFAULT_POSITION = { x: 120, y: 160, z: 240 };

  // Renderer configuration constants
  private static readonly SHADOW_MAP_SIZE = 2048;
  private static readonly TONE_MAPPING_EXPOSURE = 1.2;

  // Lighting configuration constants
  private static readonly AMBIENT_LIGHT_INTENSITY = 0.4;
  private static readonly DIRECTIONAL_LIGHT_INTENSITY = 1.0;
  private static readonly DIRECTIONAL_LIGHT_POSITION = { x: 100, y: 200, z: 100 };
  private static readonly HEMISPHERE_LIGHT_INTENSITY = 0.6;
  private static readonly HEMISPHERE_SKY_COLOR = 0x87CEEB;
  private static readonly HEMISPHERE_GROUND_COLOR = 0x228B22;

  /**
   * Initializes the complete THREE.js scene with camera, renderer, and lighting.
   * @param container - The DOM element container for the renderer
   * @returns SceneSetup object with configured scene, camera, and renderer
   */
  public initScene(container: ElementRef<HTMLDivElement>): SceneSetup {
    const scene = this.createScene();
    const camera = this.createCamera(container);
    const renderer = this.createRenderer(container);
    
    this.setupLighting(scene);
    
    return { scene, camera, renderer };
  }

  /**
   * Creates and configures the THREE.js scene with background and fog.
   * @returns Configured THREE.Scene instance
   */
  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(ThreeSceneService.SKY_COLOR);
    scene.fog = new THREE.Fog(
      ThreeSceneService.SKY_COLOR,
      ThreeSceneService.FOG_NEAR,
      ThreeSceneService.FOG_FAR
    );
    return scene;
  }

  /**
   * Creates and configures the perspective camera with default position.
   * @param container - Container element for calculating aspect ratio
   * @returns Configured THREE.PerspectiveCamera instance
   */
  private createCamera(container: ElementRef<HTMLDivElement>): THREE.PerspectiveCamera {
    const { clientWidth, clientHeight } = container.nativeElement;
    const aspectRatio = clientWidth / clientHeight;

    const camera = new THREE.PerspectiveCamera(
      ThreeSceneService.CAMERA_FOV,
      aspectRatio,
      ThreeSceneService.CAMERA_NEAR,
      ThreeSceneService.CAMERA_FAR
    );

    const { x, y, z } = ThreeSceneService.CAMERA_DEFAULT_POSITION;
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    
    return camera;
  }

  /**
   * Creates and configures the WebGL renderer with shadows and tone mapping.
   * @param container - Container element for the renderer canvas
   * @returns Configured THREE.WebGLRenderer instance
   */
  private createRenderer(container: ElementRef<HTMLDivElement>): THREE.WebGLRenderer {
    const { clientWidth, clientHeight } = container.nativeElement;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(clientWidth, clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = ThreeSceneService.TONE_MAPPING_EXPOSURE;
    
    container.nativeElement.appendChild(renderer.domElement);
    
    return renderer;
  }

  /**
   * Sets up all lighting in the scene (ambient, directional, and hemisphere).
   * @param scene - The scene to add lights to
   */
  private setupLighting(scene: THREE.Scene): void {
    this.addAmbientLight(scene);
    this.addDirectionalLight(scene);
    this.addHemisphereLight(scene);
  }

  /**
   * Adds ambient light to the scene for base illumination.
   */
  private addAmbientLight(scene: THREE.Scene): void {
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      ThreeSceneService.AMBIENT_LIGHT_INTENSITY
    );
    scene.add(ambientLight);
  }

  /**
   * Adds directional light (sun) with shadow casting.
   */
  private addDirectionalLight(scene: THREE.Scene): void {
    const light = new THREE.DirectionalLight(
      0xffffff,
      ThreeSceneService.DIRECTIONAL_LIGHT_INTENSITY
    );

    const { x, y, z } = ThreeSceneService.DIRECTIONAL_LIGHT_POSITION;
    light.position.set(x, y, z);
    light.castShadow = true;

    // Configure shadow camera
    light.shadow.camera.left = -400;
    light.shadow.camera.right = 400;
    light.shadow.camera.top = 400;
    light.shadow.camera.bottom = -400;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 500;
    light.shadow.mapSize.width = ThreeSceneService.SHADOW_MAP_SIZE;
    light.shadow.mapSize.height = ThreeSceneService.SHADOW_MAP_SIZE;

    scene.add(light);
  }

  /**
   * Adds hemisphere light for sky/ground color gradient.
   */
  private addHemisphereLight(scene: THREE.Scene): void {
    const hemisphereLight = new THREE.HemisphereLight(
      ThreeSceneService.HEMISPHERE_SKY_COLOR,
      ThreeSceneService.HEMISPHERE_GROUND_COLOR,
      ThreeSceneService.HEMISPHERE_LIGHT_INTENSITY
    );
    scene.add(hemisphereLight);
  }

  /**
   * Handles window resize events by updating camera aspect ratio and renderer size.
   * @param container - The container element
   * @param camera - The camera to update
   * @param renderer - The renderer to resize
   */
  public handleResize(
    container: ElementRef<HTMLDivElement>,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ): void {
    const { clientWidth, clientHeight } = container.nativeElement;

    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  }

  /**
   * Gets the default camera position used during scene initialization.
   * @returns Object with x, y, z coordinates
   */
  public getDefaultCameraPosition(): Readonly<{ x: number; y: number; z: number }> {
    return ThreeSceneService.CAMERA_DEFAULT_POSITION;
  }
}
