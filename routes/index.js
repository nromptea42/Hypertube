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
var ffmpeg = require('fluent-ffmpeg');
var useragent = require('express-useragent');

const OS = require('opensubtitles-api');
const OpenSubtitles = new OS({
    useragent:'OSTestUserAgentTemp',
    username: 'Hypertube',
    password: 'dotef',
    ssl: true
});

const path = require('path');
const parseRange = require('range-parser');

//double mp4
// const engine = torrentStream('magnet:?xt=urn:btih:a9b2abfeb562408bf83ccb67fd848e65cdbdbd24&dn=Sand.Sharks.2011.720p.BluRay.H264.AAC-RARBG&tr=http%3A%2F%2Ftracker.trackerfix.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710&tr=udp%3A%2F%2F9.rarbg.to%3A2710', {
//     tmp: '/Volumes/Storage/goinfre/nromptea',
//     path: '/Volumes/Storage/goinfre/nromptea/film'
// });

//un mp4
// const engine = torrentStream('magnet:?xt=urn:btih:749E77BBFEBD97E689C132E3B663BB89425476DC&dn=Moana+%282016%29+%5B720p%5D+%5BYTS.AG%5D&tr=udp%3A%2F%2Fglotorrents.pw%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fp4p.arenabg.ch%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337', {
//     tmp: '/Volumes/Storage/goinfre/nromptea',
//     path: '/Volumes/Storage/goinfre/nromptea/film'
// });

//un mkv
const engine = torrentStream('magnet:?xt=urn:btih:d8f78d2d6556ca45bf938379f73847cf17f668bb&dn=Speechless.S01E17.S-U-R-Surprise.720p.WEB-DL.DD5.1.H264-BTN%5Brartv%5D&tr=http%3A%2F%2Ftracker.trackerfix.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710&tr=udp%3A%2F%2F9.rarbg.to%3A2710', {
    tmp: '/Volumes/Storage/goinfre/nromptea',
    path: '/Volumes/Storage/goinfre/nromptea/film'
});

const getTorrentFile = new Promise(function (resolve, reject) {
    var tmp_len = 0;
    var tmp_file = null;
    engine.on('ready', function() {
        engine.files.forEach(function (file, idx) {
            // console.log(file.length);
            const ext = path.extname(file.name).slice(1);
            if (ext === 'mkv' || ext === 'mp4') {
                if (file.length > tmp_len) {
                    file.ext = ext;
                    tmp_len = file.length;
                    // console.log("interieur du foreach");
                    tmp_file = file;
                }
            }
        });
        // console.log(tmp_file.length);
        resolve(tmp_file);
    });
});

const getSubs = function(subtitles) {
     return new Promise(function (resolve, reject) {
         if (subtitles.en != undefined) {
             var fileEn = fs.createWriteStream("./public/sub/" + "big_hero_6" + ".en.srt");
             var requestEn = https.get(subtitles.en.url, function (response) {
                 var srt = response.pipe(fileEn);
                 srt.on('finish', function () {
                     var srtData = fs.readFileSync('./public/sub/big_hero_6.en.srt');
                     srt2vtt(srtData, function (err, vttData) {
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
                     srt2vtt(srtData, function (err, vttData) {
                         if (err) throw new Error(err);
                         fs.writeFileSync('./public/sub/big_hero_6.fr.vtt', vttData);
                     });
                 })
             });
             resolve("dowloaded");
         }
         resolve("no srt");
     });
};

var runningCommands = {};

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
            imdbid: "tt3521164",   // Text-based query, this is not recommended.
            query: "moana"
        }).then(subtitles => {
                // console.log(subtitles);
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
        // console.log(req.useragent);
        getTorrentFile.then(function (file) {
            const ranges = parseRange(file.length, req.headers.range, {combine: true});
            console.log(ranges);
            if (file.ext == 'mkv' && req.useragent.browser == 'Firefox') {
                if (ranges === -1) {
                    res.statusCode = 416;
                    return res.end();
                }
                else if (ranges === -2 || ranges.type !== 'bytes' || ranges.length > 1) {
                    if (req.method !== 'GET') return res.end();
                    var stream = file.createReadStream().pipe(res);
                }
                else {
                    const range = ranges[0];
                    res.statusCode = 206;
                    res.setHeader('Content-Length', 1 + range.end - range.start);
                    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.length}`);
                    if (req.method !== 'GET') return res.end();
                    var stream = file.createReadStream(range);
                }
                if (stream) {
                    var id = Math.floor(Math.random() * 10001);
                    runningCommands[id] = ffmpeg(stream).videoCodec('libvpx').audioCodec('libvorbis').format('webm')
                        .audioBitrate(128)
                        .videoBitrate(1024)
                        .outputOptions([
                            '-threads 8',
                            '-deadline realtime',
                            '-error-resilient 1'
                        ])
                        .on('start', function (cmd) {
                            //console.log('this has started ' + cmd);

                        })
                        .on('end', function () {
                            delete runningCommands[id];
                        })
                        .on('error', function (err) {
                            console.log("error now happening");
                            console.log(err);
                            delete runningCommands[id];
                            console.log("runningCommands[id] is deleted from id " + id);
                        });
                    runningCommands[id].pipe(res);
                }
            }
            else {
                res.setHeader('Content-Length', file.length);
                res.setHeader('Content-Type', `video/${file.ext}`);
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