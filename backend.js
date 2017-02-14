//jshint esversion: 6
const crypto = require('crypto');
const pull = require('pull-stream');
const tcp = require('pull-net/client');
const handshake = require('pull-handshake');

function shakeHands(cb) {
    let stream = handshake(cb); // TODO: smae cb as below?!
    let shake = stream.handshake;
    let random = Buffer.from(crypto.randomBytes(16).toString('hex'));
    console.log(`Random cookie: ${random}`);
    shake.write(random);
    shake.read(2, (err, data) => {
        if (err) return cb(err);
        if (data.toString() == 'OK') return cb(null, shake.rest());
        cb(new Error(`Handshake failed: ${data.toString()}`));
    });
    return stream;
}

let client = shakeHands( (err, stream) => {
    if (err) throw err;
    pull(
        pull.once(Buffer.from('Hello from backend')),
        stream,
        pull.map( b => b.toString() ),
        pull.log()
    );
});

let tcpStream = tcp(9998, '127.0.0.1');
pull(client, tcpStream, client);
