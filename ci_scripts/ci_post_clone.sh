#!/bin/sh

brew install npm
npm init -y
npm i --save fs jsonwebtoken axios request zlib csvtojson
node test.js
