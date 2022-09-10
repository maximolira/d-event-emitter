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
    electionTime: [10000,20000],
    delayTime: 3000,
    level: "debug"
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
        emitter.emit("myNamespace.myEvent1",{test:"event1",date: new Date().getTime()})
        emitter.emit("myNamespace.myEvent2",{test:"event2",date: new Date().getTime()})
    }
},10000)


//local emitter events
/*
emitter.statusEmitter().on(argv.name+".*",(event) =>{
    logger.debug(event);
});
*/
