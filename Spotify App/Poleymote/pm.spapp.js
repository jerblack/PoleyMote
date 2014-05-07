// Initialize the Spotify objects
var sp = getSpotifyApi(1),
    models = sp.require("sp://import/scripts/api/models"),
    views = sp.require("sp://import/scripts/api/views"),
    ui = sp.require("sp://import/scripts/ui"),
    metadata = sp.require("sp://import/scripts/metadata"),
    spArray = sp.require("sp://import/scripts/array"),
    spDND = sp.require("sp://import/scripts/dnd"),
    spFS = sp.require("sp://import/scripts/fs"),
    spPromise = sp.require("sp://import/scripts/promise"),
    react = sp.require("sp://import/scripts/react"),
    spUtil = sp.require("sp://import/scripts/util"),
    player = models.player,
    library = models.library,
    application = models.application,
    playerImage = new views.Player();

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
var cdel = "spotify:user:jerblack:playlist:6LiPQKMothh4etKWJPHNTx"
var csav = "spotify:user:jerblack:playlist:6Y6WmHOh2D4INA1sTVPXOU"


var serverIP = "192.168.0.50";
var deleteLater = 0;
var deleteLaterTrack;
var imgURL = "";
var localPaths = new Array();
var config = new Array();
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



function deDupePlaylist(plURI) {
    var tracks = new Array();

    var pl = models.Playlist.fromURI(plURI);
    log("De-duping Playlist","de-duping " + pl.name + " playlist");
    log("", "starting with " + pl.tracks.length + " tracks");
    pl.tracks.forEach(function (t) {
        if (tracks.indexOf(t.uri) == -1) {
            tracks.push(t.uri);
        } else {
            log("",'Removing duplicate track "' + t.toString() + '"')
            pl.remove(t.uri);
        }
    });
    log("", "finishing with " + pl.tracks.length + " tracks");
}


function deDupeShuffle() {
    var pls = new Array();
    log("De-duping Shuffle Playlists","De-duping each individual playlist")
    config.Playlists.Shuffle_Playlists.forEach(function (p) {
        deDupePlaylist(p.uri);
        pls.push(models.Playlist.fromURI(p.uri));
    });
    log("", "de-duping across all playlists");
    while (pls.length > 1) {
        var pl1 = pls.shift();
        log("", "comparing other playlists to " + pl1.name);
        pl1.tracks.forEach(function (t) {
            pls.forEach(function (p) {
                if (p.indexOf(t.uri) != -1) {
                    p.remove(t.uri);
                    log("", "removed track " + t.toString() + " from " + p.name); }})})}
    log("De-duping Shuffle Playlists","finished de-duping shuffle playlists");
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

function togglePause() {
    // Check if playing and reverse it
    if (player.playing) {
        log('Music Paused');
    } else {
        log('Music Resumed');
    }
    player.playing = !(player.playing);
    nowPlayingInfo();
}

function nextTrack() {
    log('Track Skipped');
    player.next();
}

function restartTrack() {
    log('Track Restarted');
    player.playTrack(player.track);
}

function markDeleteLater() {
    var thisTrack = player.track;
    deleteLaterTrack = thisTrack;
    deleteLater = 1;
    log('Marked for Delete Later', ['Song: ' + thisTrack.name, 'Artist: ' + thisTrack.album.artist.name, 'Album: ' + thisTrack.album.name]);
    thisTrack.starred = false;
}

function processDeleteLater() {
    if (deleteLater == 1) {
        thumbsDown(deleteLaterTrack.uri);
        log('Processed Delete Later Request', ['Successfully deleted ' + deleteLaterTrack.name]);
        deleteLaterTrack = null;
        deleteLater = 0;
    }
}

function cancelDeleteLater() {
    log('Cancelled Delete Later Request', 'for ' + deleteLaterTrack.name);
    deleteLaterTrack = null;
    deleteLaterPlaylist = null;
    deleteLater = 0;
}

function playStarred() {
    var p = models.library.starredPlaylist;
    var i = Math.floor(Math.random() * (p.length + 1))
    log('Now Playing', ['Track #' + i + ' in \'Starred\' Playlist']);
    player.play(p.tracks[i].uri, p.uri);
}

function playTrack(spURL) {
    player.playTrack(spURL);
}

function playAlbum(spURL) {
    var album = models.Album.fromURI(spURL, function (album) {
        log('Now Playing Album', ['\'' + album.name + '\'', 'by \'' + album.artist.name + '\'']);
    });
    player.play(spURL);
}

function playPlaylist(spURL) {
    var pl = models.Playlist.fromURI(spURL);
    player.play(pl.tracks[Math.floor(Math.random() * pl.length)], pl);
    log('Now Playing', ['\'' + pl.name + '\' Playlist']);
}


function playShufflePlaylists() {
    var spls = config.Playlists.Shuffle_Playlists;
    log('Now Playing', ["Now playing in shuffle mode.", "Playing random tracks from shuffle playlists."]);
    
    queue = new models.Playlist();
    queuePLs = new Array();

    //add first song to get music started immediately
    var pl_1 = models.Playlist.fromURI(spls[Math.floor(Math.random() * spls.length)].uri);
    queue.add(pl_1.tracks[Math.floor(Math.random() * pl_1.length)]);
    queuePLs.push(pl_1.uri);
    player.play(queue.tracks[0], queue);

    setTimeout(function () {
        var shuffle_pl_size = config.Playlists.Shuffle_Playlist_Size;
        for (var i = 0; i < shuffle_pl_size - 1; i++) {
            var pl = models.Playlist.fromURI(spls[Math.floor(Math.random() * spls.length)].uri);
            queue.add(pl.tracks[Math.floor(Math.random() * pl.length)]);
            queuePLs.push(pl.uri);
        }
    }, 2000);
}

function appendToQueue() {
    if (config.Playlists.Automatically_add_music_to_queue_when_nearing_end) {
        if (player.context === queue.uri) {
            if (queue.length - (queue.indexOf(player.track)) < 5 && queue.length - (queue.indexOf(player.track)) > 2) {
                var shuffle_pl_size = config.Playlists.Shuffle_Playlist_Size;
                var spls = config.Playlists.Shuffle_Playlists;
                setTimeout(function () {
                    for (var i = 0; i < shuffle_pl_size; i++) {
                        var pl = models.Playlist.fromURI(spls[Math.floor(Math.random() * spls.length)].uri);
                        queue.add(pl.tracks[Math.floor(Math.random() * pl.length)]);
                        queuePLs.push(pl.uri);
                    }
                }, 2000);
                log('Now Playing', ["Shuffle queue almost empty", "Now refilling with " + shuffle_pl_size + " new tracks."]);
            }
        }
    }
}

function addToBookmarks(user) {
    var t = player.track;
    if (config.Bookmarks.Automatically_star_track_if_bookmarked) {
        thumbsUp(player.track.uri);
    }
    var bmURI;
    var uName;
    config.Bookmarks.Users.forEach(function (u) {
        if (u.Name.toLowerCase() == user.toLowerCase()) {
            bmURI = u.uri;
            uName = u.Name;
        }
    });
    models.Playlist.fromURI(bmURI).add(t);
    log('Added to ' + uName + '\'s Bookmarks', ['Song: ' + t.name.decodeForText(), 'Artist: ' + t.album.artist.name.decodeForText(), 'Album: ' + t.album.name.decodeForText()]);
}

function playBookmark(user) {
    config.Bookmarks.Users.forEach(function (u) {
        if (u.Name.toLowerCase() == user.toLowerCase()) {
            playPlaylist(u.uri);
        }
    });
}

function sendBookmarks(user) {
    var bmURI;
    var uName;
    config.Bookmarks.Users.forEach(function (u) {
        if (u.Name.toLowerCase() == user.toLowerCase()) {
            bmURI = u.uri;
            uName = u.Name;
        }
    });

    var pl = models.Playlist.fromURI(bmURI);
    var bmData = {
        "user": uName,
        "bookmarksPlaylist": pl.name.decodeForText(),
        "bookmarkURI": bmURI,
        "tracks": []
    };

    pl.tracks.forEach(function (t) {
        var track = {
            "song": t.name.decodeForText(),
            "local": t.local,
            "artist": t.artists[0].name.decodeForText(),
            "album": t.album.name.decodeForText(),
            "year": t.album.year,
            "starred": t.starred,
            "spotifyURI": t.uri,
            "artistURI": t.artists[0].uri,
            "albumURI": t.album.uri

        }
        bmData.tracks.push(track);
    })
    console.log(bmData)
    console.log(JSON.stringify(bmData))
    $.post("http://" + serverIP + "" + uName, JSON.stringify(bmData));
    return bmData;
}

function removeFromBookmarks(spURL, user) {
    var bmURI;
    var uName;
    config.Bookmarks.Users.forEach(function (u) {
        if (u.Name.toLowerCase() == user.toLowerCase()) {
            bmURI = u.uri;
            uName = u.Name;
        }
    });
    models.Playlist.fromURI(bmURI).remove(spURL);
    log('Removed from ' + uName + '\'s Bookmarks', ['Song: ' + thisTrack.name.decodeForText(), 'Artist: ' + thisTrack.album.artist.name.decodeForText(), 'Album: ' + thisTrack.album.name.decodeForText()]);
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

function processDeleteQueue() {
    var dUri = config.Delete.Delete_Later_Playlist;
    var d = models.Playlist.fromURI(dUri)
    d.tracks.forEach(function (x) {
        deleteTrack(x.uri);
        d.remove(x.uri);
    })

}

function deleteArtist(SpArtistURI) {
    nextTrack();
    setTimeout(function () {
        var plArray = []
        config.Playlists.Shuffle_Playlists.forEach(function (p) {
            plArray.push(p.uri)
        });;
        config.Playlists.Favorite_Playlists.forEach(function (p) {
            plArray.push(p.uri)
        });

        var artist = models.Artist.fromURI(SpArtistURI, function (artist) {
            var name = artist.name;
            log("Deleting Artist", "Deleting all tracks from artist: " + name);
        });

        plArray.forEach(function (plURL) {
            setTimeout(function () {
                var pl = models.Playlist.fromURI(plURL);
                var a = [];
                pl.tracks.forEach(function (t) {
                    if (t.artists[0].uri == SpArtistURI) {
                        deleteTrack(t.uri);
                    }})}, 500);
        })}, 500)}

function deleteArtist2() {
    nextTrack();

    // function called with artist uri 
    // (player.track.artists.forEach(function(t){}))
    // use iterTrxUri for find tracks with artist uri
    // filter those to aTrx
    // use iterTrxName to fins local tracks


    setTimeout(function () {
        console.log("log:::" + SpArtistURI)
        var artist = models.Artist.fromURI(SpArtistURI, function (artist) {
            var name = artist.name;
            log("Deleting Artist", "Deleting all tracks from artist: " + name);
        });

        t = player.track
        if (t.local) {

        }
        
        plArray.forEach(function (plURL) {
            setTimeout(function () {
                var pl = models.Playlist.fromURI(plURL);
                var a = [];
                pl.tracks.forEach(function (t) {
                    if (t.artists[0].uri == SpArtistURI) {
                        deleteTrack(t.uri);
                    }})}, 500);
        })}, 500)}

// Figure out how to use filter on library.tracks to get tracks that match artist uri, then just deleteTrack() on all those uris
// iter through artists[] on each track in the process (forEach)

// thumbs down is not deleting local track (t.local = true) from spotify; adapt deleteAlbum and deleteArtist to handle matching names instead of uris

// delete artist and delete album should work on sp tracks and locals

// figre out why one star on local tracks is not happening

function iterTrxUri(SpArtistURI) {
    filt = library.tracks.filter(function (t) { return t.artists[0].uri == SpArtistURI; });

    return filt;
}


function iterTrxName(SpArtistName) {
    return library.tracks.filter(function (t) { return t.artists[0] == SpArtistName; });
}

function deleteAlbum(SpAlbumURI) {
    var dUri = config.Delete.Delete_Later_Playlist;
    var plArray = config.Playlists.Shuffle_Playlists;
    nextTrack();
    config.Playlists.Favorite_Playlists.forEach(function (p) {
        plArray.push(p.Name)
    });

    var album = models.Album.fromURI(SpAlbumURI);
    var name = album.name;
    log("Deleting Album", "Deleting all tracks from album: " + name);

    plArray.forEach(function (plURL) {
        setTimeout(function () {
            var pl = models.Playlist.fromURI(plURL);
            var a = [];
            pl.tracks.forEach(function (t) {
                if (t.album.uri == SpAlbumURI) {
                    deleteTrack(t.uri);
                }
            })
        });
    })
}

function deleteTrack(trackURI) {
    var d = config.Delete;
    var plArray = []

    if (d.Delete_from_all_shuffle_playlists) {
        config.Playlists.Shuffle_Playlists.forEach(function (p) { 
            plArray.push(p.uri)
        });}

    if (d.Delete_from_all_favorite_playlists == true) {
        config.Playlists.Favorite_Playlists.forEach(function (p) {
            plArray.push(p.uri);
        });}

    if (d.Delete_from_current_playlist == true) {
        if (player.context != null) {
            if (player.context.search("spotify:internal:temp_playlist") != 0) {
                plArray.push(player.context);
            }}}

    var t = models.Track.fromURI(trackURI, function (t) {
        t.starred = false;
        plArray.forEach(function (plURL) {
            var pl = models.Playlist.fromURI(plURL, function (pl) {
                // if (pl.indexOf(models.Track.fromURI(t.uri)) != -1) { <-- what was
                if (pl.indexOf(t) != -1) { // <-- what is
                    pl.remove(t.uri);

                    var npData
                    if (trackURI.search('spotify:local:')!=-1){
                        npData = {  
                                    "spURL": trackURI };}
                    else {
                        npData = {   "spURL": trackURI,
                                     "name": t.name.decodeForText(),
                                     "artist": t.artists[0].name.decodeForText(),
                                     "album": t.album.name.decodeForText()
                                 }
                            log('Thumbs Down', ['Song: ' + t.name.decodeForText(), 'Artist: ' + t.artists[0].name.decodeForText(), 'Album: ' + t.album.name.decodeForText()]);
                        }

                    $.post("http://" + serverIP + "/cmd/thumbsdown", npData);
                    log('Thumbs Down', ['Removed \'' + t + '\' from Shuffle and Favorite playlists']);
                    }})})});}


function td() {
    thumbsDown(player.track.uri);
}

function tu() {
    thumbsUp(player.track.uri);
}


function thumbsDown(trackURI) {
    deleteTrack(trackURI);
    nextTrack();

}

function thumbsUp(trackURI) {
    models.Track.fromURI(trackURI, function (t) {
        t.starred = true;
        nowPlaying();
        console.log(t);
        var npData
        if (trackURI.search('spotify:local:')!=-1){
            npData = {  
                        "spURL": trackURI };}
        else {
            npData = {   "spURL": trackURI,
                         "name": t.name.decodeForText(),
                         "artist": t.artists[0].name.decodeForText(),
                         "album": t.album.name.decodeForText()
                     }
            log('Thumbs Up', ['Song: ' + t.name.decodeForText(), 'Artist: ' + t.artists[0].name.decodeForText(), 'Album: ' + t.album.name.decodeForText()]);
        }

        $.post("http://" + serverIP + "/cmd/thumbsup", npData);
        log('Thumbs Up', ['Successfully starred \'' + t + '\'']);
    })
}

function archiveTrack() {
    var tName = player.track.toString();
    var tUri = player.track.uri;
    var track = player.track;
    var a = config.Archive;
    var plArray = [];

    if (a.Archive_from_all_shuffle_playlists) {
        config.Playlists.Shuffle_Playlists.forEach(function (p) {
            if (plArray.indexOf(p.uri) == -1) {
                plArray.push(p.uri);
            }});}

    if (a.Archive_from_all_favorite_playlists) {
        config.Playlists.Favorite_Playlists.forEach(function (p) {
            if (plArray.indexOf(p.uri) == -1) {
                plArray.push(p.uri);
            }});}

    if (a.Archive_from_current_playlist) {
        if (player.context != null) {
            if (player.context.search("spotify:internal:temp_playlist") != 0) {
                if (plArray.indexOf(player.context) == -1) {
                    plArray.push(player.context);
            }}}}

    var plResultsArray = [];
    log('Archive', 'Archiving track ' + tName);
    plArray.forEach(function (plURI) {
        models.Playlist.fromURI(plURI, function (pl) {
            if (pl.indexOf(track) != -1) {
                plResultsArray.push({'name': pl.name, 'uri': plURI});
                pl.remove(t.uri);
            }
        })
    })
    var npData = {
        "name": tName,
        "trackURI": tUri,
        "plURIs": JSON.stringify(plResultsArray)
    };
    console.log(npData);
    $.post("http://" + serverIP + "/cmd/archive", npData);
    nextTrack();

}


function undoStar() {
    var track = models.player.track;
    log("Star Removed");
    track.starred = false;
    nowPlaying();
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

function buildOfflinePL() {
    var playlist_size = 250;
    var shufflePLURIs = config.Playlists.Shuffle_Playlists;
    var chunk = Math.ceil(playlist_size / shufflePLURIs.length);

    var offline = models.Playlist.fromURI("spotify:user:jerblack:playlist:0vIRDs2K8h9FG0FtgmWmdr");

    shufflePLURIs.forEach(function (plURL) {
        setTimeout(function () {
            var pl = models.Playlist.fromURI(plURL);
            var plLen = pl.length;
            for (var i = 0; i < chunk; i++) {
                offline.add(pl.tracks[Math.floor(Math.random() * plLen)].uri);
            }
        }, 0);
    });

    log('Offline Playlist', ["Offline playlist has been populated", chunk + " tracks from each of the shuffle playlists have been added"]);
}

function getPlayQueue() {
    var q;
    if (player.context == queue.uri) {
        q = queue;
    }
    else if (player.context.indexOf("spotify:user:") == 0 && player.context.indexOf(":playlist:") != -1) {
        q = models.Playlist.fromURI(player.context);
    }
    else if (player.context.indexOf("spotify:internal:temp_playlist") == 0) {
        var t = player.track;
        q = new models.Playlist();
        q.add(t);
        return q;
    }
    var pq = [];
    var ql = q.length;
    var t = player.track;
    var tIndex = q.indexOf(t);
    var historyLength;
    var upcomingLength = 10;
    if (tIndex < 10) {historyLength = tIndex;} else {historyLength = 10;}
    for (var i = tIndex - historyLength ; i < tIndex ; i++) {
        pushToQ(pq, q, i, 'history');
    }
    pushToQ(pq, q, tIndex, 'nowplaying');
    for (var i = tIndex + 1 ; i < tIndex + upcomingLength +1; i++) {
        pushToQ(pq, q, i, 'upcoming');
    }
    $.post("http://" + serverIP + "/cmd/updatequeue", pq);
    return pq
}

function pushToQ(pq, q, i, type) {
    pq.unshift({
        "type": type,
        "song": q.tracks[i].name.decodeForText(),
        "local": q.tracks[i].local,
        "artist": q.tracks[i].artists[0].name.decodeForText(),
        "album": q.tracks[i].album.name.decodeForText(),
        "year": q.tracks[i].album.year,
        "starred": q.tracks[i].starred,
        "spotifyURI": q.tracks[i].uri,
        "artistURI": q.tracks[i].artists[0].uri,
        "albumURI": q.tracks[i].album.uri
    });
}

//move current track to electronic
function moveToElectronic() {
    var t = player.track.uri;
    var pl = models.Playlist.fromURI(player.context);
    var epl = models.Playlist.fromURI(elec);
    epl.add(t);
    pl.remove(t);
}

function copyToPlaylist(move) {

}
//move current track to ambient
function moveToAmbient() {
    var t = player.track.uri;
    var pl = models.Playlist.fromURI(player.context);
    var apl = models.Playlist.fromURI(ambi);
    apl.add(t);
    pl.remove(t);
}




function testa(){
    var searchWord = 'The Sounds';
    var search = (new models.Search('artist:"' + searchWord + '"', {
           'localResults'    : models.LOCALSEARCHRESULTS.IGNORE,
            'searchArtists'   : true,
            'searchAlbums'    : true,
            'searchTracks'    : false,
            'searchPlaylists' : false,
            'searchType'      : models.SEARCHTYPE.NORMAL                
        }));
    search.observe(models.EVENT.CHANGE, function() {
        var results = search.albums;
        console.log(results);
        })
}