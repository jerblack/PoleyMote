// Initialize the Spotify objects

var sp = getSpotifyApi(1),
    models = sp.require("sp://import/scripts/api/models"),
    views = sp.require("sp://import/scripts/api/views"),
    ui = sp.require("sp://import/scripts/ui"),
    player = models.player,
    library = models.library,
    application = models.application,
    playerImage = new views.Player();


var serverIP = "192.168.0.50";

var q = new Array();
var qPLs = new Array();
var lastTrack;


$(function () { // Starts when app loads
    log('Welcome', 'PoleyMote Spotify app is now loaded.');
    var args = models.application.arguments

    doRemote();
    utils.settings.get();

    // Update the page when the app loads
    nowplaying.dashboard();
    dashboard.toolButtons();
    utils.worker.start();

    // Listen for track changes and update the page
    player.observe(models.EVENT.CHANGE, function (event) {
        if (event.data.curtrack == true) {

			if (player.context != undefined) {
			    if (player.context.search("internal:temp_playlist") != -1) {
                    if (qPLs.length > 0){
                        nowplaying.log(true, true); 
                    } else {
                        nowplaying.log(false, true);
                    }
				} else {
			        nowplaying.log(true, false);
			    }
			} else {
			    nowplaying.log(false, true);
			}
            nowplaying.dashboard()
            controls.appendToQueue();
            utils.migrate.whenDone()
            // getPlayQueue();
        }
        remove.later.process();
    });

});


function doRemote() {
    var url = "ws://localhost:9000";
    var appName = "poleymote"
    var webSocket = new WebSocket(url);

    document.getElementById('url').innerHTML = url;
    var statusNode = document.getElementById('status');

    webSocket.onopen = function (e) {
        log("Connection to Server", ["Socket opened", "Connected to PoleyMote server"]);
        statusNode.innerHTML = "Connected";
        statusNode.className = "success";
        utils.settings.get();
    };

    webSocket.onclose = function (e) {
        log("Connection to Server", ["Socket closed", "Not connected to PoleyMote server"]);
        statusNode.innerHTML = "Not connected";
        statusNode.className = "error";
        setTimeout(doRemote(), 5000);
    };

    webSocket.onerror = function (e) {
        statusNode.innerHTML = "Error";
        statusNode.className = "error";
    };

    webSocket.onmessage = function (e) {
        var cmd = e.data.replace(appName + ':', '');
        log('Command Received', 'Command: ' + cmd);
        handleMsg(cmd);
    };
}

function log(entryType, entryText, logToDashboard) {
    if (typeof logToDashboard === "undefined") {
        logToDashboard = true;
    }
    if (typeof entryText === "undefined") {
        entryText = [""];
    }
    if (typeof entryText === "string") {
        var temp = entryText;
        entryText = new Array();
        entryText[0] = temp;
    }
    //Log to dashboard
    if (logToDashboard == true) {
        var dbString;
        if (entryType == undefined || entryType == "") {
            dbString = "";
        } else {
            dbString = '<div>|' + entryType + '|</div>';
        }
        entryText.forEach(function (e) {
            if (e != "" && e != null) {
                dbString += '<div class="logdata">' + e + '</div>';
            }
        });
        $("#play-history").prepend(dbString);
    };

    //Log to console
    var conString = ""
    if (entryType != '') {
        conString +=   "| " + entryType + " |";
    }
    entryText.forEach(function (e) {
        if (e != "" && e != null) {
            conString += ' - ' + e;
        }
    });
    console.log(conString);
    dashboard.trimLog();

}

function handleMsg(cmd) {
    if (cmd.indexOf('+') != -1) {
        cmd = cmd.split("+");
        switch (cmd[0]) {
            case 'playplaylist':
                controls.play.playlist(cmd[1]);
                break;
            case 'playtrack':
                controls.play.track(cmd[1]);
                break;
            case 'playalbum':
                controls.play.album(cmd[1]);
                break;

            // unfinished
            case 'getbookmarks':
                sendBookmarks(cmd[1]);
                break;
            case 'playbookmarks':
                playBookmark(cmd[1]);
                break;
            case 'addbookmark':
                addToBookmarks(cmd[1]);
                break;
            case 'removebookmark':
                removeFromBookmarks(cmd[1], cmd[2]);
                break;
        }
    } else {
        switch (cmd) {
            case 'playpause':
                controls.play.toggle();
                break;
            case 'thumbsup':
                star.current();
                break;
            case 'thumbsdown':
                remove.track.current();
                break;
            case 'nexttrack':
                controls.next();
                break;
            case 'skipback':
                controls.skipback();
                break;
            case 'removelater':
                remove.later.set();
                break;
            case 'cancelremovelater':
                remove.later.cancel();
                break;
            case 'refresh':
                nowplaying.sendUpdate();
                break;
            case 'playstarred':
                controls.play.starred();
                break;
            case 'playshuffleplaylists':
                controls.play.shuffle();
                break;
            case 'archivetrack':
                archive.track.current();
                break;
            case 'removeartist':
                remove.artist.current();
                break;
            case 'removealbum':
                remove.album.current();
                break;
            case 'addartist':
                add.artist.current();
                break;
            case 'addalbum':
                add.album.current();
                break;
        }
    }
}

dashboard = {}

dashboard.playlistButtons = function () {
    var favPLs = config.Playlists.Favorite_Playlists;
    $("#favPlaylists").children("button").remove();
    favPLs.forEach(function (p) {
        var name = p.Name;
        var plBtn = $(document.createElement('button')).attr('class', 'toolButtons');
        plBtn.text(name);
        plBtn.attr('onclick', 'controls.play.playlist("' + p.uri + '");')
        $("#favPlaylists").append(plBtn);
    })
    $($("#favPlaylists").children("button")[$("#favPlaylists").children("button").length - 1]).attr('class', 'bottomToolButton toolButtons')
}

dashboard.toolButtons = function () {
    $("#backBtn").click(controls.skipback);
    $("#playBtn").click(controls.play.toggle);
    $("#nextBtn").click(controls.next);
    $("#archivetrack").click(controls.archiveTrack);
    $("#playshuffle").click(controls.play.shuffle);
    $("#playstarred").click(controls.play.starred);
    $("#thumbsDownBtn").click(remove.track.current);
    $("#thumbsUpBtn").click(star.current);
    $("#remove_artist").click(remove.artist.current);
    $("#remove_album").click(remove.album.current);
    $("#dedupe").click(dedupe.find);
    $("#deletequeue").click(remove.queue.process);
    $("#connectsonos").click(utils.sonos.connect);
    $("#disconnectsonos").click(utils.sonos.disconnect);
    $("#remove_later_cancel").click(remove.later.cancel);
    $("#remove_later_set").click(remove.later.set);
}

dashboard.trimLog = function () {
    while (window.innerHeight-24 < $('#statusDiv').height()) {
        var ph = $('#play-history').children('div');
        ph[ph.length - 1].remove();
    }
}