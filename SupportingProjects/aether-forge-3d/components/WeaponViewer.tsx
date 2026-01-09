import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { buildWeapon } from '../services/weaponBuilder';
import { WeaponConfig } from '../types';

interface ViewerProps {
  config: WeaponConfig;
}

export const WeaponViewer: React.FC<ViewerProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const weaponRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());

  // Initialize Scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a1a');
    scene.fog = new THREE.Fog('#1a1a1a', 5, 30);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    // Zoomed out slightly and higher up
    camera.position.set(4, 5, 6);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.5, 0); // Look at the floating weapon
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const accentLight = new THREE.PointLight(0xff6b00, 2, 10);
    accentLight.position.set(-2, 3, 2);
    scene.add(accentLight);

    const rimLight = new THREE.SpotLight(0x4455ff, 5);
    rimLight.position.set(0, 5, -5);
    rimLight.lookAt(0, 2, 0);
    scene.add(rimLight);

    // Floor (Grid)
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Floor reflection plane
    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.5 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Animation Loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const dt = clockRef.current.getDelta();

      if (controlsRef.current) controlsRef.current.update();
      
      // Update Effects
      if (weaponRef.current && weaponRef.current.userData.updateEffect) {
          weaponRef.current.userData.updateEffect(dt);
      }
      
      // Floating animation
      if (weaponRef.current) {
          weaponRef.current.position.y = 1.0 + Math.sin(clockRef.current.elapsedTime * 0.5) * 0.05;
          weaponRef.current.rotation.y += dt * 0.1;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Weapon when Config Changes
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old weapon
    if (weaponRef.current) {
      sceneRef.current.remove(weaponRef.current);
      // Clean up memory
      weaponRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    // Build new weapon
    const newWeapon = buildWeapon(config);
    newWeapon.position.y = 1.0; // Initial float height
    weaponRef.current = newWeapon;
    sceneRef.current.add(newWeapon);

  }, [config]);

  return <div ref={containerRef} className="w-full h-full relative" />;
};