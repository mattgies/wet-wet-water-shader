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
var uProjMatrix = mat4.create();

// mat4.identity(uMVMatrix);

// mat4.scale(uMVMatrix, uMVMatrix, [0.7, 0.6, 0.8]);
// mat4.perspective(uProjMatrix, Math.PI / 5, 1, 10, 20);

// console.log(uMVMatrix);
console.log(uProjMatrix);


function createShaders() {
	let vert_shade = 
		'uniform mat4 uMVMatrix;' +
		'uniform mat4 uProjMatrix;' +
		'attribute vec3 vertcoordinates;' + 
		// 'attribute vec3 verColor;' + 
		'varying vec4 vPosition;' + 
		'void main()' +
		'{' + 
			'vec4 eyeCoords = vec4(vertcoordinates, 1.0) ;' +
			// 'gl_Position = uProjMatrix * eyeCoords;' +
			'gl_Position = uMVMatrix * eyeCoords;' +
			'vPosition = eyeCoords;' + 
		'}';

	let frag_shade = 
		'precision mediump float;' + 
		'varying vec4 vPosition;' + 
		'void main()'+
		'{' +
			'gl_FragColor = vPosition;' +
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
	shaderProgram = gl.createProgram(); 
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


function initMesh() {
	mesh = new OBJ.Mesh(bunny_mesh_str);
	OBJ.initMeshBuffers(gl, mesh);

	console.log(mesh.vertices);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertcoordinates");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");


	// implement transforms

	currentTransform = mat4.create();
	mvMatrix = mat4.create();

	mat4.identity(currentTransform);
    // mat4.rotateX(currentTransform, currentTransform, -1.5708);
	mat4.translate( currentTransform, [0.0, -0.2, 0.9]);
    mat4.scale( currentTransform, [0.45, 0.45, 0.45]);      
	// mat4.translate(currentTransform, [0.0, -0.2, -1.5]);  


	mat4.identity(mvMatrix);
	// mat4.translate(mvMatrix, [0.0, -0.3, -0.5]); // this doesn't work? i have to translate directly in the vertex shader
    mat4.multiply(mvMatrix, currentTransform);
	console.log(mvMatrix);

	gl.useProgram(shaderProgram);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

	// gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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
	gl.clearColor(0.5, 0.95, 0.8, 1.0);
	// Clear the color buffer with specified clear color
	gl.clear(gl.COLOR_BUFFER_BIT);
	

	createShaders();
	// gl.uniformMatrix4fv(prog.mvMatrixUniform, false, uMVMatrix);
	initMesh();


	gl.enable(gl.DEPTH_TEST);
  
	// Set clear color to black, fully opaque

  }
  
//   window.onload = main;