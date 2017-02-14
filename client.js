//jshint esversion: 6
console.log('Hello World');

const pull = require('pull-stream');
const ws = require('pull-ws/client');
const handshake = require('pull-handshake');

const cookie = "01234567890123456789012345678912";

function shakeHands(cb) {
    let stream = handshake(cb); // TODO: smae cb as below?!
    let shake = stream.handshake;
    shake.write(Buffer.from(cookie));
    shake.read(2, (err, data) => {
        if (err) return cb(err);
        if (data.toString() == 'OK') return cb(null, shake.rest());
        cb(new Error(`Handshake failed: ${data.toString()}`));
    });
    return stream;
}

ws('/backend', {binary: true, onConnect: (err, proxy) => {
    let client = shakeHands( (err, backend) => {
        if (err) {
            console.log(err);
            return pull.error(err);
        } else {
            console.log('handshake successful');
        }
        pull(
            pull.values('Hallo welt, wie geht es dir?'.split(" ")),
            pull.asyncMap( (s, cb) => setTimeout(
                ()=>cb(null, Buffer.from(s)),
               1000 )
            ),
            backend,
            pull.map( b => b.toString() ),
            pull.log()
        );
    });
    pull(client, proxy, client);
}});
