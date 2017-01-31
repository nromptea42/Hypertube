var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

var sha256 = require('js-sha256');
var session = require('client-sessions');
var nodemailer = require('nodemailer');
var http = require('http');

var torrentStream = require('torrent-stream');


router.get('/', function(req, res, next) {
    var engine = torrentStream('magnet:?xt=urn:btih:27425d01a17fcd2a6f113cff00ae3eeb45fed022&dn=Arrival+2016+WEB-DL+XviD+AC3-EVO&tr=http%3A%2F%2Ftracker.trackerfix.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710&tr=udp%3A%2F%2F9.rarbg.to%3A2710');

    engine.on('ready', function() {
        engine.files.forEach(function(file) {
            console.log('filename:', file.name);
            var stream = file.createReadStream();
            // stream is readable stream to containing the file content
        });
    });

    engine.on('idle', function () {
        console.log('finished !');
    });

    res.render('index');
});

module.exports = router;