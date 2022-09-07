const sequential = require('promise-sequential');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const rs = require('jsrsasign');
const PROTO_PATH = __dirname + "/confs/infra.proto";
const DEmitterService = require("./core/service")

class DEmmiter {
    constructor(params){
        if(!params) throw new Error("params not defined")
        this.infrastructure = params.infra
        this.name = params.name
        this.RSApublic = params.RSApublic
        this.RSAprivate = params.RSAprivate
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
            setTimeout(()=> { this.election() },3000)
        } else {
            let leader = this.infrastructure.filter((item)=>{ return item.startleader })[0]
            this.leader = leader.name
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
                    if (error) reject(error)
                    resolve(note)
                })
            })
        })
        sequential(arrs).then(res => { 
            let counter = {}
            let KJUR = rs.KJUR
            let KEYUTIL = rs.KEYUTIL
            let pvKey = KEYUTIL.getKey(this.RSAprivate.toString());
            res.map((item)=>{
                if(item.vote){
                    try {
                        let votefor = KJUR.crypto.Cipher.decrypt(item.vote, pvKey, 'RSA');
                        if(counter[votefor]){
                            counter[votefor] ++
                        } else {
                            counter[votefor] = 1
                        }    
                    } catch (error) {
                        console.error(error)
                    }
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
                    let pbKey = KEYUTIL.getKey(this.RSApublic.toString());
                    let encrypted = KJUR.crypto.Cipher.encrypt(newleader, pbKey, 'RSA');
                    client.refresh({ _id : new Date().getTime(), source : this.name, leader: encrypted },(error, note) => {
                        if(error) reject(error)
                        resolve(cli)
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
        return this.infrastructure.filter((item)=>{
            return item.name == this.leader
        })[0]
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
    }
    removeListener(eventName, listener1){
        let indexToRemove = -1
        this.listeners.forEach((listener,index)=>{
            if(listener.name == eventName && listener.listener.toString() == listener1.toString()){
                indexToRemove = index
            }
        })
        this.listeners.splice(indexToRemove,1)
    }
    emit(eventname,args){
        return new Promise((resolve,reject)=>{
            var packageDef = protoLoader.loadSync(PROTO_PATH, this.loaderOptions);
            const DEmitterGRPCService = grpc.loadPackageDefinition(packageDef).DEmitterGRPCService
            let leader = this.infrastructure.filter((item)=>{ return item.name == this.leader })[0]
            var client = new DEmitterGRPCService(leader.host+":"+leader.port,grpc.credentials.createInsecure());
    
            let obj = { eventName:eventname, encodedArgs: args }
            let KJUR = rs.KJUR
            let KEYUTIL = rs.KEYUTIL
            let pbKey = KEYUTIL.getKey(this.RSApublic.toString());
            let encrypted = KJUR.crypto.Cipher.encrypt(JSON.stringify(obj), pbKey, 'RSA');
    
            client.emit({ _id : new Date().getTime(), source : this.name, hash: encrypted },(error, note) => {
                if(error) 
                    reject(error)
                resolve(note)
            })
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
}

module.exports = DEmmiter