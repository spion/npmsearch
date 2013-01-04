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

*  --exact      use exact keywords only (bool)                          
*  --relevance  relevance factor for sorting `number > 0` `default 0.25`
*  --downloads  downloads factor for sorting `number > 0` `default 1.5` 
*  --freshness  freshness factor for sorting `number > 0` `default 0.5` 
*  --halflife   halflife of download count value in days                
*  --aging      halflife of package freshness in days                   
*  --dataAge    maximum data age in (days) or update data from server   
*  --refresh    force data update (bool)                                

