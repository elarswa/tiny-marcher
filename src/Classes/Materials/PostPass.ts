import { FullScreenQuad, Pass } from 'three/examples/jsm/Addons.js';
import {} from 'three/tsl';
import * as THREE from 'three';

export interface PostPassOptions {
    gl: WebGLRenderingContext;
    materialParams: THREE.ShaderMaterialParameters;
}

export default class PostPass extends Pass {
    protected _fsQuad: FullScreenQuad;
    public material: THREE.ShaderMaterial;

    constructor({ gl, materialParams }: PostPassOptions) {
        super();

        this.material = new THREE.ShaderMaterial(materialParams);
        this._fsQuad = new FullScreenQuad(this.material);
    }

    public render(
        renderer: THREE.WebGLRenderer,
        writeBuffer: THREE.WebGLRenderTarget,
        //@ts-ignore
        readBuffer: THREE.WebGLRenderTarget,
    ) {
        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
            this._fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            if (this.clear) renderer.clear();
            this._fsQuad.render(renderer);
        }
    }
}
