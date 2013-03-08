var async = require('async');
var path = require('path');

var packages = require('./packages');
var downloads = require('./downloads');

var sqlite3 = require('sqlite3');
var userstore = require('./userstore')('npmsearch');




function create(cb) {
    var db = new sqlite3.Database(path.join(userstore, 'npmsearch.db'));
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS packages  (name TEXT PRIMARY KEY ON CONFLICT REPLACE, data TEXT);");
        //db.run("CREATE TABLE IF NOT EXISTS search    (name TEXT PRIMARY KEY ON CONFLICT REPLACE, text TEXT);");
        db.run("CREATE TABLE IF NOT EXISTS keywords  (name TEXT, word TEXT, count INTEGER);");
        db.run("CREATE TABLE IF NOT EXISTS downloads (name TEXT, date INTEGER, count INTEGER);");
        db.run("CREATE TABLE IF NOT EXISTS metadata  (key TEXT primary key, value TEXT);");
        db.run("CREATE TABLE IF NOT EXISTS similars  (word1, word2, count);");
        db.run("INSERT OR IGNORE INTO metadata    VALUES ('lastUpdate', 0);");
        cb && cb(null, db);
    });
}

function prepare(options, cb) {
    create(function(err, db) {
        db.get("SELECT value as last FROM metadata WHERE key='lastUpdate'", function(er, res) {
            if (Date.now() - res.last > options.dataAge *24*60*60*1000) 
                async.parallel([
                    downloads.update.bind(downloads, db), 
                    packages.update.bind(packages, db)                   
                ], function(err, res) {
                    async.series([
                        downloads.write.bind(this, db, res[0]), 
                        packages.write.bind(this, db, res[1]),
                        db.run.bind(db, "insert or replace into metadata values ('lastUpdate', ?)", [Date.now()])
                    ], function(err) { cb(err, db); });
                });
            else cb(null, db);
        });
    });
}

function prepareArr(arr) {
    return new Array(arr.length + 1).join('?').split('').join(',');
}


exports.prepare = prepare;
exports.array = prepareArr;

