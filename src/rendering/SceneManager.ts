/**
 * SceneManager.ts - Three.js WebGL Lifecycle, Renderer, & Container Management
 * Ensures GPU-accelerated rendering, ACESFilmic tone mapping, and ResizeObserver responsive scaling.
 */

import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a192f);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Canvas styling
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    container.appendChild(this.renderer.domElement);
  }

  public onResize(callback: (width: number, height: number) => void) {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          this.renderer.setSize(width, height, false);
          callback(width, height);
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  public dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
