const log4js = require("log4js")

let DefaultService1 = require("./../../domain/services/default1_service")
var logger = log4js.getLogger();

class DefaultPort1 {
    constructor(emitter){
        this.emitter = emitter
        this.service1 = new DefaultService1();
        this.emitter.on("myNamespace.list",(args)=>this.list(args))
    }
    list(args){
        this.service1.list().then((list)=>{
            this.emitter.emit(args.responseTo,list).catch((error)=>{
                logger.error(error)
            })
        })
    }
}
module.exports = DefaultPort1