//jshint esversion: 6

const cookie = "01234567890123456789012345678912";

const crypto = require('crypto');
const pull = require('pull-stream');
const tcp = require('pull-net/client');
const handshake = require('pull-handshake');
const toStream = require('pull-stream-to-stream');
const dnode = require('dnode');

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
    if (err) return pull.error(err);
    let d = dnode({
        setBrightness: function(b) {
            console.log('new brightness', b);
        }
    }).on('remote', (remote)=>{
        remote.setSlider(0.6);
    });
    
    d.pipe(toStream(
        pull(
            pull.map( s => Buffer.from(s) ),
            client,
            pull.map( b => b.toString() )
        )
    )).pipe(d);
});

let tcpStream = tcp(9998, '127.0.0.1');
pull(backend, tcpStream, backend);
