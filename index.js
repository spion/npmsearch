var sdb = require('./lib/db');
var packages = require('./lib/packages');
var stemmer = require('./lib/stemmer');


function confidence(p, n) {
    if (n == 0)
        return 0;
    var z = 1.6; //1.0 = 85%, 1.6 = 95%
    var phat = p / n;
    return (phat + z*z/(2*n) - z * Math.sqrt((phat*(1-phat)+z*z/(4*n))/n))/(1+z*z/n);
}

function cooccur(db, keywords, cb) {
    // Disabled at the moment as it ups the query time
    // return cb(null, []);
    // Find co-occuring keywords 
    var q = ' select k1.word as word, k2.word as coword, count(k2.name) as cooccur ' 
          +' from keywords k1 join keywords k2 on k1.name = k2.name '
          +' where k2.word <> k1.word and k1.word in ('+ sdb.array(keywords) +') '
          +' group by k1.word, k2.word order by cooccur desc limit 900;';
    db.all(q, keywords, function(er, cdata) {
        if (er) throw er;
        var extra = cdata
            .filter(function(el) { return el.cooccur > 1; })
            .map(function(row) { return row.coword; })
            .filter(function(el,i,a){ return i == a.indexOf(el); });

        var words = keywords.concat(extra);
        var q2 = ' select word, count(name) as count from keywords '
               + ' where word in (' + sdb.array(words) + ') '
               + ' group by word ';
        db.all(q2, words, function(er, word_ncount_l) {
            if (er) throw er;
            var word_ncount = {};
            word_ncount_l.forEach(function(wc) { word_ncount[wc.word] = wc.count; });

            cdata.forEach(function (cowords) {
                cowords.cocount = word_ncount[cowords.coword];
                cowords.wocount = word_ncount[cowords.word];
                cowords.alloccur = word_ncount[cowords.word] + word_ncount[cowords.coword] 
                    - cowords.cooccur; // remove once because its counted twice.
                //console.log(cowords);
            });
            var suggestions = extra.map(function (extra) {

                // relevant are all keywords co-occuring with this coword (word suggestion).
                var relevant = cdata.filter(function(cow) { return cow.coword == extra });
                var co_occurs = relevant.reduce(function(acc, el) { return acc + el.cooccur; }, 0);
                // this is not exactly right as it doesnt take into account that some of
                // the keywords may co-occur frequently.
                var all_occurs = relevant.reduce(function(acc, el) { return acc + el.alloccur; }, 0);

                return { word: extra, value: confidence(co_occurs, all_occurs) };
            });
            cb(null, suggestions);
        });
    });
}

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
        cooccur(db, keywords, function(er, suggestions) {
            var sug = suggestions.sort(function(a, b) { return b.value - a.value; 
            }).filter(function(el) { return el.value > 0.1
            }).map(function(w) { return w.word });
            //console.log("Suggestions:", JSON.stringify(sug));
            db.all(" SELECT p.name, SUM(k.count) as relevance, COUNT(k.word) as keycount,"
                +" p.data as data"
                +" FROM keywords k, packages p"
                +" WHERE p.name = k.name "
                +" AND k.word IN (" + sdb.array(keywords.concat(sug)) + ") GROUP BY p.name;",
                keywords.concat(sug), function(er, data) {
                    if (er) throw er; 
                    // Keep only packages that match ALL keywords.
                    data = data.filter(function(p) { return p.keycount >= keywords.length; });
                    // Do pre-filtering if too many packages to be used as parameters.
                    if (data.length > 999) {
                        data = data.sort(function(p1, p2) { 
                            return p2.relevance - p1.relevance; 
                        }).slice(0,999);
                    }
                    var names = data.map(function(p) { return p.name; });
                    db.all(" SELECT * FROM downloads"
                        +" WHERE name IN (" + sdb.array(names)  + ")", names, 
                        function(er, dls) {
                            if (er) throw er;
                            var downloads = {};
                            dls.forEach(function(dl) {
                                var halflifems = options.halflife * 24 * 60 * 60 * 1000;
                                downloads[dl.name] = (downloads[dl.name] || 0) 
                                + dl.count * Math.pow(2, (dl.date - datenow) / halflifems); 
                            });
                            function formula(pkg) {
                                pkg.downloads = Math.round(downloads[pkg.name]);
                                var formulaRes = Math.pow(pkg.relevance / Math.pow(pkg.keycount, 0.5), 
                                    options.relevance) * Math.pow(pkg.downloads || 0, options.downloads);
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
    });
}

module.exports = search;

