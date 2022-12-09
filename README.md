# Matt Gies and Caro Wang CS112 Final Project: Realistic Water Shader in WebGL

## Online Access via GitHub Pages
[https://mattgies.github.io/cs112-final/](https://mattgies.github.io/cs112-final/)

---

## Access via index.html on a local copy of the repository
In order to run the simulation locally, you must initialize an HTTP server, otherwise the textures won't work and the canvas will not render at all  

For Mac and Linux, run  
  
```python3 -m http.server```  
  
in the terminal from our project directory, and then go to 
  
```localhost:####```  
  
in your browser where "####" is the port number specified by your terminal  

---
## References
[Evan Wallace WebGL Water Demo](http://madebyevan.com/webgl-water) \
[Evan Wallace Medium Article for Water Caustics](https://medium.com/@evanwallace/rendering-realtime-caustics-in-webgl-2a99a29a0b2c) \
[Medium Article for a more general water demo](https://medium.com/@martinRenou/real-time-rendering-of-water-caustics-59cda1d74aa) \
[WebGL Fundamentals tutorial](https://webglfundamentals.org/webgl/lessons/webgl-fundamentals.html) \
[Mozilla WebGL Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL) \
[Youtube Tutorial for WebGL](https://youtu.be/kB0ZVUrI4Aw) \
[DevOpera tutorial to WebGL + WebGL Libraries](https://dev.opera.com/articles/introduction-to-webgl-part-1/) \
[WebGL Reference](https://glmatrix.net/docs/module-mat4.html) \
[NVIDIA Water Simulation Physics Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models) \
[WebGL Reference Sheet](https://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf) \
[Creating Transparent Objects](https://subscription.packtpub.com/book/game-development/9781849691727/6/ch06lvl1sec86/creating-transparent-objects) \
[Alpha Blending for Transparency](http://learnwebgl.brown37.net/11_advanced_rendering/alpha_blending.html)

---
## Credits
[WebGL OBJ Loader Module](https://www.npmjs.com/package/webgl-obj-loader) \
[Water Texture Maps](https://3dtextures.me/2017/12/28/water-001/) \
[Ground Texture Maps](https://3dtextures.me/2017/12/26/portuguese-flooring-001/)  
glMatrix-0.9.5.js was borrowed from helper files in PA2  
&emsp; -> an extra vec3.abs() method had to be added to glMatrix-0.9.5.js 



