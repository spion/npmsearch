# npm-search

Allows you to search the npm registry by keywords. 

Results are carefully tuned - sorted using both relevance and downloads.

# Install

    [sudo] npm install -g npmsearch

# Usage

    npmsearch [options] <keywords>

# Options

* relevance - how big of a factor should keyword relevance be `number > 0` `default 2`
* downloads - how big of a factor is the number of downloads `number > 0` `default 0.25`
* halflife  - the halflife of downloads e.g. 7 means downloads that are 7 days old lose half of their value `number > 0` `default 30`
* limit     - number of results to display `number > 0` `default 7`

