# d-event-emitter
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

//RSA security certificates, these must be shared by all clients
let pub = fs.readFileSync("./certificates/public.pem") //all worker need this
let prv = fs.readFileSync("./certificates/private.pem") //all worker need this

let emitter = new DEmmiter({
    name: argv.name,
    infra: infraarr,
    RSApublic: pub,
    RSAprivate: prv,
    level: "debug" //optional parameter for debugging, default value: error (log4js)
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

## License

<a href="https://www.buymeacoffee.com/maximolira" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

  [Apache 2.0](LICENSE)