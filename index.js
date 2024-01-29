const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });

const debugDom = document.getElementById('debug');

if (!gl) {
  alert('WebGL2 is not available.');
}

const ext = gl.getExtension('EXT_color_buffer_float');
if (!ext) {
  alert('EXT_color_buffer_float is not supported');
}

// Updated vertex shader for transform feedback
const vsTransform = `#version 300 es
in vec4 a_data;
out vec4 o_data;

void main() {
    o_data = mod(a_data + 1., 10.);
}`;

// Fragment shader for transform feedback (not used but required)
const fsTransform = `#version 300 es
precision highp float;
void main() {
}`;

// Vertex shader for drawing
const vsDraw = /* glsl */ `#version 300 es
in vec4 a_data;
out vec4 vData;
out float vID;


void main() {
  vData = a_data;
  vID = float(gl_VertexID);

  float x = vID; // x coordinate
  float y = 0.0; // y coordinate (always 0 for a single row)

  gl_Position = vec4((x - 3.5) / 4.0, y, 0.0, 1.0); // Center and scale points
  gl_PointSize = 1.0; // Render each point as a single pixel
}`;

// Updated fragment shader for drawing
const fsDraw = /* glsl */ `#version 300 es
precision highp float;
in vec4 vData;
out vec4 gColor;

in float vID;
uniform sampler2D u_texture;

void main() {
    int id = int(vID);

    // Fetch the value from the texture corresponding to the vertex ID
    // The first 4 points (ids 0-3) correspond to the first pixel's RGBA components
    // The next 4 points (ids 4-7) correspond to the second pixel's RGBA components
    float value;
    if (id < 4) {
        value = texelFetch(u_texture, ivec2(0, 0), 0)[id % 4];
    } else {
        value = texelFetch(u_texture, ivec2(1, 0), 0)[id % 4];
    }

    // Normalize the value to the 0-1 range
    float normalizedValue = value / 10.0;

    // Create a color gradient from black (0) to red (10)
    vec3 color = vec3(normalizedValue, 0.0, 0.0); // Red gradient

    gColor = vec4(color, 1.0);
}`;

// Create shaders and programs
const transformProgram = createProgram(gl, vsTransform, fsTransform, [
  'o_data',
]); // Add the varyings parameter
const drawProgram = createProgram(gl, vsDraw, fsDraw);

const dataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);

const size = 2;
const dataArray = new Float32Array(size * 4);
dataArray
  .map((_, i) => i)
  .forEach((v, i) => {
    dataArray[i] = v;
  });

const width = size;
const height = 1;

canvas.width = width * 4;
canvas.height = height;
canvas.style['image-rendering'] = 'pixelated';
canvas.style.display = 'block';
canvas.style.width = `${window.innerWidth - 14}px`;
canvas.style.height = `${height * 20}px`;
const datas = new Float32Array(dataArray);
gl.bufferData(gl.ARRAY_BUFFER, datas, gl.STATIC_DRAW);

const tfDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, tfDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, datas.byteLength, gl.DYNAMIC_COPY);

// Setup transform feedback
const tf = gl.createTransformFeedback();
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, tfDataBuffer);

// Create and bind texture
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA32F,
  width,
  height,
  0,
  gl.RGBA,
  gl.FLOAT,
  null
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

// Create a framebuffer
const framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

// Attach the texture to the framebuffer
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0,
  gl.TEXTURE_2D,
  texture,
  0
);

// Check if the framebuffer is complete
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
  console.error('Framebuffer is not complete');
}

const dataLocation = gl.getAttribLocation(transformProgram, 'a_data');

const drawDataLocation = gl.getAttribLocation(drawProgram, 'a_data');

// Buffers for ping-pong
let readBuffer = dataBuffer;
let writeBuffer = tfDataBuffer;

function tick() {
  // Bind the read buffer for input
  gl.bindBuffer(gl.ARRAY_BUFFER, readBuffer);
  gl.enableVertexAttribArray(dataLocation);
  gl.vertexAttribPointer(dataLocation, 4, gl.FLOAT, false, 0, 0);

  // Use the transform program
  gl.useProgram(transformProgram);

  // Set the write buffer as the transform feedback buffer
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, writeBuffer);

  // Perform transform feedback
  gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(gl.POINTS, 0, width); // Adjust the count as needed
  gl.endTransformFeedback();
  gl.disable(gl.RASTERIZER_DISCARD);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  // Check if the framebuffer is complete
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('Framebuffer is not complete');
  }

  // Bind PBO and transfer data to texture
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, readBuffer);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.FLOAT, 0);
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);

  // Ping-pong: swap the read and write buffers
  [readBuffer, writeBuffer] = [writeBuffer, readBuffer];

  debug();
}

setInterval(tick, 1000);

function createProgram(gl, vsSource, fsSource, varyings) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // Specify the varyings for transform feedback
  if (varyings) {
    gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
  }

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program failed to link:', gl.getProgramInfoLog(program));
  }
  return program;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader failed to compile:', gl.getShaderInfoLog(shader));
  }
  return shader;
}

function glEnumToString(gl, value) {
  const keys = [];
  for (const key in gl) {
    if (gl[key] === value) {
      keys.push(key);
    }
  }
  return keys.length ? keys.join(' | ') : `0x${value.toString(16)}`;
}

function debug() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Set the viewport size to match the texture size
  gl.viewport(0, 0, width * 4, height); // Set textureWidth and textureHeight appropriately

  // Clear the framebuffer
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Prepare to draw with the draw program
  gl.useProgram(drawProgram);

  const dataBufferDebug = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dataBufferDebug);

  gl.enableVertexAttribArray(drawDataLocation);
  gl.vertexAttribPointer(drawDataLocation, 4, gl.FLOAT, false, 0, 0);

  const datasDebug = new Float32Array(size * 4 * 4);
  gl.bufferData(gl.ARRAY_BUFFER, datasDebug, gl.STATIC_DRAW);

  gl.drawArrays(gl.POINTS, 0, width * 4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  // Read pixels to confirm it worked
  const readout = new Float32Array(width * height * 4);

  const altFormat = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
  const altType = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);

  gl.readPixels(0, 0, width, height, altFormat, altType, readout);

  // Unbind the framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  debugDom.textContent = `Pixel Buffer Object Data: ${readout.join(', ')}`;
}
