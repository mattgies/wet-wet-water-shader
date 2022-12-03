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
var mvMatrix;
var currentTransform;
var projMatrix;


function createShaders() { // modify parameters if make multiple shaders
	let vert_shade = 
		'uniform mat4 uMVMatrix;' +
		'uniform mat4 uProjMatrix;' +
		'attribute vec3 vCoords;' + 
		'attribute vec3 vNorm;' +
		
		'varying vec4 vColor;' + 
		
		'void main()' +
		'{' + 
			'vec4 eyeCoords = vec4(vCoords, 1.0) ;' +
			'gl_Position = uProjMatrix * uMVMatrix * eyeCoords;' +
			'vColor = vec4(abs(vNorm), 1.0);' +
		'}';

	let frag_shade = 
		'precision mediump float;' + 
		'varying vec4 vColor;' +
		'void main()'+
		'{' +
			'gl_FragColor = vColor;' +
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


function setUpMatrices() {
	// implement transforms
	// mvMatrix setup
	mvMatrix = mat4.create();

	mat4.identity(mvMatrix);
	mat4.translate( mvMatrix, [0.0, 0.0, -30 ] );
	mat4.rotate( mvMatrix, rotAmount, [-1, 1, -1] ); 
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	// projMatrix setup
	projMatrix = mat4.create();
	mat4.identity(projMatrix);
	mat4.perspective(36, gl.viewportWidth / gl.viewportHeight, 0.1, 1000, projMatrix);
	// console.log(projMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projMatrix);
}

function setUpMatrices2() {
	// implement transforms
	// mvMatrix setup
	mvMatrix = mat4.create();

	mat4.identity(mvMatrix);
	mat4.translate( mvMatrix, [0.0, 2.0, -20 ] );
	mat4.rotate( mvMatrix, rotAmount, [-1, 1, -1] );
	mat4.translate( mvMatrix, [0.0, -2.0, 2 ] );
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	// projMatrix setup
	projMatrix = mat4.create();
	mat4.identity(projMatrix);
	mat4.perspective(36, gl.viewportWidth / gl.viewportHeight, 0.1, 1000, projMatrix);
	// console.log(projMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projMatrix);
}


function setUpShaderAttribs() {
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vCoords");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "vNorm");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
}

function setUpShaderUniforms() {
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjMatrix");
}

function drawScene() {
	setUpShaderAttribs();
	setUpShaderUniforms();


	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
	// // Clear the color buffer with specified clear color
    gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

	// gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

var clearColorR = 0.2;
// console.log(clearColorR);
var clearColorG = 0.5;
var clearColorB = 0.7;
var lastTime = 0;
var rotSpeed = 0.005;
var rotAmount = 0.0;
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
	initObj(bunny_mesh_str);
	setUpMatrices2();
	drawScene();
	setUpMatrices();
	drawScene();

	OBJ.deleteMeshBuffers(gl, mesh);

	initObj(one_plane);
	drawScene();
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
  
//   window.onload = main;