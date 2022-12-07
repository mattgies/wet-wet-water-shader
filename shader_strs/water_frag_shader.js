var water_frag_shader = `
		#extension GL_OES_standard_derivatives : enable // extension enables use of dFdx and dFdy
		precision mediump float;

		uniform vec3 u_lightPos; // light position in world-space coordinates ( needs MV matrix to be converted to cam space)
		uniform mat4 u_mvMatrix;
		uniform mat4 u_nMatrix;
		uniform mat4 u_pMatrix;
		uniform sampler2D u_waterNormalMap;
		uniform float u_totalTimeElapsed;

		varying vec3 v_vPos; // camera-space coordinates for position of the current fragment
		varying vec2 v_vTexCoords1; // (u,v) tex coords which have already been adjusted with rotation and time offset
		varying vec2 v_vTexCoords2;

		void main() {
			vec4 waterSurfaceNorm1 = texture2D(u_waterNormalMap, v_vTexCoords1);
			vec4 waterSurfaceNorm2 = texture2D(u_waterNormalMap, v_vTexCoords2);

			vec4 wSN1CorrectDirs = vec4(waterSurfaceNorm1.r, waterSurfaceNorm1.b, waterSurfaceNorm1.g, 1.0);
			vec4 wSN2CorrectDirs = vec4(waterSurfaceNorm2.r, waterSurfaceNorm2.b, waterSurfaceNorm2.g, 1.0);

			vec4 wSN1CamSpace = u_nMatrix * wSN1CorrectDirs;
			vec4 wSN2CamSpace = u_nMatrix * wSN2CorrectDirs;
			vec3 waterNormalInCamSpace = normalize(vec3(wSN1CamSpace) + vec3(wSN2CamSpace));
			
			vec3 lightPosInCamSpace = vec3(u_mvMatrix * vec4(u_lightPos, 1.0));
			vec3 vi = lightPosInCamSpace - v_vPos;

			// float normalized_n_i_dot = dot(waterNormalInCamSpace / length(waterNormalInCamSpace), vi / length(vi));

			vec4 intermed = u_mvMatrix * vec4(u_lightPos, 1.0);
			vec3 camSpaceLightPos = vec3(intermed);



			vi = camSpaceLightPos - v_vPos;
			float normalized_n_i_dot = dot(waterNormalInCamSpace / length(waterNormalInCamSpace), vi / length(vi));
			float uAmbient = 0.1; // line 141
			vec3 uSpecularColor = vec3(1.0, 1.0, 1.0); // line 140
			vec3 uDiffuseColor = vec3(0.2392, 0.5216, 0.7765); // line 139 in pa2_webgl.js

			float uLightPower = 10.0;
			float uExponent = 50.0;
			
			if (normalized_n_i_dot > 0.0) {
				vec3 normalized_o = - v_vPos / length(v_vPos);
				vec3 normalized_n = waterNormalInCamSpace / length(waterNormalInCamSpace);
				vec3 normalized_i = vi / length(vi);
				vec3 normalized_h = (normalized_i + normalized_o) / length(normalized_i + normalized_o);

				
				float vI = uLightPower / (pow(length(vi),2.0) / 5.0 + 5.0);
				float inner_left_term = vI * normalized_n_i_dot + uAmbient;
				vec3 left_term = inner_left_term * uDiffuseColor;
				float right_term_as_float = vI * pow(dot(normalized_n, normalized_h), uExponent);
				vec3 right_term_as_vec = right_term_as_float * uSpecularColor;
				vec3 three_d_frag_color = left_term + right_term_as_vec;
				gl_FragColor = vec4(three_d_frag_color, 0.7);
			}
			else {
				vec3 three_d_frag_color = uAmbient * uDiffuseColor;
				gl_FragColor = vec4(three_d_frag_color, 0.7);
			}
		}
	`; 