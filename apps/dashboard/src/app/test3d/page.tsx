'use client';

import { useEffect, useRef, useState } from 'react';

// Vanilla Three.js test - R3F olmadan
export default function Test3DPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState('Başlatılıyor...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const init = async () => {
            try {
                setStatus('Three.js yükleniyor...');

                // Dynamic import Three.js
                const THREE = await import('three');

                setStatus('Scene oluşturuluyor...');

                // Basic setup
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x030303);

                const camera = new THREE.PerspectiveCamera(
                    75,
                    window.innerWidth / window.innerHeight,
                    0.1,
                    1000
                );
                camera.position.z = 5;

                setStatus('WebGL Renderer oluşturuluyor...');

                const renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    powerPreference: 'default'
                });
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

                containerRef.current!.appendChild(renderer.domElement);

                setStatus('Mesh oluşturuluyor...');

                // Red box
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
                const cube = new THREE.Mesh(geometry, material);
                scene.add(cube);

                setStatus('✅ Hazır! Animasyon başlıyor...');

                // Animation loop
                let frameId: number;
                const animate = () => {
                    frameId = requestAnimationFrame(animate);
                    cube.rotation.x += 0.01;
                    cube.rotation.y += 0.01;
                    renderer.render(scene, camera);
                };

                animate();

                // Cleanup
                return () => {
                    cancelAnimationFrame(frameId);
                    renderer.dispose();
                    geometry.dispose();
                    material.dispose();
                };

            } catch (err: any) {
                console.error('Three.js Error:', err);
                setError(err.message || 'Bilinmeyen hata');
                setStatus('❌ HATA!');
            }
        };

        init();
    }, []);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#030303',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Status bar */}
            <div style={{
                padding: '1rem',
                backgroundColor: '#0a0a0a',
                borderBottom: '1px solid #991b1b',
                color: '#fecaca',
                fontFamily: 'monospace',
                fontSize: '14px',
                zIndex: 10
            }}>
                <strong>🧪 Vanilla Three.js Test</strong>
                <br />
                Status: {status}
                {error && (
                    <div style={{ color: '#ef4444', marginTop: '0.5rem' }}>
                        Error: {error}
                    </div>
                )}
            </div>

            {/* Three.js container */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    width: '100%',
                    height: '100%'
                }}
            />
        </div>
    );
}
