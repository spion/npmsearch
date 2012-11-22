var sqlite3 = require('sqlite3')
var RegClient = require('npm-registry-client')
var async = require('async');

var db = new sqlite3.Database(__dirname + '/npmsearch.db');

var http = require('http'), url = require('url');

var express = { name: 'express',
    description: 'Sinatra inspired web development framework',
    'dist-tags': { latest: '3.0.3' },
    maintainers: [ [Object] ],
    author: { name: 'TJ Holowaychuk', email: 'tj@vision-media.ca' },
    repository: { type: 'git', url: 'git://github.com/visionmedia/express' },
    users: 
    { isaacs: true,
        coverslide: true,
        bencevans: true },
    time: { modified: '2012-11-17T00:03:09.011Z' },
    versions: { '3.0.3': 'latest' },
    keywords: 
        [ 'express',
    'framework',
    'sinatra',
    'api' ] };





function createDB(cb) {
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS packages  (name TEXT PRIMARY KEY ON CONFLICT REPLACE, data TEXT);");
        db.run("CREATE TABLE IF NOT EXISTS search    (name TEXT PRIMARY KEY ON CONFLICT REPLACE, text TEXT);");
        db.run("CREATE TABLE IF NOT EXISTS keywords  (name TEXT, word TEXT, count INTEGER);");
        db.run("CREATE TABLE IF NOT EXISTS downloads (name TEXT, date INTEGER, count INTEGER);");
        cb && cb();
    });
}

function alog(msg) {
    return function(cb) { console.log(msg); cb(null); }
}

function updateDownloads(cb) {    
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
        http.get(url.parse('http://isaacs.iriscouch.com/downloads/_design/app/_view/day?startkey=["'+d+'","0"]&reduce=false'), 
            function(res) {
                res.setEncoding('utf8');
                var body = [];
                res.on('data', function(data){ body.push(data); });
                res.on('end', function() {
                    cb && cb(null, JSON.parse(body.join('')));
                });
            });
    });
}

function writeDownloads(downloads, cb) {
    var dldCount = 0, insertDownload;
    async.series([
        db.run.bind(db, "BEGIN TRANSACTION;"),
        function(cb) {
            insertDownload = db.prepare("INSERT INTO downloads VALUES (?, ?, ?)");
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
        alog("downloads added")
    ], cb);
}

function updatePackages(cb) {
    var registry = new RegClient({registry: 'http://registry.npmjs.org', cache: __dirname + '/cache' });
    registry.get( "/-/all", '', false, true, function (er, data) {
        if (er) throw er;
        cb && cb(null, data);
    });
}

function extractPackageKeywords(pkg) {
    var words = {};
    words[pkg.name] = 5;

    (pkg.description || "").split(/[\s.,()]/g).filter(function(w) { 
        return w.length 
    }).map(function(w) { return w.toLowerCase(); 
    }).forEach(function(w) { words[w] = (words[w] || 0) + 1; });

    if (typeof(pkg.keywords) == 'string') 
        pkg.keywords = pkg.keywords.split(/[\s,]+/);
    var pkgkeys = pkg.keywords || [];

    pkgkeys.map(function(w) { return w.toLowerCase(); 
    }).forEach(function(w) { words[w] = (words[w] || 0) + 2; });
    var arr = [];
    for (var key in words) arr.push({word: key, count: words[key]});
    return arr;
}

function writePackages(data, cb) {
    console.log("updating packages");
    var insertPkg, insertSearch, insertKeyword;    
    async.series([
        db.run.bind(db, "DELETE FROM keywords;"),
        db.run.bind(db, "BEGIN TRANSACTION;"),
        function(cb) {
            insertPkg = db.prepare('INSERT OR REPLACE INTO packages VALUES (?, ?);');
            insertSearch = db.prepare("INSERT OR REPLACE INTO search   VALUES (?, ?);");
            insertKeyword = db.prepare("INSERT INTO keywords VALUES (?, ?, ?);");
            for (var key in data) {
                var pkg = data[key];
                insertPkg.run(pkg.name, JSON.stringify(pkg));
                insertSearch.run(pkg.name, pkg.description);
                extractPackageKeywords(pkg).forEach(function(w) {
                    insertKeyword.run(pkg.name, w.word, w.count);
                });
                
            }
            cb();
        },
        function(cb) { insertPkg.finalize(cb) },
        function(cb) { insertSearch.finalize(cb) },
        function(cb) { insertKeyword.finalize(cb) },
        db.run.bind(db, "CREATE INDEX IF NOT EXISTS keywords_words ON keywords (word);"),
        db.run.bind(db, "COMMIT;"),
        alog("packages updated")
    ], cb);
}

function prepareDB(cb) {
    createDB(function() {
        db.get('SELECT MAX(date) as last FROM downloads', function(er, res) {
            if (Date.now() - res.last > 1.5*24*60*60*1000) 
                async.parallel([updateDownloads, updatePackages], function(err, res) {
                    async.series([
                        writeDownloads.bind(this, res[0]), 
                        writePackages.bind(this, res[1]) 
                    ], cb);
                });
            else cb();
        });
    });
}

var argv = require('optimist')
    .argv;

function prepareArr(arr) {
    return new Array(arr.length + 1).join('?').split('').join(',');
}

function search(keywords, options, cb) {
    prepareDB(function() {
        db.all("SELECT p.name, SUM(k.count) as relevance, COUNT(k.word) as keycount,"
            +" p.data as data"
            +" FROM keywords k, packages p"
            +" WHERE p.name = k.name "
            +" AND k.word IN (" + prepareArr(keywords) + ") GROUP BY p.name",
            keywords, function(er, data) {
                if (er) throw er; 
                var names = data.map(function(p) { return p.name; });
                db.all("SELECT * FROM downloads"
                     +" WHERE name IN (" + prepareArr(names)  + ")", names, function(er, dls) {
                         var downloads = {};
                         dls.forEach(function(dl) {
                             downloads[dl.name] = (downloads[dl.name] || 0) + dl.count; 
                         });
                         function formula(pkg) {
                             pkg.downloads = downloads[pkg.name];
                             return Math.pow(pkg.relevance / Math.pow(pkg.keycount, 0.5), 2) 
                                * Math.pow(pkg.downloads || 0, 0.3);
                         }
                         data.forEach(function(pkg) {
                             pkg.keys = extractPackageKeywords(pkg).length;
                         });
                         data = data.sort(function(a, b) { return formula(b) - formula(a); })
                            .filter(function(p) { return p.keycount >= keywords.length; });
                        cb(null, data);
                });
                    
            }); 
    });
}

var results = search(argv._, {}, function(err, results) {

    for (var k = 0; k < Math.min(results.length, 6); ++k) {
        var details = results[k];
        var space = "    ";
        var pkg = JSON.parse(details.data);
        console.log("*", pkg.name, '(' + details.relevance, details.downloads + ')');
        console.log(space, pkg.description);
        if (pkg.author) console.log(space, "by", pkg.author.name, "<" + pkg.author.email + ">");
        if (pkg.repository) console.log(space, pkg.repository.url);
        console.log("");
    }

});

