const PROTO_PATH = __dirname + "/../confs/infra.proto";
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs")
class DEmitterClient {
    constructor(root,cli){
        this.self = root
        this.cli = cli

        let credentials = grpc.ServerCredentials.createInsecure()
        if(this.self.ssl){
            credentials = grpc.ChannelCredentials.createSsl(
                fs.readFileSync('./certificates/ca.crt'), 
                fs.readFileSync('./certificates/client.key'), 
                fs.readFileSync('./certificates/client.crt')
            );
        }


        this.loaderOptions = {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        };
        var packageDef = protoLoader.loadSync(PROTO_PATH, this.loaderOptions);
        const DEmitterGRPCService = grpc.loadPackageDefinition(packageDef).DEmitterGRPCService
        this.client = new DEmitterGRPCService(cli.host+":"+cli.port,credentials);
    }
    hearthbeat(encrypted){
        return () => new Promise((resolve,reject)=>{
            this.client.hearthbeat({ _id : new Date().getTime(), source : this.self.name, hash: encrypted }, (error, note) => { 
                if(error){
                    resolve(undefined)
                } else {
                    resolve(note)
                }
            })   
        })
    }
    election(){
        return () => new Promise((resolve,reject)=>{
            this.client.elections({ _id : new Date().getTime(), source : this.self.name }, (error, note) => {  
                let name = this.self.name+".election"
                let eventObject = {
                    eventName: name,
                    createdAt: new Date().getTime(),
                    target: this.cli.name,
                    source: this.self.name
                };
                if (error) {
                    eventObject["descr"]="error when call for election.";
                    this.self.eventEmitter.emit(name,eventObject)
                    resolve({source:"",vote:""})
                } else {
                    eventObject["descr"]="called for election.";
                    let name = this.self.name+".election"
                    this.self.eventEmitter.emit(name,eventObject)
                    resolve(note)
                }
            })
        })
    }
    refresh(encrypted){
        return () => new Promise((resolve,reject)=>{
            this.client.refresh({ _id : new Date().getTime(), source : this.self.name, leader: encrypted },(error, note) => {
                let eventObject = {
                    eventName: this.self.name+".refresh",
                    descr:"called for election result.",
                    createdAt: new Date().getTime(),
                    target: this.cli.name,
                    source: this.self.name
                };
                if(error) {
                    eventObject["descr"] = "error when call for refresh"
                    this.self.eventEmitter.emit(this.name+".refresh",eventObject)
                    resolve(this.cli)
                } else {
                    eventObject["descr"] = "refreshed"
                    this.self.eventEmitter.emit(this.name+".refresh",eventObject)
                    resolve(this.cli)
                }
            })
        })
    }
    emit(encrypted){
        return () => new Promise((resolve,reject)=>{
            this.client.emit({ _id : new Date().getTime(), source : this.self.name, hash: encrypted },(error, note) => {
                if(error) {
                    reject(error)
                } else {
                    resolve(note)
                }
            })
        })
    }
    listen(request){
        return () => new Promise((resolve,reject)=>{
            this.client.listen(request,(error, note) => {
                let name = this.self.name+".emitted"
                let eventObject = {
                    eventName: name,
                    createdAt: new Date().getTime(),
                    target: this.cli.name,
                    source: this.self.name
                };
                if(error) {
                    eventObject["descr"]="error when emmited.";
                    this.self.eventEmitter.emit(name,eventObject)
                    resolve(undefined)
                } else {
                    eventObject["descr"]="emmited.";
                    this.self.eventEmitter.emit(name,eventObject)
                    resolve(note)
                }
            })     
        })
    }
}
module.exports = DEmitterClient