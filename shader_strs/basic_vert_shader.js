var basic_vert_shader = `
		precision mediump float; // had to add this line because using mvMatrix in the fragment shader caused an error bc of differing precision

		uniform mat4 u_mvMatrix;
		uniform mat4 u_pMatrix;
		uniform mat4 u_nMatrix;
		uniform float u_totalTimeElapsed;
		uniform vec3 u_lightPos;

		uniform sampler2D u_waterDispMap;
		uniform sampler2D u_groundDispMap;
		uniform float u_waterTexCoordScale;
		uniform float u_groundTexCoordScale;


		attribute vec3 a_vCoords;
		attribute vec2 a_vTexCoords;

		varying vec3 v_vPosWorldSpace;
		varying vec3 v_vPos;
		varying vec2 v_vTexCoordsOriginal;
		varying vec2 v_vTexCoords1;
		varying vec2 v_vTexCoords2;

		void main() {
			// SET VARYING VALS
			vec4 camSpacePos = u_mvMatrix * vec4(a_vCoords, 1.0);

			v_vPosWorldSpace = a_vCoords;
			v_vPos = vec3(camSpacePos);
			v_vTexCoordsOriginal = u_groundTexCoordScale * a_vTexCoords;
			v_vTexCoords1 = 0.2 * u_waterTexCoordScale * (a_vTexCoords + vec2(u_totalTimeElapsed / 6000.0, 0.0));
			v_vTexCoords2 = u_waterTexCoordScale * (a_vTexCoords + vec2(0.0, u_totalTimeElapsed / 12000.0));

			float yDisplacement = (texture2D(u_groundDispMap, v_vTexCoordsOriginal).g - 0.5);
			camSpacePos = u_mvMatrix * vec4(a_vCoords.x, a_vCoords.y + 0.05 * yDisplacement, a_vCoords.z, 1.0);
			gl_Position = u_pMatrix * camSpacePos;
		}
	`;