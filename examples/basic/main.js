const log4js = require("log4js")
const fs = require("fs")
let DEmmiter = require("./../../")
var argv = require('minimist')(process.argv.slice(2));
BigInt.prototype.toJSON = function() { return this.toString() }

process.setMaxListeners(0);

log4js.configure({
    appenders: { 
      main:
        { type: "stdout", filename: "./logs/main.log" },
    },
    categories: { 
      default: { appenders: ["main"], level: "debug" },
    },
});

var logger = log4js.getLogger();

logger.debug("processname::"+argv.name)

let infraarr = [{
    name: "test1",  //name of the worker
    host: "127.0.0.1", //host
    port: 65000, //port
    eligible: true, //if true worker can act as leader
    startleader: true // when start there must be only one :)
},{
    name: "test2",
    host: "127.0.0.1",
    port: 65001,
    eligible: true,
    startleader: false
}]

let pub = fs.readFileSync("./certificates/public.pem") //all worker need this
let prv = fs.readFileSync("./certificates/private.pem") //all worker need this


let emitter = new DEmmiter({
    name: argv.name,
    infra: infraarr,
    RSApublic: pub,
    RSAprivate: prv,
    level: "debug"
})

//setting a listener
emitter.on("myEvent",(args)=>{
    logger.debug("listener args::"+JSON.stringify(args))
})

//emit event only if worker is not the leader
setInterval(()=>{
    if(emitter.getLeader().name !== argv.name){
        logger.debug("emit::"+emitter.getLeader().name)
        emitter.emit("myEvent",{test:"qwerty",date: new Date().getTime()}).catch((error)=>{
            logger.debug("no other clients?")
        })
    }
},10000)


