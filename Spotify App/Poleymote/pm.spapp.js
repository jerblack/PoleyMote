// Initialize the Spotify objects
var sp = getSpotifyApi(1),
    models = sp.require("sp://import/scripts/api/models"),
    views = sp.require("sp://import/scripts/api/views"),
    ui = sp.require("sp://import/scripts/ui");
    // metadata = sp.require("sp://import/scripts/metadata"),
    // spArray = sp.require("sp://import/scripts/array"),
    // spDND = sp.require("sp://import/scripts/dnd"),
    // spFS = sp.require("sp://import/scripts/fs"),
    // spPromise = sp.require("sp://import/scripts/promise"),
    // react = sp.require("sp://import/scripts/react"),
    // spUtil = sp.require("sp://import/scripts/util"),
    var player = models.player;
    var library = models.library;
    var application = models.application;
    var playerImage = new views.Player();

//spotify library playlists
var sl1 = 'spotify:user:jerblack:playlist:5XnrfPufI8J3WuDXSJrj3m';
var sl2 = 'spotify:user:jerblack:playlist:3L5VxdSBxnUPVhwXCoThiG';
var sl3 = 'spotify:user:jerblack:playlist:3HESEQC2UvmA1Ap1q4Q2m1';
//iTunes Music playlist
var itm = 'spotify:user:jerblack:playlist:0Ylz9nIhbZpapcDVaST6bd';

//test playlist
var tpl = "spotify:user:jerblack:playlist:3HFHQx96edpvrz1vBA0JtM";
//delete later playlist
var dltr = "spotify:user:jerblack:playlist:67EixlPyzPOax02RdqquBs"
//spotify:user:jerblack:playlist:67EixlPyzPOax02RdqquBs
//bookmarks
var jbm = "spotify:user:jerblack:playlist:4aSwU3mYsVoMV5Wnxo4AbB";
var mbm = "spotify:user:jerblack:playlist:6b82pMJqlIBygf3cHgZZ5p";
//electronic and ambient
var elec = "spotify:user:jerblack:playlist:0m2cGNVm9Zp6l9e09SiffL";
var ambi = "spotify:user:jerblack:playlist:7a9mjhowih1tHU94Yve7lx";
var star = "spotify:user:jerblack:starred";
var clas = "spotify:user:jerblack:playlist:695tkzllIgTDYjq8S8KJGx";
var coachella = "spotify:user:jerblack:playlist:0WAbJXwfOJbwU7nhz8aOKh";


var serverIP = "192.168.0.50";
var deleteLater = 0;
var deleteLaterTrack;
var localPaths = new Array();
var config = {};
var queue = new Array();
var queuePLs = new Array();


$(function () { // Starts when app loads
    log('Welcome', 'PoleyMote Spotify app is now loaded.');
    var args = models.application.arguments
    var lastTrack;

    $("#" + args[0]).show();
    doRemote();
    getSettings();

    // Update the page when the app loads
    nowPlaying();

    // Listen for track changes and update the page
    player.observe(models.EVENT.CHANGE, function (event) {
        if (event.data.curtrack == true) {

			if (player.context != undefined) {
			    if (player.context.search("internal:temp_playlist") != -1) {
                    if (queuePLs.length > 0){
                        logNP(true, true); 
                    } else {
                        logNP(false, true);
                    }
				} else {
			        logNP(true, false);
			    }
			} else {
			    logNP(false, true);
			}
            nowPlaying();
            nowPlayingInfo();
            appendToQueue();
            // getPlayQueue();
        }
        processDeleteLater();
    });
});

function logNP(includePL, shuffle) {
    var t = player.track;
    if (includePL == true) {
        if (shuffle == true) {
            log('Track Changed', ['Song: ' + t.name.decodeForText(),
                'Artist: ' + t.artists[0].name.decodeForText(),
                'Album: ' + t.album.name.decodeForText(),
                'Playlist: ' + models.Playlist.fromURI(queuePLs[queue.indexOf(t)]).name]);
        } else {
            if (player.context.search(':starred') == -1 ) {
                log('Track Changed', ['Song: ' + t.name.decodeForText(),
                'Artist: ' + t.artists[0].name.decodeForText(),
                'Album: ' + t.album.name.decodeForText(),
                'Playlist: ' + models.Playlist.fromURI(player.context).name]);
            } else {
                log('Track Changed', ['Song: ' + t.name.decodeForText(),
                'Artist: ' + t.artists[0].name.decodeForText(),
                'Album: ' + t.album.name.decodeForText(),
                'Playlist: Starred']);
            }

        }
    } else {
        log('Track Changed', ['Song: ' + t.name.decodeForText(),
            'Artist: ' + t.artists[0].name.decodeForText(),
            'Album: ' + t.album.name.decodeForText()]);
    }
}

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
        getSettings();
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
    var conString = "| " + entryType + " |";
    entryText.forEach(function (e) {
        if (e != "" && e != null) {
            conString += ' - ' + e;
        }
    });
    console.log(conString);
    trimDashLog();

}

function trimDashLog() {
    while (window.innerHeight-24 < $('#statusDiv').height()) {
        var ph = $('#play-history').children('div');
        ph[ph.length - 1].remove();
    }
}

function handleMsg(cmd) {
    if (cmd.indexOf('+') != -1) {
        cmd = cmd.split("+");
        switch (cmd[0]) {
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
            case 'playplaylist':
                playPlaylist(cmd[1]);
                break;
            case 'playtrack':
                playTrack(cmd[1]);
                break;
            case 'playalbum':
                playAlbum(cmd[1]);
                break;
        }
    } else {
        switch (cmd) {
            case 'playpause':
                togglePause();
                break;
            case 'thumbsup':
                thumbsUp(player.track.uri);
                break;
            case 'thumbsdown':
                thumbsDown(player.track.uri);
                break;
            case 'nexttrack':
                nextTrack();
                break;
            case 'skipback':
                restartTrack();
                break;
            case 'deletelater':
                markDeleteLater();
                break;
            case 'canceldeletelater':
                cancelDeleteLater();
                break;
            case 'refresh':
                nowPlayingInfo();
                break;
            case 'deleteartist':
                deleteArtist(player.track.artists[0].uri);
                break;
            case 'deletealbum':
                deleteAlbum(player.track.album.uri);
                break;
            case 'playstarred':
                playStarred();
                break;
            case 'playshuffleplaylists':
                playShufflePlaylists();
                break;
            case 'archivetrack':
                archiveTrack();
                break;
        }
    }
}

function nowPlaying() {
    // This will be null if nothing is playing.
    var track = player.track;

    if (track == null) {
        $("#now-playing").html("How boring! :(");
    } else {
        $("#now-playing").empty();
        $("#years").empty();
        $("#bio").empty();
        $("#genres").empty();

        var cover = $(document.createElement('div')).attr('id', 'player-image');

        if (player.track.local == false) {
            cover.append($(document.createElement('a')).attr('href', track.data.album.uri));
            var img = new ui.SPImage(track.image ? track.image : "sp://import/img/placeholders/300-album.png");
            cover.children().append(img.node);
        } else {
            localImg = getLocalArt();
            if (localImg != null) {
                cover.append($(c = document.createElement('img')).attr('src', localImg));
                c.setAttribute("id", "player-image");
            } else {
                cover.append($(document.createElement('img')).attr('src', "sp://import/img/placeholders/300-album.png"));
            }
        }
        var npInfo = $(document.createElement('div')).attr('id', 'npInfo');

        var song = '<p>song</p><p class="metadata"><a href="' + track.uri + '">' + track.name + '</a></p>';
        var artist = '<p>artist</p><p class="metadata"><a href="' + track.album.artist.uri + '">' + track.artists[0].name.decodeForText() + '</a></p>';

        if (player.track.album.year != null) {
            var album = '<p>album</p><p class="metadata"><a href="' + track.album.uri + '">' + track.album.name.decodeForText() + '</a> - ' + track.album.year + '</p>';
        } else {
            var album = '<p>album</p><p class="metadata"><a href="' + track.album.uri + '">' + track.album.name.decodeForText() + '</a></p>';
        }

        var star = '<div id="starDiv"><a href="#" onclick="undoStar();"><img src="pm.spapp.img.star.png" id="star" /></a></div>';

        $("#now-playing").append(cover);
        npInfo.append(song);
        npInfo.append(artist);
        npInfo.append(album);
        if (track.starred == true) {
            $(cover).append(star);
        } else {
            $("#star").remove();
        }
        $("#now-playing").append(npInfo);

    }

    nowPlayingInfo()
}

function nowPlayingInfo() {

    var pl = '';
    if (player.context != undefined) {
        if (player.context.search(":starred") != -1) {
                pl = 'Starred';
        } else if (player.context.search("internal:temp_playlist") != -1) {
            if (queuePLs.length > 0) {
                pl = models.Playlist.fromURI(queuePLs[queue.indexOf(player.track)]).name;
            } else {
                pl = '';
            }
        } else {
                var p = models.Playlist.fromURI(player.context);
                pl = p.name;
        }
    } else {
        pl = '';
    }
    t = player.track;	

    var npData = {
        "song": encodeURIComponent(t.name.decodeForText()),
        "local": t.local,
        "artist": encodeURIComponent(t.artists[0].name.decodeForText()),
        "album": encodeURIComponent(t.album.name.decodeForText()),
        "year": t.album.year,
        "starred": t.starred,
        "playing": player.playing,
        "spotifyURI": t.uri,
        "artistURI": t.artists[0].uri,
        "albumURI": t.album.uri,
        "playlist": encodeURIComponent(pl)
    };
    $.post("http://" + serverIP + "/cmd/updatetrackinfo", npData);
}

function getLocalArt() {
    var mosaicURI;
    var trackURI = player.track.uri;
    var found = false

    localPaths.filter(function (p) {
        if (p.spURL == trackURI) {
            mosaicURI = p.localPath;
        }
    });

    if (mosaicURI != null)
        return mosaicURI;

    if (localPaths.length >= 100)
        localPaths = localPaths.slice(0, 10);

    if (player.track.local) {
        var tempPL = new models.Playlist();
        tempPL.add(trackURI);
        mosaicURI = tempPL.image;
        localPaths.push({
            "localPath": mosaicURI,
            "spURL": trackURI
        });
        return mosaicURI;
    } else {
        return "not_local";
    }
}

function getSettings() {
    $.getJSON("http://" + serverIP + "/cmd/getsettings", function (data) {
        config = data;
        addPlButtons();
    })
}

function addPlButtons() {
    var favPLs = config.Playlists.Favorite_Playlists;
    $("#favPlaylists").children("button").remove();
    favPLs.forEach(function (p) {
        var name = p.Name;
        var pl = $(document.createElement('button')).attr('class', 'toolButtons');
        pl.text(name);
        pl.attr('onclick', 'playPlaylist("' + p.uri + '");')
        $("#favPlaylists").append(pl);
    })
    $($("#favPlaylists").children("button")[$("#favPlaylists").children("button").length - 1]).attr('class', 'bottomToolButton toolButtons')
}

