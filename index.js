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
var lightPos = vec3.create([0.0, 3.0, 0.0]); ; // position of the light, used as a uniform for shader calculations
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


var textures = [];
function setUpTextureMaps(shaderProgram) {
	// TO ADD A NEW TEXTURE MAP, ALL YOU HAVE TO DO IS A FEW STEPS:
	// 1. add the image to the index.html file via an image tag
	// 2. make the width and height of that image tag 0 so that the image doesnt show up on the page
	// 3. add the id of that image tag to the image_ids array
	// 4. add a new attribute to the shader program containing the gl.getUniformLocation value for the new uniform's name
	// 5. add a new uniform1i statement right after the for loop below, containing the next available number
	// 6. add a new gl.activeTexture/gl.bindTexture set to the very bottom of this function
	// that's it!
	image_ids = [
		"water_normal_map",
		"water_displacement_map",
		"ground_color_map",
		"ground_displacement_map"
	]
	
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
	gl.uniform1i(shaderProgram.groundColorMapUniform, 2);
	gl.uniform1i(shaderProgram.groundDispMapUniform, 3);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textures[1]);
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, textures[2]);
	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, textures[3]);
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


var lightIntensity = 1.0;
var causticsIntensity = 1.0;
var waterSurfaceDisplacementIntensity = 1.0;
var waterTextureCoordinateScale = 1.0;
var groundTextureCoordinateScale = 1.0;


function setUpShaderUniforms(shaderProgram) {
	gl.useProgram(shaderProgram);
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "u_mvMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "u_pMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "u_nMatrix");
	shaderProgram.lightPosUniform = gl.getUniformLocation(shaderProgram, "u_lightPos");
	shaderProgram.totalTimeElapsedUniform = gl.getUniformLocation(shaderProgram, "u_totalTimeElapsed");
	shaderProgram.waterNormalMapUniform = gl.getUniformLocation(shaderProgram, "u_waterNormalMap");
	shaderProgram.waterDispMapUniform = gl.getUniformLocation(shaderProgram, "u_waterDispMap");
	shaderProgram.groundColorMapUniform = gl.getUniformLocation(shaderProgram, "u_groundColorMap");
	shaderProgram.groundDispMapUniform = gl.getUniformLocation(shaderProgram, "u_groundDispMap");

	shaderProgram.lightIntensityUniform = gl.getUniformLocation(shaderProgram, "u_lightIntensity");
	shaderProgram.causticsIntensityUniform = gl.getUniformLocation(shaderProgram, "u_causticsIntensity");
	shaderProgram.waterSurfaceDisplacementIntensityUniform = gl.getUniformLocation(shaderProgram, "u_waterSurfaceDisplacementIntensity");
	shaderProgram.waterTextureCoordinateScaleUniform = gl.getUniformLocation(shaderProgram, "u_waterTexCoordScale");
	shaderProgram.groundTextureCoordinateScaleUniform = gl.getUniformLocation(shaderProgram, "u_groundTexCoordScale");

	if (shaderProgram.mvMatrixUniform != null) {
		updateMVMatrixUniform(shaderProgram);
	}
	if (shaderProgram.pMatrixUniform != null) {
		setUpProjMatrix(shaderProgram);
	}
	if (shaderProgram.nMatrixUniform != null) {
		updateNMatrixUniform(shaderProgram);
	}
	if (shaderProgram.lightPosUniform != null) {
		setUpLightPos(shaderProgram);
	}
	if (shaderProgram.totalTimeElapsedUniform != null) {
		updateTotalTimeElapsedUniform(shaderProgram);
	}
	if (shaderProgram.lightIntensityUniform != null) {
		updateLightIntensityUniform(shaderProgram);
	}
	if (shaderProgram.causticsIntensityUniform != null) {
		updateLightIntensityUniform(shaderProgram);
	}
	if (shaderProgram.waterSurfaceDisplacementIntensityUniform != null) {
		updateWaterSurfaceDisplacementIntensity(shaderProgram);
	}
	if (shaderProgram.waterTextureCoordinateScaleUniform != null) {
		updateWaterTextureCoordinateScaleUniform(shaderProgram);
	}
	if (shaderProgram.groundTextureCoordinateScaleUniform != null) {
		updateGroundTextureCoordinateScaleUniform(shaderProgram);
	}
	if (shaderProgram.waterNormalMapUniform != null
		&& shaderProgram.waterDispMapUniform != null
		&& shaderProgram.groundColorMapUniform != null
		&& shaderProgram.groundDispMapUniform != null) {
		setUpTextureMaps(shaderProgram);
	}
}


function drawScene() {
	gl.clearColor(clearColorR, clearColorG, clearColorB, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	for (obj of objsToDraw) {
		mesh = obj.mesh;
		shaderProgram = obj.shaderProg;
		gl.useProgram(shaderProgram);

		// the only things that can change each frame are:
		// - the camera position
		// - the total elapsed time
		// so all we have to update each frame are the MV Matrix (camera-dependent), N Matrix (camera-dependent), and totalTimeElapsed (time-dependent)
		// no need to update textures since those stay the same, the uv coordinates for accessing the texutres are just animated :)))

		// this optimization makes it run WAY faster in the browser and no reload-due-to-memory-usage errors :D
		updateMVMatrixUniform(shaderProgram);
		updateNMatrixUniform(shaderProgram);
		updateTotalTimeElapsedUniform(shaderProgram);
		updateLightIntensityUniform(shaderProgram);
		updateCausitcsIntensity(shaderProgram);
		updateWaterSurfaceDisplacementIntensity(shaderProgram);
		updateWaterTextureCoordinateScaleUniform(shaderProgram);
		updateGroundTextureCoordinateScaleUniform(shaderProgram);
		setUpLightPos(shaderProgram);

		
		if (shaderProgram.vertexNormalAttribute != -1) {
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		}
		
		if (shaderProgram.vertexPositionAttribute != -1) {
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		}	

		if (shaderProgram.vertexTextureAttribute != -1) {
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, mesh.textureBuffer.itemSize /* 2 */, gl.FLOAT, false, 0, 0);
		}
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
		gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
}


var clearColorR = 0.02;
var clearColorG = 0.04;
var clearColorB = 0.08;
var lastTime = 0;
var elapsed;
var rotSpeed = 0.0005;
var rotAmountY = 3 * Math.PI / 4;
var rotAmountXZ = Math.PI / 8;
var timeScale = 1;
function tick() {
	requestAnimationFrame(tick);

	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		elapsed = timeNow - lastTime;
		totalTimeElapsed += timeScale * elapsed; // defined in the vars section at the very top of this index.js file
	}
	lastTime = timeNow;

	/*
	SLIDERS FOR:
	- time scale
	- light intensity
	- resolution scale
	- caustics intensity
	- water surface displacement intensity
	- texture coordinate scale
	- light position (x, y, z in world space)
	*/
	
	const ts = document.getElementById("time-scale");
	timeScale = ts.value;
	const li = document.getElementById("light-intensity");
	lightIntensity = li.value * 1.4;
	const ci = document.getElementById("caustics-intensity");
	causticsIntensity = ci.value * 4;
	const wsdi = document.getElementById("water-surface-displacement-intensity");
	waterSurfaceDisplacementIntensity = wsdi.value / 6;
	const wtcs = document.getElementById("water-texture-coordinate-scale");
	waterTextureCoordinateScale = 1.1 / wtcs.value;
	const gtcs = document.getElementById("ground-texture-coordinate-scale");
	groundTextureCoordinateScale = 1.1 / gtcs.value;
	const lpx = document.getElementById("light-position-x");
	const lpy = document.getElementById("light-position-y");
	const lpz = document.getElementById("light-position-z");
	lightPos = vec3.create([Number(lpx.value), Number(lpy.value), Number(lpz.value)]);
	
	// bc colors can have += 50 on their vals, they must be between 50 and 205 (inclusive) for accurate gradient
	const startColorR = 194;
	const startColorG = 52;
	const startColorB = 109;
	const endColorR = 95;
	const endColorG = 59;
	const endColorB = 196;
	inputSliders.forEach(sliderElement => {
		input_elem = sliderElement.children[2];
		percentOfSliderFull = 100 * (input_elem.value - input_elem.min) / (input_elem.max - input_elem.min);
		let new_style = `background-size: ${percentOfSliderFull}% 100%;`;
		newR = startColorR * (100 - percentOfSliderFull) / 100 + endColorR * percentOfSliderFull / 100;
		newG = startColorG * (100 - percentOfSliderFull) / 100 + endColorG * percentOfSliderFull / 100;
		newB = startColorB * (100 - percentOfSliderFull) / 100 + endColorB * percentOfSliderFull / 100;
		new_style += `background-image: linear-gradient(to right, rgb(${newR - 50}, ${newG - 50}, ${newB - 50}), rgb(${newR + 50}, ${newG + 50}, ${newB + 50}));`;
		sliderElement.children[2].setAttribute('style', new_style);
		sliderElement.children[3].innerHTML = input_elem.value;
	})

	drawScene();
}


function addObjectToDraw(obj_str, shaderProgram, uses_norms) {
	mesh = new OBJ.Mesh(obj_str);
	OBJ.initMeshBuffers(gl, mesh);
	
	objsToDraw.push({
		"mesh": mesh,
		"shaderProg": shaderProgram,
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


function mouseDragStop() {
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


var inputSliders;
function initGL() {
	// initGL is called on page load
	// Initialize the GL context
	canvas = document.querySelector("#glCanvas");
	canvas.onmousedown = mouseDown;
	canvas.onmouseup = mouseDragStop;
	canvas.onmouseout = mouseDragStop;
	canvas.onmousemove = mouseMove;

	inputSliders = document.querySelectorAll("label");


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
	createShaderProgram(basicShaderProgram, basic_vert_shader, basic_frag_shader);

	// water shader
	createShaderProgram(waterShaderProgram, water_vert_shader, water_frag_shader);

	shaderPrograms = [basicShaderProgram, waterShaderProgram];
	for (prog of shaderPrograms) {
		setUpShaderAttribs(prog);
		setUpShaderUniforms(prog);
	}

	addObjectToDraw(pool_sides_and_bottom, basicShaderProgram);
	addObjectToDraw(water_surface_plane, waterShaderProgram);

	tick();
}
