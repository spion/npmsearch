# npmsearch

Allows you to search the npm registry by keywords. 

Results are carefully tuned - sorted using both relevance and downloads.

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

* relevance - how big of a factor should keyword relevance be `number > 0` `default 2`
* downloads - how big of a factor is the number of downloads `number > 0` `default 0.25`
* halflife  - the halflife of downloads e.g. 7 means downloads that are 7 days old lose half of their value `number > 0` `default 30`
* exact     - don't try to expand keywords, use only the keywords specified. (boolean)
* limit     - number of results to display `number > 0` `default 7`
* freshness - maximum age of the database results to use in days.  `number > 0` `default 1.5`
* refresh   - force database reload (boolean)


