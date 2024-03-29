var basic_frag_shader = `
		#extension GL_OES_standard_derivatives : enable // extension enables use of dFdx and dFdy

		precision mediump float;

		uniform vec3 u_lightPos;
		uniform mat4 u_mvMatrix;
		uniform float u_lightIntensity;
		uniform float u_causticsIntensity;
		uniform sampler2D u_waterNormalMap;
		uniform sampler2D u_waterDispMap;
        uniform sampler2D u_groundColorMap;
		uniform float u_waterSurfaceDisplacementIntensity;

		varying vec3 v_vPosWorldSpace;
		varying vec2 v_vTexCoordsOriginal;
        varying vec2 v_vTexCoords1;
		varying vec2 v_vTexCoords2;

		void main() {
			// SET UP VARIABLES
			float dispMapOffset1 = 2. * texture2D(u_waterDispMap, v_vTexCoords1).g - 0.5;
			float dispMapOffset2 = texture2D(u_waterDispMap, v_vTexCoords2).g - 0.5;

			float yDisplacement = (dispMapOffset1 + dispMapOffset2) * u_waterSurfaceDisplacementIntensity;
			float waterSurfaceYCoord = 0.808494;
			float groundPlaneYCoord = -0.368807;
			float yDistFlatWaterToGround = waterSurfaceYCoord - groundPlaneYCoord;

			vec4 waterSurfaceNorm1 = texture2D(u_waterNormalMap, v_vTexCoords1);
			vec4 waterSurfaceNorm2 = texture2D(u_waterNormalMap, v_vTexCoords2);

			vec3 wSN1CorrectDirs = normalize(waterSurfaceNorm1.rbg - vec3(0.5));
			vec3 wSN2CorrectDirs = normalize(waterSurfaceNorm2.rbg - vec3(0.5));

			vec3 waterNormal = normalize(wSN1CorrectDirs + wSN2CorrectDirs);


			// CALCULATE INTERSECTIONS
			vec3 oldlightDirection = normalize(vec3(v_vPosWorldSpace.x, yDistFlatWaterToGround, v_vPosWorldSpace.z) - u_lightPos);
			vec3 newlightDirection = normalize(vec3(v_vPosWorldSpace.x, yDistFlatWaterToGround + yDisplacement, v_vPosWorldSpace.z) - u_lightPos);

			vec3 oldRefractRay = refract(normalize(oldlightDirection), vec3(0.0, 1.0, 0.0), 1.0 / 1.33);
			float oldt = (yDistFlatWaterToGround) / oldRefractRay.y;
			vec3 oldIntersect = vec3(v_vPosWorldSpace.x, yDistFlatWaterToGround, v_vPosWorldSpace.z) + (oldt * oldRefractRay);

			vec3 newRefractRay = refract(normalize(newlightDirection), waterNormal, 1.0 / 1.33);
			float newt = (yDistFlatWaterToGround + yDisplacement) / newRefractRay.y;

			vec3 newIntersect = vec3(v_vPosWorldSpace.x, 															
									 yDistFlatWaterToGround + yDisplacement, 	
									 v_vPosWorldSpace.z) + (newt * newRefractRay);									

			vec4 transformed_oldInt = u_mvMatrix * vec4(oldIntersect, 1.0);
			vec4 transformed_newInt = u_mvMatrix * vec4(newIntersect, 1.0);

			float oldArea = length(dFdx(transformed_oldInt)) * length(dFdy(transformed_oldInt));
			float newArea = length(dFdx(transformed_newInt)) * length(dFdy(transformed_newInt));
			float caustic = oldArea / newArea;
			
			vec3 Kd = vec3(12.0/255.0, 103.0/255.0, 167.0/255.0);
			float I = u_lightIntensity * 8.0;
			float maxDot = max(0.0, dot(vec3(0.0, 1.0, 0.0), normalize(u_lightPos - v_vPosWorldSpace)));
			float r = length(newIntersect - vec3(v_vPosWorldSpace.x, yDistFlatWaterToGround + yDisplacement, v_vPosWorldSpace.z)) + length(u_lightPos - vec3(v_vPosWorldSpace.x, yDistFlatWaterToGround + yDisplacement, v_vPosWorldSpace.z));
			float rSquared = r * r;
            
            gl_FragColor = 1.4 * texture2D(u_groundColorMap, v_vTexCoordsOriginal);
			gl_FragColor = gl_FragColor * vec4((I / rSquared * maxDot * Kd), 1.0); // multiplicative blending between base colors
			gl_FragColor = gl_FragColor + u_causticsIntensity * 1. / rSquared * u_lightIntensity * caustic; // additive blending between base colors + white highlights from 
			
		}
	`; 