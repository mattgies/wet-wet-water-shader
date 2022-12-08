var water_frag_shader = `
		#extension GL_OES_standard_derivatives : enable // extension enables use of dFdx and dFdy
		precision mediump float;

		uniform vec3 u_lightPos; // light position in world-space coordinates ( needs MV matrix to be converted to cam space)
		uniform mat4 u_mvMatrix;
		uniform mat4 u_nMatrix;
		uniform sampler2D u_waterNormalMap;
		uniform float u_totalTimeElapsed;
		uniform float u_lightIntensity;

		varying vec3 v_vPos; // camera-space coordinates for position of the current fragment
		varying vec3 v_vPosWorldSpace;
		varying vec2 v_vTexCoords1; // (u,v) tex coords which have already been adjusted with rotation and time offset
		varying vec2 v_vTexCoords2;

		void main() {
			vec4 waterSurfaceNorm1 = texture2D(u_waterNormalMap, v_vTexCoords1); // world-space
			vec4 waterSurfaceNorm2 = texture2D(u_waterNormalMap, v_vTexCoords2); // world-space

			vec4 wSN1CorrectDirs = normalize(vec4(waterSurfaceNorm1.r, waterSurfaceNorm1.b, waterSurfaceNorm1.g, 0.0)); // world-space
			vec4 wSN2CorrectDirs = normalize(vec4(waterSurfaceNorm2.r, waterSurfaceNorm2.b, waterSurfaceNorm2.g, 0.0)); // world-space

			vec3 worldSpaceNormal = normalize(vec3(wSN1CorrectDirs) + vec3(wSN2CorrectDirs));


			vec3 vi = u_lightPos - v_vPosWorldSpace;
			float normalized_n_i_dot = dot(worldSpaceNormal / length(worldSpaceNormal), vi / length(vi));
			float uAmbient = 0.1; // line 141
			vec3 uSpecularColor = vec3(1.0, 1.0, 1.0); // line 140
			vec3 uDiffuseColor = vec3(0.2392, 0.5216, 0.7765); // line 139 in pa2_webgl.js

			float uLightPower = u_lightIntensity * 8.0;
			float uExponent = 50.0;
			
			if (normalized_n_i_dot > 0.0) {
				vec3 normalized_o = - v_vPos / length(v_vPos);
				vec3 normalized_n = worldSpaceNormal / length(worldSpaceNormal);
				vec3 normalized_i = vi / length(vi);
				vec3 normalized_h = (normalized_i + normalized_o) / length(normalized_i + normalized_o);

				
				float vI = uLightPower / (pow(length(vi),2.0) / 5.0 + 5.0);
				float inner_left_term = vI * normalized_n_i_dot + uAmbient;
				vec3 left_term = inner_left_term * uDiffuseColor;
				float right_term_as_float = vI * pow(dot(normalized_n, normalized_h), uExponent);
				vec3 right_term_as_vec = right_term_as_float * uSpecularColor;
				vec3 three_d_frag_color = left_term + right_term_as_vec;
				gl_FragColor = vec4(three_d_frag_color, 0.9);
			}
			else {
				vec3 three_d_frag_color = uAmbient * uDiffuseColor;
				gl_FragColor = vec4(three_d_frag_color, 0.9);
			}
		}
	`; 