'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function TestPage() {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // --- BASİT KURULUM (Raw Three.js) ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111); // Koyu Gri

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        // --- İÇERİK ---
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        // --- LOOP ---
        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        };
        animate();

        // --- CLEANUP ---
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frameId);
            renderer.dispose();
            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            <div ref={mountRef} />
            <div style={{ position: 'absolute', top: 20, left: 20, color: '#0f0', fontFamily: 'monospace' }}>
                <h1>TEST ODASI 1</h1>
                <p>Eğer bu küp dönüyorsa, sorun bizim kodda.</p>
                <p>Eğer dönmüyorsa, sorun senin tarayıcıda/GPU'da.</p>
            </div>
        </div>
    );
}
