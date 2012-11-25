#!/usr/bin/env node

var search = require('../index.js');
var argv = require('optimist').argv;

search(argv._, argv, function(err, results) {
    var limit = argv.limit || 7;
    for (var k = 0; k < Math.min(results.length, limit); ++k) {
        var details = results[k];
        var space = "    ";
        var pkg = JSON.parse(details.data);
        console.log("*", pkg.name, '(' + details.relevance, details.downloads + ')');
        console.log(space, pkg.description);
        if (pkg.author) console.log(space, "by", pkg.author.name, "<" + pkg.author.email + ">");
        if (pkg.repository) 
            console.log(space, pkg.repository.url.replace('git://','http://'));
        console.log();
    }
});

