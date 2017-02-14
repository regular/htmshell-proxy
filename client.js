//jshint esversion: 6
const pull = require('pull-stream');
const ws = require('pull-ws/client');
const handshake = require('pull-handshake');
const toStream = require('pull-stream-to-stream');
const dnode = require('dnode');

function shakeHands(cookie, cb) {
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

module.exports = function(cookie, api, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts; opts = {};
    }
    let wsPath = opts.wsPath || '/backend';

    ws(wsPath, {binary: true, onConnect: (err, proxy) => {
        if (err) return cb(err);
        let client = shakeHands(cookie, (err, backend) => {
            if (err) {
                cb(err);
                return pull.error(err);
            } else {
                console.log('handshake successful');
            }
            let d = dnode(api).on('remote', remote => cb(null, remote) );
            d.pipe(toStream(
                pull(
                    pull.map( s => Buffer.from(s) ),
                    backend,
                    pull.map( b => b.toString() )
                )
            )).pipe(d);
        });
        pull(client, proxy, client);
    }});
};
