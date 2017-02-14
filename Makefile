pwd := $(shell pwd)

all: build/bundle.js
.PHONY : all

build/bundle.js: client.js
	mkdir -p build
	node_modules/.bin/browserify client.js -o build/bundle.js

clean:
	rm -f build/*
