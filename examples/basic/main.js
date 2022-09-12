const log4js = require("log4js")
const fs = require("fs")
let DEmmiter = require("./../../")
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

logger.debug("processname::"+argv.name)

let infraarr = [{
    name: "test1",  //name of the worker
    host: "localhost", //host
    port: 65000, //port
    eligible: true, //if true worker can act as leader
    startleader: true // when start there must be only one :)
},{
    name: "test2",
    host: "localhost",
    port: 65001,
    eligible: true,
    startleader: false
},{
    name: "test3",
    host: "localhost",
    port: 65002,
    eligible: true,
    startleader: false
}]



let emitter = new DEmmiter({
    name: argv.name,
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
emitter.on("myNamespace.myEvent1",(args)=>{
    logger.debug("listener event 1 args::"+JSON.stringify(args))
})

//setting a listener
emitter.on("myNamespace.*",(args)=>{
    logger.debug("listener all events args::"+JSON.stringify(args))
})


//emit event only if worker is not the leader
setInterval(()=>{
    if(emitter.getLeader().name !== argv.name){
        logger.debug("emit::"+emitter.getLeader().name)
        emitter.emit("myNamespace.myEvent1",{test:"event1",date: new Date().getTime()}).catch((error)=>console.log(error))
        emitter.emit("myNamespace.myEvent2",{test:"event2",date: new Date().getTime()}).catch((error)=>console.log(error))
    }
},10000)


//local emitter events

emitter.statusEmitter().on(argv.name+".election",(event) =>{
    logger.debug(event);
});

