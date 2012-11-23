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
        cb && cb(null, db);
    });
}

function prepare(options, cb) {
    create(function(err, db) {
        db.get('SELECT MAX(date) as last FROM downloads', function(er, res) {
            if (Date.now() - res.last > options.freshness *24*60*60*1000) 
                async.parallel([
                    downloads.update.bind(downloads, db), 
                    packages.update.bind(packages, db)                   
                ], function(err, res) {
                    async.series([
                        downloads.write.bind(this, db, res[0]), 
                        packages.write.bind(this, db, res[1]) 
                    ], cb.bind(null, null, db));
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

