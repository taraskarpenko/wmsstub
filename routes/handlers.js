"use strict";
var db = require('../db');
var express = require('express');
var request = require('request');


exports.getRequestList = function (req, res) {
    db.all("SELECT * from v_requests_list ORDER BY received_at desc",
        function (err, rows) {
            if (err) {
                console.log(JSON.stringify(err));
                res.render('error', { error: { stack: JSON.stringify(err), status: 'SQLError' } });
            } else {
                res.render('requests_list', {
                    requests: rows
                });
            }
        }
    );
};

exports.getRequestDetails = function (req, res) {
    getRequestDetailsFromDB(req.params.id)
        .then(function (requests) {
            res.render('request_details',
                {
                    request_id: req.params.id,
                    requests: requests
                });
        })
};

exports.postFFRequest = function (req, res) {
    let reqBody = req.body;

    console.log(reqBody);
    db.all("SELECT MAX(version) as version FROM fulfilment_requests WHERE request_id = '" + reqBody.id + "'", function (err, rows) {
        let version = 0;
        if (rows) {
            version = rows[0].version + 1;
        }

        let stmt1 = db.prepare("INSERT INTO fulfilment_requests (request_id, version, order_id, original_payload, created_at)" +
            "VALUES (?,?,?,?,?)");
        stmt1.run(reqBody.id, version, reqBody.order_id, JSON.stringify(reqBody), reqBody.created_at);
        stmt1.finalize();

        let stmt2 = db.prepare("INSERT INTO shipping_address (request_id, version, first_name, second_name, last_name, city, " +
            "state, zip_code, address_line_1, address_line_2, province, country_code, phone, email)" +
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        stmt2.run(
            reqBody.id,
            version,
            reqBody.shipping_address.first_name,
            reqBody.shipping_address.second_name,
            reqBody.shipping_address.last_name,
            reqBody.shipping_address.city,
            reqBody.shipping_address.state,
            reqBody.shipping_address.zip_code,
            reqBody.shipping_address.address_line_1,
            reqBody.shipping_address.address_line_2,
            reqBody.shipping_address.province,
            reqBody.shipping_address.country_code,
            reqBody.shipping_address.phone,
            reqBody.shipping_address.email
        );
        stmt2.finalize();

        let stmt3 = db.prepare("INSERT INTO billing_address (request_id, version, first_name, second_name, last_name, city, " +
            "state, zip_code, address_line_1, address_line_2, province, country_code, phone, email)" +
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        stmt3.run(
            reqBody.id,
            version,
            reqBody.billing_address.first_name,
            reqBody.billing_address.second_name,
            reqBody.billing_address.last_name,
            reqBody.billing_address.city,
            reqBody.billing_address.state,
            reqBody.billing_address.zip_code,
            reqBody.billing_address.address_line_1,
            reqBody.billing_address.address_line_2,
            reqBody.billing_address.province,
            reqBody.billing_address.country_code,
            reqBody.billing_address.phone,
            reqBody.billing_address.email
        );
        stmt3.finalize();

        let stmt4 = db.prepare("INSERT INTO shipping_options (request_id, version, carrier, service_level) VALUES (?,?,?,?)");

        stmt4.run(
            reqBody.id,
            version,
            reqBody.shipping_options.carrier,
            reqBody.shipping_options.service_level
        );
        stmt4.finalize();

        let stmt5 = db.prepare("INSERT INTO order_extended_attr (request_id, version, name, value) VALUES (?,?,?,?)");
        reqBody.extended_attributes.forEach(function (attribute) {
            stmt5.run(
                reqBody.id,
                version,
                attribute.name,
                attribute.value
            );
        });

        stmt5.finalize();

        promisifiedInsertItems(reqBody.id, version, reqBody.items);

    });

    res.status(200);
    res.send('Request saved in DB');
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
    if (req.body.missing_product_ids) {
        body.missing_product_ids = [];
        body.missing_product_ids = body.missing_product_ids.concat(req.body.missing_product_ids);
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
                res.send(JSON.stringify({ "Returned 404": "Shippment record does not exist" }));
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
                res.send(JSON.stringify({ "Returned 404": "Rejection record does not exist" }));
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
    let body = { 'line_items': [] };
    for (let idx in shippments) {
        let shipment = { tracking_code: shippments[idx].tracking_code, carrier: shippments[idx].carrier };
        body.line_items.push({ shipment: shipment, product_ids: shippments[idx].orderItems });
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

function promisifiedInsertItems(request_id, version, items) {
    let item = items.shift();
    if (!item) return;
    return insertItemWithAttr(request_id, version, item)
        .then(function () {
            return promisifiedInsertItems(request_id, version, items);
        })
        .catch(function () {
            return promisifiedInsertItems(request_id, version, items);
        });
}

function insertItemWithAttr(request_id, version, item) {
    return new Promise(function (resolve, reject) {
        let query = "INSERT INTO items (request_id, version, product_id) VALUES (?,?,?)";
        db.run(query, [request_id, version, item.product_id], function (err) {
            let stmt2 = db.prepare("INSERT INTO item_extended_attr (item_id, name, value) VALUES (?,?,?)");
            let id = this.lastID;
            item.extended_attributes.forEach(function (attribute) {
                stmt2.run(id, attribute.name, attribute.value);
            });
            stmt2.finalize(function () {
                return resolve();
            });
        });
    });
}

function getRequestDetailsFromDB(requestId) {
    return promisifiedDbAll("select * from fulfilment_requests where request_id='" + requestId + "' order by version desc")
        .then(function (rows) {
            return rows.map((row) => ({
                "request_id": row.request_id,
                "version": row.version,
                "order_id": row.order_id,
                "items": [],
                "extended_attributes": [],
                "original_payload": row.original_payload,
                "created_at": row.created_at,
                "received_at": row.received_at
            }));
        })
        .then(function (requests) {
            let promises = [];
            
            return Promise.all(requests.map((request) => {
                return promisifiedDbAll("select * from items where request_id='" + request.request_id + "' and version=" + request.version)
                .then((rows) => {
                    rows.forEach((row) => {
                        request.items.push({
                            id: row.id,
                            product_id: row.product_id,
                            extended_attributes: []
                        })
                    })

                    return request;
                })
                .then((request) => {
                    request.items.map((item) => {
                        return promisifiedDbAll("select * from item_extended_attr where item_id=" + item.id)
                        .then((rows) => {
                            rows.forEach((row) => {
                                item.extended_attributes.push({
                                    name: row.name,
                                    value: row.value
                                })
                            });
                        })
                        return item;
                    })
                    return request
                })
                .then((request) => {
                    return request;
                })
            }))
        })
        .then(function (requests) {
            let promises = [];
            
            return Promise.all(requests.map((request) => {
                return promisifiedDbAll("select * from order_extended_attr where request_id='" + request.request_id + "' and version=" + request.version)
                .then((rows) => {
                    rows.forEach((row) => {
                        request.extended_attributes.push({
                            name: row.name,
                            value: row.value
                        })
                    })

                    return request;
                })
                .then((request) => {
                    return request;
                });
            }))
        })
        .then(function (requests) {
            let promises = [];
            
            return Promise.all(requests.map((request) => {
                return promisifiedDbAll("select * from shipping_options where request_id='" + request.request_id + "' and version=" + request.version)
                .then((rows) => {
                    request.shipping_options= {
                        carrier: rows[0].carrier,
                        service_level: rows[0].service_level
                    }
                    return request;
                })
                .then((request) => {
                    return request;
                });
            }))
        })
        .then(function (requests) {
            let promises = [];
            
            return Promise.all(requests.map((request) => {
                return promisifiedDbAll("select * from billing_address where request_id='" + request.request_id + "' and version=" + request.version)
                .then((rows) => {
                    request.billing_address= {
                        first_name: rows[0].first_name,
                        second_name: rows[0].second_name,
                        last_name: rows[0].last_name,
                        city: rows[0].city,
                        state: rows[0].state,
                        zip_code: rows[0].zip_code,
                        address_line_1: rows[0].address_line_1,
                        address_line_2: rows[0].address_line_2,
                        province: rows[0].province,
                        country_code: rows[0].country_code,
                        phone: rows[0].phone,
                        email: rows[0].email
                    }
                    return request;
                })
                .then((request) => {
                    return request;
                });
            }))
        })
        .then(function (requests) {
            let promises = [];
            
            return Promise.all(requests.map((request) => {
                return promisifiedDbAll("select * from shipping_address where request_id='" + request.request_id + "' and version=" + request.version)
                .then((rows) => {
                    request.shipping_address= {
                        first_name: rows[0].first_name,
                        second_name: rows[0].second_name,
                        last_name: rows[0].last_name,
                        city: rows[0].city,
                        state: rows[0].state,
                        zip_code: rows[0].zip_code,
                        address_line_1: rows[0].address_line_1,
                        address_line_2: rows[0].address_line_2,
                        province: rows[0].province,
                        country_code: rows[0].country_code,
                        phone: rows[0].phone,
                        email: rows[0].email
                    }
                    return request;
                })
                .then((request) => {
                    return request;
                });
            }))
        })
        .then(function (requests) {
            return requests;
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