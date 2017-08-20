"use strict";
var db = require('../db');
var express = require('express');
var request = require('request');


exports.getRequestList = function (req, res) {
    db.all("SELECT request_id, " +
        "created_at, " +
        "group_concat(product_id) as products, " +
        "received_at, " +
        "SUBSTR(billing_address, 16, INSTR(billing_address, 'second_name') - 19) as customer_n1, " +
        "SUBSTR(billing_address, INSTR(billing_address, 'last_name') + 12,  INSTR(billing_address, 'city') - INSTR(billing_address, 'last_name') - 15) as customer_n2 " +
        "FROM ff_requests GROUP BY request_id, created_at, received_at ORDER BY received_at desc",
        function (err, rows) {
            if (err) {
                console.log(JSON.stringify(err));
                res.render('error', {error: {stack: JSON.stringify(err), status: 'SQLError'}});
            } else {
                res.render('requests_list', {
                    requests: rows
                });
            }
        });
};

exports.getRequestDetails = function (req, res) {
    getRequestDetailsFromDB(req.params.id, function (err, details) {
        if (!err) {
            res.render('request_details',
                {
                    request_id: req.params.id,
                    requests: details
                });
        } else {
            res.render('error', {error: {stack: JSON.stringify(err), status: 'SQLError'}});
        }
    });
};

exports.postFFRequest = function (req, res) {
    let reqBody = req.body;

    console.log(reqBody);
    reqBody.items.forEach(function (item) {
        let stmt = db.prepare("INSERT INTO ff_requests (request_id, billing_address, shipping_address, shipping_options," +
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
};

exports.postFFRequestByIdRejection = function (req, res) {
    console.log(req.body);
    console.log(req.cookies);

    let url = (req.cookies.host.includes(".newstore.net") ? "https://" : "http://") + req.cookies.host;

    let headers = {
        'Authorization': 'Bearer ' + req.cookies.token
    };
    let body = {};
    body.rejection_reason = req.body.rejection_reason;
    if (req.body.missing_items) {
        body.missing_items = [];
        body.missing_items = body.missing_items.concat(req.body.missing_items);
    }


    let options = {
        url: url + "/v0/d/fulfillment_requests/" + req.params.id + "/rejection",
        method: 'POST',
        headers: headers,
        json: body
    };

    request(options, function (error, response, body) {
        if (!error) {
            let bod = {};
            if (body) {
                bod = body;
            }
            res.render("processing_result", {
                success: response.statusCode === 201,
                status_code: response.statusCode,
                response_body: JSON.stringify(bod),
                request_type: "rejection",
                request_id: req.params.id.toString()
            });
            // res.send(JSON.stringify(body));
        } else {
            console.log("error" + error);
            res.locals.message = error.message;
            res.locals.error = error;
            res.status(error.status || 500);
            res.render('error');
        }
    });
};

exports.getFFRequestByIdShipment = function (req, res) {
    console.log(req.body);
    console.log(req.cookies);
    let url = (req.cookies.host.includes(".newstore.net") ? "https://" : "http://") + req.cookies.host;

    let headers = {
        'Authorization': 'Bearer ' + req.cookies.token
    };

    let options = {
        url: url + "/v0/d/fulfillment_requests/" + req.params.id + "/shipment",
        method: 'GET',
        headers: headers
    };
    request(options, function (error, response, body) {
        if (!error) {
            if (response.statusCode === 404) {
                res.send(JSON.stringify({"Returned 404": "Shippment record does not exist"}));
            } else {
                res.send(body);
            }
        } else {
            console.log("error" + error);
            res.locals.message = error.message;
            res.locals.error = error;
            res.status(error.status || 500);
            res.render('error');
        }
    });
};

exports.getFFRequestByIdRejection = function (req, res) {
    console.log(req.body);
    console.log(req.cookies);
    let url = (req.cookies.host.includes(".newstore.net") ? "https://" : "http://") + req.cookies.host;

    let headers = {
        'Authorization': 'Bearer ' + req.cookies.token
    };

    let options = {
        url: url + "/v0/d/fulfillment_requests/" + req.params.id + "/rejection",
        method: 'GET',
        headers: headers
    };
    request(options, function (error, response, body) {
        if (!error) {
            if (response.statusCode === 404) {
                res.send(JSON.stringify({"Returned 404": "Rejection record does not exist"}));
            } else {
                res.send(body);
            }
        } else {
            console.log("error" + error);
            res.locals.message = error.message;
            res.locals.error = error;
            res.status(error.status || 500);
            res.render('error');
        }
    });
};

exports.postFFRequestByIdAcknowledgement = function (req, res) {
    let url = (req.cookies.host.includes(".newstore.net") ? "https://" : "http://") + req.cookies.host;
    let headers = {
        'Authorization': 'Bearer ' + req.cookies.token
    };
    let options = {
        url: url + "/v0/d/fulfillment_requests/" + req.params.id + "/acknowledgement",
        method: 'POST',
        headers: headers
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
};

exports.postFFRequestByIdShippment = function (req, res) {
    console.log(req.body);
    var shippments = [];
    let loopCount = 0;

    for (let k in req.body) {
        console.log(k + " " + req.body[k]);
        let index = k.substr(9, 1);

        if (!shippments[index]) {
            shippments[index] = Object();
        }
        if (k.indexOf("_carrier") > -1) {
            shippments[index].carrier = req.body[k];
        }
        if (k.indexOf("_tracking_code") > -1) {
            shippments[index].tracking_code = req.body[k];
        }
        if (k.indexOf("_orderItems") > -1) {
            shippments[index].orderItems = [];
            shippments[index].orderItems = shippments[index].orderItems.concat(req.body[k]);
        }

        if (loopCount < Object.keys(req.body).length - 1) {
            ++loopCount;
        } else {
            procedWithShipp(res, req, shippments);
        }
    }
};


function procedWithShipp(res, req, shippments) {
    let url = (req.cookies.host.includes(".newstore.net") ? "https://" : "http://") + req.cookies.host;

    let headers = {
        'Authorization': 'Bearer ' + req.cookies.token
    };
    let body = {'line_items': []};
    for (let idx in shippments) {
        let shipment = {tracking_code: shippments[idx].tracking_code, carrier: shippments[idx].carrier};
        body.line_items.push({shipment: shipment, item_ids: shippments[idx].orderItems});
    }

    console.log("Body: " + JSON.stringify(body));

    let options = {
        url: url + "/v0/d/fulfillment_requests/" + req.params.id + "/shipment",
        method: 'POST',
        headers: headers,
        json: body
    };

    request(options, function (error, response, body) {
        if (!error) {
            let bod = {};
            if (body) {
                bod = body;
            }
            res.render("processing_result", {
                success: response.statusCode === 201,
                status_code: response.statusCode,
                response_body: JSON.stringify(bod),
                request_type: "shippment",
                request_id: req.params.id.toString()
            });
        } else {
            console.log("error" + error);
            res.locals.message = error.message;
            res.locals.error = error;
            res.status(error.status || 500);
            res.render('error');
        }
    });
}

function getRequestDetailsFromDB(requestId, callback) {
    return promisifiedDbAll("SELECT distinct received_at FROM ff_requests where request_id='" + requestId + "'ORDER BY received_at")
        .then(function (rows) {
            var resPromises = [];
            for (let key in rows) {
                resPromises.push(promisifiedDbAll("SELECT * FROM ff_requests WHERE request_id='" + requestId + "' AND received_at =  DATETIME('" + rows[key].received_at + "')"));
            }
            return Promise.all(resPromises)
        })
        .then(function (allResults) {
            callback(null, allResults);
        })
        .catch(function (err) {
            callback(err);
        });
}

function promisifiedDbAll(request) {
    return new Promise(function (resolve, reject) {
        db.all(request, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}