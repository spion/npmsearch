**The old npm download count API endpoints dont exist anymore.
This module has not yet been upgraded to the new API so it doesn't work at the moment**

[config-reference]: https://github.com/npm/npm-www/blob/master/models/downloads.js#L37
[missing-config]: https://github.com/npm/npm-www/blob/master/config.js

# npmsearch

Allows you to search the npm registry by keywords from the command line.

Results are carefully tuned - sorted using both relevance and downloads.

Here are some cool points of the algorithm:

* Keywords are stemmed and expanded using a cooccurrance matrix (e.g. mongo -> mongo, mongodb)
* Download counts age exponentially - recent downloads are valued more than old downloads.

Search is fast - `npmsearch` uses a local database populated directly by the npm registry (no middle-man server involved)

# Trying it

Want to try it first? Visit the [web based demo](http://npmsearch.docucalc.com)

# Install

    [sudo] npm install -g npmsearch

# Usage

    npmsearch <keywords> [options]

Here is a sample listing:

    % npmsearch orm
    * orm (7 185)
        NodeJS Object-relational mapping
        by Diogo Resende <dresende@thinkdigital.pt>
        http://github.com/dresende/node-orm.git

    * sequelize (3 2456)
        Multi dialect ORM for Node.JS
        by Sascha Depold <sascha@depold.com>

    * mongoose (2 25863)
        Mongoose MongoDB ODM
        by Guillermo Rauch <guillermo@learnboost.com>
        git://github.com/LearnBoost/mongoose.git

    * model (3 684)
        Datastore-agnostic ORM in JavaScript
        by Matthew Eernisse <mde@fleegix.org>
        git://github.com/mde/model.git

    * patio (3 190)
        Patio query engine and ORM
        by Doug Martin <undefined>
        git@github.com:c2fo/patio.git

    ...

# Options

*  --exact      use exact keywords only (bool)                          
*  --relevance  relevance factor for sorting `number > 0` `default 0.25`
*  --downloads  downloads factor for sorting `number > 0` `default 1.5` 
*  --freshness  freshness factor for sorting `number > 0` `default 0.25` 
*  --halflife   halflife of download count value in days  `default 30
*  --aging      halflife of package freshness in days     `default 180`
*  --dataAge    maximum data age in (days) or fetch from registry (default 1.5)
*  --refresh    force data update (bool)

