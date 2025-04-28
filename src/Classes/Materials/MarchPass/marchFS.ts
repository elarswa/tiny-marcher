export default `
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
    uniform float u_diffIntensity;
    uniform float u_shininess;
    uniform float u_specIntensity;
    uniform vec3 u_specularColor;
    uniform vec3 u_ambientColor;
    uniform float u_ambientIntensity;
    uniform float u_specularIntensity;
    uniform vec3 u_box;
    uniform sampler2D u_image_buffer;
    uniform sampler2D u_depth;

    const int NUM_STEPS = 32;
    const float MIN_DIST = 0.001;
    const float MAX_DIST = 100.0;
    const float EPSILON = 0.0001;


    float boxSDF(vec3 p, vec3 b) {
        vec3 d = abs(p) - b;
        return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
    }

    float sphereSDF(vec3 p, float r) {
        return length(p) - r;
    }

    float repeat(vec3 p, float s) {
        vec3 radius = p - s*round(p/s);
        return sphereSDF(radius, 0.5);
    }

    float sceneSDF(vec3 p) {
        if (length(p) > 10.0) return MAX_DIST + 1.0;
        return repeat(p, 3.0);
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

    // from https://iquilezles.org/articles/normalsSDF/
   vec3 normal(vec3 p) {
        vec3 n = vec3(0, 0, 0);
        vec3 e;
        for(int i = 0; i < 4; i++) {
            e = 0.5773 * (2.0 * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.0);
            n += e * sceneSDF(p + e * EPSILON);
        }
        return normalize(n);
    }

    void main() {
        vec2 uv = vUv;//u_resolution.xy;
        vec3 ray_origin = u_camPos;
        vec3 ray_dir = (u_camInvProjMat * vec4(uv*2.-1., 0, 1)).xyz;
        ray_dir = normalize( (u_camToWorldMat * vec4(ray_dir, 0)).xyz );

        float scene_distance = ray_march(ray_origin, ray_dir);
        vec4 texel = texture2D(u_image_buffer, uv);
        vec4 depth_texel = texture2D(u_depth, uv);

        if (scene_distance > MAX_DIST) {
            gl_FragColor = texel;
            return;
        }
        
        vec3 hit_position = ray_origin + scene_distance * ray_dir;
        vec3 normal_dir = normal(hit_position);

        // float dotNL = dot(normal_dir, u_lightDir);
        // float diff = max(dotNL, 0.0) * u_diffIntensity;
        // float spec = pow(diff, u_shininess) * u_specIntensity;
        // vec3 color = u_diffuse * diff + u_specularColor * spec + u_ambientColor * u_ambientIntensity;
        
        // gl_FragColor = vec4(color, 1.); // color output
        gl_FragColor = vec4(abs( normal_dir ), 1.); // color output
    }
`;
