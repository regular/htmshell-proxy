// jshint esversion: 6, -W083
const http = require('http');
const ecstatic = require('ecstatic')(__dirname, {
    cache: "no-cache"
});

const pull = require('pull-stream');
const defer = require('pull-defer');
const handshake = require('pull-handshake');
const tcp = require('pull-net/server');
const ws = require('pull-ws/server');

let http_server = http.createServer(ecstatic);
http_server.listen(9999, '127.0.0.1', ()=>{
    console.log(`ready, listening on ${http_server.address().port}`);
});
 
let connections = {};

function shakeHands(cb, verifyCookie) {
    let stream = handshake(cb); // TODO: smae cb as below?!
    let shake = stream.handshake;
    shake.read(32, (err, cookie) => {
        if (err) return cb(err);
        if (verifyCookie && !verifyCookie(cookie.toString())) {
            shake.write(Buffer.from('ER'));
            return cb(new Error('Cookie is invalid'));
        }
        shake.write(Buffer.from('OK'));
        cb(null, {
            cookie: cookie.toString(),
            stream: shake.rest()
        });
    });
    return stream;
}

let tcp_server = tcp( (backend) => {
    let proxy = shakeHands( (err, result) => {
        if (err) {
            console.log(err);
            return pull.error(err);
        }
        let {stream, cookie} = result;
        console.log(`backend cookie: ${cookie}`);
        connections[cookie] = stream;
    });
    pull(proxy, backend, proxy);
});
tcp_server.listen(9998, '127.0.0.1');

ws({
    server: http_server,
    path: '/backend'
}, (client) => {
    let proxy = shakeHands( (err, result) => {
        if (err) {
            console.log(err);
            return pull.error(err);
        }
        let {stream, cookie} = result;
        console.log(`Cookie from web: ${cookie}`);
        let backend = connections[cookie];
        
        pull(
            backend,
            pull.map( b => {
                console.log(`backend to browser: ${b.toString()}`);
                return b;
            }),
            stream,
            pull.map( b => {
                console.log(`browser to backend: ${b.toString()}`);
                return b;
            }),
            backend
        );
    }, function verifyCookie(cookie) {
        return connections[cookie];
    });
    pull(proxy, client, proxy);
});
