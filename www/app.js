
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , search = require('../index.js');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
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
