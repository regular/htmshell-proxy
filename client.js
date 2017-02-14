//jshint esversion: 6
const pull = require('pull-stream');
const ws = require('pull-ws/client');
const handshake = require('pull-handshake');
const toStream = require('pull-stream-to-stream');
const dnode = require('dnode');

const cookie = "01234567890123456789012345678912";

console.log('Hello World');

let slider = document.getElementById('slider');
slider.max = 1;
slider.min = 0;
slider.step = 0.01;

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
        let d = dnode({
            setSlider: function(x) {
                console.log('slider pos', x);
                slider.value = Number(x);
           }
        }).on('remote', (remote)=>{
            slider.addEventListener('input', ()=>{
                remote.setBrightness(slider.value);
            });
        });
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
