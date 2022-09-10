const log4js = require("log4js")
const fs = require("fs")
const express = require('express')
const DEmmiter = require("d-event-emitter")

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

makeid = (length) => {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
   return result;
};

errorNoCli = (error)=>{
  logger.debug("no other clients?")
};

let infraarr = JSON.parse(fs.readFileSync("./confs/infra.json"))
let pub = fs.readFileSync("./certificates/public.pem") //all worker need this
let prv = fs.readFileSync("./certificates/private.pem") //all worker need this

let emitter = new DEmmiter({
  name: "front-controller",
  infra: infraarr,
  RSApublic: pub,
  RSAprivate: prv, 
  electionTime: [60000,120000],
  delayTime: 3000,
  heartbeatTime: 6000,
  level: "debug"
})


const app = express()
const port = 3000

app.get('/user', (req, res) => {
    let eventresponsename = makeid(6);
    emitter.once(eventresponsename,(args)=>{ res.send(args) })
    emitter.emit("user::list",{responseTo:eventresponsename}).catch(errorNoCli)
})


app.get('/products', (req, res) => {
  let eventresponsename = makeid(6);
  emitter.once(eventresponsename,(args)=>{ res.send(args) })
  emitter.emit("prd::list",{responseTo:eventresponsename}).catch(errorNoCli)
})

app.get('/add_user', (req, res) => {
    let eventresponsename = makeid(6);
    emitter.once(eventresponsename,(args)=>{ res.send(args) })
    emitter.emit("user::add",{responseTo:eventresponsename,username:req.query.username}).catch(errorNoCli)
})

app.get('/del_user', (req, res) => {
    let eventresponsename = makeid(6);
    emitter.once(eventresponsename,(args)=>{ res.send(args) })
    emitter.emit("user::del",{responseTo:eventresponsename,username:req.query.username}).catch(errorNoCli)
})

app.listen(port, () => {
  logger.debug(`Example app listening on port ${port}`)
})

