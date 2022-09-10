const log4js = require("log4js")
const fs = require("fs")
const DEmmiter = require("d-event-emitter")

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
let pub = fs.readFileSync("./certificates/public.pem") //all worker need this
let prv = fs.readFileSync("./certificates/private.pem") //all worker need this

let emitter = new DEmmiter({
    name: "worker-users",
    infra: infraarr,
    RSApublic: pub,
    RSAprivate: prv,
    electionTime: [10000,20000],
    delayTime: 3000,
    level: "debug"
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