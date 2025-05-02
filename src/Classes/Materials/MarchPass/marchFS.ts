export default `
    precision mediump float;
    uniform int u_outputType;
    uniform float u_time;
    uniform vec2 u_resolution;
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
    uniform int u_maxSteps;

    const float MIN_DIST = 0.001;
    const float MAX_DIST = 100.0;
    const float EPSILON = 0.0001;

    struct MarchResult {
        float distance;
        int steps;
    };

    
    float normalizeToRange(float target, float low, float high) {
        target = clamp(target, low, high);
        return (target - low) / (high - low);
    }

    float boxSDF(vec3 p, vec3 b) {
        vec3 d = abs(p) - b;
        return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
    }

    float sphereSDF(vec3 p, float r) {
        return length(p) - r;
    }

    float repeat(vec3 p, float s) {
        vec3 radius = p - s*round(p/s);
        // return boxSDF(radius, vec3(0.5));
        return sphereSDF(radius, 0.5);
    }

    float sceneSDF(vec3 p) {
        if (length(p) > 10.0) return MAX_DIST + 1.0;
        return repeat(p, 2.0);
    }

    MarchResult ray_march(in vec3 rayOrigin, in vec3 rayDirection) {
        float total_distance = 0.0;
        int i = 0;
        for (; i < u_maxSteps; i++) {
            vec3 current_position = rayOrigin + rayDirection * total_distance;
            float dist = sceneSDF(current_position);

            if (dist < MIN_DIST ||  dist > MAX_DIST) break;

            total_distance += dist;
        }

        return MarchResult(total_distance, i);
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

        MarchResult march = ray_march(ray_origin, ray_dir);
        vec4 texel = texture2D(u_image_buffer, uv);
        vec4 depth_texel = texture2D(u_depth, uv);

        if (march.distance > MAX_DIST) {
            gl_FragColor = texel;
            gl_FragColor = texel;
            return;
        }

        vec3 hit_position = ray_origin + march.distance * ray_dir;
        vec3 normal_dir = normal(hit_position);

        if (u_outputType == 0) {
            float dotNL = dot(normal_dir, u_lightDir);
            float diffuse_intensity = max(dotNL, 0.0) * u_diffIntensity;

            float spec = pow(diffuse_intensity, u_shininess) * u_specIntensity;
            // vec3 color = u_diffuse * diffuse_intensity + u_specularColor * spec + u_ambientColor * u_ambientIntensity;

            vec3 color = vec3(0.7) * diffuse_intensity + u_ambientColor * u_ambientIntensity;
            gl_FragColor = vec4(color, 1.); // color output
        } else if (u_outputType == 1) {
            vec3 color = vec3(march.distance * .1);
            gl_FragColor = vec4(color, 1.); // depth output
        } else if (u_outputType == 2) {
            gl_FragColor = vec4(abs( normal_dir ), 1.); // normal output
        } else if (u_outputType == 3) {
            float max_steps_f = float(u_maxSteps);
            float third_max_steps_f = max_steps_f / 3.0;
            float two_third_max_steps_f = 2.0 * max_steps_f / 3.0;
            float input_steps_f = float(march.steps);

            // kinda glowy output
            // float low_steps = normalizeToRange(input_steps_f, 0.0, third_max_steps_f);
            // float mid_steps = normalizeToRange(input_steps_f, third_max_steps_f, two_third_max_steps_f);
            // float high_steps = normalizeToRange(input_steps_f, two_third_max_steps_f, max_steps_f);
            // gl_FragColor = vec4(high_steps, mid_steps, low_steps, 1.); // steps as color output

            if (input_steps_f < third_max_steps_f) {
                gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
            } else if (input_steps_f < two_third_max_steps_f) {
                gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
            } else {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
            
        }
    }
`;
