import * as THREE from 'three';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Camera position
        this.camera.position.z = 5;
        this.camera.position.y = 1;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 10, 10);
        this.scene.add(directionalLight);

        // Background / Highway
        this.createEnvironment();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    createEnvironment() {
        // Dark background
        this.scene.background = new THREE.Color(0x050505);

        // Grid helper for reference (faint)
        const gridHelper = new THREE.GridHelper(50, 50, 0x222222, 0x111111);
        gridHelper.position.y = -2;
        this.scene.add(gridHelper);

        // Neon lines (Top and Bottom of the "lane")
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-50, 2, 0),
            new THREE.Vector3(50, 2, 0)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0055 });

        const topLine = new THREE.Line(lineGeometry, lineMaterial);
        topLine.position.y = 2;
        this.scene.add(topLine);

        const bottomLine = new THREE.Line(lineGeometry, lineMaterial);
        bottomLine.position.y = -2;
        this.scene.add(bottomLine);

        // Add some particles or stars
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 500;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 100;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.1,
            color: 0x00ff88,
            transparent: true,
            opacity: 0.5
        });

        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(particlesMesh);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
