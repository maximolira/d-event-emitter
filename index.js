const sequential = require('promise-sequential');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const log4js = require("log4js")
const fs = require("fs")
const PROTO_PATH = __dirname + "/confs/infra.proto";
const EventEmitter2 = require('eventemitter2');
const DEmitterService = require("./bin/service")
const DEmitterCompressor = require("./bin/compressor")
const DEmitterClient = require("./bin/cli")
const DEmitterTimers = require("./bin/timers")
class DEmmiter {
    constructor(params){
        if(!params) throw new Error("params not defined")    
        this.compressor = new DEmitterCompressor(this)
        this.timers = new DEmitterTimers(this)
        log4js.configure({
            appenders: { 
              main:
                { type: "stdout" },
            },
            categories: { 
              default: { appenders: ["main"], level: params.level || 'error' },
            },
        });        
        this.logger = log4js.getLogger();
        this.eventEmitter = new EventEmitter2({
            wildcard: true,
            delimiter: '.', 
            newListener: false, 
            removeListener: false, 
            maxListeners: 10,
            verboseMemoryLeak: false,
            ignoreErrors: false
        });
        this.infrastructure = params.infra
        this.name = params.name
        this.electionTime = params.electionTime
        this.delayTime = params.delayTime
        this.heartbeatTime = params.heartbeatTime
        this.ssl = params.ssl
        this.metadataContext = [{
            name: this.name,
            updatedAt: new Date().getTime(),
            liat:  new Date().getTime(),
            events: {}
        }];
        this.owner = this.infrastructure.filter((item)=>{ return item.name == this.name })[0]
        this.listeners = []
        this.timers.init()
        let credentials = grpc.ServerCredentials.createInsecure()
        if(params.ssl){
            credentials = grpc.ServerCredentials.createSsl(
                fs.readFileSync(params.ssl.ca), [{
                cert_chain: fs.readFileSync(params.ssl.cert_chain),
                private_key: fs.readFileSync(params.ssl.private_key)
            }], true);
        }
        this.loaderOptions = {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        };
        this.server = new grpc.Server();
        var packageDef = protoLoader.loadSync(PROTO_PATH, this.loaderOptions);
        const grpcObj = grpc.loadPackageDefinition(packageDef);
        this.server.addService(grpcObj.DEmitterGRPCService.service, new DEmitterService(this) )
        this.server.bindAsync(this.owner.host+':'+this.owner.port, credentials ,(error,port)=>{ 
            if(error) throw error
            this.server.start(); 
        })
    } 
    getLeader(){
        let leader = this.infrastructure.filter((item)=>{
            return item.name == this.leader
        })[0]
        if(leader){
            return leader
        } else {
            return { name : ""}
        }
    }
    addListener(eventName, listener1){
        let exist = false
        this.listeners.forEach((listener)=>{
            if(listener.name == eventName && listener1.toString() ==listener.listener.toString() ){
                exist = true
            }
        })
        if(!exist){
            this.listeners.push({name:eventName,listener:listener1})
            let detail = {}
            this.listeners.forEach((listener)=>{
                if(detail[listener.name]){
                    detail[listener.name] ++
                } else {
                    detail[listener.name] = 1
                }
            })        
            this.metadataContext.forEach((item,index)=>{
                if(item.name == this.name){
                    this.metadataContext[index].events = detail
                    this.metadataContext[index].updatedAt = new Date().getTime()
                    this.metadataContext[index].liat = new Date().getTime()
                }
            })
        }
    }
    removeAllListener(eventName){
        let newlisteners = []
        this.listeners.forEach((listener,index)=>{
            if(listener.name !== eventName){
                newlisteners.push(listener)
            }
        })
        this.listeners = newlisteners
        let detail = {}
        this.listeners.forEach((listener)=>{
            if(detail[listener.name]){
                detail[listener.name] ++
            } else {
                detail[listener.name] = 1
            }
        })
        this.metadataContext.forEach((item,index)=>{
            if(item.name == this.name){
                this.metadataContext[index].events = detail
                this.metadataContext[index].updatedAt = new Date().getTime()
                this.metadataContext[index].liat = new Date().getTime()
            }
        })
    }
    removeListener(eventName, listener1){
        let indexToRemove = -1
        this.listeners.forEach((listener,index)=>{
            if(listener.name == eventName && listener.listener.toString() == listener1.toString()){
                indexToRemove = index
            }
        })
        this.listeners.splice(indexToRemove,1)
        let detail = {}
        this.listeners.forEach((listener)=>{
            if(detail[listener.name]){
                detail[listener.name] ++
            } else {
                detail[listener.name] = 1
            }
        })
        this.metadataContext.forEach((item,index)=>{
            if(item.name == this.name){
                this.metadataContext[index].events = detail
                this.metadataContext[index].updatedAt = new Date().getTime()
                this.metadataContext[index].liat = new Date().getTime()
            }
        })
    }
    emit(eventname,args){
        return new Promise((resolve,reject)=>{
            let leader = this.infrastructure.filter((item)=>{ return item.name == this.leader })[0]
            if(!leader){
                sequential([this.timers.election()]).then(_ => { 
                    reject("not leader?")    
                }).catch(err => { })  
            } else {
                let client = new DEmitterClient(this,leader)
                let obj = { eventName:eventname, encodedArgs: args }
                let encrypted = this.compressor.compress(JSON.stringify(obj))
                sequential([client.emit(encrypted)]).then(res => { 
                    resolve(res[0])    
                }).catch(err => { })  
            }
        })
    }
    on(eventName,listener){
        this.addListener(eventName, listener)
        return this
    }
    off(eventName,listener){
        this.removeListener(eventName,listener)
        return this
    }
    once(eventName,listener1){
        let listener = (args)=>{
            this.removeListener(eventName,listener)
            listener1(args)
        };
        this.addListener(eventName,listener)
    }
    statusEmitter(){
        return this.eventEmitter
    }
    getMetadataContext(){
        return this.metadataContext
    }
}

module.exports = DEmmiter