#!/bin/sh

brew install npm
npm init -y
for i in 'fs' 'jsonwebtoken' 'axios' 'request' 'zlib' 'csvtojson'; do npm i --save "$i"; done
node test.js
