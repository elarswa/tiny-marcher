import { debounceTime, fromEvent } from 'rxjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import MarchMaterial from '../../Materials/MarchMaterial';

export interface RenderControllerProps {
    container: HTMLDivElement;
}

// TODO: refactor so March Material is a full screen quad processing pass
// Manipulate the scene via proxy geometries

export default class RenderController {
    private _container: HTMLDivElement = document.createElement('div');
    private _renderer: THREE.WebGLRenderer;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _march: MarchMaterial | null = null;
    private _light: THREE.DirectionalLight | null = null;
    private _ambientLight: THREE.AmbientLight | null = null;
    private _plane: THREE.Mesh | null = null;

    constructor() {
        this._renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            depth: false,
            stencil: false,
        });

        // Initialize scene
        this._scene = new THREE.Scene();

        // Initialize camera with reasonable defaults
        this._camera = new THREE.PerspectiveCamera(
            75, // Field of view
            1, // Aspect ratio (will be updated in init)
            0.1, // Near plane
            1000, // Far plane
        );
        this._camera.position.set(0, 5, 5);

        this._light = new THREE.DirectionalLight(0xffffff, 1);
        this._light.position.set(5, 5, 5).normalize();
        this._scene.add(this._light);
        this._scene.background = new THREE.Color(0xffffff); // Set background color
        this._ambientLight = new THREE.AmbientLight(0x404040, 1); // Soft white light
        this._scene.add(this._ambientLight);
        const gridHelper = new THREE.GridHelper(10, 10);
        this._scene.add(gridHelper);

        // Add basic perspective camera controls
        const controls = new OrbitControls(this._camera, this._renderer.domElement);
        controls.enableDamping = true; // Enable damping for smoother controls
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 100;
        controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation
    }

    public init = ({ container }: RenderControllerProps) => {
        this._container = container;
        this._renderer.setSize(this._container.clientWidth, this._container.clientHeight);

        this._renderer.domElement.style.display = 'block';
        this._renderer.domElement.style.width = '100vw';
        this._renderer.domElement.style.height = '100vh';
        this._container.appendChild(this._renderer.domElement);

        // Update camera aspect ratio
        this._camera.aspect = this._container.clientWidth / this._container.clientHeight;
        this._camera.updateProjectionMatrix();
        this._resize();
        this.startAnimationLoop();

        const material = new MarchMaterial({}, this._renderer.getContext());
        this._march = material;

        if (this._light && this._ambientLight) {
            this._march.lightColor.copy(this._light.color);
            this._march.lightDir.copy(this._light.position);
            // TODO: ambient light in MarchMaterial
        }

        this._march.resolution.set(this._container.clientWidth, this._container.clientHeight);

        const geometry = new THREE.PlaneGeometry();
        this._plane = new THREE.Mesh(geometry, material);

        // Get the wdith and height of the near plane
        const nearPlaneWidth =
            this._camera.near *
            Math.tan(THREE.MathUtils.degToRad(this._camera.fov / 2)) *
            this._camera.aspect *
            2;
        const nearPlaneHeight = nearPlaneWidth / this._camera.aspect;
        this._plane.scale.set(nearPlaneWidth, nearPlaneHeight, 1);

        this._scene.add(this._plane);
    };

    private _movePlaneWithCamera = () => {
        if (this._plane) {
            this._plane.position.copy(this._camera.position);
            this._plane.lookAt(
                this._camera.position
                    .clone()
                    .add(this._camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1)),
            );
        }
    };

    public dispose = () => {
        this.resize.unsubscribe();
    };

    public render = () => {
        if (this._march) {
            this._march.camPos.copy(this._camera.position);
            this._march.camToWorldMat.copy(this._camera.matrixWorld);
            this._march.camInvProjMat.copy(this._camera.projectionMatrixInverse);
            this._march.resolution.set(this._container.clientWidth, this._container.clientHeight);
        }
        this._movePlaneWithCamera();
        this._renderer.render(this._scene, this._camera);
    };

    public startAnimationLoop = () => {
        const animate = () => {
            requestAnimationFrame(animate);
            this.render();
        };
        animate();
    };

    private _resize = () => {
        if (!this._container.parentElement) return;
        this._renderer.setSize(this._container.clientWidth, this._container.clientHeight);

        // Update camera aspect ratio on resize
        this._camera.aspect = this._container.clientWidth / this._container.clientHeight;
        this._camera.updateProjectionMatrix();
    };

    public resize = fromEvent(window, 'resize').pipe(debounceTime(200)).subscribe(this._resize);
}
