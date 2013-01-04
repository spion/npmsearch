#!/usr/bin/env node

var search = require('../index.js');
var argv = require('optimist')
    .demand(1)
    .describe('exact',     "use exact keywords only (bool)")
    .describe('relevance', "relevance factor for sorting `number > 0` `default 0.25`")
    .describe('downloads', "downloads factor for sorting `number > 0` `default 1.5`")
    .describe('freshness', "freshness factor for sorting `number > 0` `default 0.5`")
    .describe('halflife',  "halflife of download count value in days")
    .describe('aging',     "halflife of package freshness in days")
    .describe('dataAge',   "maximum data age in (days) or update data from server")
    .describe('refresh',   "force data update (bool)")
    .argv

search(argv._, argv, function(err, results) {
    var limit = argv.limit || 7;
    for (var k = 0; k < Math.min(results.length, limit); ++k) {
        var details = results[k];
        var space = "    ";
        var pkg = details.data;
        console.log("*", pkg.name, '(' + details.relevance, details.downloads + ')');
        console.log(space, pkg.description);
        if (pkg.author) console.log(space, "by", pkg.author.name, "<" + pkg.author.email + ">");
        if (pkg.repository && pkg.repository.url) 
            console.log(space, pkg.repository.url.replace('git://','http://'));
        console.log();
    }
});

