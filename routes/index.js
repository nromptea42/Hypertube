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


var pump = require('pump');
var fs = require('fs');

router.get('/', function(req, res, next) {
    res.render('index', {base_url: 'http://localhost:8000'});
    // res.json({coucou: "coucou"});
});

router.get('/video', function (req, res, next) {
    var file = "./public/videos/film/american/american.mp4";
    console.log(file);

    fs.stat(file, function (err, stats) {
        if (err) {
            if (err.code === 'EONENT')
                return res.sendStatus(404);
            return next(err);
        }
        var range = req.headers.range;

        if (!range) {
            var err = new Error("Wrong range");
                    err.status = 416;
            return next(err);
        }

        var positions = range.replace(/bytes=/, "").split("-");

        var start = parseInt(positions[0], 10);

        var file_size = stats.size;

        var end = positions[1] ? parseInt(positions[1], 10) : file_size -1;

        var chunksize = (end - start) + 1;

        var head = {
            "Content-Range": "bytes " + start + "-" + end + "/" + file_size,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "video/mp4"
        };

        res.writeHead(206, head);

        var stream_position = {
            start: start,
            end: end
        };

        var stream = fs.createReadStream(file, stream_position);

        stream.on("open", function () {
            stream.pipe(res);
        });

        stream.on("error", function(err) {
            return next(err);
        });
    });
});

router.post('/download', function(req, res, next) {
    var engine = torrentStream('magnet:?xt=urn:btih:1AD001509A762AD98DF9B4353EB5E4775E28F244&dn=American+Pastoral+%282016%29+%5B720p%5D+%5BYTS.AG%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337', {
        tmp: '/Volumes/Storage/goinfre/nromptea',
        path: '/Volumes/Storage/goinfre/nromptea/film'
    });

    engine.on('ready', function() {
        engine.files.forEach(function(file) {
            console.log(file.path);
            console.log('filename:', file.name);
            var stream = file.createReadStream();
            // stream is readable stream to containing the file content
        });
        engine.on('idle', function () {
            console.log('finished !');
        });
    });
    res.render('index');
});

module.exports = router;