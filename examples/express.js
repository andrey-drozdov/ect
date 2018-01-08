"use strict";

var express = require('express');
var app = express();

var EctAd = require('../index');
var ectRenderer = new EctAd({ watch: true });
app.engine('html', ectRenderer.render);
app.set('view engine', 'html');
app.set('views', __dirname + '/view');

app.get('/', function (req, res){
    res.render('page.html');
});

app.listen(3000);
console.log('Listening on port 3000');
