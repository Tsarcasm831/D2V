
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PlayerConfig } from '../../types';
import { PlayerModel } from '../../game/PlayerModel';
import { IdleAction } from '../../game/animator/actions/IdleAction';

interface PlayerPreviewProps {
    config: PlayerConfig;
}

export const PlayerPreview: React.FC<PlayerPreviewProps> = ({ config }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const modelRef = useRef<PlayerModel | null>(null);
    const frameIdRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // Setup
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const scene = new THREE.Scene();
        // Transparent background
        scene.background = null; 
        
        // Adjust camera for portrait character framing
        // Moved back to 4.6 to fit full body comfortably within the UI panel
        const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
        camera.position.set(0, 0.9, 4.6); 
        camera.lookAt(0, 0.9, 0);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows for UI
        containerRef.current.appendChild(renderer.domElement);

        // Lighting (Front-lit for UI)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
        dirLight.position.set(2, 2, 5);
        dirLight.castShadow = true;
        // Tune shadows for small scale
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);
        
        // Add a back/rim light for better definition against dark bg
        const backLight = new THREE.DirectionalLight(0x4455ff, 0.6);
        backLight.position.set(-2, 2, -5);
        scene.add(backLight);

        // Player Model
        const playerModel = new PlayerModel(config);
        // Face camera slightly
        playerModel.group.rotation.y = 0.2;
        scene.add(playerModel.group);

        sceneRef.current = scene;
        modelRef.current = playerModel;
        rendererRef.current = renderer;

        // Mock Player Object for IdleAction
        const mockPlayer = {
            config: config,
            isCombatStance: false,
            model: playerModel,
        };

        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            
            // Run Idle Animation
            IdleAction.animate(mockPlayer, playerModel.parts, 0.1, false);
            
            // Update hair/physics
            playerModel.update(0.016, new THREE.Vector3(0,0,0));

            renderer.render(scene, camera);
        };

        animate();

        // Resize Observer
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        
        const resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(containerRef.current);

        return () => {
            cancelAnimationFrame(frameIdRef.current);
            resizeObserver.disconnect();
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, []);

    // Sync Config changes
    useEffect(() => {
        if (modelRef.current) {
            modelRef.current.sync(config, false);
        }
    }, [config]);

    return <div ref={containerRef} className="w-full h-full" />;
};
