var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = "mongodb://localhost:27017/test";

var sha256 = require('js-sha256');
var session = require('client-sessions');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var http = require('http');

// router.use(function (req, res, next) {
//     if (req.session && req.session.user) {
//         mongo.connect(url, function (err, db) {
//             db.collection('user-data').findOne({email: req.session.user.email}).then(function (cursor) {
//                 db.close();
//                 if (cursor) {
//                     req.session.user = cursor;
//                     console.log(req.session.user);
                // }
                // next();
                // });
            // });
        // } else {
        // next();
    // }
// });
//
// function requireLogin (req, res, next) {
//     if (!req.session.user) {
//         res.render('login');
//     } else {
//         next();
//     }
// }

router.get('/', function(req, res, next) {
    res.render('index');
});

module.exports = router;