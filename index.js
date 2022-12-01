//
// start here
//

// const OBJ = require("./js_files/webgl-obj-loader");
'use strict';

var gl;
var canvas;
var shaderProgram;

var vertexPositionBuffer;
var vertexColorBuffer;

var mesh;
var uMVMatrix = mat4.create();
mat4.scale(uMVMatrix, [0.15, 0.15, 0.15]);


function createShaders() {
	let vert_shade = 
		'uniform mat4 uMVMatrix;' +
		'attribute vec3 vertcoordinates;' + 
		'attribute vec4 verColor;' + 
		'varying vec4 vColor;' + 
		'void main()' +
		'{' + 
			'gl_Position = uMVMatrix *  vec4(vertcoordinates, 1.0);' +
			'vColor = verColor;' + 
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

	var vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
	vertexBuffer.itemSize = 3;
	vertexBuffer.numItems = mesh.vertices.length / 3;

	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
	indexBuffer.itemSize = 3;
	indexBuffer.numItems = mesh.indices.length / 3;

	// enable the attributes for the vertex shader
	gl.useProgram(shaderProgram);
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertcoordinates");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	gl.vertexAttribPointer(
		shaderProgram.vertexPositionAttribute,
		3, // num elements per attribute (x, y, z coords)
		gl.FLOAT,
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT, // size per vertex (in bytes)
		0 // offset from the start to this attrib
	);
  
	// shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "verColor");
	// gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
	gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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
	initMesh();


	gl.enable(gl.DEPTH_TEST);
  
	// Set clear color to black, fully opaque

  }
  
//   window.onload = main;