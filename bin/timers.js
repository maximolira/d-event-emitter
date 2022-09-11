const sequential = require('promise-sequential');
const DEmitterClient = require("./cli")

class DEmitterTimers {
    constructor(root){
        this.self = root
    }
    init(){
        if(this.self.owner.startleader){
            this.self.leader = this.self.name
            setTimeout(()=> { 
                sequential([this.election()]).then(_ => { 

                })
            },this.self.delayTime)
        } else {
            let leader = this.self.infrastructure.filter((item)=>{ return item.startleader })[0]
            this.self.leader = leader.name
        }
        setInterval(()=>{
            this.hearthbeat()
        },this.self.heartbeatTime)
    }
    hearthbeat(){
        let metadata = this.self.metadataContext.filter((item)=> { return item.name == this.self.name } )[0]
        if(metadata){
            let actual = new Date().getTime()
            if((metadata.liat + this.self.electionTime[1]) < actual){
                sequential([this.election()]).then(_ => { 
                    
                })
            }
        }
        if(this.self.leader == this.self.name){
            let encrypted = this.self.compressor.compress(JSON.stringify(this.self.metadataContext))
            let clis = this.self.infrastructure.filter((cli)=>{ return cli.name != this.self.name })
            let arrs = clis.map((cli)=>{
                var client = new DEmitterClient(this.self,cli)
                return client.hearthbeat(encrypted)
            })
            sequential(arrs).then(res => { 
                res.forEach((tokened)=>{
                    try {
                        let detailobj = this.self.compressor.decompress(tokened.hash)
                        let remoteobj = JSON.parse(detailobj)
                        let found = false;
                        this.self.metadataContext.forEach((item,index)=>{
                            if(item.name == remoteobj.name){
                                found = true
                                this.self.metadataContext[index] = remoteobj
                            }
                        })
                        if(!found){
                            this.self.metadataContext.push(remoteobj)
                        }
                    } catch (error) {
                    }
                })
            })
        } 
    }
    election(){
        return () => new Promise((resolve,reject)=>{
            let clients = this.self.infrastructure.filter((item)=>{ return item.eligible })
            let arrs = clients.map((cli)=>{
                var client = new DEmitterClient(this.self,cli)
                return client.election()
            })
            sequential(arrs).then(res => { 
                let counter = {}
                res.map((item)=>{
                    if(item.vote){
                        try {
                            let votefor = this.self.compressor.decompress(item.vote)
                            let factor = 1;
                            if(votefor == this.self.leader){
                                factor = 0.5;
                            }
                            if(counter[votefor]){
                                counter[votefor] = counter[votefor]  + (1 * factor)
                            } else {
                                counter[votefor] = (1 * factor)
                            }    
                        } catch (error) {}
                    }
                })
                let keys = Object.keys(counter)
                let newleader = "", newleaderrecount = 0
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index];
                    if(newleaderrecount < counter[key]){
                        newleaderrecount = counter[key]
                        newleader = key
                    }
                }
                let encrypted = this.self.compressor.compress(newleader)
                let arrrefresh = this.self.infrastructure.map((cli)=>{
                    let client = new DEmitterClient(this.self,cli)
                    return client.refresh(encrypted)
                }) 
                sequential(arrrefresh).then(res => { 
                    
                }).catch(err => { 
                    throw err
                })         
            }).catch(err => { 
                throw err
            })

        })
    }
}
module.exports = DEmitterTimers