import * as THREE from 'three';

export interface MarchMaterialProps {
    color?: THREE.ColorRepresentation;
    box?: THREE.Vector3;
    camPos?: THREE.Vector3;
    camToWorldMat?: THREE.Matrix4;
    camInvProjMat?: THREE.Matrix4;
    lightDir?: THREE.Vector3;
    lightColor?: THREE.ColorRepresentation;
    time?: number;
    resolution?: THREE.Vector2;
}

const fragment = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec3 u_diffuse;
    varying vec2 vUv;
    varying vec3 vPos;
    uniform vec3 u_camPos;
    uniform mat4 u_camToWorldMat;
    uniform mat4 u_camInvProjMat;
    uniform vec3 u_lightDir;
    uniform vec3 u_lightColor;
    uniform vec3 u_diffIntensity;
    uniform float u_shininess;
    uniform float u_specIntensity;
    uniform vec3 u_specularColor;
    uniform vec3 u_ambientColor;
    uniform float u_ambientIntensity;
    uniform float u_specularIntensity;
    uniform vec3 u_box;

    const int NUM_STEPS = 32;
    const float MIN_DIST = 0.001;
    const float MAX_DIST = 1000.0;

    float boxSDF(vec3 p, vec3 b) {
        // vec3 d = abs(p) - b;
        // return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
        vec3 d = p - u_box; // distance from point to  point
        return length(d) - 1.0; // 1 is radius
    }

    float sceneSDF(vec3 p) {
    // TODO: replace with box from proxy geometry
        float box = boxSDF(p, vec3(1.0));
        return box;
    }

    float ray_march(in vec3 rayOrigin, in vec3 rayDirection) {
        float total_distance = 0.0;
        for (int i = 0; i < NUM_STEPS; i++) {
            vec3 current_position = rayOrigin + rayDirection * total_distance;
            float dist = sceneSDF(current_position);

            if (dist < MIN_DIST ||  dist > MAX_DIST) break;

            total_distance += dist;
        }

        return total_distance;
    }

    void main() {
        // vec2 st = gl_FragCoord.xy / u_resolution;
        vec2 uv = vUv;
        vec3 ro = u_camPos;
        vec3 rd = (u_camInvProjMat * vec4(uv*2.-1., 0, 1)).xyz;
        rd = (u_camToWorldMat * vec4(rd, 0)).xyz;
        rd = normalize(rd);

        float scene_distance = ray_march(ro, rd);

        if (scene_distance > MAX_DIST) {
            discard;
        }
        
        vec3 hit_position = ro + scene_distance * rd;
        
        // Get normal of hit point
        // vec3 n = normalize(hit_position);

        // float dotNL = dot(n, u_lightDir);
        // float diff = max(dotNL, 0.0) * u_diffIntensity;
        // float spec = pow(diff, u_shininess) * u_specIntensity;
        
        gl_FragColor = vec4(u_diffuse,1); // color output
    }
`;

export default class MarchMaterial extends THREE.ShaderMaterial {
    constructor(params: MarchMaterialProps, gl: WebGLRenderingContext) {
        const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragShader) throw new Error(`Cannot compile fragment`);
        gl.shaderSource(fragShader, fragment);
        gl.compileShader(fragShader);

        const success = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);
        if (!success) {
            const error = gl.getShaderInfoLog(fragShader);
            console.error(`Shader compilation failed: ${error}`);
        }
        super({
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2() },
                u_diffuse: { value: new THREE.Color(0xff0000) },
                u_box: { value: new THREE.Vector3(0.1, 0.1, 0.1) },
                u_camPos: { value: new THREE.Vector3() },
                u_camToWorldMat: { value: new THREE.Matrix4() },
                u_camInvProjMat: { value: new THREE.Matrix4() },
                u_lightDir: { value: new THREE.Vector3() },
                u_lightColor: { value: new THREE.Color(0xffffff) },
                u_abientColor: { value: new THREE.Color(0xffffff) },
                u_ambientIntensity: { value: 0.1 },
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPos;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    vPos = gl_Position.xyz;
                }
            `,
            fragmentShader: fragment,
        });
    }

    get color() {
        return this.uniforms.u_diffuse.value;
    }

    set color(color: THREE.Color) {
        this.uniforms.u_diffuse.value = color;
    }

    get time() {
        return this.uniforms.u_time.value;
    }

    set time(time: number) {
        this.uniforms.u_time.value = time;
    }

    get resolution() {
        return this.uniforms.u_resolution.value;
    }

    set resolution(resolution: THREE.Vector2) {
        this.uniforms.u_resolution.value = resolution;
    }

    get box() {
        return this.uniforms.u_box.value;
    }

    set box(box: THREE.Vector3) {
        this.uniforms.u_box.value = box;
    }

    get camPos() {
        return this.uniforms.u_camPos.value;
    }

    set camPos(camPos: THREE.Vector3) {
        this.uniforms.u_camPos.value = camPos;
    }

    get camToWorldMat() {
        return this.uniforms.u_camToWorldMat.value;
    }

    set camToWorldMat(camToWorldMat: THREE.Matrix4) {
        this.uniforms.u_camToWorldMat.value = camToWorldMat;
    }

    get camInvProjMat() {
        return this.uniforms.u_camInvProjMat.value;
    }

    set camInvProjMat(camInvProjMat: THREE.Matrix4) {
        this.uniforms.u_camInvProjMat.value = camInvProjMat;
    }

    get lightDir() {
        return this.uniforms.u_lightDir.value;
    }

    set lightDir(lightDir: THREE.Vector3) {
        this.uniforms.u_lightDir.value = lightDir;
    }

    get lightColor() {
        return this.uniforms.u_lightColor.value;
    }

    set lightColor(lightColor: THREE.Color) {
        this.uniforms.u_lightColor.value = lightColor;
    }
}
