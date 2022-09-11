const log4js = require("log4js")
const fs = require("fs")
const DEmmiter = require("./../../../")


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
    name: "worker-users",
    infra: infraarr,
    RSApublic: pub,
    RSAprivate: prv,
    electionTime: [60000,120000],
    delayTime: 3000,
    heartbeatTime: 6000,
    level: "debug",
    ssl:{
        ca: "./certificates/ca.crt",
        cert_chain: "./certificates/server.crt",
        private_key: "./certificates/server.key"
    }
})

let usersList = []

emitter.on("user::add",(args)=>{
    usersList.push({username:args.username,created_at:new Date().getTime()})
    emitter.emit(args.responseTo,{status:"ok"}).catch((error)=>{
        logger.error(error)
    })
})

emitter.on("user::del",(args)=>{
    let toRemove = -1
    usersList.forEach((user,index)=>{
        if(user.username == args.username){
            toRemove = index
        }
    })
    usersList.splice(toRemove,1)
    emitter.emit(args.responseTo,{status:"ok"}).catch((error)=>{
        logger.error(error)
    })
})

emitter.on("user::list",(args)=>{
    emitter.emit(args.responseTo,{status:"ok",list:usersList}).catch((error)=>{
        logger.error(error)
    })
})

logger.debug("starting worker")