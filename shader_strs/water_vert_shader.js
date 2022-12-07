var water_vert_shader = `
		precision mediump float; // had to add this line because using mvMatrix in the fragment shader caused an error bc of differing precision

		uniform mat4 u_mvMatrix;
		uniform mat4 u_pMatrix;
		uniform mat4 u_nMatrix;
		uniform float u_totalTimeElapsed;
		uniform sampler2D u_waterDispMap;

		attribute vec3 a_vCoords;
		attribute vec2 a_vTexCoords;

		varying vec3 v_vPos;
		varying vec2 v_vTexCoords1;
		varying vec2 v_vTexCoords2;

		void main() {
			// TEXTURE COORDINATES
			v_vTexCoords1 = a_vTexCoords + vec2(u_totalTimeElapsed / 6000.0, 0.0);
			v_vTexCoords2 = a_vTexCoords + vec2(0.0, u_totalTimeElapsed / 12000.0);

			// OFFSET FROM DISPLACMENT MAP
			float dispMapOffset1 = texture2D(u_waterDispMap, v_vTexCoords1).g - 0.5;
			float dispMapOffset2 = texture2D(u_waterDispMap, v_vTexCoords2).g - 0.5;

			// BEGIN TEST
			float dispMapOffset = (dispMapOffset1 + dispMapOffset2) / 15.0;
			// END TEST

			vec4 offsetCoords = vec4(a_vCoords.x, a_vCoords.y + dispMapOffset, a_vCoords.z, 1.0);
			vec4 camSpacePos = u_mvMatrix * offsetCoords;
			v_vPos = vec3(camSpacePos);

			gl_Position = u_pMatrix * camSpacePos;
		}
	`;