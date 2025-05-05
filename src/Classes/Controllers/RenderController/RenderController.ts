import { debounceTime, fromEvent } from 'rxjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import MarchPass, { OutputType } from '../../Materials/MarchPass/MarchPass';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { FAR, NEAR } from '../../../Constants/camera';

export interface RenderControllerProps {
    container: HTMLDivElement;
}

const radius = 5; // Distance from the origin
const speed = 0.1; // Speed of orbit

export default class RenderController {
    private _container: HTMLDivElement = document.createElement('div');
    private _renderer: THREE.WebGLRenderer;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _light: THREE.DirectionalLight | null = null;
    private _ambientLight: THREE.AmbientLight | null = null;
    private _composer: EffectComposer;
    private _marchPass: MarchPass | null = null;
    private _depthRender: THREE.WebGLRenderTarget;
    private _stats: Stats = new Stats();

    constructor() {
        this._renderer = new THREE.WebGLRenderer({
            alpha: true,
            depth: true,
            stencil: false,
        });
        this._renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Initialize scene
        this._scene = new THREE.Scene();

        // Initialize camera with reasonable defaults
        this._camera = new THREE.PerspectiveCamera(
            75, // Field of view
            1, // Aspect ratio (will be updated in init)
            NEAR,
            FAR,
        );
        this._camera.position.set(0, 5, 5);
        this._depthRender = new THREE.WebGLRenderTarget(); // init later

        this._light = new THREE.DirectionalLight(0xffffff, 1);
        this._light.position.set(5, 5, 0).normalize();
        this._scene.add(this._light);
        this._scene.background = new THREE.Color(0xffffff); // Set background color
        this._ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Soft white light
        this._scene.add(this._ambientLight);
        const gridHelper = new THREE.GridHelper(10, 10);
        this._scene.add(gridHelper);
        const axesHelper = new THREE.AxesHelper(5);
        this._scene.add(axesHelper);

        // Add basic perspective camera controls
        const controls = new OrbitControls(this._camera, this._renderer.domElement);
        controls.enableDamping = true; // Enable damping for smoother controls
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 100;
        controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation

        this._composer = new EffectComposer(this._renderer);
    }

    public addWalls = () => {
        const wallGeometry = new THREE.BoxGeometry(2, 1, 0.1);
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x0ff0f0 });
        const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
        wall1.position.set(0, 0.5, -0.5);
        this._scene.add(wall1);
        const wall2 = wall1.clone();
        wall2.position.set(1, 0.5, 1);
        wall2.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 4);
        this._scene.add(wall2);
    };

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

        this._depthRender = new THREE.WebGLRenderTarget(
            this._container.clientWidth,
            this._container.clientHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,

                depthBuffer: true,
                depthTexture: new THREE.DepthTexture(
                    this._container.clientWidth,
                    this._container.clientHeight,
                ),
            },
        );

        this._composer.addPass(new RenderPass(this._scene, this._camera));

        // insert marching pass
        this._marchPass = new MarchPass(this._renderer.getContext());
        this._marchPass.material.uniforms.u_depth.value = this._depthRender.depthTexture;
        this._composer.addPass(this._marchPass);
        this._resize();
        this.addWalls();
        this.startAnimationLoop();

        const gui = new GUI();
        gui.add(this._marchPass, 'enabled').name('March');
        gui.add(this._marchPass, 'maxSteps', 1, 200, 1).name('Steps');
        gui.add(this._marchPass, 'outputType').name('Output Type').options({
            Color: 0,
            Depth: 1,
            Normal: 2,
            Steps: 3,
        });
        const depthFolder = gui.addFolder('Depth Settings');
        const sceneDepthController = depthFolder
            .add(this._marchPass, 'showSceneDepth')
            .name('Scene Depth');
        if (this._marchPass.outputType !== OutputType.DEPTH) sceneDepthController.hide();

        gui.onChange(() => {
            if (this._marchPass?.outputType === 1) {
                sceneDepthController.show();
            } else {
                sceneDepthController.hide();
            }
        });

        gui.open();
        document.body.appendChild(this._stats.dom);
    };

    public dispose = () => {
        this.resize.unsubscribe();
    };

    private _updateMarchMaterial = () => {
        if (this._marchPass) {
            this._marchPass.lightDir.copy(
                (this._light?.position || new THREE.Vector3(0, 1, 0).normalize()).multiplyScalar(
                    -1,
                ),
            );
            this._marchPass.ambientColor.copy(
                this._ambientLight?.color || new THREE.Color(1, 1, 1),
            );
            this._marchPass.ambientIntensity = this._ambientLight?.intensity || 1.0;
            this._marchPass.camPos.copy(this._camera.position);
            this._marchPass.camToWorldMat.copy(this._camera.matrixWorld);
            this._marchPass.camInvProjMat.copy(this._camera.projectionMatrixInverse);
            this._marchPass.resolution.set(
                this._container.clientWidth,
                this._container.clientHeight,
            );
        }
    };

    public render = () => {
        this._stats.begin();
        const elapsedTime = performance.now() * 0.001; // Convert to seconds

        this._camera.position.x = radius * Math.cos(elapsedTime * speed);
        this._camera.position.z = radius * Math.sin(elapsedTime * speed);
        this._camera.lookAt(0, 0, 0); // Ensure the camera always looks at the origin

        this._updateMarchMaterial();
        this._renderer.setRenderTarget(this._depthRender);
        this._renderer.render(this._scene, this._camera);
        this._composer.render();
        this._stats.end();
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
        this._composer.setSize(this._container.clientWidth, this._container.clientHeight);
        this._composer.setPixelRatio(window.devicePixelRatio);

        // Update camera aspect ratio on resize
        this._camera.aspect = this._container.clientWidth / this._container.clientHeight;
        this._camera.updateProjectionMatrix();
    };

    public resize = fromEvent(window, 'resize').pipe(debounceTime(200)).subscribe(this._resize);
}
