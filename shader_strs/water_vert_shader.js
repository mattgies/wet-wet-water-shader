var water_vert_shader = `
		precision mediump float; // had to add this line because using mvMatrix in the fragment shader caused an error bc of differing precision

		uniform mat4 u_mvMatrix;
		uniform mat4 u_pMatrix;
		uniform sampler2D u_waterDispMap;
		uniform float u_totalTimeElapsed;
		uniform float u_waterSurfaceDisplacementIntensity;
		uniform float u_waterTexCoordScale;

		attribute vec3 a_vCoords;
		attribute vec2 a_vTexCoords;

		varying vec3 v_vPosWorldSpace;
		varying vec2 v_vTexCoords1;
		varying vec2 v_vTexCoords2;

		void main() {
			// TEXTURE COORDINATES
			v_vTexCoords1 = 0.2 * u_waterTexCoordScale * (a_vTexCoords + vec2(u_totalTimeElapsed / 6000.0, 0.0));
			v_vTexCoords2 = u_waterTexCoordScale * (a_vTexCoords + vec2(0.0, u_totalTimeElapsed / 12000.0));

			// OFFSET FROM DISPLACMENT MAP
			float dispMapOffset1 = 2. * texture2D(u_waterDispMap, v_vTexCoords1).g - 0.5;
			float dispMapOffset2 = texture2D(u_waterDispMap, v_vTexCoords2).g - 0.5;

			float yDisplacement = (dispMapOffset1 + dispMapOffset2);

			vec4 offsetCoords = vec4(a_vCoords.x, a_vCoords.y + u_waterSurfaceDisplacementIntensity * yDisplacement, a_vCoords.z, 1.0);
			vec4 camSpacePos = u_mvMatrix * offsetCoords;
			v_vPosWorldSpace = vec3(offsetCoords);

			gl_Position = u_pMatrix * camSpacePos;
		}
	`;