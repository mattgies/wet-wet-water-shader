function pool() {
	var coords = [
		-1, -1, -1,
		-1, -1, 1,
		-1, 1, -1,
		-1, 1, 1,
		1, -1, -1,
		1, 1, -1,
		1, -1, 1,
		1, 1, 1,
		-1, -1, -1,
		1, -1, -1,
		-1, -1, 1,
		1, -1, 1,
		-1, 1, -1,
		-1, 1, 1,
		1, 1, -1,
		1, 1, 1,
		-1, -1, -1,
		-1, 1, -1,
		1, -1, -1,
		1, 1, -1,
		-1, -1, 1,
		1, -1, 1,
		-1, 1, 1,
		1, 1, 1
	];

	var indices = [
		0, 1, 2,
		2, 1, 3,
		4, 5, 6,
		6, 5, 7,
		12, 13, 14,
		14, 13, 15,
		16, 17, 18,
		18, 17, 19,
		20, 21, 22,
		22, 21, 23
	];

	// var normals = [

	// ];

	return {
		vertexPositions: new Float32Array(coords),
		// vertexNormals: new Float32Array(normals),
		indices: new Uint16Array(indices)
	 }	
}