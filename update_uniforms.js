function updateMVMatrixUniform(shaderProgram) {
	// uses inverse of the camera's transformations to set up the mvMatrix
	// that way, all objects get transformed into camera space with the mvMatrix
	// camera space = (cam at (0, 0, 0) facing down -Z axis)
	let camTransforms = mat4.create();
	mat4.identity(camTransforms);
	mat4.rotateY(camTransforms, rotAmountY);
	mat4.rotateX(camTransforms, -rotAmountXZ);
	mat4.translate(camTransforms, [0.0, 0.0, 6.0]);

	mvMatrix = mat4.inverse(camTransforms);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function setUpProjMatrix(shaderProgram) {
	projMatrix = mat4.create();
	mat4.identity(projMatrix);
	mat4.perspective(36, gl.viewportWidth / gl.viewportHeight, 0.1, 1000, projMatrix);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projMatrix);
}


function updateNMatrixUniform(shaderProgram) {
	nMatrix = mat4.inverse(mvMatrix);
	mat4.transpose(nMatrix);
	gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


function setUpLightPos(shaderProgram) {
	lightPos = vec3.create([0.5, 3.0, -0.5]); // object-space position of the light (converted to cam space in the frag shader)
	gl.uniform3fv(shaderProgram.lightPosUniform, lightPos);
}


function updateTotalTimeElapsedUniform(shaderProgram) {
	gl.uniform1f(shaderProgram.totalTimeElapsedUniform, totalTimeElapsed);
	gl.uniform1f(shaderProgram.IORRatioUniform, IOR_ratio);
}


function updateLightIntensityUniform(shaderProgram) {
	gl.uniform1f(shaderProgram.lightIntensityUniform, lightIntensity);
}


function updateCausitcsIntensity(shaderProgram) {
	gl.uniform1f(shaderProgram.causticsIntensityUniform, causticsIntensity);
}


function updateWaterSurfaceDisplacementIntensity(shaderProgram) {
	gl.uniform1f(shaderProgram.waterSurfaceDisplacementIntensityUniform, waterSurfaceDisplacementIntensity);
}


function updateWaterTextureCoordinateScaleUniform(shaderProgram) {
	gl.uniform1f(shaderProgram.waterTextureCoordinateScaleUniform, waterTextureCoordinateScale);
}


function updateGroundTextureCoordinateScaleUniform(shaderProgram) {
	gl.uniform1f(shaderProgram.groundTextureCoordinateScaleUniform, groundTextureCoordinateScale);
}
