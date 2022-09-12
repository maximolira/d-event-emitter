const express = require('express')
const log4js = require("log4js")

const DefaultController = require("../adapters/controllers/default_controller")

var logger = log4js.getLogger();

class HttpServer {
    constructor(emitter){
        this.emitter = emitter
        this.app = express()
        this.defaultController = new DefaultController(this.emitter)
        this.app.get('/',(req, res)=>this.defaultController.List(req,res))
        this.app.get('/add', (req, res)=>this.defaultController.Add(req,res))
    }
    listen(port){
        this.app.listen(port, () => {
            logger.debug(`Example app listening on port ${port}`)
        })
    }
}
module.exports = HttpServer