const glsl = (x: any) => String(x);

export default glsl`
    #include <packing>
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
    uniform bool u_showSceneDepth;

    const float MIN_DIST = 0.001;
    const float MAX_DIST = 100.0;
    const float EPSILON = 0.0001;
    const float PI = 3.1415926;
    const float NEAR = 0.1;
    const float FAR = 100.0;
    const float HALF_FOV_RAD = 75.0 * 0.5 * PI / 180.0;

    // #define repeat(p, period) mod(p, period)

    float smin(float a, float b, float blendRadius) {
        float c = clamp(0.5 + (b - a) * (0.5 / blendRadius), 0., 1.);
        return mix(b, a, c) - blendRadius * c * (1.0 - c);
    }

    struct MarchResult {
        float distance;
        vec3 hit_position;
        int steps;
    };

    
    float Normalize_to_range(float target, float low, float high) {
        return (target - low) / (high - low);
    }

    float Remap_from_range_to_range(float target, float old_low, float old_high, float new_low, float new_high) {
        return new_low + (target - old_low) * (new_high - new_low) / (old_high - old_low);
    }

    // put value fromk range [0, 1] to range [NEAR, FAR]
    float Linear_depth(float depth) {
        float z = depth * 2.0 - 1.0; // back to NDC
        return (2.0 * NEAR * FAR) / (FAR + NEAR - z * (FAR - NEAR));
    }

    float Box_sdf(vec3 p, vec3 b) {
        vec3 d = abs(p) - b;
        return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
    }

    float Sphere_sdf(vec3 p, float r) {
        return length(p) - r;
    }

    float XZ_Plane_sdf(vec3 p) {
        return p.y;
    }
    }

    MarchResult Ray_march(in vec3 rayOrigin, in vec3 rayDirection) {
        float total_distance = 0.0;
        vec3 hit_position = vec3(0.0);

        int i = 0;
        for (; i < u_maxSteps; i++) {
            hit_position = rayOrigin + rayDirection * total_distance;
            float dist = Scene_sdf(hit_position) * 0.999;

            if (dist < MIN_DIST ||  dist > MAX_DIST) break;

            total_distance += dist;
        }

        return MarchResult(total_distance, hit_position, i);
    }

    // from https://iquilezles.org/articles/normalsSDF/
   vec3 Normal(vec3 p) {
        vec3 n = vec3(0, 0, 0);
        vec3 e;
        for(int i = 0; i < 4; i++) {
            e = 0.5773 * (2.0 * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.0);
            n += e * Scene_sdf(p + e * EPSILON);
        }
        return normalize(n);
    }

    float readDepth( vec2 coord ) {
        float fragCoordZ = texture2D( u_depth, coord ).x;
        float viewZ = perspectiveDepthToViewZ( fragCoordZ, NEAR, FAR );
        return viewZToOrthographicDepth( viewZ, NEAR, FAR );
    }

    void main() {
        vec2 uv = vUv;//u_resolution.xy;

        vec2 screen_uv_ndc = uv;
        screen_uv_ndc = ( screen_uv_ndc * 2.0 - 1.0 );

        vec3 ray_origin = u_camPos;
        vec3 ray_dir = (u_camInvProjMat * vec4(screen_uv_ndc, 0, 1)).xyz;
        ray_dir = normalize( (u_camToWorldMat * vec4(ray_dir, 0)).xyz );

        MarchResult march = Ray_march(ray_origin, ray_dir);

        float scene_depth = readDepth(uv);
        float march_depth = Normalize_to_range(Remap_from_range_to_range(march.distance, MIN_DIST, MAX_DIST, NEAR, FAR), NEAR, FAR);
        float ray_cosa = normalize(vec3(screen_uv_ndc * tan( HALF_FOV_RAD ), 1.)).z;

        bool draw_raster_scene = (march_depth * ray_cosa) > scene_depth || march.distance > MAX_DIST;
        bool draw_depth = u_outputType == 1 ;


        if ( draw_raster_scene && !draw_depth ) { 
            vec4 texel = texture2D(u_image_buffer, uv);
            gl_FragColor = texel;
            return;
        }

        vec3 normal_dir = Normal(march.hit_position);

        if (u_outputType == 0) {
            float dot_normal_light = dot(normal_dir, u_lightDir);
            float diffuse_intensity = max(dot_normal_light, 0.0) * u_diffIntensity;

            // float spec = pow(diffuse_intensity, u_shininess) * u_specIntensity;
            // vec3 color = u_diffuse * diffuse_intensity + u_specularColor * spec + u_ambientColor * u_ambientIntensity;

            vec3 color = vec3(1.0) * diffuse_intensity + u_ambientColor * u_ambientIntensity;
            gl_FragColor = vec4(color, 1.); // color output
        } else if (u_outputType == 1) {
            if (u_showSceneDepth) {
                gl_FragColor = vec4(vec3(scene_depth), 1.);
           } else {
                vec3 color = vec3(march_depth);
            gl_FragColor = vec4(color, 1.); // depth output
            }
        } else if (u_outputType == 2) {
            gl_FragColor = vec4(abs( normal_dir ), 1.); // normal output
        } else if (u_outputType == 3) {
            float max_steps_f = float(u_maxSteps);
            float input_steps_f = float(march.steps);
            float steps_ratio = input_steps_f / max_steps_f;

            gl_FragColor = vec4(sin(PI * steps_ratio - PI * 0.5), sin(PI * steps_ratio), cos(PI * steps_ratio), 1.0);
        }
    }
`;
