
const log4js = require("log4js")

var logger = log4js.getLogger();

class DefaultController {
    constructor(emitter){
        this.emitter = emitter
        this.makeid = (length) => {
            var result           = '';
            var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var charactersLength = characters.length;
            for ( var i = 0; i < length; i++ ) {
              result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
           return result;
        };
    }
    List(req, res){
        let eventresponsename = this.makeid(6);
        this.emitter.once(eventresponsename,(args)=>{ res.send(args) })
        this.emitter.emit("myNamespace.list",{responseTo: eventresponsename}).catch((error)=>logger.error(error))
    }
    Add(req, res){
        let eventresponsename = this.makeid(6);
        this.emitter.once(eventresponsename,(args)=>{ res.send(args) })
        this.emitter.emit("myNamespace.add",{test:req.query.test,responseTo: eventresponsename}).catch((error)=>logger.error(error))
    }
}
module.exports = DefaultController