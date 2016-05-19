var log4js = require('log4js');
var logger = log4js.getLogger('application');

var data = require('./data');

module.exports = {

    findAccount: function (id, name, response, callback) {

        var outcome = false;

        logger.info('Quick Analysis ...');

        var db = cloudant.db.use("insurance");

        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                logger.info("Number of accounts: " + count);

                var item;

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        if (doc.id === id && doc.name === name) {
                            outcome = true;
                            callback(true, response, id, name);

                            logger.info('found a match');
                        }
                    })
                })

                if (count === 0 || outcome === false) {
                    callback(outcome, response, id, name);
                }
            }
        })

    },

    /*  Takes an id and a name and an outcome if the the id and name were found.
        Possible outcomes   - no account found - so create one, return true.
                            - no account found - so create one, fail, return false.
                            - account found - return true. 
    */

    handleAccountOutcome: function (outcome, response, id, name) {

        if (outcome === false) {

            /* create a new account */

            var db = cloudant.db.use("insurance");

            var account = data.createRecord(id, name);

            db.insert(account, id, function (err, body, header) {
                if (err) {

                    logger.warn('account insertion failure', err.message)

                    response.end(JSON.stringify({
                        outcome: outcome
                    }));

                } else {
                    logger.info('Inserted a new account into the database.');

                    response.end(JSON.stringify({
                        outcome: true
                    }));
                }
            });

        } else {

            logger.info('returning a record');
            response.end(JSON.stringify({
                outcome: outcome
            }));
        }
    }
}