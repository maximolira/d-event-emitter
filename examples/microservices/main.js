const log4js = require("log4js")
const fs = require("fs")
let DEmmiter = require("./../../")
let HttpServer = require("./servers/httpServer")
var argv = require('minimist')(process.argv.slice(2));
BigInt.prototype.toJSON = function() { return this.toString() }

process.setMaxListeners(0);

log4js.configure({
    appenders: { 
      console: { type: "stdout" },
      main: { type: "file" , filename: "./logs/front.out" },
    },
    categories: { 
      default: { appenders: ["main","console"], level: "debug" },
    },
});
var logger = log4js.getLogger();

let infraarr = JSON.parse(fs.readFileSync("./confs/infra.json"))

let emitter = new DEmmiter({
    name: "front",
    infra: infraarr,
    electionTime: [12000,18000],
    delayTime: 3000,
    heartbeatTime: 6000,
    level: "debug",
    ssl:{
        ca: "./certificates/ca.crt",
        cert_chain: "./certificates/server.crt",
        private_key: "./certificates/server.key"
    }
})

const port = 3000
let server = new HttpServer(emitter)
server.listen(port)
