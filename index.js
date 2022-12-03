var gl;
var canvas;
var shaderProgram;

var vertexPositionBuffer;
var vertexColorBuffer;

var objsToDraw; // collection of OBJ.Mesh objects with initialized buffers which can be used to draw
var mesh;
var mvMatrix; // model-view matrix
var nMatrix; // normal matrix
var projMatrix; // projection matrix for MVP transformations
var lightPos; // position of the light, used as a uniform for shader calculations


function createShaders() { // modify parameters if make multiple shaders
	let vert_shade = `
		uniform mat4 u_mvMatrix;
		uniform mat4 u_nMatrix;
		uniform mat4 u_pMatrix;

		attribute vec3 a_vCoords;
		attribute vec3 a_vNorm;

		varying vec4 v_vColor;
		varying vec3 v_vPos;
		varying vec3 v_vNorm;

		void main() {
			vec4 camSpacePos = u_mvMatrix * vec4(a_vCoords, 1.0) ;
			v_vPos = vec3(camSpacePos);
			gl_Position = u_pMatrix * camSpacePos;
			v_vColor = vec4((a_vNorm), 1.0);
			v_vNorm = vec3(u_nMatrix * vec4(a_vNorm, 1.0));
		}
	`;

	let frag_shade = `
		precision mediump float;

		uniform vec3 u_lightPos;

		varying vec4 v_vColor;
		varying vec3 v_vPos;
		varying vec3 v_vNorm;

		void main() {
			// basic diffuse shader implementation
			vec3 Kd = vec3(0.15, 0.95, 0.6);
			float I = 5.0;
			float maxDot = max(0.0, dot(v_vNorm, u_lightPos - v_vPos));
			float rSquared = length( u_lightPos - v_vPos ) * length( u_lightPos - v_vPos );

			gl_FragColor = vec4((I / rSquared * maxDot * Kd), 1.0);
		}
	`; 

	// create and compile vertex shader
	var vShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vShader, vert_shade);
	gl.compileShader(vShader);

	// validate vertex shader complication
	if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vShader));
		return;
	}

	// create and compile fragment shader
	var fShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fShader, frag_shade);
	gl.compileShader(fShader);

	// validate fragment shader compilation
	if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fShader));
		return;
	}

	// create shader program & attach vert + frag shaders
	shaderProgram = gl.createProgram(); // take this out if we parametrize our createShaders function
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

	gl.useProgram(shaderProgram);
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


function setUpMVMatrix() {
	// uses inverse of the camera's transformations to set up the mvMatrix
	// that way, all objects get transformed into camera space with the mvMatrix
	// camera space = (cam at (0, 0, 0) facing down -Z axis)
	let camTransforms = mat4.create();
	mat4.identity(camTransforms);
	mat4.rotateX(camTransforms, Math.PI / 6);
	mat4.rotateY(camTransforms, rotAmount);
	mat4.translate(camTransforms, [0.0, 0.2, 6.0]);

	mvMatrix = mat4.inverse(camTransforms);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function setUpProjMatrix() {
	projMatrix = mat4.create();
	mat4.identity(projMatrix);
	mat4.perspective(36, gl.viewportWidth / gl.viewportHeight, 0.1, 1000, projMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projMatrix);
}


function setUpNMatrix() {
	nMatrix = mat4.inverse(mvMatrix);
	mat4.transpose(nMatrix);
	gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


function setUpLightPos() {
	lightPos = vec3.create([0.0, 5.0, 0.0]);
	gl.uniform3fv(shaderProgram.lightPosUniform, lightPos);
}


function setUpShaderAttribs() {
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "a_vCoords");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "a_vNorm");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
}


function setUpShaderUniforms() {
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "u_mvMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "u_pMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "u_nMatrix");
	shaderProgram.lightPosUniform = gl.getUniformLocation(shaderProgram, "u_lightPos");

	setUpMVMatrix();
	setUpProjMatrix();
	setUpNMatrix();
	setUpLightPos();
}


function drawScene() {
	gl.clearColor(clearColorR, clearColorG, clearColorB, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	for (obj of objsToDraw) {
		mesh = obj;
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
var rotSpeed = 0.0005;
var rotAmount = 0;
function tick() {
	requestAnimationFrame(tick);

	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		var elapsed = timeNow - lastTime;
		rotAmount += rotSpeed * elapsed;
	}
	lastTime = timeNow;

	// the only uniforms that update on each tick are the modelview and normal matrices
	// the projection matrix and light pos vector stay the same every tick
	setUpMVMatrix();
	setUpNMatrix();

	drawScene();
}


function getObjectsToDraw(obj_str_names) {
	objsToDraw = [];
	for (obj_name of obj_str_names) {
		mesh = new OBJ.Mesh(obj_name);
		OBJ.initMeshBuffers(gl, mesh);
		objsToDraw.push(mesh);
	}
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

	createShaders();
	getObjectsToDraw([
		pool_sides_and_bottom,
		one_plane
	]);

	setUpShaderAttribs();
	setUpShaderUniforms();

	tick();
  }
