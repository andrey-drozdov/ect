var EctAd = require('../index');

module.exports = {

    setUp : (callback) => {
        this.root = __dirname + "/testview1";
        this.watch = true;
        this.ext = ".html";
        callback();
    },

    construct : (test) => {
        var ectad = new EctAd({
            root: this.root,
            watch: this.watch,
            ext: this.ext
        });
        test.ok(ectad, "Created successfully");
        test.ok(ectad.options, "Should have options");
        test.done();
    },

    render : (t) => {
        var ectad = new EctAd({
            root: this.root,
            watch: this.watch,
            ext: this.ext
        });
        var out = ectad.render('page', {
            title : "Test title!",
            deepvar: "Deepvar"
        });
        t.notEqual(out,null, "File rendering");
        t.done();
    }


}