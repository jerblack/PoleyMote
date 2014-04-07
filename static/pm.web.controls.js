// htc One is 1080x1920
// lumia is 768x1280

var animRate = 300;

(function () {
    console.log("Startup - calling fixWidth()");
    setTimeout(fixWidth, 1);

})();


function fixWidth() {
    console.log("Calling fixWidth()");
    var dw = document.documentElement.clientWidth;
    if (dw < 360) {
        $("page").css("width", dw + 'px');
        $("menu").css("width", dw + 'px');
        $("toolbar").css("width", dw + 'px');

    }
}

function sendWebRequest(link) {
    console.log("Calling sendWebRequest('" + link + "')");
    var request = new XMLHttpRequest();
    var msg = "http://" + location.host + link;
    request.open("GET", msg, true);
    request.send(null);
}

function doneButton() {
    console.log("Calling doneButton()");
    $("#doneButton").fadeIn();
    setTimeout(function () { $("#doneButton").fadeOut(); }, 1000);
}

