const log4js = require("log4js")

class DataAcessObject {
    constructor(){
        this.knex = require('knex')({
            client: 'sqlite3', // or 'better-sqlite3'
            useNullAsDefault: false,
            connection: {
                filename: './data/dev.sqlite3'
            }
        });
    }
    exec(selectStatement,binding){
        return new Promise((resolve,reject)=>{
            this.knex.raw(selectStatement,binding).then((result)=>{
                resolve(result)
            })
        })
    }
}
module.exports = DataAcessObject