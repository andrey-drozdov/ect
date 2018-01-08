var http = require('http');
var connect = require('connect');
var app = connect();
var server = http.createServer(app);

var EctAd = require('./../index');
var renderer = new EctAd({ root : __dirname + '/view', ext : '.html', watch: true });
app.use('/', renderer.compiler({ gzip: true }));

server.listen(3000);
