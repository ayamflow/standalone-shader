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
        this.gl = gl
        this.texture = texture
        this.image = image
        this.flipY = flipY
        this.wrapS = getProp(gl, WRAP, wrapS)
        this.wrapT = getProp(gl, WRAP, wrapT)
        this.filter = getProp(gl, FILTER, filter)

        if (image.complete && image.width && image.height || image instanceof Image === false) {
            // Update if already loaded or not an image element
            this.update()
        } else {
            // Fill texture with black pixel if image isn't ready
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))

            const self = this
            image.addEventListener('load', function onload() {
                image.removeEventListener('load', onload)
                self.update()
            })
        }
    }

    update() {
        const gl = this.gl
        const image = this.image

        gl.bindTexture(gl.TEXTURE_2D, this.texture)

        if (this.flipY === true) {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D)
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS || gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT || gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filter || gl.LINEAR)
    }

    destroy() {
        this.gl.deleteTexture(this.texture)
    }
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