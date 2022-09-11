const rs = require('jsrsasign');
class DEmitterEncryptor {
    constructor(root){
        this.self = root
        this.KJUR = rs.KJUR
        this.KEYUTIL = rs.KEYUTIL
    }
    encrypt(inputValue){
        let pbKey = this.KEYUTIL.getKey(this.self.RSApublic.toString());
        let encrypted = this.KJUR.crypto.Cipher.encrypt(inputValue, pbKey, 'RSA');
        return encrypted
    }
    decrypt(hash){
        try {
            let pvKey = this.KEYUTIL.getKey(this.self.RSAprivate.toString());
            let detailobj = this.KJUR.crypto.Cipher.decrypt(hash, pvKey, 'RSA');    
            return detailobj
        } catch (error) {
            return undefined
        }
    }
}
module.exports = DEmitterEncryptor