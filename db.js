var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.serialize(function() {
    db.run("CREATE TABLE ff_requests " +
        "(request_id TEXT, " +
        "billing_address TEXT, " +
        "shipping_address TEXT, " +
        "shipping_options TEXT, " +
        "created_at TEXT, " +
        "product_id TEXT, " +
        "item_id TEXT, " +
        "extended_attributes TEXT, " +
        "original_payload TEXT," +
        "received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
});

module.exports = db;