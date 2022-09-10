const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const PROTO_PATH = __dirname + "/../confs/infra.proto";
const rs = require('jsrsasign');
const { getLogger } = require("log4js");

class DEmitterService {
    constructor(root){
        this.self = root
    }
    hearthbeat(caller,callback){      
        let KJUR = rs.KJUR
        let KEYUTIL = rs.KEYUTIL
        let pvKey = KEYUTIL.getKey(this.self.RSAprivate.toString());    
        try {
            let detailobj = KJUR.crypto.Cipher.decrypt(caller.request.hash, pvKey, 'RSA');
            this.self.metadataContext = JSON.parse(detailobj)
        } catch (error) {}
        let detail = {}
        this.self.listeners.forEach((listener)=>{
            if(detail[listener.name]){
                detail[listener.name] ++
            } else {
                detail[listener.name] = 1
            }
        })
        let retobj = {
            name: this.self.name,
            updatedAt: new Date().getTime(),
            liat:  new Date().getTime(),
            events: detail
        }
        let pbKey = KEYUTIL.getKey(this.self.RSApublic.toString());
        let encrypted = KJUR.crypto.Cipher.encrypt(JSON.stringify(retobj), pbKey, 'RSA');
        callback(null,{
            _id : new Date().getTime(),
            source : this.self.name,
            hash : encrypted
        });    
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
        let KJUR = rs.KJUR
        let KEYUTIL = rs.KEYUTIL
        let pvKey = KEYUTIL.getKey(this.self.RSAprivate.toString());
        let event1;
        try {
            let jsonStr = KJUR.crypto.Cipher.decrypt(caller.request.hash, pvKey, 'RSA');
            event1 = JSON.parse(jsonStr)            
        } catch (error) {}
        let founds = []
        if(event1){
            let tags = this.self.metadataContext.filter((item)=>{
                let events = Object.keys(item.events)
                let returnv = false
                events.forEach((evt)=>{
                    let comprv = ""
                    if(evt.endsWith("*")){
                        comprv = evt.substring(0,evt.length - 1)
                    } else {
                        comprv = evt
                    }
                    returnv = (event1.eventName.startsWith(comprv))
                })
                return returnv
            })
            founds = tags.map((item)=>{
                return this.self.infrastructure.filter((item2)=>{
                    return item2.name == item.name
                })[0]
            })
        }
        founds.forEach((cli)=>{
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
                let nextelection = nextPeriod(this.self.electionTime[0],this.self.electionTime[1])
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