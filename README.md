# standalone-shader

A native webgl wrapper for 2D shaders.

![standalone-shader](https://i.imgur.com/osvHp7f.jpg)

Similar to [gl-shader](https://github.com/stackgl/gl-shader) but with a smaller scope and naive approach.
This uses the ["big triangle" approach](https://michaldrobot.com/2014/04/01/gcn-execution-patterns-in-full-screen-passes/) instead of a quad.

> :warning: experimental package made for learning purposes

### Installation :package:

```bash
npm i ayamflow/standalone-shader -S
```

### Usage :book:

#### createShader(options)
`options` can contain the following parameters:
    - canvas
    - uniforms {}
    - vertexShader
    - fragmentShader

All parameters are optional.
`time` and `resolution` uniforms are automatically passed to the shader.

Uniform examples:

```
    time: {
        type: 'float',
        value: 0
    },
    resolution: {
        type: 'vec2',
        value: [480, 320]
    },
    map: {
        type: 'sampler2D',
        value: new Image(),
        wrapS: 'mirror', // defaults to 'clamp'
        wrapT: 'repeat', // defaults to 'clamp'
        filter: 'nearest' // defaults to 'linear'
    }
```

#### shader.start
#### shader.stop
#### shader.resize(width, height)
#### shader.tick(time)
Override this for
#### shader.destroy

### Example :floppy_disk:

```js
    import createShader from 'standalone-shader'

    let img = new Image()
    img.src = './texture.jpg'

    let shader = createShader({
        canvas: document.querySelector('canvas'),
        uniforms: {
            map: {
                type: 'sampler2D',
                value: img,
                wrapS: 'clamp',
                filter: 'nearest'
            }
        },
        fragmentShader: `
            precision highp float;

            uniform vec2 resolution;
            uniform float time;
            uniform sampler2D map;
            varying vec2 vUv;

            void main() {
                vec2 st = gl_FragCoord.xy / resolution.xy;
                st.x *= resolution.x / resolution.y;

                gl_FragColor = texture2D(map, st);
            }
        `
    })
    shader.resize(600, 400)
    shader.start()

    shader.onTick = function(time) {
        // change some uniform value
    }

    // or you could resize following browser events
    window.addEventListener('resize', function() {
        shader.resize(innerWidth, innerHeight)
    })

```
[Demo.](https://ayamflow.github.io/standalone-shader/demo/index.html)

### TODO
- mipmap filters
- uniform type detection
- better error log
- renderer options (alpha, ...)
- extensions (derivatives, ...)
- context lost/restore
- ...

### License :pencil:

MIT. See [LICENSE](http://github.com/ayamflow/standalone-shader/blob/master/LICENSE) for details.