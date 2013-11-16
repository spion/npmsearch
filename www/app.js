/**
 * Module dependencies.
 */

//check platform, don't show GID if the user is running Windows as it causes the server to crash
var os = require('os')
if(os.platform() == 'win32') {
  console.log('Application running');
} else {
  console.log("Running as", process.getgid(), "in", process.cwd());
}

var express = require('express')
  , http = require('http')
  , path = require('path')
  , search = require('../index.js');

var app = express();



app.configure(function(){
  app.set('port', process.env.PORT || 8100);
  app.use(express.compress());
  app.use(express.favicon());
  //app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(path.join(__dirname, 'app')));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/search', function(req, res) {
    var q = req.query.q.split(' '),
        opt = JSON.parse(req.query.options)
    search(q, opt, function(err, data) {
        res.json(data);
    });
});

app.get(/.+/, function(req, res) {
    res.sendfile('app/index.html');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

function dailyUpdate() {
    try {
        search(["asdfasdf"], {refresh: true}, function(err, data) {
            if (err) console.log("Error refreshing DB", err);
            else console.log("Database updated");
        });
    } catch (e) {
        console.log("Exception while refreshing db", e);
    };
};

// Update every day.
setInterval(dailyUpdate, 86400 * 1000);
// Also start with an update.
dailyUpdate();

