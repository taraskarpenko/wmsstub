var express = require('express');
var router = express.Router();
var db = require('../db');
var async = require('async');
var http = require("http");
var https = require("https");
var dns = require("dns");
var circularJSON = require('circular-json');
var request = require('request');
var externalip = require("externalip");
var public_ip = "0.0.0.0";

router.get('/', function (req, res, next) {
    getMyPublicIp(function (ip) {
        db.all("SELECT request_id, created_at, group_concat(product_id) as products, received_at FROM ff_requests GROUP BY request_id, created_at, received_at ORDER BY received_at",
            function (err, rows) {
                if (err) {
                    console.log(JSON.stringify(err));
                    res.render('error', {error: {stack: JSON.stringify(err), status: 'SQLError'} });
                } else {
                    res.render('requests_list', {
                        requests: rows,
                        public_ip: ip
                    });
                }
            });

    });
});

router.get('/:id', function (req, res, next) {
    getRequestDetailsFromDB(req.params.id, function (details) {
        res.render('request_details',
            {
                request_id: req.params.id,
                requests: details
            });
    });

});

router.post('/', function (req, res, next) {
    var reqBody = req.body;

    console.log(reqBody);
    reqBody.items.forEach(function (item) {
        var stmt = db.prepare("INSERT INTO ff_requests (request_id, billing_address, shipping_address, shipping_options," +
            "created_at, product_id, item_id, extended_attributes, original_payload) VALUES (?,?,?,?,?,?,?,?,?)");
        stmt.run(reqBody.id,
            JSON.stringify(reqBody.billing_address),
            JSON.stringify(reqBody.shipping_address),
            JSON.stringify(reqBody.shipping_options),
            JSON.stringify(reqBody.created_at),
            JSON.stringify(item.product_id),
            JSON.stringify(item.item_id),
            JSON.stringify(item.extended_attributes),
            JSON.stringify(reqBody)
        );
        stmt.finalize();
    });

    res.status(200);
    res.send('respond with a resource');
});

router.post('/:id/reject', function (req, res) {
    console.log(req.body);
    console.log(req.cookies);
    res.send("");
});

router.get('/:id/reject', function (req, res) {
    console.log(req.body);
    console.log(req.cookies);
    res.send("");
});

router.post('/:id/acknowledge', function (req, res) {
    console.log(req.body);
    console.log(req.cookies);

    var url = (req.cookies.host.includes(".newstore.net") ? "https://" : "http://") + req.cookies.host;
    var headers = {
        'Authorization': req.cookies.token
    };
    var options = {
        url: url + "/v0/d/fulfillment_requests/" + req.params.id + "/acknowledgement",
        method: 'POST',
        headers: headers,
    };

    request(options, function (error, response, body) {
        if (!error) {
            res.send(JSON.stringify(body));
        } else {
            console.log("error" + error);
            res.locals.message = error.message;
            res.locals.error = error;
            res.status(error.status || 500);
            res.render('error');
        }
    });
});

function getRequestDetailsFromDB(requestId, callback) {
    "use strict";
    let requestDetails = [];
    db.all("SELECT distinct received_at FROM ff_requests where request_id='" + requestId + "'ORDER BY received_at",

        function (err, rows) {
            for (let key in rows) {
                db.all("SELECT * FROM ff_requests WHERE request_id='" + requestId + "' AND received_at =  DATETIME('" + rows[key].received_at + "')", function (err, rows1) {
                    requestDetails[requestDetails.length] = rows1;
                    if (requestDetails.length === rows.length) {
                        callback(requestDetails);
                    }
                });
            }
        });
}

function getMyPublicIp(callback) {
    if (public_ip === "0.0.0.0") {
        externalip(function (err, ip) {
            console.log(ip);
            console.log(err);
            if (!err) {
                public_ip = ip
                callback(ip);
            } else {
                callback("0.0.0.0");
            }
        });
    } else callback(public_ip);
}


module.exports = router;
