const log4js = require("log4js")
const fs = require("fs")
let DEmmiter = require("../..")
let DefaultPort1 = require("./adapters/ports/default_ports1")
var argv = require('minimist')(process.argv.slice(2));
BigInt.prototype.toJSON = function() { return this.toString() }

process.setMaxListeners(0);

log4js.configure({
    appenders: { 
      main:
        { type: "stdout" },
    },
    categories: { 
      default: { appenders: ["main"], level: "debug" },
    },
});
var logger = log4js.getLogger();

let infraarr = JSON.parse(fs.readFileSync("./confs/infra.json"))

let emitter = new DEmmiter({
    name: "agent1",
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

//setting a listener

let defaultPort = new DefaultPort1(emitter)
logger.debug("start listener1")
