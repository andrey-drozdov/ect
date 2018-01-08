var EctAd = require('./../index');
var renderer = new EctAd({ root : __dirname + '/view', ext : '.html' });

renderer.render('page', { title: 'Hello, World!' }, function(error, html) {
	console.log(error);
	console.log(html);
});
