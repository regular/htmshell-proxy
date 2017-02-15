//jshint esversion: 6
const crypto = require('crypto');
const pull = require('pull-stream');
const tcp = require('pull-net/client');
const handshake = require('pull-handshake');
const toStream = require('pull-stream-to-stream');
const dnode = require('dnode');

function shakeHands(random, cb) {
    let stream = handshake(cb); // TODO: smae cb as below?!
    let shake = stream.handshake;
    console.log(`Random cookie: ${random}`);
    shake.write(random);
    shake.read(2, (err, data) => {
        if (err) {
            console.error(`backend proxy: read failed: ${err}`);
            return cb(err);
        }
        if (data.toString() == 'OK') return cb(null, shake.rest());
        cb(new Error(`Handshake failed: ${data.toString()}`));
    });
    return stream;
}

module.exports = function(cookie, api, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    let tcpPort = opts.tcpPort || 9998;
    let tcpAddress = opts.tcpAddress || '127.0.0.1';

    let backend = shakeHands(cookie, (err, client) => {
        if (err) {
            cb(err);
            return pull.error(err);
        }
        let d = dnode(api).on('remote', remote => cb(null, remote) );
        
        d.pipe(toStream(
            pull(
                pull.map( s => Buffer.from(s) ),
                client,
                pull.map( b => b.toString() )
            )
        )).pipe(d);
    });

    let tcpStream = tcp(tcpPort, tcpAddress);
    pull(backend, tcpStream, backend);
};

module.exports.randomCookie = function() {
    return Buffer.from(crypto.randomBytes(16).toString('hex'));
};
