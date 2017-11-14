var sqlite3 = require('sqlite3').verbose();
var file = "fulfilment_requests";
var db = new sqlite3.Database(file);

db.serialize(function() {

    db.run(
        "CREATE TABLE IF NOT EXISTS fulfilment_requests (" +
        "request_id TEXT NOT NULL, " +
        "version INTEGER NOT NULL, " +
        "order_id TEXT, " +
        "original_payload TEXT NOT NULL," +
        "created_at TEXT NOT NULL, " +
        "received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
        "PRIMARY KEY (request_id, version)" +
        ");"
    );

    db.run(
        "CREATE TABLE IF NOT EXISTS shipping_address (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "request_id TEXT NOT NULL, " +
        "version INTEGER NOT NULL, " +
        "first_name TEXT, " +
        "second_name TEXT, " +
        "last_name TEXT, " +
        "city TEXT, " +
        "state TEXT, " +
        "zip_code TEXT, " +
        "address_line_1 TEXT, " +
        "address_line_2 TEXT, " +
        "province TEXT, " +
        "country_code TEXT, " +
        "phone TEXT, " +
        "email TEXT, " +
        "FOREIGN KEY(request_id, version) REFERENCES fulfilment_requests(request_id, version) ON UPDATE CASCADE ON DELETE CASCADE" +
        ");"
    );

    db.run(
        "CREATE TABLE IF NOT EXISTS billing_address (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "request_id TEXT NOT NULL, " +
        "version INTEGER NOT NULL, " +
        "first_name TEXT, " +
        "second_name TEXT, " +
        "last_name TEXT, " +
        "city TEXT, " +
        "state TEXT, " +
        "zip_code TEXT, " +
        "address_line_1 TEXT, " +
        "address_line_2 TEXT, " +
        "province TEXT, " +
        "country_code TEXT, " +
        "phone TEXT, " +
        "email TEXT, " +
        "FOREIGN KEY(request_id, version) REFERENCES fulfilment_requests(request_id, version) ON UPDATE CASCADE ON DELETE CASCADE" +        
        ");"
    );

    db.run(
        "CREATE TABLE IF NOT EXISTS shipping_options (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "request_id TEXT NOT NULL, " +
        "version INTEGER NOT NULL, " +
        "carrier TEXT, " +
        "service_level TEXT, " +
        "FOREIGN KEY(request_id, version) REFERENCES fulfilment_requests(request_id, version) ON UPDATE CASCADE ON DELETE CASCADE" +                
        ");"
    );

    db.run(
        "CREATE TABLE IF NOT EXISTS order_extended_attr (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "request_id TEXT NOT NULL, " +
        "version INTEGER NOT NULL, " +
        "name TEXT, " +
        "value TEXT, " +
        "FOREIGN KEY(request_id, version) REFERENCES fulfilment_requests(request_id, version) ON UPDATE CASCADE ON DELETE CASCADE" +                
        ");"
    );

    db.run(
        "CREATE TABLE IF NOT EXISTS items (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "request_id TEXT NOT NULL, " +
        "version INTEGER NOT NULL, " +
        "product_id TEXT, " +
        "FOREIGN KEY(request_id, version) REFERENCES fulfilment_requests(request_id, version) ON UPDATE CASCADE ON DELETE CASCADE" +                
        ");"
    );

    db.run(
        "CREATE TABLE IF NOT EXISTS item_extended_attr (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "item_id INTEGER NOT NULL, " +
        "name TEXT, " +
        "value TEXT, " +
        "FOREIGN KEY(item_id) REFERENCES items(id) ON UPDATE CASCADE ON DELETE CASCADE" +        
        ");"
    );

    db.run(
        "create view IF NOT EXISTS v_requests_list as " +
        "select " +
        "(billing_address.first_name || ' ' || billing_address.second_name || ' ' || billing_address.last_name) as customer, " +
        "fulfilment_requests.request_id as request_id, " +
        "fulfilment_requests.order_id as order_id, " +
        "fulfilment_requests.created_at as created_at, " +
        "fulfilment_requests.received_at as received_at, " +
        "fulfilment_requests.version as version, " +
        "group_concat(items.product_id, ';') as products " +
        "from items " +
        "left join fulfilment_requests on fulfilment_requests.request_id = items.request_id AND fulfilment_requests.version = items.version " +
        "left join billing_address on  fulfilment_requests.request_id = billing_address.request_id AND fulfilment_requests.version = billing_address.version " +
        "group by fulfilment_requests.request_id, fulfilment_requests.version "
    );
    
});

module.exports = db;