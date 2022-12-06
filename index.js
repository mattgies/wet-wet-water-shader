
var gl;
var canvas;
var basicShaderProgram;
var waterShaderProgram;

var vertexPositionBuffer;
var vertexColorBuffer;

var objsToDraw = []; // collection of OBJ.Mesh objects with initialized buffers which can be used to draw
var mesh;
var mvMatrix; // model-view matrix
var nMatrix; // normal matrix
var projMatrix; // projection matrix for MVP transformations
var lightPos; // position of the light, used as a uniform for shader calculations
var totalTimeElapsed = 0; // used for animation of the waves within the vertex shader, so animation speed is consistent regardless of the amt of time for frame draw
var IOR_ratio = 1.0 / 1.33;

function createShaderProgram(shaderProgram, vShaderStr, fShaderStr) { // modify parameters if make multiple shaders
	// create and compile vertex shader
	var vShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vShader, vShaderStr);
	gl.compileShader(vShader);

	// validate vertex shader complication
	if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vShader));
		return;
	}

	// create and compile fragment shader
	var fShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fShader, fShaderStr);
	gl.compileShader(fShader);

	// validate fragment shader compilation
	if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fShader));
		return;
	}

	// create shader program & attach vert + frag shaders
	gl.attachShader(shaderProgram, vShader);
	gl.attachShader(shaderProgram, fShader);
	gl.linkProgram(shaderProgram);

	// validate successful linkage of shader program with shaders
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
		return;
	}
	gl.validateProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
		console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
		return;
	}
}


function createGLContext(canvas) {
	var names = ["webgl", "experimental-webgl"];
	var context = null;
	for (var i=0; i < names.length; i++) {
	  try {
		context = canvas.getContext(names[i]);
	  } catch(e) {}
	  if (context) {
		break;
	  }
	}
	if (context) {
	  context.viewportWidth = canvas.width;
	  context.viewportHeight = canvas.height;
	} else {
	  alert("Failed to create WebGL context!");
	}
	return context;
  }


function setUpMVMatrix(shaderProgram) {
	// uses inverse of the camera's transformations to set up the mvMatrix
	// that way, all objects get transformed into camera space with the mvMatrix
	// camera space = (cam at (0, 0, 0) facing down -Z axis)
	let camTransforms = mat4.create();
	mat4.identity(camTransforms);
	mat4.rotateZ(camTransforms, rotAmountXZ);
	mat4.rotateX(camTransforms, rotAmountXZ);
	mat4.rotateY(camTransforms, rotAmountY);
	mat4.translate(camTransforms, [0.0, 0.2, 6.0]);

	mvMatrix = mat4.inverse(camTransforms);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function setUpProjMatrix(shaderProgram) {
	projMatrix = mat4.create();
	mat4.identity(projMatrix);
	mat4.perspective(36, gl.viewportWidth / gl.viewportHeight, 0.1, 1000, projMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projMatrix);
}


function setUpNMatrix(shaderProgram) {
	nMatrix = mat4.inverse(mvMatrix);
	mat4.transpose(nMatrix);
	gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


function setUpLightPos(shaderProgram) {
	lightPos = vec3.create([0.0, 10.0, 0.0]); // object-space position of the light (converted to cam space in the frag shader)
	gl.uniform3fv(shaderProgram.lightPosUniform, lightPos);
}


function updateTotalTimeElapsedUniform(shaderProgram) {
	gl.uniform1f(shaderProgram.totalTimeElapsedUniform, totalTimeElapsed);
	gl.uniform1f(shaderProgram.IORRatioUniform, IOR_ratio);
}


var textures = [];
function setUpWaterNormalMap(shaderProgram) {
	image_ids = ["water_normal_map", "water_displacement_map"]
	
	for (image_id of image_ids) {
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.texImage2D(
			gl.TEXTURE_2D, // TARGET = texture type
			0, // LEVEL = lod
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			document.getElementById(image_id)
		);

		textures.push(texture);
	}

	gl.uniform1i(shaderProgram.waterNormalMapUniform, 0);
	gl.uniform1i(shaderProgram.waterDispMapUniform, 1);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textures[1]);
}


function setUpShaderAttribs(shaderProgram) {
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "a_vCoords");
	if (shaderProgram.vertexPositionAttribute != -1) {
		gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	}
	
	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "a_vNorm");
	if (shaderProgram.vertexNormalAttribute != -1) {
		gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
	}

	shaderProgram.vertexTextureAttribute = gl.getAttribLocation(shaderProgram, "a_vTexCoords");
	if (shaderProgram.vertexTextureAttribute != -1) {
		gl.enableVertexAttribArray(shaderProgram.vertexTextureAttribute);
	}
}


function setUpShaderUniforms(shaderProgram) {
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "u_mvMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "u_pMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "u_nMatrix");
	shaderProgram.lightPosUniform = gl.getUniformLocation(shaderProgram, "u_lightPos");
	shaderProgram.totalTimeElapsedUniform = gl.getUniformLocation(shaderProgram, "u_totalTimeElapsed");
	shaderProgram.waterNormalMapUniform = gl.getUniformLocation(shaderProgram, "u_waterNormalMap");
	shaderProgram.waterDispMapUniform = gl.getUniformLocation(shaderProgram, "u_waterDispMap");

	if (shaderProgram.mvMatrixUniform != -1) {
		setUpMVMatrix(shaderProgram);
	}
	if (shaderProgram.pMatrixUniform != -1) {
		setUpProjMatrix(shaderProgram);
	}
	if (shaderProgram.nMatrixUniform != -1) {
		setUpNMatrix(shaderProgram);
	}
	if (shaderProgram.lightPosUniform != -1) {
		setUpLightPos(shaderProgram);
	}
	if (shaderProgram.totalTimeElapsedUniform != -1) {
		updateTotalTimeElapsedUniform(shaderProgram);
	}
	if (shaderProgram.waterNormalMapUniform != -1 && shaderProgram.waterDispMapUniform != -1) {
		setUpWaterNormalMap(shaderProgram);
	}
}


function drawScene() {
	gl.clearColor(clearColorR, clearColorG, clearColorB, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	for (obj of objsToDraw) {
		mesh = obj.mesh;
		shaderProgram = obj.shaderProg;
		usesNorms = obj.usesNorms;
		gl.useProgram(shaderProgram);

		setUpShaderAttribs(shaderProgram);
		setUpShaderUniforms(shaderProgram);

		
		if (usesNorms) {
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, mesh.textureBuffer.itemSize /* 2 */, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

		gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
}


var clearColorR = 0.35;
var clearColorG = 0.5;
var clearColorB = 0.7;
var lastTime = 0;
var elapsed;
var rotSpeed = 0.0005;
var rotAmountY = 3 * Math.PI / 4;
var rotAmountXZ = Math.PI / 12;
function tick() {
	requestAnimationFrame(tick);

	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		elapsed = timeNow - lastTime;
		// rotAmountY += rotSpeed * elapsed;
		// if (rotAmountY > Math.PI && rotSpeed > 0 || rotAmountY < Math.PI / 2 && rotSpeed < 0) {
		// 	rotSpeed = -rotSpeed;
		// }
		totalTimeElapsed += elapsed; // defined in the vars section at the very top of this index.js file
	}
	lastTime = timeNow;

	drawScene();
}


function addObjectToDraw(obj_str, shaderProgram, uses_norms) {
	mesh = new OBJ.Mesh(obj_str);
	OBJ.initMeshBuffers(gl, mesh);
	
	objsToDraw.push({
		"mesh": mesh,
		"shaderProg": shaderProgram,
		"usesNorms": uses_norms
	});
}



// CAMERA ROTATION VIA MOUSE CLICK AND DRAG
var dragging = false;
var lastPosX;
var lastPosY;
function mouseDown() {
	dragging = true;
	lastPosX = null;
	lastPosY = null;
}


function mouseUp() {
	dragging = false;
}


function mouseMove(event) {
	if (dragging) {
		let rect = event.target.getBoundingClientRect();
		if (lastPosX != null) {
			rotX = event.pageX - rect.x - lastPosX;
			rotAmountY -= rotX / 200;
		}
		if (lastPosY != null) {
			rotY = event.pageY - rect.y - lastPosY;
			rotAmountXZ += rotY / 400;
		}
		lastPosX = event.pageX - rect.x;
		lastPosY = event.pageY - rect.y;
	}
}


function initGL() {
	// initGL is called on page load
	// Initialize the GL context
	canvas = document.querySelector("#glCanvas");
	canvas.onmousedown = mouseDown;
	canvas.onmouseup = mouseUp;
	canvas.onmouseout = mouseUp;
	canvas.onmousemove = mouseMove;


	gl = createGLContext(canvas);
  
	// Only continue if WebGL is available and working
	if (gl === null) {
	  alert(
		"Unable to initialize WebGL. Your browser or machine may not support it."
	  );
	  return;
	}

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	var ext = gl.getExtension("OES_standard_derivatives");
	if (!ext) {
	alert("this machine or browser does not support OES_texture_float");
	}

	basicShaderProgram = gl.createProgram();
	waterShaderProgram = gl.createProgram();

	// ground shader
	let vert_shade = `
		precision mediump float; // had to add this line because using mvMatrix in the fragment shader caused an error bc of differing precision

		uniform mat4 u_mvMatrix;
		uniform mat4 u_pMatrix;
		uniform mat4 u_nMatrix;
		uniform float u_totalTimeElapsed;
		uniform vec3 u_lightPos;

		uniform sampler2D u_waterNormalMap;
		uniform sampler2D u_waterDispMap; 

		attribute vec3 a_vCoords;
		attribute vec2 a_vTexCoords;

		varying vec3 v_vPos;
		varying vec2 v_vTexCoords;
		varying vec3 v_newIntersect;
		varying vec3 v_oldIntersect;

		void main() {	
			vec2 texCoordsWithTimeOffset = a_vTexCoords + vec2(u_totalTimeElapsed / 4500.0, u_totalTimeElapsed / 4500.0);
			vec2 vTexCoords = texCoordsWithTimeOffset;

			vec3 oldlightDirection = vec3(a_vCoords.x, 0.808494 - (-0.368807), a_vCoords.z) - u_lightPos; // light direction
			vec3 newlightDirection = vec3(a_vCoords.x, 0.808494 - (-0.368807) + texture2D(u_waterDispMap, vTexCoords).g, a_vCoords.z) - u_lightPos;
			// texture2D(u_waterNormalMap, vTexCoords) gives the normal at v_vTexCoords as vec4
			// 0.808494 - (-0.368807)
			
			vec3 oldRefractRay = refract(normalize(oldlightDirection), vec3(0.0, 1.0, 0.0), 1.0 / 1.33);
			// vec3 oldRefractRay = refract(normalize(a_vCoords + vec3(0.0, .808494 - a_vCoords.y, 0.0)), vec3(0.0, 1.0, 0.0), 1.0 / 1.33);
			float oldt = (0.808494 - (-0.368807)) / oldRefractRay.y;
			vec3 oldIntersect = vec3(a_vCoords.x, 0.808494 - (-0.368807), a_vCoords.z) + (oldt * oldRefractRay);

			vec3 newNormal = vec3(texture2D(u_waterNormalMap, vTexCoords));
			if (dot(newlightDirection, newNormal) < 0.0) {
				newNormal = -1.0 * newNormal;
			}
			
			vec3 newRefractRay = refract(normalize(newlightDirection), vec3(texture2D(u_waterNormalMap, vTexCoords)), 1.0 / 1.33);
			// vec3 newRefractRay = refract(normalize(vec3(a_vCoords.x, 0.808494 - (-0.368807) + texture2D(u_waterDispMap, vTexCoords).g, a_vCoords.z)), vec3(texture2D(u_waterNormalMap, vTexCoords)), 1.0 / 1.33);
			float newt = (0.808494 - (-0.368807) + texture2D(u_waterDispMap, vTexCoords).g) / newRefractRay.y;

			vec3 newIntersect = vec3(a_vCoords.x, 															
									 0.808494 - (-0.368807) + texture2D(u_waterDispMap, vTexCoords).g, 	
									 a_vCoords.z) + (newt * newRefractRay);									

			vec4 transformed_oldInt = u_mvMatrix * vec4(oldIntersect, 1.0);
			vec4 transformed_newInt = u_mvMatrix * vec4(newIntersect, 1.0);
			
			v_oldIntersect = vec3(u_pMatrix * transformed_oldInt);
			v_newIntersect = vec3(u_pMatrix * transformed_newInt);

			vec4 camSpacePos = u_mvMatrix * vec4(a_vCoords, 1.0);
			v_vPos = vec3(camSpacePos);
			gl_Position = u_pMatrix * camSpacePos;

			v_vTexCoords = texCoordsWithTimeOffset;
		}
	`;

	let frag_shade = `
		#extension GL_OES_standard_derivatives : enable // extension enables use of dFdx and dFdy

		precision mediump float;

		uniform vec3 u_lightPos;
		uniform mat4 u_mvMatrix;
		uniform mat4 u_nMatrix;
		uniform mat4 u_pMatrix;
		uniform float u_totalTimeElapsed;
		uniform sampler2D u_waterNormalMap;
		uniform sampler2D u_waterDispMap;

		varying vec3 v_vPos; // camera-space pos of the fragment, interpolated from cam-space vert positions
		varying vec2 v_vTexCoords;

		varying vec3 v_newIntersect;
		varying vec3 v_oldIntersect;

		void main() {
			vec4 intermed = u_mvMatrix * vec4(u_lightPos, 1.0);
			vec3 camSpaceLightPos = vec3(intermed);

			// basic diffuse shader implementation

			vec3 Kd = vec3(1.0, 1.0, 1.0);
			float I = 1.0;
			float maxDot = max(0.0, dot(v_vNorm, camSpaceLightPos - v_vPos));
			float rSquared = length( camSpaceLightPos - v_vPos ) * length( camSpaceLightPos - v_vPos );

			gl_FragColor = vec4((I / rSquared * maxDot * Kd), 1.0);
		}
	`; 

	createShaderProgram(basicShaderProgram, vert_shade, frag_shade);

	// water shader
	vert_shade = `
		precision mediump float; // had to add this line because using mvMatrix in the fragment shader caused an error bc of differing precision

		uniform mat4 u_mvMatrix;
		uniform mat4 u_pMatrix;
		uniform mat4 u_nMatrix;
		uniform float u_totalTimeElapsed;
		uniform sampler2D u_waterDispMap;

		attribute vec3 a_vCoords;
		attribute vec2 a_vTexCoords;

		varying vec3 v_vPos;
		varying vec2 v_vTexCoords;

		void main() {
			// TEXTURE COORDINATES
			vec2 texCoordsWithTimeOffset = a_vTexCoords + vec2(u_totalTimeElapsed / 4500.0, u_totalTimeElapsed / 4500.0);
			v_vTexCoords = texCoordsWithTimeOffset;

			// OFFSET FROM DISPLACMENT MAP
			vec4 dispMapOffset = texture2D(u_waterDispMap, texCoordsWithTimeOffset);
			vec4 offsetCoords = vec4(a_vCoords.x, a_vCoords.y + 0.5 * dispMapOffset.y, a_vCoords.z, 1.0);
			vec4 camSpacePos = u_mvMatrix * offsetCoords;
			v_vPos = vec3(camSpacePos);

			gl_Position = u_pMatrix * camSpacePos;
		}
	`;


	frag_shade = `
		#extension GL_OES_standard_derivatives : enable // extension enables use of dFdx and dFdy
		precision mediump float;

		uniform vec3 u_lightPos; // light position in world-space coordinates ( needs MV matrix to be converted to cam space)
		uniform mat4 u_mvMatrix;
		uniform mat4 u_nMatrix;
		uniform mat4 u_pMatrix;
		uniform sampler2D u_waterNormalMap;
		uniform sampler2D u_waterDispMap;
		uniform float u_totalTimeElapsed;

		varying vec3 v_vPos; // camera-space coordinates for position of the current fragment
		varying vec2 v_vTexCoords; // (u,v) tex coords which have already been adjusted with rotation and time offset

		void main() {
			vec3 waterSurfaceNormal = normalize(vec3(u_nMatrix * texture2D(u_waterNormalMap, v_vTexCoords))); // this assumes that the normal map texture has 1.0 opacity (so that the w value is 1.0 for when it's multiplied by the normal matrix)
			
			vec3 lightPosInCamSpace = vec3(u_mvMatrix * vec4(u_lightPos, 1.0));
			vec3 vi = lightPosInCamSpace - v_vPos;

			float normalized_n_i_dot = dot(waterSurfaceNormal / length(waterSurfaceNormal), vi / length(vi));

			if (normalized_n_i_dot > 0.0) {
				vec3 normalized_o = - v_vPos / length(v_vPos);
				vec3 normalized_n = waterSurfaceNormal / length(waterSurfaceNormal);
				vec3 normalized_i = vi / length(vi);
				vec3 normalized_h = (normalized_i + normalized_o) / length(normalized_i + normalized_o);

				float I = 50.0;
				float vI = I / (pow(length(vi),2.0) / 5.0 + 5.0);
				float uBeta = 0.2; // line 106 of pa2_webgl.js
				float uIOR = 1.0; // line 105 of pa2_webgl.js
				float uAmbient = 0.2; // line 141 of pa2_webgl.js
				vec3 uDiffuseColor = vec3(0.0/255.0, 85.0/255.0, 102.0/255.0);
				vec3 uSpecularColor = vec3(1.0, 1.0, 1.0);

				// F(i,h)
				// Fresnel factor calculation
				float ff_c = dot(normalized_i, normalized_h);
				float ff_g = sqrt(pow(uIOR, 2.0) - 1.0 + pow(ff_c, 2.0));
				float ff_left_term = 0.5 * pow((ff_g - ff_c), 2.0) / pow((ff_g + ff_c), 2.0);
				float ff_right_term = 1.0 + pow(((ff_c * (ff_g + ff_c) - 1.0) / (ff_c * (ff_g - ff_c) + 1.0)), 2.0);
				float ff = ff_left_term * ff_right_term;

				// D(h)
				// GGX normal distribution function
				float PI = 3.1415926535897932384626433832795;
				float theta_h = acos(dot(normalized_n, normalized_h)); // angle between n and h; we know normalized_n and normalized_h are both mag 1
				float d_numerator = pow(uBeta, 2.0);
				float d_denom = PI * pow(cos(theta_h), 4.0) * pow((pow(uBeta, 2.0) + pow(tan(theta_h), 2.0)), 2.0);
				float d = d_numerator / d_denom;

				// G(i, o, h)
				// shadow-masking function of the GGX distribution
				float theta_i = acos(dot(normalized_n, normalized_i));
				float G1_i_h = 2.0 / (1.0 + sqrt(1.0 + pow(uBeta, 2.0) * pow(tan(theta_i), 2.0)));
				float theta_o = acos(dot(normalized_n, normalized_o));
				float G1_o_h = 2.0 / (1.0 + sqrt(1.0 + pow(uBeta, 2.0) * pow(tan(theta_o), 2.0)));
				float g_i_o_h = G1_i_h * G1_o_h;

				float left_outer = vI * normalized_n_i_dot;
				float left_inner_numerator = ff * d * g_i_o_h;
				float left_inner_denom = 4.0 * dot(normalized_n, normalized_i) * dot(normalized_n, normalized_o);
				vec3 left_inner = uDiffuseColor + left_inner_numerator / left_inner_denom * uSpecularColor;
				vec3 left_term = left_outer * left_inner;
				
				vec3 right_term = uAmbient * uDiffuseColor;
				vec3 three_d_frag_color = left_term + right_term;
				gl_FragColor = vec4(three_d_frag_color, 0.7);
			}
			else {
				float uAmbient = 0.1; // line 141 of pa2_webgl.js
				vec3 uDiffuseColor = vec3(0.0/255.0, 85.0/255.0, 102.0/255.0);
				vec3 three_d_frag_color = uAmbient * uDiffuseColor;
            	gl_FragColor = vec4(three_d_frag_color, 0.7);
			}
		}
	`; 

	createShaderProgram(waterShaderProgram, vert_shade, frag_shade);

	addObjectToDraw(pool_sides_and_bottom, basicShaderProgram, false);
	addObjectToDraw(one_plane, waterShaderProgram, true);

	tick();
  }
