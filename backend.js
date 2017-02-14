//jshint esversion: 6

const cookie = "01234567890123456789012345678912";

const crypto = require('crypto');
const pull = require('pull-stream');
const tcp = require('pull-net/client');
const handshake = require('pull-handshake');

function shakeHands(cb) {
    let stream = handshake(cb); // TODO: smae cb as below?!
    let shake = stream.handshake;
    //let random = Buffer.from(crypto.randomBytes(16).toString('hex'));
    let random = Buffer.from(cookie);
    console.log(`Random cookie: ${random}`);
    shake.write(random);
    shake.read(2, (err, data) => {
        if (err) return cb(err);
        if (data.toString() == 'OK') return cb(null, shake.rest());
        cb(new Error(`Handshake failed: ${data.toString()}`));
    });
    return stream;
}

let backend = shakeHands( (err, client) => {
    if (err) throw err;
    pull(
        client,
        pull.map( b => Buffer.from(b.toString().toUpperCase()) ),
        client
    );
});

let tcpStream = tcp(9998, '127.0.0.1');
pull(backend, tcpStream, backend);
