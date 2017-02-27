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
var Promise = require("bluebird");

var torrentStream = require('torrent-stream');


var pump = require('pump');
var fs = require('fs');
var jade = require('jade');

// router.get('/', function(req, res, next) {
//     res.render('index', {base_url: 'http://localhost:8000'});
// });

router.get('*', function (req, res, next) {
    if (req.url != "/Guardians.of.the.Galaxy.2014.1080p.BluRay.x264.YIFY.mp4") {
        var rpath = __dirname + '/views/index.jade';
        fs.readFile(rpath, 'utf8', function (err, str) {
            var fn = jade.compile(str, {filename: rpath, pretty: true});
            res.writeHead(200, {"Content-Type": "text/html"});
            res.write(fn());
            res.end();
        });
    }
    else {
        engineGo(23).delay(8000).then(function (result) {
            console.log('engineGo has happened');
            var filer = '/Volumes/Storage/goinfre/nromptea/Guardians.of.the.Galaxy.2014.720p.BluRay.x264.YIFY.mp4';
            fs.stat(filer, function (err, stats) {
                if (err) {
                    console.log(err);
                    if (err.code === 'ENOENT') {
                        // 404 Error if file not found
                        return res.sendStatus(404);
                    }
                    res.end(err);
                }
                var range = req.headers.range;
                // console.log("range is " + range);
                if (!range) {
                    console.log("no range");
                    // 416 Wrong range
                    return res.sendStatus(416);
                }
                var positions = range.replace(/bytes=/, "").split("-");
                var start = parseInt(positions[0], 10);
                var total = stats.size;
                var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
                var chunksize = (end - start) + 1;
                // console.log(start + "  " + end);

                res.writeHead(206, {
                    "Content-Range": "bytes " + start + "-" + end + "/" + total,
                    "Accept-Ranges": "bytes",
                    'Connection': 'keep-alive',
                    "Content-Length": chunksize,
                    "Content-Type": "video/mp4"
                });
                //fconsole.log("about to write");
                if (start < end) {
                    var stream = fs.createReadStream(filer, {start: start, end: end});
                    pump(stream, res);
                }
            });
        })
    }
});

var runningEngines = {};

let engineGo = function (id) {
    return new Promise(function (resolve, reject) {
        console.log("entering engineGo");
        if (runningEngines[id] == undefined) {
            var engine = torrentStream('magnet:?xt=urn:btih:836D2E8C6350E4CE3800E812B60DE53A63FEB027&dn=Guardians+of+the+Galaxy+%282014%29+%5B720p%5D+%5BYTS.AG%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337', {
                tmp: '/Volumes/Storage/goinfre/nromptea',
                path: '/Volumes/Storage/goinfre/nromptea/film'
            });
            engine.on('ready', function () {
                // console.log(engine.files);
                engine.files.forEach(function (file) {
                    if (file.name.substr(file.name.length - 3) == 'mkv' || file.name.substr(file.name.length - 3) == 'mp4') {
                        // console.log('filename:', file.name);
                        var stream = file.createReadStream();
                        var writable = fs.createWriteStream('public/videos/' + file.name);
                        // console.log("about to write file");
                        runningEngines[id] = engine;
                        pump(stream, writable);
                        engine.on('download', function () {
                            // console.log(file.name);
                            console.log(engine.swarm.downloaded / file.length * 100 + "%");
                            resolve(file);
                        });
                    }
                    // stream is readable stream to containing the file content
                });
            });
        }
        else {
            runningEngines[id].files.forEach(function (file) {
                if (file.name.substr(file.name.length - 3) == 'mkv' || file.name.substr(file.name.length - 3) == 'mp4') {
                    resolve(file)
                }
            })
        }
    });
};

module.exports = router;