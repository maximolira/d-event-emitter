# d-event-emitter v(0.2.1)
event emitter using interprocess network layer

## Installation

```
npm install d-event-emitter
```

## Basic configuration

  Details of the infrastructure must be provided, and the corresponding security certificates


```js

const DEmmiter = require("d-event-emitter")

//array with the infrastructure configuration
let infraarr = [{
    name: "test1",  //name of the worker
    host: "127.0.0.1", //host
    port: 65000, //port
    eligible: true, //if true worker can act as leader
    startleader: true // when start there must be only one :)
},{
    name: "test2",
    host: "127.0.0.1",
    port: 65001,
    eligible: true,
    startleader: false
}]


let emitter = new DEmmiter({
    name: argv.name,
    infra: infraarr,
    electionTime: [60000,120000],  //interval of election
    delayTime: 3000, //delay start time before first election
    heartbeatTime: 6000, //heartbeat event timer
    level: "debug" //optional parameter for debugging, default value: error (log4js)
    // if SSL certificates are not included, the connection will be made using insecure mode
    ssl:{
        ca: "./certificates/ca.crt", //SSL ca certificate
        cert_chain: "./certificates/server.crt", // SSL cert_chain certificate
        private_key: "./certificates/server.key" // SSL private key
    }
})
```


## Examples

  Basic usage examples are detailed below. Arguments passed to the event must be serializable values. Other usage examples are located in the examples folder

```js
//setting a listener
emitter.on("myEvent",(args)=>{
    console.log("listener args::"+JSON.stringify(args))
})

emitter.emit("myEvent",{test:"qwerty",date: new Date().getTime()}).catch((error)=>{
    console.log("no other clients?")
})

```

  Wildcard character ("*") support for namespace in event listening

```js
//setting a listener
emitter.on("myNamespace.MyEvent1",(args)=>{
    console.log("listener event1 args::"+JSON.stringify(args))
})

emitter.on("myNamespace.*",(args)=>{
    console.log("listener all events args::"+JSON.stringify(args))
})

emitter.emit("myNamespace.MyEvent1",{test:"event1",date: new Date().getTime()})
emitter.emit("myNamespace.MyEvent2",{test:"event2",date: new Date().getTime()})

```

## License

<a href="https://www.buymeacoffee.com/maximolira" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

  [Apache 2.0](LICENSE)