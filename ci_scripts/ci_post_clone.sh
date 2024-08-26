#!/bin/sh

brew install npm
npm init -y
npm i fs
npm i axios
npm i jsonwebtoken
npm i request
npm i zlib
npm i out
npm i csvtojson
pwd
ls
CONNECT_PRIVATE_KEY=${CONNECT_PRIVATE_KEY} node test.js
