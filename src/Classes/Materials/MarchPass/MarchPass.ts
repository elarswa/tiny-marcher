import PostPass from '../PostPass';
import * as THREE from 'three';
import marchFS from './marchFS';
import marchVS from './marchVS';

const materialParams: THREE.ShaderMaterialParameters = {
    uniforms: {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(800, 600) },
        u_box: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        u_camPos: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        u_camToWorldMat: { value: new THREE.Matrix4() },
        u_camInvProjMat: { value: new THREE.Matrix4() },
        u_lightDir: { value: new THREE.Vector3(0.0, 0.0, -1.0) },
        u_lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        u_image_buffer: { value: null },
        u_depth: { value: null },
    },
    vertexShader: marchVS,
    fragmentShader: marchFS,
};

export default class MarchPass extends PostPass {
    constructor(gl: WebGLRenderingContext) {
        super({ gl, materialParams });
    }

    get time(): number {
        return this.material.uniforms.u_time.value;
    }

    set time(value: number) {
        this.material.uniforms.u_time.value = value;
    }

    get resolution(): THREE.Vector2 {
        return this.material.uniforms.u_resolution.value;
    }

    set resolution(value: THREE.Vector2) {
        this.material.uniforms.u_resolution.value = value;
    }

    get box(): THREE.Vector3 {
        return this.material.uniforms.u_box.value;
    }

    set box(value: THREE.Vector3) {
        this.material.uniforms.u_box.value = value;
    }

    get camPos(): THREE.Vector3 {
        return this.material.uniforms.u_camPos.value;
    }

    set camPos(value: THREE.Vector3) {
        this.material.uniforms.u_camPos.value = value;
    }

    get camToWorldMat(): THREE.Matrix4 {
        return this.material.uniforms.u_camToWorldMat.value;
    }

    set camToWorldMat(value: THREE.Matrix4) {
        this.material.uniforms.u_camToWorldMat.value = value;
    }

    get camInvProjMat(): THREE.Matrix4 {
        return this.material.uniforms.u_camInvProjMat.value;
    }

    set camInvProjMat(value: THREE.Matrix4) {
        this.material.uniforms.u_camInvProjMat.value = value;
    }

    get lightDir(): THREE.Vector3 {
        return this.material.uniforms.u_lightDir.value;
    }

    set lightDir(value: THREE.Vector3) {
        this.material.uniforms.u_lightDir.value = value;
    }

    get lightColor(): THREE.Color {
        return this.material.uniforms.u_lightColor.value;
    }

    set lightColor(value: THREE.Color) {
        this.material.uniforms.u_lightColor.value = value;
    }

    public override render(
        renderer: THREE.WebGLRenderer,
        writeBuffer: THREE.WebGLRenderTarget,
        readBuffer: THREE.WebGLRenderTarget,
    ) {
        this.material.uniforms.u_image_buffer.value = readBuffer.texture;
        this.material.uniformsNeedUpdate = true;
        super.render(renderer, writeBuffer, readBuffer);
    }
}
