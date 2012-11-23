var async = require('async');
var path = require('path');
var mkdirp = require('mkdirp');
var sqlite3 = require('sqlite3');
var userstore = require('./userstore')('npmsearch');
var RegClient = require('npm-registry-client')
var http = require('http'), url = require('url');

var stemmer = require('./stemmer');

function update(db, cb) {
    var registry = new RegClient({registry: 'http://registry.npmjs.org', cache: userstore });
    registry.get( "/-/all", '', false, true, function (er, data) {
        if (er) throw er;
        cb && cb(null, data);
    });
}

function extractKeywords(pkg) {
    var words = {};
    if (!pkg.name) return [];
    words[pkg.name.toLowerCase()] = 5;

    (pkg.description || "").split(/[\s.,()]/g).filter(function(w) { 
        return w.length 
    }).map(function(w) { 
        return stemmer(w).toLowerCase(); 
    }).forEach(function(w) { 
        words[w] = (words[w] || 0) + 1; 
    });

    if (typeof(pkg.keywords) == 'string') 
        pkg.keywords = pkg.keywords.split(/[\s,]+/);
    var pkgkeys = pkg.keywords || [];

    pkgkeys.map(function(w) { 
        return stemmer(w).toLowerCase(); 
    }).forEach(function(w) { 
        words[w] = (words[w] || 0) + 2; 
    });
    var arr = [];
    for (var key in words) arr.push({word: key, count: words[key]});
    return arr;
}

function write(db, data, cb) {
    var insertPkg, insertSearch, insertKeyword;    
    async.series([
        db.run.bind(db, "DELETE FROM keywords;"),
        db.run.bind(db, "BEGIN TRANSACTION;"),
        function(cb) {
            insertPkg = db.prepare('INSERT OR REPLACE INTO packages VALUES (?, ?);');
            //insertSearch = db.prepare("INSERT OR REPLACE INTO search   VALUES (?, ?);");
            insertKeyword = db.prepare("INSERT INTO keywords VALUES (?, ?, ?);");
            for (var key in data) {
                var pkg = data[key];
                insertPkg.run(pkg.name, JSON.stringify(pkg));
                //insertSearch.run(pkg.name, pkg.description);
                extractKeywords(pkg).forEach(function(w) {
                    insertKeyword.run(pkg.name, w.word, w.count);
                });
                
            }
            cb();
        },
        function(cb) { insertPkg.finalize(cb) },
        //function(cb) { insertSearch.finalize(cb) },
        function(cb) { insertKeyword.finalize(cb) },
        db.run.bind(db, "CREATE INDEX IF NOT EXISTS keywords_words ON keywords (word);"),
        db.run.bind(db, "CREATE INDEX IF NOT EXISTS keywords_names ON keywords (name);"),
        db.run.bind(db, "COMMIT;"),
    ], cb);
}

exports.update = update;
exports.write = write;
exports.extractKeywords = extractKeywords;
