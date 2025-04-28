import PostPass from '../PostPass';
import * as THREE from 'three';

const materialParams: THREE.ShaderMaterialParameters = {
    uniforms: {
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 1000.0 },
        tDiffuse: { value: null },
        tDepth: { value: null },
    },
    vertexShader: `
        varying vec2 vUv;
        void main()
        {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        #include <packing>
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uCameraNear;
        uniform float uCameraFar;
        varying vec2 vUv;
        float readDepth(sampler2D depthSampler, vec2 coord) {
            float fragCoordZ = texture2D(depthSampler, coord).x;
            float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
            return viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar);
        }
        void main() {
            vec4 diffuse = texture2D(tDiffuse, vUv);
            float depth = readDepth(tDepth, vUv);
            gl_FragColor = vec4(diffuse.rgb * (1.0 - depth), 1.0);
        }`,
};

export default class DepthPass extends PostPass {
    constructor(gl: WebGLRenderingContext) {
        super({ gl, materialParams });
    }
}
