const WRAP = {
    clamp: 'CLAMP_TO_EDGE',
    mirror: 'MIRRORED_REPEAT',
    repeat: 'REPEAT',
}

const FILTER = {
    nearest: 'NEAREST',
    linear: 'LINEAR',
    // NEAREST_MIPMAP_NEAREST
    // LINEAR_MIPMAP_NEAREST
    // NEAREST_MIPMAP_LINEAR
    // LINEAR_MIPMAP_LINEAR
}

export default class Texture {
    constructor(gl, image, wrapS, wrapT, filter, flipY) {
        const texture = gl.createTexture()
        this.texture = texture

        const ws = getProp(gl, WRAP, wrapS)
        const wt = getProp(gl, WRAP, wrapT)
        const f = getProp(gl, FILTER, filter)

        if (image.complete && image.width && image.height) {
            onImageReady(gl, texture, image, ws, wt, f, flipY)
        } else {
            // Fill texture with black pixel if image isn't ready
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
            image.onload = function() {
                image.onload = null
                onImageReady(gl, texture, image, ws, wt, f, flipY)
            }
        }
    }

    destroy(gl) {
        gl.deleteTexture(this.texture)
    }
}

function onImageReady(gl, texture, image, wrapS, wrapT, filter, flipY) {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (flipY === true) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D)
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS || gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT || gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR)
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0
}

function getProp(gl, constants, prop) {
    if (prop !== undefined) {
        let value = constants[prop]
        if (!value) return

        return gl[value]
    }
}