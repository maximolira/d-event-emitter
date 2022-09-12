
const log4js = require("log4js")
const DataAcessObject = require("./../../adapters/database/data_access_object")
var logger = log4js.getLogger();

class DefaultService1 {
    constructor(){
        this.dao = new DataAcessObject()
    }
    list(){
        return new Promise((resolve,reject)=>{
            this.dao.exec("select * from test",[]).then((retades)=>{
                resolve(retades)
            })
        })
    }
}
module.exports = DefaultService1