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

function cooccur(db, opt, keywords, cb) {
    // if exact keyword match requested, don't expand keywords.
    if (opt && opt.exact) return cb(null, []);
    // Find co-occuring keywords 
    var q = ' select k1.word as word, k2.word as coword,  count(k2.name) as cooccur ' 
          + ' from keywords k1 join keywords k2 on k1.name = k2.name '
          + ' where k1.word in ('+ sdb.array(keywords) +') and k2.word <> k1.word '
          + ' group by k1.word, k2.word order by cooccur desc limit 200;';
 
    var q = ' select word1 as word, word2 as coword, count as cooccur from similars '
          + ' where word1 in (' + sdb.array(keywords) + ') '
          + ' union '
          + ' select word2 as word, word1 as coword, count as cooccur from similars '
          + ' where word1 in (' + sdb.array(keywords) + ') '
          + ' order by cooccur desc limit 500;';
          
    db.all(q, keywords.concat(keywords), function(er, cdata) {
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
                cowords.alloccur = word_ncount[cowords.word] + word_ncount[cowords.coword];
            });
            var suggestions = extra.map(function (extra) {

                // relevant are all keywords co-occuring with this coword (word suggestion).
                var relevant = cdata.filter(function(cow) { return cow.coword == extra });
                var co_occurs = relevant.reduce(function(acc, el) { return acc + 2 * el.cooccur; }, 0);
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
    options.relevance = options.relevance || 1.5; // relevance
    options.downloads = options.downloads || 0.25; // half-lifed downloads
    options.freshness = options.freshness || 0.5 // package update

    options.halflife  = options.halflife  || 30; // downloads older than 30 days
    options.aging     = options.aging     || 90; // 3 months without update for package = 1/2 value
    options.dataAge   = options.dataAge   || 1.5; // 1.5 days without update


    if (options.refresh) options.dataAge = 0;

    var datenow = Date.now();

    keywords = keywords.map(function(kw) { return stemmer(kw).toLowerCase(); });

    sdb.prepare(options, function(er, db) {
        if (er) console.log(er);
        cooccur(db, options, keywords, function(er, suggestions) {
            var sugo = suggestions.sort(function(a, b) { 
                return b.value - a.value; 
            }).filter(function(el) { return el.value > 0.2 });
            
            var sug = sugo.map(function(w) { return w.word });
            db.all(" SELECT p.name, SUM(k.count) as relevance, COUNT(k.word) as keycount,"
                +" p.data as data"
                +" FROM keywords k, packages p"
                +" WHERE p.name = k.name "
                +" AND k.word IN (" + sdb.array(keywords.concat(sug)) + ") "
                +" GROUP BY p.name;",
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
                    // Parse JSON in p.data
                    data.forEach(function(pkg) { pkg.data = JSON.parse(pkg.data); });

                    var names = data.map(function(p) { return p.name; });
                    db.all(" SELECT * FROM downloads"
                        +" WHERE name IN (" + sdb.array(names)  + ")", names, 
                        function(er, dls) {


                            if (er) throw er;
                            var downloads = {};
                            var halflifems = options.halflife * 24 * 60 * 60 * 1000;
                            dls.forEach(function(dl) {
                                downloads[dl.name] = (downloads[dl.name] || 0) 
                                + dl.count * Math.pow(2, (dl.date - datenow) / halflifems); 
                            });
                            var aging = options.aging * 24 * 60 * 60 * 1000;
                            function formula(pkg) {
                                if (pkg.formulaRes) return pkg.formulaRes;
                                if (pkg.data.time && pkg.data.time.modified)
                                    var freshness = Math.pow(2, 
                                        (new Date(pkg.data.time.modified).getTime() - datenow) / aging);
                                else var freshness = 0.1;
                                pkg.downloads = Math.round(downloads[pkg.name]);
                                var formulaRes = Math.pow(pkg.relevance / Math.pow(pkg.keycount, 0.5), 
                                    options.relevance) 
                                    * Math.pow(pkg.downloads || 0, options.downloads) 
                                    * Math.pow(freshness, options.freshness);
                                pkg.formula = Math.round(formulaRes);
                                pkg.formulaRes = formulaRes;
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

