const fs = require("fs")
const NodeRSA = require('node-rsa');
const key = new NodeRSA().generateKeyPair();
const publicKey = key.exportKey('pkcs8-public-pem');
const privateKey = key.exportKey('pkcs1-pem');


var dir = './certificates';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

// write public key
fs.openSync('./certificates/public.pem', 'w');
fs.writeFileSync('./certificates/public.pem', publicKey, 'utf8');

// write private key
fs.openSync('./certificates/private.pem', 'w');
fs.writeFileSync('./certificates/private.pem', privateKey, 'utf8');


console.log("done.")