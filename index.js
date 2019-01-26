import Texture from './texture.js'

const defaultVertexShader = `
    attribute vec3 position;

    void main() {
        gl_Position = vec4(position, 1.0);
    }
`
const defaultFragmentShader = `
    precision highp float;

    uniform vec2 resolution;
    uniform float time;

    void main() {
        vec2 st = gl_FragCoord.xy / resolution.xy;
        st.x *= resolution.x / resolution.y;

        gl_FragColor = vec4(st, 0.5 + 0.5 * sin(time), 1.0);
    }
`

class Shader {
    constructor(options) {
        const canvas = options.canvas || document.createElement('canvas')
        const gl = canvas.getContext('webgl')
        if (!gl) {
            console.warn('[standalone-shader] WebGL doesn\'t seem to be supported.')
            return
        }

        const vertexSource = options.vertexShader || defaultVertexShader
        const fragmentSource = options.fragmentShader || defaultFragmentShader
        const vertexShader = initShader(gl, gl.VERTEX_SHADER, vertexSource)
        const fragmentShader = initShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
        const program = initProgram(gl, vertexShader, fragmentShader)

        this.uniforms = Object.assign({
            time: {
                type: 'float',
                value: 0
            },
            resolution: {
                type: 'vec2',
                value: [1, 1]
            },
        }, options.uniforms || {})

        Object.keys(this.uniforms).forEach(function(name, i) {
            let uniform = this.uniforms[name]
            uniform._location = gl.getUniformLocation(program, name)
            uniform._type = getUniformType(uniform.type)
            if (uniform.value instanceof Image) {
                uniform._isImage = true
                uniform._value = new Texture(gl, uniform.value, uniform.wrapS, uniform.wrapT, uniform.filter, uniform.flipY)
            }
            if (uniform._type.indexOf('Matrix') > -1) {
                uniform._isMatrix = true
            }
        }, this)
        console.warn('[standalone-shader] uniforms', this.uniforms)

        const positionLocation = gl.getAttribLocation(program, 'position')
        const positionBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1, -1, 4, 4, -1
            ]),
            gl.STATIC_DRAW
        )

        this.gl = gl
        this.program = program
        this.vertexShader = vertexShader
        this.fragmentShader = fragmentShader
        this.positionLocation = positionLocation
        this.positionBuffer = positionBuffer
        this.rafID = -1
        this.dpr = options.dpr || 1
        this.update = this.update.bind(this)
    }

    get domElement() {
        return this.gl.canvas
    }

    resize(width, height) {
        width = width || innerWidth
        height = height || innerHeight
        const gl = this.gl
        const scaledWidth = Math.floor(width * this.dpr)
        const scaledHeight = Math.floor(height * this.dpr)

        gl.canvas.width = scaledWidth
        gl.canvas.height = scaledHeight
        gl.canvas.style.width = width + 'px'
        gl.canvas.style.height = height + 'px'
        gl.viewport(0, 0, scaledWidth, scaledHeight)

        this.uniforms.resolution.value[0] = scaledWidth
        this.uniforms.resolution.value[1] = scaledHeight
    }

    start() {
        this.stop()
        this.rafID = requestAnimationFrame(this.update)
    }

    stop() {
        cancelAnimationFrame(this.rafID)
    }

    onTick(time) {} // overriden by user

    update(time) {
        this.rafID = requestAnimationFrame(this.update)
        const gl = this.gl
        let textureID = 0

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(this.program)

        gl.enableVertexAttribArray(this.positionLocation)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)

        this.uniforms.time.value = time / 1000
        this.onTick(this.uniforms.time.value)

        let numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS)
        for (let i = 0; i < numUniforms; i++) {
            let name = gl.getActiveUniform(this.program, i).name
            let uniform = this.uniforms[name]
            if (uniform._isImage) {
                gl.uniform1i(uniform._location, textureID)
                gl.activeTexture(gl.TEXTURE0 + textureID)
                gl.bindTexture(gl.TEXTURE_2D, uniform._value.texture)
                textureID++
            } else {
                if (uniform._isMatrix) {
                    gl[uniform._type](uniform._location, false, uniform.value)
                } else {
                    gl[uniform._type](uniform._location, uniform.value)
                }
            }
        }

        gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    destroy() {
        let numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS)
        for (let i = 0; i < numUniforms; i++) {
            let name = gl.getActiveUniform(this.program, i).name
            let uniform = this.uniforms[name]
            if (uniform._isImage) {
                uniform._value.destroy()
            }
        }

        const gl = this.gl
        if (gl.canvas.parentNode) {
            gl.canvas.parentNode.removeChild(gl.canvas)
        }
        gl.deleteBuffer(this.positionBuffer)
        gl.deleteProgram(this.program)
    }
}

function initShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) {
        return shader
    }

    console.warn('[standalone-shader] createShader error', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
}

function initProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)

    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    if (success) {
        return program
    }

    // TODO:
    // more error info?
    // see https://github.com/mrdoob/three.js/blob/6e89128f1ae239f29f2124a43133bb3d767b19bf/src/renderers/webgl/WebGLProgram.js#L556

    console.warn('[standalone-shader] createProgram error', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
}

function getUniformType(type) {
    switch (type) {
        case 'int':
        case 'sampler2D':
            return 'uniform1i'

        case 'float':
            return 'uniform1f'

        case 'mat2':
        case 'mat3':
        case 'mat4':
            let mat = type.charAt(3)
            return `uniformMatrix${mat}fv`

        case 'vec2':
        case 'vec3':
        case 'vec4':
            let vec = type.charAt(3)
            return `uniform${vec}fv`

        default:
            console.error(`[standalone-shader] Unknown uniform type: ${type}`)
            return
    }
}

export default function createShader(options) {
    return new Shader(options)
}