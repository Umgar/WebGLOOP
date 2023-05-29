const vertexShaderTxt = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 vertColor;

    varying vec3 fragColor;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    void main()
    {
        fragColor = vertColor;
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }
`;

const fragmentShaderTxt = `
    precision mediump float;

    varying vec3 fragColor;

    void main()
    {
        gl_FragColor = vec4(fragColor, 1.0);
    }
`;
const mat4 = glMatrix.mat4;

    // Base colors for different boxes
const baseColors = [
    // R, G, B
    0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,

    0.75, 0.25, 0.5, 0.75, 0.25, 0.5, 0.75, 0.25, 0.5, 0.75, 0.25, 0.5,

    0.25, 0.25, 0.75, 0.25, 0.25, 0.75, 0.25, 0.25, 0.75, 0.25, 0.25, 0.75,

    1.0, 0.0, 0.15, 1.0, 0.0, 0.15, 1.0, 0.0, 0.15, 1.0, 0.0, 0.15,

    0.0, 1.0, 0.15, 0.0, 1.0, 0.15, 0.0, 1.0, 0.15, 0.0, 1.0, 0.15,

    0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.5, 0.5, 1.0,
  ];


    // Class representing the 3D world
class World {
  #gl;
  #canvas;
  #backgroundColor = [0.5, 0.4, 0.7];
  #program;
  #objects = [];

  //Constructor - initializes the world
  //id <- id of canvas object
  //backgroundColor <- array[3] with color of the bg, default [0.5, 0.4, 0.7]
  constructor(id, backgroundColor) {
    this.#canvas = document.getElementById(id);
    this.#gl = this.#canvas.getContext("webgl");
    if (!this.#gl) {
      alert("no webgl");
      return;
    }
    if (backgroundColor != null) this.#backgroundColor = backgroundColor;
    this.prepareBG();

    this.#program = this.#gl.createProgram();
  }

  //Setting the background and enabling dynamic culling
  prepareBG() {
    this.#gl.clearColor(...this.#backgroundColor, 1); // R,G,B, opacity
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);
    this.#gl.enable(this.#gl.DEPTH_TEST);
    this.#gl.enable(this.#gl.CULL_FACE);
  }

  //change color of the background and reload the background
  set background(backgroundColor) {
    if (backgroundColor == null) {
      alert("Changing background to null");
      return;
    }
    this.#backgroundColor = backgroundColor;
    this.#gl.clearColor(...this.#backgroundColor, 1); // R,G,B, opacity
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);
  }

  // Load a shader
  loadShader(shaderText, type) {
    let shader_type;
    const gl = this.#gl;
    if (type == "VERTEX") {
      shader_type = gl.VERTEX_SHADER;
    } else if (type == "FRAGMENT") {
      shader_type = gl.FRAGMENT_SHADER;
    }
    const shader = gl.createShader(shader_type);
    gl.shaderSource(shader, shaderText);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
      return;
    }
    gl.attachShader(this.#program, shader);
  }

  // Prepare the shaders
  preperShaders() {
    this.loadShader(vertexShaderTxt, "VERTEX");
    this.loadShader(fragmentShaderTxt, "FRAGMENT");
    this.#gl.linkProgram(this.#program);
    this.#gl.validateProgram(this.#program);
  }

   // Load data into a buffer
  loadToBuffer(type, values) {
    let array_type;
    let valuesArray;
    if (type == "VERTEXS") {
      array_type = this.#gl.ARRAY_BUFFER;
      valuesArray = new Float32Array(values);
    } else if (type == "INDICES") {
      array_type = this.#gl.ELEMENT_ARRAY_BUFFER;
      valuesArray = new Uint16Array(values);
    }
    const bufferObject = this.#gl.createBuffer();
    this.#gl.bindBuffer(array_type, bufferObject);
    this.#gl.bufferData(array_type, valuesArray, this.#gl.STATIC_DRAW);
  }

// Load an object
  loadObject(object) {
    const gl = this.#gl;
    const program = this.#program;
    const box = new Box(object.colors, object.size, object.position, object.rotation);
    this.loadToBuffer("VERTEXS", box.vertices);
    if (box.indices != null) {
      this.loadToBuffer("INDICES", box.indices);
      object.pointsToRender = box.indices.length;
    }
    else{
        object.pointsToRender = box.vertices.length;
    }

    const posAttrLocation = gl.getAttribLocation(program, "vertPosition");
    const colorAttrLocation = gl.getAttribLocation(program, "vertColor");
    gl.vertexAttribPointer(
      posAttrLocation,
      3, // number of elements per attribute
      gl.FLOAT,
      gl.FALSE,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0
    );

    this.loadToBuffer("VERTEXS", box.colors);
    gl.vertexAttribPointer(
      colorAttrLocation, // attribute location
      3, // number of elements per attribute
      gl.FLOAT, // type of elements
      gl.FALSE, // if data is normalized
      3 * Float32Array.BYTES_PER_ELEMENT, // Size of individual vertex
      0 * Float32Array.BYTES_PER_ELEMENT // offset from the beginnning  of a single vertex to this attribute
    );
    this.#objects.push(object);
    gl.enableVertexAttribArray(posAttrLocation);
    gl.enableVertexAttribArray(colorAttrLocation);
  }

  // Start rendering world
  startRender() {
    const gl = this.#gl;
    const program = this.#program;
    gl.useProgram(program);

    const matWorldUniformLocation = gl.getUniformLocation(program, "mWorld");
    const matViewUniformLocation = gl.getUniformLocation(program, "mView");
    const matProjUniformLocation = gl.getUniformLocation(program, "mProj");
    let worldMatrix = mat4.create();
    let viewMatrix = mat4.create();
    let projMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(
      projMatrix,
      glMatrix.glMatrix.toRadian(45),
      this.#canvas.width / this.#canvas.height,
      0.1,
      1000.0
    );

    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);
    this.loop();
  }

  // Rendering loop
  loop() {
    const gl = this.#gl;
    
    let angle = (performance.now() / 1000 / 8) * 2 * Math.PI;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    for(let i=0;i<this.#objects.length; i++)
        this.rotateObj(this.#objects[i],angle);
  }

  // Rotate an object
  rotateObj(object, angle)
  {
    let worldMatrix = mat4.create();
    const gl = this.#gl;
    const program = this.#program;
    const matWorldUniformLocation = gl.getUniformLocation(program, "mWorld");
    let rotationMatrix = new Float32Array(16);
    let translationMatrix = new Float32Array(16);
    mat4.fromRotation(rotationMatrix, angle, object.rotation);
    mat4.fromTranslation(translationMatrix, object.position);
    mat4.mul(worldMatrix, translationMatrix, rotationMatrix); // RTFM
    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.drawElements(gl.TRIANGLES, object.pointsToRender, gl.UNSIGNED_SHORT, 0);
    
  }
}


 // Class representing a box
class Box {
pointsToRender;
size;
  vertices = [
    // X, Y, Z
    // Top
    -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,

    // Left
    -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0,

    // Right
    1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,

    // Front
    1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,

    // Back
    1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0,

    // Bottom
    -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0,
  ];
  colors = [];
  indices = [
    // Top
    0, 1, 2, 0, 2, 3,

    // Left
    5, 4, 6, 6, 4, 7,

    // Right
    8, 9, 10, 8, 10, 11,

    // Front
    13, 12, 14, 15, 14, 12,

    // Back
    16, 17, 18, 16, 18, 19,

    // Bottom
    21, 20, 22, 22, 20, 23,
  ];

  // Constructor - create a box
  constructor(color, size = [1,1,1], position = [1,1,1], rotation = [1,1,1]) {
    
    for (let i = 0; i < this.vertices.length; i += color.length)
      this.colors.push(...color);
    for(let i = 0; i < this.vertices.length; i++)
    {
        this.vertices[i] *= size[i%3];
    }
    this.position = position;
    this.rotation = rotation;
    this.size = size;
  }
}

// Create an instance of the World class and Box objects

let world = new World("main-canvas");
world.preperShaders();
const box = new Box(baseColors, [1,1,1], [-1.5, 1.2, 0], [-2, 3, 1]);
const box2 = new Box(baseColors, [1/2,1/2,1/2], [2.4, -1, 0], [2, 3, 1]);

const box3 = new Box(baseColors, [1/2,1/2,1/2], undefined, [1, 1, 1]);
world.loadObject( box);
world.loadObject(box2);
world.loadObject(box3);
world.startRender();
const loopObj = function()
{
    world.loop();
    requestAnimationFrame(loopObj);
}
requestAnimationFrame(loopObj);
