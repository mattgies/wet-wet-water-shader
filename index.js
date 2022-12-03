//
// start here
//



// const OBJ = require("./js_files/webgl-obj-loader");

var gl;
var canvas;
var shaderProgram;

var vertexPositionBuffer;
var vertexColorBuffer;

var mesh;
var mvMatrix; // model-view matrix
var nMatrix; // normal matrix
var projMatrix; // projection matrix for MVP transformations
var lightPos;


function createShaders() { // modify parameters if make multiple shaders
	let vert_shade = 
		'uniform mat4 uMVMatrix;' +
		'uniform mat4 uNMatrix;' +
		'uniform mat4 uProjMatrix;' +
		'attribute vec3 vCoords;' + 
		'attribute vec3 aVertNorm;' +
		
		'varying vec4 vColor;' + 
		'varying vec3 vPosition;' + // vertex position in cam space
		'varying vec3 vNorm;' +
		
		'void main()' +
		'{' + 
			'vec4 camSpacePos = uMVMatrix * vec4(vCoords, 1.0) ;' +
			'vPosition = vec3(camSpacePos);' +
			'gl_Position = uProjMatrix * camSpacePos;' +
			'vColor = vec4((aVertNorm), 1.0);' +

			// TODO add normal matrix to transform normals to camera space
			'vNorm = vec3(uNMatrix * vec4(aVertNorm, 1.0));' +
		'}';

	let frag_shade = 
		'precision mediump float;' + 
		'uniform vec3 uLightPos;' +
		'varying vec4 vColor;' +
		'varying vec3 vPosition;' +
		'varying vec3 vNorm;' +
		'void main()' +
		'{' +
			// 'gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);' +
			'gl_FragColor = vec4(dot(normalize(uLightPos - vPosition), vNorm) * vNorm, 1.0);' +
		'}'; 

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


function initObj(obj_string) {
	mesh = new OBJ.Mesh(obj_string);
	OBJ.initMeshBuffers(gl, mesh);
}


function setUpMatricesPoolSides() {
	// implement transforms
	// mvMatrix setup
	mvMatrix = mat4.create();

	mat4.identity(mvMatrix);
	mat4.translate( mvMatrix, [0.0, 0.0, -6.0 ] );
	mat4.rotateY( mvMatrix, rotAmount );
	mat4.rotateX( mvMatrix, Math.PI / 3);
	mat4.rotateY( mvMatrix, - 3 * Math.PI / 4);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function setUpMatricesPoolSurface() {
	// implement transforms
	// mvMatrix setup
	mvMatrix = mat4.create();

	mat4.identity(mvMatrix);
	mat4.translate( mvMatrix, [0.0, 0.0, -6.0] );
	mat4.rotateY( mvMatrix, rotAmount );
	mat4.rotateX( mvMatrix, Math.PI / 3);
	mat4.rotateY( mvMatrix, - 3 * Math.PI / 4);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function setUpShaderAttribs() {
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vCoords");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertNorm");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
}

function setUpShaderUniforms() {
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.lightPosUniform = gl.getUniformLocation(shaderProgram, "uLightPos");

	nMatrix = mat4.inverse(mvMatrix);
	mat4.transpose(nMatrix);
	gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, nMatrix);

	lightPos = vec3.create([0.0, 15.0, -6.0]);
	gl.uniform3fv(shaderProgram.lightPosUniform, lightPos);

	projMatrix = mat4.create();
	mat4.identity(projMatrix);
	mat4.perspective(36, gl.viewportWidth / gl.viewportHeight, 0.1, 1000, projMatrix);
	// console.log(projMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projMatrix);
}

function drawScene() {
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

var clearColorR = 0.2;
// console.log(clearColorR);
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

	gl.clearColor(clearColorR, clearColorG, clearColorB, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	initObj(pool_sides_and_bottom);
	setUpMatricesPoolSides();
	setUpShaderAttribs();
	setUpShaderUniforms();
	drawScene();

	// initObj(one_plane);
	// setUpMatricesPoolSurface();
	// setUpShaderAttribs();
	// setUpShaderUniforms();4
	// drawScene();
}

function initGL() {
	canvas = document.querySelector("#glCanvas");
	// Initialize the GL context
	gl = createGLContext(canvas);
  
	// Only continue if WebGL is available and working
	if (gl === null) {
	  alert(
		"Unable to initialize WebGL. Your browser or machine may not support it."
	  );
	  return;
	}

	createShaders();

	gl.enable(gl.DEPTH_TEST);
	initObj(bunny_mesh_str);
	tick();
  
  }
