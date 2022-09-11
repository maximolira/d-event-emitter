const sequential = require('promise-sequential');
const DEmitterClient = require("./cli")

class DEmitterService {
    constructor(root){
        this.self = root
    }
    hearthbeat(caller,callback){      
        try {
            let detailobj = this.self.encryptor.decrypt(caller.request.hash)
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
        let encrypted = this.self.encryptor.encrypt(JSON.stringify(retobj))
        callback(null,{
            _id : new Date().getTime(),
            source : this.self.name,
            hash : encrypted
        });    
    }
    listen(caller,callback){
        try {
            let jsonStr = this.self.encryptor.decrypt(caller.request.hash)
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
        
        let event1;
        try {
            let jsonStr = this.self.encryptor.decrypt(caller.request.hash)
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
        let promarr = []
        founds.forEach((cli)=>{
            var client = new DEmitterClient(this.self,cli)
            promarr.push(client.listen(caller.request))
        })
        sequential(promarr).then(_ => { 
            callback(null,{
                _id : new Date().getTime(),
                source : this.self.name,
                status : "ok"
            });      
        })
    }
    refresh(caller,callback){
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
            this.self.leader = this.self.encryptor.decrypt(caller.request.leader)
            if(this.self.name == this.self.leader){
                let nextPeriod = (min, max) => {  return Math.floor(Math.random() * (max - min + 1) + min) };
                let nextelection = nextPeriod(this.self.electionTime[0],this.self.electionTime[1])
                setTimeout(()=> { this.self.timers.election() },nextelection)
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
        let encrypted = this.self.encryptor.encrypt(vote)
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