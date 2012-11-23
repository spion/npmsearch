var sdb = require('./lib/db');
var packages = require('./lib/packages');
var stemmer = require('./lib/stemmer');




function search(keywords, options, cb) {

    options = options || {};
    options.relevance = options.relevance || 1;
    options.downloads = options.downloads || 0.25;
    options.halflife  = options.halflife || 30;
    options.freshness = options.freshness || 1.5;
    if (options.refresh) options.freshness = 0;

    var datenow = Date.now();

    keywords = keywords.map(function(kw) { return stemmer(kw).toLowerCase(); });
    sdb.prepare(options, function(er, db) {
        db.all("SELECT p.name, SUM(k.count) as relevance, COUNT(k.word) as keycount,"
            +" p.data as data"
            +" FROM keywords k, packages p"
            +" WHERE p.name = k.name "
            +" AND k.word IN (" + sdb.array(keywords) + ") GROUP BY p.name",
            keywords, function(er, data) {
                if (er) throw er; 
                // Keep only packages that match ALL keywords.
                data = data.filter(function(p) { return p.keycount >= keywords.length; });
                // Do pre-filtering if too many packages to be used as parameters.
                if (data.length > 999) 
                    data = data.sort(function(p1, p2) { 
                        return p2.relevance - p1.relevance; 
                    }).slice(0,999);
                var names = data.map(function(p) { return p.name; });
                db.all("SELECT * FROM downloads"
                     +" WHERE name IN (" + sdb.array(names)  + ")", names, function(er, dls) {
                         if (er) throw er;
                         var downloads = {};
                         dls.forEach(function(dl) {
                             var halflifems = options.halflife * 24 * 60 * 60 * 1000;
                             downloads[dl.name] = (downloads[dl.name] || 0) 
                             + dl.count * Math.pow(2, (dl.date - datenow) / halflifems); 
                         });
                         function formula(pkg) {
                             pkg.downloads = Math.round(downloads[pkg.name]);
                             var formulaRes = Math.pow(pkg.relevance / Math.pow(pkg.keycount, 0.5), options.relevance) 
                                * Math.pow(pkg.downloads || 0, options.downloads);
                             pkg.formula = Math.round(formulaRes);
                             return formulaRes;
                         }
                         data.forEach(function(pkg) {
                             pkg.keys = packages.extractKeywords(pkg).length;
                         });
                         data = data.sort(function(a, b) { return formula(b) - formula(a); });
                        cb(null, data);
                });
                    
            }); 
    });
}

module.exports = search;

