// jshint esversion: 6, -W083
const pull = require('pull-stream');
const handshake = require('pull-handshake');
const tcp = require('pull-net/server');
const ws = require('pull-ws/server');

module.exports = function(http_server, opts = {}) {
    let tcpPort = opts.tcpPort || 9998;
    let wsPath = opts.wsPath || '/backend';
    let tcpAddress = opts.tcpAddress || '127.0.0.1';

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
    tcp_server.listen(tcpPort, tcpAddress);

    console.log(`Proxy: Connecting websocket at ${wsPath} to incoming tcp connections on port ${tcpPort} at ${tcpAddress}`);
    ws({
        server: http_server,
        path: wsPath
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
};
