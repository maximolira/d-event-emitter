const sequential = require('promise-sequential');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const rs = require('jsrsasign');
const log4js = require("log4js")
const PROTO_PATH = __dirname + "/confs/infra.proto";
const EventEmitter2 = require('eventemitter2');
const DEmitterService = require("./core/service")
const DEmitterEncryptor = require("./core/encryptor")

class DEmmiter {
    constructor(params){
        if(!params) throw new Error("params not defined")
        
        this.encryptor = new DEmitterEncryptor(this)

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
        this.RSApublic = params.RSApublic
        this.RSAprivate = params.RSAprivate
        this.metadataContext = [{
            name: this.name,
            updatedAt: new Date().getTime(),
            liat:  new Date().getTime(),
            events: {}
        }];
        this.owner = this.infrastructure.filter((item)=>{ return item.name == this.name })[0]
        this.listeners = []
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
        
        this.server.bindAsync(this.owner.host+':'+this.owner.port, grpc.ServerCredentials.createInsecure(),(error,port)=>{ 
            if(error) throw error
            this.server.start(); 
        })
        if(this.owner.startleader){
            this.leader = this.name
            setTimeout(()=> { this.election() },this.delayTime)
        } else {
            let leader = this.infrastructure.filter((item)=>{ return item.startleader })[0]
            this.leader = leader.name
        }
        setInterval(()=>{
            this.hearthbeat()
        },params.heartbeatTime)
    }
    hearthbeat(){
        let metadata = this.metadataContext.filter((item)=> { return item.name == this.name } )[0]
        if(metadata){
            let actual = new Date().getTime()
            if((metadata.liat + this.electionTime[1]) < actual){
                this.election()
            }
        }
        if(this.leader == this.name){
            let encrypted = this.encryptor.encrypt(JSON.stringify(this.metadataContext))
            var packageDef = protoLoader.loadSync(PROTO_PATH, this.loaderOptions);
            const DEmitterGRPCService = grpc.loadPackageDefinition(packageDef).DEmitterGRPCService
            let clis = this.infrastructure.filter((cli)=>{ return cli.name != this.name })
            let arrs = clis.map((cli)=>{
                var client = new DEmitterGRPCService(cli.host+":"+cli.port,grpc.credentials.createInsecure());
                return () => new Promise((resolve,reject)=>{
                    client.hearthbeat({ _id : new Date().getTime(), source : this.name, hash: encrypted }, (error, note) => { 
                        if(error){
                            resolve(undefined)
                        } else {
                            resolve(note)
                        }
                    })   
                })
            })
            sequential(arrs).then(res => { 
                res.forEach((tokened)=>{
                    try {
                        let detailobj = this.encryptor.decrypt(tokened.hash)
                        let remoteobj = JSON.parse(detailobj)
                        let found = false;
                        this.metadataContext.forEach((item,index)=>{
                            if(item.name == remoteobj.name){
                                found = true
                                this.metadataContext[index] = remoteobj
                            }
                        })
                        if(!found){
                            this.metadataContext.push(remoteobj)
                        }
                    } catch (error) {
                    }
                })
            })
        } 
    }
    election(){
        let clients = this.infrastructure.filter((item)=>{ return item.eligible })
        var packageDef = protoLoader.loadSync(PROTO_PATH, this.loaderOptions);
        const DEmitterGRPCService = grpc.loadPackageDefinition(packageDef).DEmitterGRPCService
        let arrs = clients.map((cli)=>{
            var client = new DEmitterGRPCService(cli.host+":"+cli.port,grpc.credentials.createInsecure());
            return () => new Promise((resolve,reject)=>{
                client.elections({ _id : new Date().getTime(), source : this.name }, (error, note) => {   
                    let name = this.name+".election"
                    let eventObject = {
                        eventName: name,
                        createdAt: new Date().getTime(),
                        target: cli.name,
                        source: this.name
                    };
                    if (error) {
                        eventObject["descr"]="error when call for election.";
                        this.eventEmitter.emit(name,eventObject)
                        resolve({source:"",vote:""})
                    } else {
                        eventObject["descr"]="called for election.";
                        let name = this.name+".election"
                        this.eventEmitter.emit(name,eventObject)
                        resolve(note)
                    }
                })
            })
        })
        sequential(arrs).then(res => { 
            let counter = {}
            res.map((item)=>{
                if(item.vote){
                    try {
                        let votefor = this.encryptor.decrypt(item.vote)
                        let factor = 1;
                        if(votefor == this.leader){
                            factor = 0.5;
                        }
                        if(counter[votefor]){
                            counter[votefor] = counter[votefor]  + (1 * factor)
                        } else {
                            counter[votefor] = (1 * factor)
                        }    
                    } catch (error) {}
                }
            })
            let keys = Object.keys(counter)
            let newleader = "", newleaderrecount = 0
            for (let index = 0; index < keys.length; index++) {
                const key = keys[index];
                if(newleaderrecount < counter[key]){
                    newleaderrecount = counter[key]
                    newleader = key
                }
            }
            let arrrefresh = this.infrastructure.map((cli)=>{
                return ()=> new Promise((resolve,reject)=>{
                    var client = new DEmitterGRPCService(cli.host+":"+cli.port,grpc.credentials.createInsecure());
                    let encrypted = this.encryptor.encrypt(newleader)
                    client.refresh({ _id : new Date().getTime(), source : this.name, leader: encrypted },(error, note) => {
                        let eventObject = {
                            eventName: this.name+".refresh",
                            descr:"called for election result.",
                            createdAt: new Date().getTime(),
                            target: cli.name,
                            source: this.name
                        };
                        if(error) {
                            eventObject["descr"] = "error when call for refresh"
                            this.eventEmitter.emit(this.name+".refresh",eventObject)
                            resolve(cli)
                        } else {
                            eventObject["descr"] = "refreshed"
                            this.eventEmitter.emit(this.name+".refresh",eventObject)
                            resolve(cli)
                        }
                    })
                })
            }) 
            sequential(arrrefresh).then(res => { 
                
            }).catch(err => { 
                throw err
            })         
        }).catch(err => { 
            throw err
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
            var packageDef = protoLoader.loadSync(PROTO_PATH, this.loaderOptions);
            const DEmitterGRPCService = grpc.loadPackageDefinition(packageDef).DEmitterGRPCService
            let leader = this.infrastructure.filter((item)=>{ return item.name == this.leader })[0]
            if(!leader){
                this.election()
                reject("not leader?")
            } else {
                var client = new DEmitterGRPCService(leader.host+":"+leader.port,grpc.credentials.createInsecure());
                let obj = { eventName:eventname, encodedArgs: args }
                let encrypted = this.encryptor.encrypt(JSON.stringify(obj))
                client.emit({ _id : new Date().getTime(), source : this.name, hash: encrypted },(error, note) => {
                    if(error) {
                        this.logger.debug(leader)
                        reject(error)
                    } else {
                        resolve(note)
                    }
                })
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