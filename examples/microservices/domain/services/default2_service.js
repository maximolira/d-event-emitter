
const log4js = require("log4js")
const DataAcessObject = require("../../adapters/database/data_access_object")
var logger = log4js.getLogger();

class DefaultService2 {
    constructor(){
        this.dao = new DataAcessObject()
    }
    add(test){
        return new Promise((resolve,reject)=>{
            this.dao.exec("insert into test(test) values (?)",[test]).then((_)=>{
                resolve({code:200,status:"ok",value:"ok"})
            })
        })
    }
}
module.exports = DefaultService2