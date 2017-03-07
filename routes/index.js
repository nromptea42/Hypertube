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
var https = require('https');
var Promise = require("bluebird");

var torrentStream = require('torrent-stream');
var pump = require('pump');
var fs = require('fs');
var jade = require('jade');
var srt2vtt = require('srt2vtt');

const OS = require('opensubtitles-api');
const OpenSubtitles = new OS({
    useragent:'OSTestUserAgentTemp',
    username: 'Hypertube',
    password: 'dotef',
    ssl: true
});

const path = require('path');
const parseRange = require('range-parser');
const engine = torrentStream('magnet:?xt=urn:btih:BB43CF1DC5B200BA37679DB96375A8190D933C2E&dn=Big+Hero+6+%282014%29+%5B720p%5D+%5BYTS.AG%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337', {
    tmp: '/Volumes/Storage/goinfre/nromptea',
    path: '/Volumes/Storage/goinfre/nromptea/film'
});
const getTorrentFile = new Promise(function (resolve, reject) {
    engine.on('ready', function() {
        engine.files.forEach(function (file, idx) {
            const ext = path.extname(file.name).slice(1);
            if (ext === 'mkv' || ext === 'mp4') {
                file.ext = ext;
                resolve(file);
            }
        });
    });
});

const getSubs = function(subtitles) {
     return new Promise(function (resolve, reject) {
         var fileEn = fs.createWriteStream("./public/sub/" + "big_hero_6" + ".en.srt");
         var requestEn = https.get(subtitles.en.url, function (response) {
             var srt = response.pipe(fileEn);
             srt.on('finish', function () {
                 var srtData = fs.readFileSync('./public/sub/big_hero_6.en.srt');
                 srt2vtt(srtData, function(err, vttData) {
                     if (err) throw new Error(err);
                     fs.writeFileSync('./public/sub/big_hero_6.en.vtt', vttData);
                 });
             })
         });
         var fileFr = fs.createWriteStream("./public/sub/" + "big_hero_6" + ".fr.srt");
         var requestFr = https.get(subtitles.fr.url, function (response) {
             var srt = response.pipe(fileFr);
             srt.on('finish', function () {
                 var srtData = fs.readFileSync('./public/sub/big_hero_6.fr.srt');
                 srt2vtt(srtData, function(err, vttData) {
                     if (err) throw new Error(err);
                     fs.writeFileSync('./public/sub/big_hero_6.fr.vtt', vttData);
                 });
             })
         });
         resolve("dowloaded");
     });
};

router.get('*', function(req, res, next) {
    if (req.url != '/Guardians.of.the.Galaxy.2014.1080p.BluRay.x264.YIFY.mp4') {
        res.setHeader('Content-Type', 'text/html');
        if (req.method !== 'GET') return res.end();

        OpenSubtitles.login()
        .then(resu => {
            OpenSubtitles.search({
            sublanguageid: 'eng,fre',       // Can be an array.join, 'all', or be omitted.
            // hash: rows[0].hash,   // Size + 64bit checksum of the first and last 64k
            //path: rows[0].path,        // Complete path to the video file, it allows
            //   to automatically calculate 'hash'.
            //filename: rows[0].path.substring(rows[0].path.lastIndexOf("/" + 1)),        // The video file name. Better if extension
            extensions: 'srt', // Accepted extensions, defaults to 'srt'.
            limit: 'best',  // Can be 'best', 'all' or an
                            // arbitrary nb. Defaults to 'best'
            imdbid: "tt2245084",   // Text-based query, this is not recommended.
            query: "big hero 6"
        }).then(subtitles => {
                console.log(subtitles);
                getSubs(subtitles).then(function (str) {
                    console.log(str);
                    var rpath = __dirname + '/../views/index.jade';
                    fs.readFile(rpath, 'utf8', function (err, str) {
                        var fn = jade.compile(str, {filename: rpath, pretty: true});
                        res.end(fn({subFr: "./public/sub/big_hero_6.fr.vtt", subEn: "./public/sub/big_hero_6.en.vtt"}));
                    });
                });
            })
        })
        .catch(err => {
           console.log(err);
        })
    } else {
        res.setHeader('Accept-Ranges', 'bytes');
        getTorrentFile.then(function (file) {
            res.setHeader('Content-Length', file.length);
            res.setHeader('Content-Type', `video/${file.ext}`);
            const ranges = parseRange(file.length, req.headers.range, { combine: true });
            console.log(ranges);
            if (ranges === -1) {
                // 416 Requested Range Not Satisfiable
                res.statusCode = 416;
                return res.end();
            } else if (ranges === -2 || ranges.type !== 'bytes' || ranges.length > 1) {
                // 200 OK requested range malformed or multiple ranges requested, stream entire video
                if (req.method !== 'GET') return res.end();
                return file.createReadStream().pipe(res);
            } else {
                // 206 Partial Content valid range requested
                const range = ranges[0];
                res.statusCode = 206;
                res.setHeader('Content-Length', 1 + range.end - range.start);
                res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.length}`);
                if (req.method !== 'GET') return res.end();
                return file.createReadStream(range).pipe(res);
            }
        }).catch(function (e) {
            console.error(e);
            res.end(e);
        });
    }
});

// router.get('*', function (req, res, next) {
//     console.log(req.url);
//     if (req.url != "/Guardians.of.the.Galaxy.2014.1080p.BluRay.x264.YIFY.mp4") {
//         console.log("JE SUIS PASSE LA");
//         var rpath = __dirname + '/../views/index.jade';
//         fs.readFile(rpath, 'utf8', function (err, str) {
//             if (err) {
//                 throw err;
//             }
//             var fn = jade.compile(str);
//             res.writeHead(200, { "Content-Type": "text/html" });
//             res.write(fn());
//             res.end();
//         });
//     }
//     else {
//         engineGo(23).delay(8000).then(function (result) {
//             console.log('engineGo has happened');
//             var filer = '/Volumes/Storage/goinfre/nromptea/Big.Hero.6.2014.720p.BluRay.x264.YIFY.mp4';
//             fs.stat(filer, function (err, stats) {
//                 if (err) {
//                     console.log(err);
//                     if (err.code === 'ENOENT') {
//                         // 404 Error if file not found
//                         return res.sendStatus(404);
//                     }
//                     res.end(err);
//                 }
//                 var range = parseRange(stats.size, req.headers.range);
//                 // console.log("range is " + range);
//                 if (!range) {
//                     console.log("no range");
//                     // 416 Wrong range
//                     return res.sendStatus(416);
//                 }
//                 if (range.type === 'bytes') {
//                     // the ranges
//                     range.forEach(function (r) {
//                         // var positions = range.replace(/bytes=/, "").split("-");
//                         var start = r.start;
//                         var total = stats.size;
//                         var end = r.end;
//                         var chunksize = (end - start);
//                         console.log(start + "  " + end);
//
//                         res.writeHead(206, {
//                             "Content-Range": "bytes " + start + "-" + end + "/" + total,
//                             "Accept-Ranges": "bytes",
//                             'Connection': 'keep-alive',
//                             "Content-Length": chunksize,
//                             "Content-Type": "video/mp4"
//                         });
//                         var stream = fs.createReadStream(filer, {start: start, end: end});
//                         console.log("PUMP INCOMING");
//                         pump(stream, res);
//                     })
//                 }
//             });
//         })
//     }
// });

// var runningEngines = {};

// let engineGo = function (id) {
//     return new Promise(function (resolve, reject) {
//         console.log("entering engineGo");
//         if (runningEngines[id] == undefined) {
//             var engine = torrentStream('magnet:?xt=urn:btih:BB43CF1DC5B200BA37679DB96375A8190D933C2E&dn=Big+Hero+6+%282014%29+%5B720p%5D+%5BYTS.AG%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337', {
//                 tmp: '/Volumes/Storage/goinfre/nromptea',
//                 path: '/Volumes/Storage/goinfre/nromptea/film'
//             });
//             engine.on('ready', function () {
//                 // console.log(engine.files);
//                 engine.files.forEach(function (file) {
//                     if (file.name.substr(file.name.length - 3) == 'mkv' || file.name.substr(file.name.length - 3) == 'mp4') {
//                         // console.log('filename:', file.name);
//                         var stream = file.createReadStream();
//                         var writable = fs.createWriteStream('public/videos/' + file.name);
//                         console.log("about to write file");
//                         runningEngines[id] = engine;
//                         pump(stream, writable);
//                         engine.on('download', function () {
//                             // console.log(file.name);
//                             console.log(engine.swarm.downloaded / file.length * 100 + "%");
//                             resolve(file);
//                         });
//                     }
//                     // stream is readable stream to containing the file content
//                 });
//             });
//         }
//         else {
//             runningEngines[id].files.forEach(function (file) {
//                 if (file.name.substr(file.name.length - 3) == 'mkv' || file.name.substr(file.name.length - 3) == 'mp4') {
//                     resolve(file)
//                 }
//             })
//         }
//     });
// };

module.exports = router;