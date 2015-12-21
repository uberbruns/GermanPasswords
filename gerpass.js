// =================
// Load Dependencies
// =================

var Promise = require("bluebird");
var sqlite3 = require('sqlite3').verbose();
var path = require('path');


// =============
// Configuration
// =============

var __OPTIONS = {
    dbFilename : path.join(__dirname, 'morphy.sqlite'),
    recipieIndex: undefined,
    verbose: false,
    results: 100,
    separator: "-",
    toTitleCase: false,
    toLowerCase: true
}


var __RECIPIES = [{
    order: [1, 0, 2, 3],
    words: [{
        wkl: "SUB",
        kas: "NOM",
        abl: null,
        der: null
    }, {
        wkl: "ADJ",
        kas: "NOM",
        gen: 0,
        num: 0
    }, {
        wkl: "VER",
        num: 0,
        konj: "SFT",
        gebrauch: null,
        pers: (results) => {
            return (results[0].num === "PLU") ? "1" : "3";
        }
    }, {
        wkl: "SUB",
        kas: "NOM",
        abl: null,
        der: null
    }]

}, {
    order: [3, 2, 0, 1],
    words: [{
        wkl: "ART",
        kas: "NOM",
    }, {
        wkl: "SUB",
        kas: "NOM",
        der: "ADJ",
        gen: 0,
        num: 0
    }, {
        wkl: "VER",
        num: 0,
        konj: "SFT",
        gebrauch: null,
        pers: (results) => {
            return (results[0].num === "PLU") ? "1" : "3";
        }
    }, {
        wkl: "ADV",
        typ: "TMP"
    }]
}, {
    order: [0, 2, 1, 3],
    words: [{
        wkl: "VER",
        form: "IMP",
    }, {
        wkl: "SUB",
        kas: "NOM",
        abl: null,
        der: null,
    }, {
        gen: 1,
        num: 1,
        wkl: "ADJ",
        kas: "NOM",
    }, {
        wkl: "ADV"
    }]
}];


// ================
// Helper Functions
// ================

function promiseWhile(predicate, action) {
    function loop() {
        if (!predicate()) return;
        return Promise.resolve(action()).then(loop);
    }
    return Promise.resolve().then(loop);
}


function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}



// ===============
// Create Paswords
// ===============

var resultPhrases = [];
var db = new sqlite3.Database(path.join(__dirname, 'morphy.sqlite'));

promiseWhile(() => {
    return resultPhrases.length < __OPTIONS.results
}, () => {

    var results = []
    var index = __OPTIONS.recipieIndex

    if (index === undefined) {
        index = Math.floor(Math.random() * __RECIPIES.length)
    }

    var recipie = __RECIPIES[index];

    return Promise.each(recipie.words, (comp) => {

        var whereComp = [];
        var whereString;

        for (var column in comp) {
            var value = comp[column];
            if (typeof value === "string") {
                whereComp.push("`" + column + "` = '" + value + "'");
            } else if (typeof value === "number") {
                var v = results[value][column]
                if (v !== null) {
                    whereComp.push("`" + column + "` = '" + results[value][column] + "'");
                }
            } else if (typeof value === "function") {
                var result = value(results);
                whereComp.push("`" + column + "` = '" + result + "'");
            } else if (typeof value === "object" && value === null) {
                whereComp.push("`" + column + "` is NULL");
            } else {
                console.log(typeof value, value);
            }
        }

        whereString = whereComp.join(" AND ")

        if (__OPTIONS.verbose === true) {
            console.log(whereString);
        }

        return Promise.fromCallback((callback) => {
            db.get("SELECT * FROM words WHERE " + whereString + " ORDER BY RANDOM() LIMIT 1;", callback);
        })

        .catch((err) => {
          console.log("SQL Query Error: " + whereString);
          console.log(err);
        })

        .then((result) => {
            results.push(result);
        })

    })

    .finally(() => {

        var phrase = recipie.order.map((i) => {
            var word = results[i].wort;

            if (__OPTIONS.toLowerCase === true) {
                word = word.toLowerCase();
            } else if (__OPTIONS.toTitleCase === true) {
                word = word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
            }

            return word
        }).join(__OPTIONS.separator);

        resultPhrases.push(phrase);
        console.log(phrase);
    })

})

.finally(() => {

    db.close();

})
