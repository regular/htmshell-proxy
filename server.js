// jshint esversion: 6, -W083
const http = require('http');
const ecstatic = require('ecstatic')(__dirname, {
    cache: "no-cache"
});

const pull = require('pull-stream');
const handshake = require('pull-handshake');
const tcp = require('pull-net/server');

function shakeHands(cb) {
    let stream = handshake(cb); // TODO: smae cb as below?!
    let shake = stream.handshake;
    shake.read(32, (err, random) => {
        if (err) return cb(err);
        console.log(`Random cookie: ${random.toString()}`);
        shake.write(Buffer.from('OK'));
        cb(null, shake.rest());
    });
    return stream;
}

let tcp_server = tcp( (client) => {
    let proxy = shakeHands( (err, stream) => {
        if (err) throw err;
        pull(
            pull.once(Buffer.from('hdllo from proxy!')),
            stream,
            pull.map( b => b.toString() ),
            pull.log()
        );
    });
    pull(proxy, client, proxy); //ECHO
});
tcp_server.listen(9998, '127.0.0.1');


let http_server = http.createServer(ecstatic);
http_server.listen(9999, '127.0.0.1', ()=>{
    console.log(`ready, listening on ${http_server.address().port}`);
});
 

