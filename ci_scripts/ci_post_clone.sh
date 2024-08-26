#!/bin/sh

brew install npm
npm init -y
for i in 'fs' 'jsonwebtoken' 'axios' 'request' 'zlib' 'csvtojson'; do npm install --save "$i"; done
node test.js
