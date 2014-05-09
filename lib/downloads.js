var async = require('async');
var path = require('path');
var mkdirp = require('mkdirp');
var sqlite3 = require('sqlite3');
var userstore = require('./userstore')('npmsearch');
var http = require('http'), https = require('https'), url = require('url');


var URI = 'http://registry.npmjs.org/downloads/_design/app/_view/day';

//var URI = 'http://isaacs.iriscouch.com/downloads/_design/app/_view/day';

function update(db, cb) {
    var dlds = 0;
    db.get('SELECT MAX(date) as last FROM downloads', function(er, res) {
        //if (er) throw er;
        var d =  new Date(res.last || Date.now() - 31 * 24 * 60 * 60 * 1000)
            .toISOString().substr(0,10);
        var deleteAll = new Date(d).getTime() - 1000;
        db.serialize(function() {
            db.run("DROP INDEX IF EXISTS downloads_name;");
            db.run("DELETE FROM downloads WHERE date > ?;", deleteAll);
        });
        console.log("fetching downloads after", d, "...");
        http.get(url.parse(URI + '?startkey=["' + d + '","0"]&reduce=false'),
            function(res) {
                res.setEncoding('utf8');
                var body = [];
                res.on('data', function(data){ body.push(data); });
                res.on('end', function() {
                    if (cb) cb(null, JSON.parse(body.join('')));
                });
            });
    });
}

function write(db, downloads, cb) {
    var dldCount = 0, insertDownload;
    async.series([
        db.run.bind(db, "BEGIN TRANSACTION;"),
        function(cb) {
            insertDownload = db.prepare("INSERT INTO downloads VALUES (?, ?, ?)");
            console.log(downloads);
            downloads.rows.forEach(function(download) {
                var date = new Date(download.key[0]);
                var pkgname = download.key[1];
                var count = download.value;
                insertDownload.run(pkgname, date, count);
            });
            cb();
        },
        function(cb) { insertDownload.finalize(cb) },
        db.run.bind(db, "CREATE INDEX IF NOT EXISTS downloads_name ON downloads (name);"),
        db.run.bind(db, "COMMIT;"),
    ], cb);
}


exports.update = update;
exports.write = write;
