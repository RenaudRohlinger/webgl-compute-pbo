# WebGL2 Compute shading via Transform Feedback and Pixel Buffer Object

This repository contains an example that demonstrates a technique akin to compute shading in WebGL2. It utilizes a buffer transform feedback and a Pixel Buffer Object (PBO) to simulate compute shader effects in environments where compute shaders are not supported.

## Live example
[https://webgl-compute-pbo.renaudrohlinger.com/](https://webgl-compute-pbo.renaudrohlinger.com/)
<br/>
<br/>
[<img width="720" alt="image" src="https://github.com/RenaudRohlinger/webgl-compute-pbo/assets/15867665/257a975f-3441-49b1-8406-e34c7a2f07e4">](https://webgl-compute-pbo.renaudrohlinger.com/)

## Overview
The example showcases how to process vertex data every second through transform feedback. The processed results, stored in an array buffer, are then transferred to a texture using a PBO (`gl.PIXEL_UNPACK_BUFFER`) that will be used as input in the next frame. This method keeps the processed data entirely on the GPU, enhancing performance.

## Features
- **GPU-Based Data Processing**: By using transform feedback and a PBO, data is processed on the GPU, reducing CPU-GPU data transfer and optimizing performance.
- **Texture Data Access**: Shaders can efficiently access and manipulate the updated data in the texture through a texture uniform and `texelFetch`.
- **Dynamic Computations**: This approach is ideal for GPU-based computations like dynamic sorting or simulations, where minimizing CPU-GPU data transfer is crucial.
- **Debugging**: For debugging purposes, the texture's contents can be read back to the CPU using `gl.readPixels`.

## Use Case
The compute operation in this example incrementally updates vertex data values and transfers them to a texture using a GPU-to-GPU Pixel Buffer Object (PBO) transfer. This method bypasses the CPU, further improving performance.

Feel free to explore the example and use it as a reference for implementing similar GPU-based data processing techniques in your WebGL2 projects.


## Author

[`Renaud Rohlinger @onirenaud`](https://twitter.com/onirenaud)
