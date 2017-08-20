"use strict";
var express = require('express');
var router = express.Router();
var handlers = require('./handlers');

// UI Page to show all requests
router.get('/', function (req, res) {
    handlers.getRequestList(req, res);
});

// UI Page to show request details
router.get('/:id', function (req, res) {
    handlers.getRequestDetails(req, res)
});

// STUB
router.post('/', function (req, res) {
    handlers.postFFRequest(req, res)
});

// GET REJECTION STATUS
router.get('/:id/reject', function (req, res) {
    handlers.getFFRequestByIdRejection(req, res);
});

// POST REJECTION
router.post('/:id/reject', function (req, res) {
    handlers.postFFRequestByIdRejection(req, res);
});

// POST ACKNOWLEDGEMENT
router.post('/:id/acknowledge', function (req, res) {
    handlers.postFFRequestByIdAcknowledgement(req, res);
});

// GET SHIPPMENT STATUS
router.get('/:id/ship', function (req, res) {
    handlers.getFFRequestByIdShipment(req, res);
});

// POST NEW SHIPPMENT
router.post('/:id/ship', function (req, res) {
    handlers.postFFRequestByIdShippment(req, res);
});

module.exports = router;