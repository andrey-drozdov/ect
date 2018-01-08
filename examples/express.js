"use strict";

var express = require('express');
var app = express();

var EctAd = require('../index');
var ectRenderer = new EctAd({ext: ".html"});
app.engine('html', ectRenderer.render);
app.set('view engine', 'html');
app.set('views', __dirname + '/view');

app.get('/', function (req, res){
    res.render('page');
});

app.get('/simple', function (req, res) {
    res.send("Done!");
});

app.get('/other', function (req, res) {
    res.render("other");
});


app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

app.listen(3000);
console.log('Listening on port 3000');
