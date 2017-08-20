window.onload = function () {
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    if (document.getElementById('token_field')) {
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf("token=") === 0) {
                document.getElementById('token_field').value = c.split("=")[1];
            }
            if (c.indexOf("host=") === 0) {
                document.getElementById('host').value = c.split("=")[1];
            }
            if (c.indexOf("username=") === 0) {
                document.getElementById('username').value = c.split("=")[1];
            }
        }
    }
}
;

function clearCookies() {
    var cookies = decodeURIComponent(document.cookie).split(";");
    for (var i = 0; i < cookies.length; i++) {
        let d = new Date();
        document.cookie = cookies[i].split("=")[0] + "=;path=/;expires=" + d.toUTCString();
    }
    document.getElementById('token_field').value = "";
}

function checkToken() {
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf("token=") === 0) {
            return true
        }
    }
    alert("Credentials are required");
    return false;
}

function isAckPossible() {
    return checkToken();
}

function isRejectPossible() {
    return checkToken();
}

function isShippmentPossible() {
    return checkToken();
}

function callToken(host, username, password) {
    $.ajax({
        type: "POST",
        url: "http://" + host + "/v0/token",
        data: "grant_type=password&username=" + username + "&password=" + password
    })
        .done(function (message) {
            document.cookie = "token=" + message.access_token + "; path=/; max-age=7200;";
            document.cookie = "host=" + document.getElementById("host").value + "; path=/; max-age=7200;";
            document.cookie = "username=" + document.getElementById("username").value + "; path=/; max-age=7200;";
            document.getElementById('token_field').value = message.access_token;
        })
        .fail(function (message) {
            alert("incorrect username or password for " + host);
        });
}

function getShippmentStatus(request_id) {
    $.ajax({
        type: "GET",
        url: "/stub/" + request_id + "/ship"
    })
        .done(function (message) {
            document.getElementById('shippmentStatus').value = JSON.stringify(JSON.parse(message), null, 2)
        })
        .fail(function (message) {
            alert(JSON.stringify(message));
        });
}

function getRejectionStatus(request_id) {
    $.ajax({
        type: "GET",
        url: "/stub/" + request_id + "/reject"
    })
        .done(function (message) {
            let mess = {};
            if (message) {
                mess = message;
            }
            console.log(mess);
            document.getElementById('rejectionStatus').value = JSON.stringify(JSON.parse(mess), null, 2);
        })
        .fail(function (message) {
            alert(JSON.stringify(message));
        });
}

function addShippmentUi(request) {
    console.log("Adding shippment UI form");
    let shippmentForm = document.createElement("fieldset");
    var indexxx = $("*[id^=shippment_form]").length;
    let flegend = document.createElement("legend");
    flegend.innerHTML = "Shippment #" + indexxx;
    shippmentForm.appendChild(flegend);
    shippmentForm.id = "shippment_form";
    shippmentForm.setAttribute("name", "shippment" + indexxx);

    let selectionWarning = document.createElement("p");
    selectionWarning.innerHTML = "Hold down the Ctrl (windows) / Command (Mac) button to select multiple options.";


    let itemsInput = document.createElement('select');
    itemsInput.setAttribute("name", "shippment" + indexxx + "_orderItems");
    itemsInput.setAttribute("multiple", "");
    for (var index in request) {
        let id = request[index].product_id;
        let itemId = request[index].item_id;
        let option = document.createElement("option");
        option.setAttribute("value", itemId.replace("\"", "").replace("\"", ""));
        option.innerHTML = itemId + " ( " + id + " ) ";
        itemsInput.appendChild(option);
    }


    let carrierInputText = document.createElement("input");
    carrierInputText.setAttribute("name", "shippment" + indexxx + "_carrier");

    let trackingCodeInputText = document.createElement("input");
    trackingCodeInputText.setAttribute("name", "shippment" + indexxx + "_tracking_code");

    shippmentForm.appendChild(document.createTextNode("Carrier     \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0   "));
    shippmentForm.appendChild(carrierInputText);
    shippmentForm.appendChild(document.createElement("br"));
    shippmentForm.appendChild(document.createTextNode("Tracking code \u00A0 "));
    shippmentForm.appendChild(trackingCodeInputText);
    shippmentForm.appendChild(document.createElement("br"));
    shippmentForm.appendChild(itemsInput);
    shippmentForm.appendChild(selectionWarning);
    let submitButton = document.getElementById('shippment_submit_button' + request[0].received_at);
    document.getElementById('shippment_outer_form' + request[0].received_at).insertBefore(shippmentForm, submitButton);

}

$(function () {
    $("legend").parents("fieldset").find("*:not('legend')").toggle();

    $("legend").click(function () {
        $(this).parents("fieldset").find("*:not('legend')").toggle();
        return false;
    });
});