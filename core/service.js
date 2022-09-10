const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const PROTO_PATH = __dirname + "/../confs/infra.proto";
const rs = require('jsrsasign');

class DEmitterService {
    constructor(root){
        this.self = root
    }
    listen(caller,callback){
        let KJUR = rs.KJUR
        let KEYUTIL = rs.KEYUTIL
        let pvKey = KEYUTIL.getKey(this.self.RSAprivate.toString());
        try {
            let jsonStr = KJUR.crypto.Cipher.decrypt(caller.request.hash, pvKey, 'RSA');
            let obj = JSON.parse(jsonStr)
            let affecteds = this.self.listeners.filter((list)=>{ 
                if(list.name.endsWith("*")){
                    let tmplistv = list.name.substring(0,list.name.length - 1);
                    return obj.eventName.startsWith(tmplistv);
                } else {
                    return list.name == obj.eventName 
                }
            })
            affecteds.forEach((callback1)=>{
                let args = obj.encodedArgs
                callback1.listener(args)
            })
            let name = this.self.name+".listened"
            let eventObject = {
                eventName: name,
                descr: "event listened",
                createdAt: new Date().getTime(),
                target: this.self.name,
                source: this.self.name
            };
            this.self.eventEmitter.emit(name,eventObject)
            callback(null,{
                _id : new Date().getTime(),
                source : this.self.name,
                status : "ok"
            });    
        } catch (error) {
            callback(null,{
                _id : new Date().getTime(),
                source : this.self.name,
                status : "error"
            });    
        }
        
    }
    emit(caller,callback){
        var packageDef = protoLoader.loadSync(PROTO_PATH, this.self.loaderOptions);
        const DEmitterGRPCService = grpc.loadPackageDefinition(packageDef).DEmitterGRPCService
        this.self.infrastructure.forEach((cli)=>{
            var client = new DEmitterGRPCService(cli.host+":"+cli.port,grpc.credentials.createInsecure());
            client.listen(caller.request,(error, note) => {
                let name = this.name+".emitted"
                let eventObject = {
                    eventName: name,
                    createdAt: new Date().getTime(),
                    target: cli.name,
                    source: this.name
                };
                if(error) {
                    eventObject["descr"]="error when emmited.";
                    this.self.eventEmitter.emit(name,eventObject)
                } else {
                    eventObject["descr"]="emmited.";
                    this.self.eventEmitter.emit(name,eventObject)
                }
            })
        })
        callback(null,{
            _id : new Date().getTime(),
            source : this.self.name,
            status : "ok"
        });
    }
    refresh(caller,callback){
        let KJUR = rs.KJUR
        let KEYUTIL = rs.KEYUTIL
        let pvKey = KEYUTIL.getKey(this.self.RSAprivate.toString());
        
        let name = this.self.name+".refreshed"
        let eventObject = {
            eventName: name,
            descr: "refreshed elections results",
            createdAt: new Date().getTime(),
            target: this.self.name,
            source: this.self.name
        };
        this.self.eventEmitter.emit(name,eventObject)
        
        try {
            this.self.leader = KJUR.crypto.Cipher.decrypt(caller.request.leader, pvKey, 'RSA');
            if(this.self.name == this.self.leader){
                let nextPeriod = (min, max) => {  return Math.floor(Math.random() * (max - min + 1) + min) };
                let nextelection = nextPeriod(10000,20000)
                setTimeout(()=> { this.self.election() },nextelection)
            }
            callback(null,{
                _id : new Date().getTime(),
                source : this.self.name,
            })    
        } catch (error) {
            callback(null,{
                _id : new Date().getTime(),
                source : this.self.name,
            })    
        }
        
    }
    elections(caller, callback){ 
        let elector = (min, max) => {  return Math.floor(Math.random() * (max - min + 1) + min) };
        let clients = this.self.infrastructure.filter((item)=>{
            return item.eligible
        })
        let vote = ""
        if(clients.length > 1){
            let optionvote = elector(0,clients.length - 1)
            vote = clients[optionvote].name
        } else if(clients.length == 1) {
            vote = clients[0].name
        } 

        let KJUR = rs.KJUR
        let KEYUTIL = rs.KEYUTIL
        let pbKey = KEYUTIL.getKey(this.self.RSApublic.toString());
        let encrypted = KJUR.crypto.Cipher.encrypt(vote, pbKey, 'RSA');
        let name = this.self.name+".vote"
        let eventObject = {
            eventName: name,
            descr: "vote",
            createdAt: new Date().getTime(),
            target: this.self.name,
            source: this.self.name
        };
        this.self.eventEmitter.emit(name,eventObject)
        callback(null,{
            _id : new Date().getTime(),
            source : this.self.name,
            vote : encrypted
        });
    }
}
module.exports = DEmitterService