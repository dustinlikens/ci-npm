#!/bin/sh

brew install npm
npm init -y
npm i fs jsonwebtoken axios request zlib csvtojson
node test.js
