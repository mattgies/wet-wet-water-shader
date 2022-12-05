
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
	mat4.rotateZ(camTransforms, Math.PI / 12);
	mat4.rotateX(camTransforms, Math.PI / 12);
	mat4.rotateY(camTransforms, rotAmount);
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
	lightPos = vec3.create([0.2, 1.4, -0.4]); // object-space position of the light (converted to cam space in the frag shader)
	gl.uniform3fv(shaderProgram.lightPosUniform, lightPos);
}


function updateTotalTimeElapsedUniform(shaderProgram) {
	gl.uniform1f(shaderProgram.totalTimeElapsedUniform, totalTimeElapsed);
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
var rotSpeed = 0.0002;
var rotAmount = Math.PI / 2;
function tick() {
	requestAnimationFrame(tick);

	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		elapsed = timeNow - lastTime;
		// rotAmount += rotSpeed * elapsed;
		if (rotAmount > Math.PI || rotAmount < Math.PI / 2) {
			rotSpeed = -rotSpeed;
		}
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


function initGL() {
	// initGL is called on page load
	// Initialize the GL context
	canvas = document.querySelector("#glCanvas");
	gl = createGLContext(canvas);
  
	// Only continue if WebGL is available and working
	if (gl === null) {
	  alert(
		"Unable to initialize WebGL. Your browser or machine may not support it."
	  );
	  return;
	}

	gl.enable(gl.DEPTH_TEST);

	basicShaderProgram = gl.createProgram();
	waterShaderProgram = gl.createProgram();

	let vert_shade = `
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

		void main() {			
			vec4 camSpacePos = u_mvMatrix * vec4(a_vCoords, 1.0);
			v_vPos = vec3(camSpacePos);
			gl_Position = u_pMatrix * camSpacePos;
			v_vColor = vec4((a_vNorm), 1.0);
			v_vNorm = normalize(vec3(u_nMatrix * vec4(a_vNorm, 1.0)));
		}
	`;

	let frag_shade = `
		precision mediump float;

		uniform vec3 u_lightPos;
		uniform mat4 u_mvMatrix;

		varying vec4 v_vColor;
		varying vec3 v_vPos;
		varying vec3 v_vNorm;

		void main() {
			vec4 intermed = u_mvMatrix * vec4(u_lightPos, 1.0);
			vec3 camSpaceLightPos = vec3(intermed);

			// basic diffuse shader implementation

			vec3 Kd = vec3(0.15, 0.45, 0.85);
			float I = 0.5;
			float maxDot = max(0.0, dot(v_vNorm, camSpaceLightPos - v_vPos));
			float rSquared = length( camSpaceLightPos - v_vPos ) * length( camSpaceLightPos - v_vPos );

			gl_FragColor = vec4((I / rSquared * maxDot * Kd), 1.0);
		}
	`; 

	createShaderProgram(basicShaderProgram, vert_shade, frag_shade);

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

		void main() {
			float offsetFromX = 0.1 * sin(a_vCoords.x + 0.005 * u_totalTimeElapsed);
			float offsetFromZ = 0.1 * sin(a_vCoords.z + 0.005 * u_totalTimeElapsed);
			vec3 offsetCoords = vec3(a_vCoords.x, a_vCoords.y + offsetFromX + offsetFromZ, a_vCoords.z);

			// hard-coded recalculation for vertex normals based on the partial derivatives of the sine wave
			vec3 alpha = vec3(1.0, 0.2 * cos(a_vCoords.x), 0.0);
			vec3 beta = vec3(0.0, 0.2 * cos(a_vCoords.z), 1.0);
			v_vNorm = normalize(vec3(u_nMatrix * vec4(cross(beta, alpha), 1.0)));
			
			vec4 camSpacePos = u_mvMatrix * vec4(offsetCoords, 1.0);
			v_vPos = vec3(camSpacePos);
			gl_Position = u_pMatrix * camSpacePos;
			v_vColor = vec4((a_vNorm), 1.0);
			// v_vNorm = vec3(u_nMatrix * vec4(a_vNorm, 1.0));
		}
	`;

	createShaderProgram(waterShaderProgram, vert_shade, frag_shade);

	addObjectToDraw(pool_sides_and_bottom, basicShaderProgram);
	addObjectToDraw(one_plane, waterShaderProgram);
	console.log(objsToDraw);

	tick();
  }
