function clearCookies() {
    var cookies = decodeURIComponent(document.cookie).split(";");
    for (var i = 0; i < cookies.length; i++) {
        document.cookie = cookies[i].split("=")[0] + '=; Max-Age=0'
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

function callToken(host, username, password) {
    $.post("https://" + host + "/v0/token", "grant_type=password&username=" + username + "&password=" + password)
        .done(function (message) {
            document.cookie = "token=" + message.access_token + "; path=/; max-age=7200;";
            document.cookie = "host=" + document.getElementById("host").value + "; path=/; max-age=7200;";
            document.getElementById('token_field').value = message.access_token;
        })
        .fail(function (message) {
            alert("incorrect username or password for " + host);
        });
}