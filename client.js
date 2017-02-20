//jshint esversion: 6
const pull = require('pull-stream');
const ws = require('pull-ws/client');
const handshake = require('pull-handshake');
const toStream = require('pull-stream-to-stream');
const dnode = require('dnode');
const parallel = require('async/parallel');

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

            let d = dnode(api);

            console.log(process);
            // add setProcessProperties to allow the backend to
            // populate our fake process object
            if (typeof api.setProcessProperties === 'undefined') {
                parallel([
                    (parallelCb)=>{
                        d.on('remote', remote => {
                            // this needs to happen ...
                            parallelCb(null, remote);
                        });
                    },
                    (parallelCb)=>{
                        api.setProcessProperties = (argv, env, cb) => {
                            console.log('setProcessProperties was called');
                            process.argv = argv;
                            process.env = env;
                            // --> and this needs to happen,
                            // before we can call cb(null, remote)
                            cb(null);
                            parallelCb(null);
                        };
                    }], (err, results) => {
                        if (err) return cb(err);
                        let [remote] = results;
                        cb(err, remote);
                    }
                );
            } else {
                d.on('remote', remote => cb(null, remote) );
            }

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
