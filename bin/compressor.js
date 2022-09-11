const zlib = require('zlib');
class DEmitterCompressor {
    constructor(root){
        this.self = root
       
    }
    compress(inputValue){
        var deflated = zlib.deflateSync(inputValue).toString('base64');
        return deflated
    }
    decompress(hash){
        var inflated = zlib.inflateSync(Buffer.from(hash, 'base64')).toString();
        return inflated
    }
}
module.exports = DEmitterCompressor