
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
	lightPos = vec3.create([0.0, 1.2, 0.0]); // object-space position of the light (converted to cam space in the frag shader)
	gl.uniform3fv(shaderProgram.lightPosUniform, lightPos);
}


function updateTotalTimeElapsedUniform(shaderProgram) {
	gl.uniform1f(shaderProgram.totalTimeElapsedUniform, totalTimeElapsed);
	gl.uniform1f(shaderProgram.IORRatioUniform, IOR_ratio);
}


function setUpShaderAttribs(shaderProgram) {
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "a_vCoords");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "a_vNorm");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
}


function setUpShaderUniforms(shaderProgram) {
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "u_mvMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "u_pMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "u_nMatrix");
	shaderProgram.lightPosUniform = gl.getUniformLocation(shaderProgram, "u_lightPos");
	shaderProgram.totalTimeElapsedUniform = gl.getUniformLocation(shaderProgram, "u_totalTimeElapsed");
	shaderProgram.IORRatioUniform = gl.getUniformLocation(shaderProgram, "u_IOR_ratio");


	setUpMVMatrix(shaderProgram);
	setUpProjMatrix(shaderProgram);
	setUpNMatrix(shaderProgram);
	setUpLightPos(shaderProgram);
	updateTotalTimeElapsedUniform(shaderProgram);
}


function drawScene() {
	gl.clearColor(clearColorR, clearColorG, clearColorB, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	for (obj of objsToDraw) {
		mesh = obj.mesh;
		shaderProgram = obj.shaderProg;
		gl.useProgram(shaderProgram);

		setUpShaderAttribs(shaderProgram);
		setUpShaderUniforms(shaderProgram);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

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


function addObjectToDraw(obj_str, shaderProgram) {
	mesh = new OBJ.Mesh(obj_str);
	OBJ.initMeshBuffers(gl, mesh);
	
	objsToDraw.push({
		"mesh": mesh,
		"shaderProg": shaderProgram
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
		uniform mat4 u_nMatrix;
		uniform mat4 u_pMatrix;
		
		uniform float u_totalTimeElapsed;
		uniform float u_IOR_ratio;

		attribute vec3 a_vCoords;
		attribute vec3 a_vNorm;

		varying vec4 v_vColor;
		varying vec3 v_vPos;
		varying vec3 v_vNorm;
		varying vec3 v_Intersect;

		void main() {			
			vec3 waterPos = vec3(a_vCoords.x, 0.808494, a_vCoords.z);
			
			float offsetFromX = 0.1 * sin(waterPos.x + 0.005 * u_totalTimeElapsed);
			float offsetFromZ = 0.1 * sin(waterPos.z + 0.005 * u_totalTimeElapsed / 1.4);
			vec3 offsetCoords = vec3(waterPos.x, waterPos.y + offsetFromX + offsetFromZ, waterPos.z);

			// hard-coded recalculation for vertex normals based on the partial derivatives of the sine wave
			vec3 alpha = vec3(1.0, 0.1 * cos(waterPos.x + 0.005 * u_totalTimeElapsed), 0.0);
			vec3 beta = vec3(0.0, 0.1 * cos(waterPos.z + 0.005 * u_totalTimeElapsed / 1.4), 1.0);
			v_vNorm = normalize(vec3(u_nMatrix * vec4(cross(beta, alpha), 1.0)));

			vec3 refractRay = refract(normalize(offsetCoords), v_vNorm, u_IOR_ratio);
			float t = -offsetCoords.y / refractRay.y;
			vec3 intersect = offsetCoords + (t * refractRay);

			vec4 v4_Intersect = u_mvMatrix * vec4(intersect, 1.0);
			vec4 camSpacePos = u_mvMatrix * vec4(a_vCoords, 1.0);
			
			v_vPos = vec3(camSpacePos);
			v_Intersect = vec3(u_pMatrix * v4_Intersect); 
			gl_Position = u_pMatrix * camSpacePos;
			v_vColor = vec4((a_vNorm), 1.0);
			v_vNorm = normalize(vec3(u_nMatrix * vec4(a_vNorm, 1.0)));
		}
	`;

	let frag_shade = `
		#extension GL_OES_standard_derivatives : enable
		precision mediump float;

		uniform vec3 u_lightPos;
		uniform mat4 u_mvMatrix;

		varying vec4 v_vColor;
		varying vec3 v_vPos;
		varying vec3 v_vNorm;
		varying vec3 v_Intersect;

		void main() {
			vec4 intermed = u_mvMatrix * vec4(u_lightPos, 1.0);
			vec3 camSpaceLightPos = vec3(intermed);
			float caustic = abs(dFdx(v_vPos.x) * dFdy(v_vPos.z) / (dFdx(v_Intersect.x) * dFdy(v_Intersect.z)));
			// basic diffuse shader implementation

			vec3 Kd = vec3(1.0, 1.0, 1.0);
			float I = 1.0;
			float maxDot = max(0.0, dot(v_vNorm, camSpaceLightPos - v_vPos));
			float rSquared = length( camSpaceLightPos - v_vPos ) * length( camSpaceLightPos - v_vPos );

			gl_FragColor = vec4((I / rSquared * maxDot * Kd), 1.0);
			gl_FragColor = gl_FragColor + caustic;
		}
	`; 

	createShaderProgram(basicShaderProgram, vert_shade, frag_shade);

	// water shader
	vert_shade = `
		precision mediump float; // had to add this line because using mvMatrix in the fragment shader caused an error bc of differing precision

		uniform mat4 u_mvMatrix;
		uniform mat4 u_nMatrix;
		uniform mat4 u_pMatrix;
		
		uniform float u_totalTimeElapsed;

		attribute vec3 a_vCoords;
		attribute vec3 a_vNorm;

		varying vec4 v_vColor;
		varying vec3 v_vPos;
		varying vec3 v_vNorm;

		// TEST
		varying vec3 v_vPosOld;
		// END TEST

		void main() {
			float offsetFromX1 = 0.05 * sin(a_vCoords.x + 0.005 * u_totalTimeElapsed);
			float offsetFromX2 = 0.05 * -sin(a_vCoords.x + 0.007 * u_totalTimeElapsed);

			float offsetFromZ1 = 0.05 * sin(a_vCoords.z + 0.005 * u_totalTimeElapsed / 1.4);
			
			float offsetFromXZ = 0.05 * sin(a_vCoords.x + a_vCoords.z + .003 * u_totalTimeElapsed);

			vec3 offsetCoords = vec3(a_vCoords.x, a_vCoords.y + offsetFromX1 + offsetFromZ1 + offsetFromX2 + offsetFromXZ, a_vCoords.z);

			// hard-coded recalculation for vertex normals based on the partial derivatives of the sine wave
			vec3 alpha = vec3(1.0, 0.05 * cos(a_vCoords.x + 0.005 * u_totalTimeElapsed)
								 - 0.05 * cos(a_vCoords.x + 0.007 * u_totalTimeElapsed) 
								 + 0.05 * cos(a_vCoords.x +  a_vCoords.z + .003 * u_totalTimeElapsed) , 0.0);
			vec3 beta = vec3(0.0, 0.05 * cos(a_vCoords.z + 0.005 * u_totalTimeElapsed / 1.4) 
								+ 0.05 * cos(a_vCoords.x +  a_vCoords.z + .003 * u_totalTimeElapsed)
								, 1.0);
			v_vNorm = normalize(vec3(u_nMatrix * vec4(cross(beta, alpha), 1.0)));
			
			vec4 camSpacePos = u_mvMatrix * vec4(offsetCoords, 1.0);
			v_vPos = vec3(camSpacePos);

			// TEST
			v_vPosOld = vec3(gl_Position);
			// END TEST

			gl_Position = u_pMatrix * camSpacePos;
			v_vColor = vec4((a_vNorm), 1.0);
			// v_vNorm = vec3(u_nMatrix * vec4(a_vNorm, 1.0));
		}
	`;

	// frag_shade = `
	// 	#extension GL_OES_standard_derivatives : enable
	// 	precision mediump float;

	// 	uniform vec3 u_lightPos;
	// 	uniform mat4 u_mvMatrix;

	// 	varying vec4 v_vColor;
	// 	varying vec3 v_vPos;
	// 	varying vec3 v_vNorm;

	// 	// TEST
	// 	varying vec3 v_vPosOld;
	// 	// END TEST

	// 	void main() {
	// 		vec4 intermed = u_mvMatrix * vec4(u_lightPos, 1.0);
	// 		vec3 camSpaceLightPos = vec3(intermed);

	// 		// TEST
	// 		dFdx(1.0);
	// 		// END TEST

	// 		// basic diffuse shader implementation
	// 		vec3 Kd = vec3(0.5, 0.8, 0.9);
	// 		float I = 0.5;
	// 		float maxDot = max(0.0, dot(v_vNorm, normalize(camSpaceLightPos - v_vPos)));
	// 		float rSquared = length( camSpaceLightPos - v_vPos ) * length( camSpaceLightPos - v_vPos );

	// 		gl_FragColor = vec4((I / rSquared * maxDot * Kd), 0.5);
	// 	}
	// `; 




	frag_shade = `
		precision mediump float;

		uniform vec3 u_lightPos;
		uniform mat4 u_mvMatrix;

		varying vec4 v_vColor;
		varying vec3 v_vPos;
		varying vec3 v_vNorm;

		void main() {
			vec3 vi = u_lightPos - v_vPos;
			float normalized_n_i_dot = dot(v_vNorm / length(v_vNorm), vi / length(vi));

			if (normalized_n_i_dot > 0.0) {
				vec3 normalized_o = - v_vPos / length(v_vPos);
				vec3 normalized_n = v_vNorm / length(v_vNorm);
				vec3 normalized_i = vi / length(vi);
				vec3 normalized_h = (normalized_i + normalized_o) / length(normalized_i + normalized_o);

				float I = 20.0;
				float vI = I / (pow(length(vi),2.0) / 5.0 + 5.0);
				float uBeta = 0.2; // line 106 of pa2_webgl.js
				float uIOR = 5.0; // line 105 of pa2_webgl.js
				float uAmbient = 0.1; // line 141 of pa2_webgl.js
				vec3 uDiffuseColor = vec3(0.0/255.0, 109.0/255.0, 143.0/255.0);
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
				gl_FragColor = vec4(three_d_frag_color, 0.8);
			}
			else {
				float uAmbient = 0.1; // line 141 of pa2_webgl.js
				vec3 uDiffuseColor = vec3(200/255, 109/255, 143/255);
				vec3 three_d_frag_color = uAmbient * uDiffuseColor;
            	gl_FragColor = vec4(three_d_frag_color, 0.7);
			}
		}
	`; 

	createShaderProgram(waterShaderProgram, vert_shade, frag_shade);

	addObjectToDraw(pool_sides_and_bottom, basicShaderProgram);
	addObjectToDraw(one_plane, waterShaderProgram);

	tick();
  }
