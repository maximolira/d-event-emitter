
const log4js = require("log4js");
const DefaultService2 = require("../../domain/services/default2_service");

var logger = log4js.getLogger();

class DefaultPort2 {
    constructor(emitter){
        this.emitter = emitter
        this.service2 = new DefaultService2();
        this.emitter.on("myNamespace.add",(args)=>this.add(args))
    }
    add(args){
        this.service2.add(args.test).then((_)=>{
            this.emitter.emit(args.responseTo,{code:200,status:"ok",value:"ok"}).catch((error)=>{
                logger.error(error)
              })
        })
    }
}
module.exports = DefaultPort2