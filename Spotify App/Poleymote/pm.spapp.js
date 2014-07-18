// Initialize the Spotify objects

var sp = getSpotifyApi(1),
    models = sp.require("sp://import/scripts/api/models"),
    views = sp.require("sp://import/scripts/api/views"),
    ui = sp.require("sp://import/scripts/ui"),
    player = models.player,
    library = models.library,
    application = models.application,
    playerImage = new views.Player();


var serverIP = "192.168.0.5";

var q = new Array();
var qPLs = new Array();
var lastTrack;


$(function () { // Starts when app loads
    log('Welcome', 'PoleyMote Spotify app is now loaded.');

    utils.connectServer();
    utils.settings.get();

    // Update the page when the app loads
    nowPlaying.update();
    dashboard.toolButtons();
    utils.worker.start();

    // Listen for track changes and update the page
    player.observe(models.EVENT.CHANGE, function (event) {
        if (event.data.curtrack == true) {
            if (player.context != undefined) {
                if (player.context.search("internal:temp_playlist") != -1) {
                    if (qPLs.length > 0){
                        nowPlaying.update.log(true, true); 
                    } else {
                        nowPlaying.update.log(false, true);
                    }
                } else {
                    nowPlaying.update.log(true, false);
                }
            } else {
                nowPlaying.update.log(false, true);
            }
            nowPlaying.update()
            utils.appendToQueue();
            // utils.migrate.whenDonePlaying()
            remove.later.process();
        }
    });

});


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
        dashboard.trimLog();
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
}


// ----------------------- //
// ------ Dashboard ------ //
// ----------------------- //

dashboard = {}

dashboard.playlistButtons = function () {
    var favPLs = config.Playlists.Favorite_Playlists;
    $("#favPlaylists").children("button").remove();
    favPLs.forEach(function (p) {
        var name = p.Name;
        var plBtn = $(document.createElement('button')).attr('class', 'toolButtons');
        plBtn.text(name);
        plBtn.attr('onclick', 'play.playlist("' + p.uri + '");')
        $("#favPlaylists").append(plBtn);
    })
    $($("#favPlaylists").children("button")[$("#favPlaylists").children("button").length - 1]).attr('class', 'bottomToolButton toolButtons')
}

dashboard.toolButtons = function () {
    $("#backBtn").click(play.restart);
    $("#playBtn").click(play.toggle);
    $("#nextBtn").click(play.next);
    $("#archivetrack").click(archive.track.current);
    $("#playshuffle").click(play.shuffle);
    $("#playstarred").click(play.starred);
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
        if (ph[ph.length - 1] != undefined) {
            ph[ph.length - 1].remove();
        }
    }
}

// ------------------------- //
// ------ Now Playing ------ //
// ------------------------- //
var nowPlaying = {};

nowPlaying.update = function () {
    nowPlaying.update.dashboard();
    nowPlaying.update.server();
}

nowPlaying.update.log = function (includePL, shuffle) {
    var t = player.track;
    if (includePL == true) {
        if (shuffle == true) {
            log('Track Changed', ['Song: ' + t.name.decodeForText(),
                'Artist: ' + t.artists[0].name.decodeForText(),
                'Album: ' + t.album.name.decodeForText(),
                'Playlist: ' + spls[qPLs[q.indexOf(t)]].name]);
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
                'Playlist: Starred']);}}
    } else {
        log('Track Changed', ['Song: ' + t.name.decodeForText(),
            'Artist: ' + t.artists[0].name.decodeForText(),
            'Album: ' + t.album.name.decodeForText()]);}}


nowPlaying.update.dashboard = function () {
    var track = player.track;

    if (track != null) {
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
            localImg = nowPlaying.getLocalArtPath();
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

        var starDiv = '<div id="starDiv"><a href="#" onclick="star.undo();"><img src="pm.spapp.img.star.png" id="star" /></a></div>';

        $("#now-playing").append(cover);
        npInfo.append(song);
        npInfo.append(artist);
        npInfo.append(album);
        if (track.starred == true) {
            $(cover).append(starDiv);
        } else {
            $("#star").remove();
        }
        $("#now-playing").append(npInfo);
    }
}

nowPlaying.update.server = function () {
    var pl = '';
    if (player.context != undefined) {
        if (player.context.search(":starred") != -1) {
                pl = 'Starred';
        } else if (player.context.search("internal:temp_playlist") != -1) {
            if (qPLs.length > 0) {
                pl = spls[qPLs[q.indexOf(player.track)]].name;
            } else {
                pl = '';}
        } else {
                var p = models.Playlist.fromURI(player.context);
                pl = p.name;}
    } else {
        pl = '';}
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

var localPaths = [];

nowPlaying.getLocalArtPath = function () {
    var mosaicURI;
    var trackURI = player.track.uri;
    var found = false

    localPaths.filter(function (p) {
        if (p.spURL == trackURI) {
            mosaicURI = p.localPath;
        }});

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

// ------------------ //
// ------ Play ------ //
// ------------------ //

var play = {};

play.toggle = function () {
    if (player.playing) {
        log('Music Paused');
    } else {
        log('Music Resumed');
    }
    player.playing = !(player.playing);
    nowPlaying.update.server();
}

play.next = function () {
    log('Track Skipped');
    player.next();
}

play.restart = function () {
    log('Track Restarted');
    player.playTrack(player.track);
}

play.starred = function () {
    var p = models.library.starredPlaylist;
    var i = Math.floor(Math.random() * (p.length + 1))
    log('Now Playing', ['Track #' + i + ' in \'Starred\' Playlist']);
    player.play(p.tracks[i].uri, p.uri);
}

play.track = function(spURL) {
    player.playTrack(spURL);
}

play.album = function(spURL) {
    var album = models.Album.fromURI(spURL, function (album) {
        log('Now Playing Album', ['\'' + album.name + '\'', 'by \'' + album.artist.name + '\'']);
    });
    player.play(spURL);
}

play.playlist = function(spURL) {
    var pl = models.Playlist.fromURI(spURL);
    player.play(pl.tracks[Math.floor(Math.random() * pl.length)], pl);
    log('Now Playing', ['\'' + pl.name + '\' Playlist']);
}

var q = new models.Playlist();
var qPLs = new Array();

play.shuffle = function() {
    console.log('started at ' + utils.displayTime());
    var spl_size = config.Playlists.Shuffle_Playlist_Size;
    log('Now Playing', ["Now playing in shuffle mode.",
                        "Playing random tracks from shuffle playlists."]);
    q = new models.Playlist();
    qPLs = new Array();
    // add first song to get music started immediately
    var pl_index = Math.floor(Math.random() * spls.length);
    var thispl = spls[pl_index];
    q.add(thispl.tracks[Math.floor(Math.random() * thispl.length)]);
    qPLs.push(pl_index);
    player.play(q.tracks[0], q);

    // setTimeout to give enough time to update Now Playing in dash and server
    setTimeout(function(){
        for (var i = 0; i < spl_size - 1; i++) {
            try {
                var pl_index = Math.floor(Math.random() * spls.length);
                var thispl = spls[pl_index];
                if (thispl.length > 0) {
                    q.add(thispl.tracks[Math.floor(Math.random() * thispl.length)]);
                    qPLs.push(pl_index);
                }

            } catch (err) {
                console.log(err.message);
                console.log(i);
            }

            };
        console.log('finished at ' + utils.displayTime());
        }, 500)
    }



// ------------------- //
// ------ utils ------ //
// ------------------- //

utils = {
    sonos:      {},
    worker:     {},
    migrate:    {},
    settings:   {},
    shuffle:    {},
    playlist:   {}
}

utils.handleMsg = function (cmd) {
    if (cmd.indexOf('+') != -1) {
        cmd = cmd.split("+");
        switch (cmd[0]) {
            case 'playplaylist':
                play.playlist(cmd[1]);
                break;
            case 'playtrack':
                play.track(cmd[1]);
                break;
            case 'playalbum':
                play.album(cmd[1]);
                break;
        }
    } else {
        switch (cmd) {
            case 'playpause':
                play.toggle();
                break;
            case 'thumbsup':
                star.current();
                break;
            case 'thumbsdown':
                remove.track.current();
                break;
            case 'nexttrack':
                play.next();
                break;
            case 'skipback':
                play.restart();
                break;
            case 'removelater':
                remove.later.set();
                break;
            case 'cancelremovelater':
                remove.later.cancel();
                break;
            case 'refresh':
                nowPlaying.update.server();
                break;
            case 'playstarred':
                play.starred();
                break;
            case 'playshuffleplaylists':
                play.shuffle();
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


utils.connectServer = function () {
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
        setTimeout(utils.connectServer(), 5000);
    };

    webSocket.onerror = function (e) {
        statusNode.innerHTML = "Error";
        statusNode.className = "error";
    };

    webSocket.onmessage = function (e) {
        var cmd = e.data.replace(appName + ':', '');
        log('Command Received', 'Command: ' + cmd);
        utils.handleMsg(cmd);
    };
}

utils.displayTime = function () {
    var str = "";
    var currentTime = new Date()
    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()
    if (minutes < 10) {minutes = "0" + minutes}
    if (seconds < 10) {seconds = "0" + seconds}
    str += hours + ":" + minutes + ":" + seconds + " ";
    if (hours > 11){str += "PM"} else {str += "AM"}
    return str;
}

utils.appendToQueue = function () {
    if (config.Playlists.Automatically_add_music_to_queue_when_nearing_end) {
        if (player.context === q.uri) {
            // if (q.length - (q.indexOf(player.track)) < 5 && q.length - (q.indexOf(player.track)) > 2) {
            if (q.length - (q.indexOf(player.track)) > 2 && q.length - (q.indexOf(player.track)) < 5) {

                try {
                    var spl_size = config.Playlists.Shuffle_Playlist_Size;
                    for (var i = 0; i < spl_size - 1; i++) {
                        var pl_index = Math.floor(Math.random() * spls.length);
                        var thispl = spls[pl_index];
                        q.add(thispl.tracks[Math.floor(Math.random() * thispl.length)]);
                        qPLs.push(pl_index);
                        };
                    log('Now Playing', ["Shuffle queue almost empty", "Now refilling with " + spl_size + " new tracks."]);
                } catch (err) {
                    utils.settings.get();
                }
            }
        }
    }
}

// ------------------------- //
// ------ utils.sonos ------ //
// ------------------------- //

utils.sonos.connect = function () {
    $.get('http://'+serverIP+'/cmd/connectsonos')
}

utils.sonos.disconnect = function () {
    $.get('http://'+serverIP+'/cmd/disconnectsonos')
}


// -------------------------- //
// ------ utils.worker ------ //
// -------------------------- //

var worker;
utils.worker.start = function() {
    worker = new Worker('pm.spapp.worker.js'); 
    worker.onmessage = function(e){
            // console.log(e.data)
            rsp = e.data;
            switch (rsp.fn) {
                case 'dedupe':
                    dedupe.delete(rsp.data);
                    break;
                case 'log':
                    log(rsp.title, rsp.text);
                    break;
                default:
                    console.log(e.data);
                };
            }
        }

utils.worker.do = function (f,d) {
    if (worker.toString() != '[object Worker]') {
        utils.worker.start();
    }
    worker.postMessage({fn: f, data: d});
    console.log('"' + f + '" passed into web worker');
}

// -------------------------- //
// ------ utils.config ------ //
// -------------------------- //

var config;

utils.settings.get = function () {
    $.getJSON("http://" + serverIP + "/cmd/getsettings", function (data) {
        config = data;
        utils.settings.onLoad();
    })}

utils.settings.onLoad = function() {
    dashboard.playlistButtons();
    utils.playlist.init();
}

utils.settings.update = function(new_config) {
    console.log('update settings')
    console.log(new_config);
    $.post("http://" + serverIP + "/cmd/updatesettings", new_config, function () {
            utils.settings.get();
    })}

// ---------------------------- //
// ------ utils.playlist ------ //
// ---------------------------- //

var spls = [], fpls = [];

utils.playlist.init = function () {
    spls = [];
    fpls = [];
    spls.push(models.library.starredPlaylist);
    config.Playlists.Shuffle_Playlists.forEach(function(spl){
        models.Playlist.fromURI(spl.uri, function(p){
            if (spls.indexOf(p) == -1) {
                spls.push(p);
            }})})
    config.Playlists.Favorite_Playlists.forEach(function(fpl){
        models.Playlist.fromURI(fpl.uri, function(p){
            if (fpls.indexOf(p) == -1) {
                fpls.push(p);
            }})})};

utils.playlist.getURI = function (name) {
    console.log(name);
    var allPls = sp.core.library.getPlaylistsUri();
    var uri;
    allPls.forEach(function(p){
        if (p.name == name) {
            uri = p.uri;
        }
    })
    return uri;
}

utils.playlist.makeOffline = function () {
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


// --------------------------- //
// ------ utils.shuffle ------ //
// --------------------------- //

utils.shuffle.balance   = function () {
    var pl_base_name    = config.Playlists.Spl_base_name;
    var shuffles        = [];
    var counts          = [];
    var total           = 0;
    spls.forEach(function (p) {
        if (p.name.search(pl_base_name) != -1) {
            shuffles.push(p);
        }})
    shuffles.forEach(function(s){
        counts.push(s.tracks.length);
        total += s.tracks.length;
    })
    var avg = Math.floor(total / shuffles.length)

    console.log(total)
    console.log((avg))

    shuffles.forEach(function(s){
        if (s.length > avg + 5) {
            var diff = s.length - avg;
            var movers = [];
            for (var i = 0; i < diff; i++) {
                var t = s.tracks[0];
                movers.push(t);
                s.remove(t.uri);
            }
            shuffles.forEach(function(sh){
                if (movers.length > 0 && sh.length < avg - 5){
                    var chunk = avg - sh.length;
                    for (var i = 0; i < chunk; i++) {
                        sh.add(movers[0].uri)          
                    }
                }
            })
        }
    })

    return counts

}


utils.shuffle.createFolder = function () {
    var folder = config.Playlists.Spl_folder;
    var allPls = sp.core.library.getPlaylistsUri();
    var found = false;
    allPls.forEach(function(p){
        if (p.name != undefined && 
            p.name.search(folder) != -1 && 
            p.type == 'start-group') {
                found = true;
            }})
    if (!found) {
        sp.core.library.createPlaylistGroup(folder);
    }
    return 0;
}


utils.shuffle.getHighest = function () {
    var pl_base_name = config.Playlists.Spl_base_name;
    var highest_spl = 0;
    var shuffles = [];
    var allPls = sp.core.library.getPlaylistsUri();
    allPls.forEach(function(p){
        if (p.name != undefined &&
            p.name.search(pl_base_name) != -1 &&
            p.type == 'playlist') {
                shuffles.push(p.name);
        }})
    shuffles.forEach(function(s){
        index = s.replace(pl_base_name, '').trim();
        index = parseInt(index)
        if (index > highest_spl) {
            highest_spl = index;
            }})
    return highest_spl;
}

utils.shuffle.moveSplToFolder = function (playlist) {
    utils.shuffle.createFolder();
    var folder = config.Playlists.Spl_folder;
    var allPls = sp.core.library.getPlaylistsUri();
    var folder_indexes = [];
    var folder_begin = -1;
    var folder_end = -1;
    var pl_index = -1;
    allPls.forEach(function(p){
        if (p.name == folder) {
            folder_begin = allPls.indexOf(p)
        }
        if (p.type == 'end-group') {
            folder_indexes.push(allPls.indexOf(p));
        }
        if (p.name != undefined && 
            p.name.search(playlist) != -1 && 
            p.type == 'playlist') {
                pl_index = allPls.indexOf(p);
        }
    })
    folder_indexes.forEach(function(f){
        if (f >= folder_begin && 
            folder_end == -1) {
                folder_end = f;
        }})

    sp.core.library.movePlaylist(pl_index, folder_end);
    return;
}

utils.shuffle.newSpl = function () {
    var pl_base_name = config.Playlists.Spl_base_name;
    var index = utils.shuffle.getHighest() + 1;
    var newName = pl_base_name + ' ' + index;
    var pl = new models.Playlist(newName);
    utils.shuffle.moveSplToFolder(newName);
    var new_pl = {
        Name: newName,
        uri: utils.playlist.getURI(newName)
    }
    var new_config = config;
    new_config.Playlists.Shuffle_Playlists.push(new_pl)
    utils.settings.update(new_config);
    return  new_pl.uri;

    }




// --------------------------- //
// ------ utils.migrate ------ //
// --------------------------- //

utils.migrate.whenDonePlaying = function () {
    if (lastTrack != undefined && 
        lastTrack.search('spotify:local:') != -1) {
            utils.migrate.fromURI(lastTrack);
    }
    setTimeout(function(){
        lastTrack = player.track.uri;
    }, 1000);
}


utils.migrate.playlist = function (plURI, iterations) {
    if (iterations == undefined) {
        iterations = 10;
    }
    var count = 0;

    models.Playlist.fromURI(plURI, function (p) {
        p.tracks.forEach(function (t) {
            if (count < iterations) {
                if (t.uri.search('spotify:local:') != -1) {
                    utils.migrate.fromURI(t.uri, plURI, count);
                    count ++ ;
                }
            }
        })
        log('Migrate Playlist', ['Finished migrating local tracks in playlist', p.name])
    })
}


utils.migrate.fromURI = function (localURI, plURI, count) {
    var notFoundPl = 'spotify:user:jerblack:playlist:1ywNJTpSpq0FQN3zmUvfqw'
    var track = utils.parseSPurl(localURI);
    var search = new models.Search(track.artist);
    if (count == undefined) {
        var count = ''
    }
    search.observe(models.EVENT.CHANGE, function() {
        var found = 0;

        search.tracks.forEach(function(t) {
            if (found == 0 && track.name.toLowerCase() == t.name.toLowerCase()) {
                found = 1;
                add.trackArray( [t.uri] );
                remove.queue.add(localURI);
                console.log("Migrated: '" + t.name + "' by '"+ t.artists[0].name + "' | " + count);
            }
        });

        if (found == 0) {
                console.log("Not Found: '" + track.name + "' by '"+ track.artist + "' not found on Spotify | " + count);
                models.Playlist.fromURI(notFoundPl, function (p) {
                    p.add(localURI);
                })
                if (plURI != undefined) {
                    models.Playlist.fromURI(plURI, function (p) {
                        p.remove(localURI)
                    })}}});
    search.appendNext();
}

utils.parseSPurl = function (spURL) {
    if (spURL.search('spotify:local:') != -1) {
        var s = spURL.replace('spotify:local:', '');
        s = s.split(':');
        var a = [];
        s.forEach(function(t) {
            t = t.split('+').join(' ');
            t = decodeURIComponent(t);
            a.push(t);
        })
        var track = {
            artist: a[0],
            album: a[1],
            name: a[2],
            duration: a[3]
        }
        return track
    } else {
        return {}
    }
}


utils.migrate.server = function (plURI, iterations) {
    if (iterations == undefined) {
        iterations = 100;
    }
    var count = 0;
    not_found_pl = 'spotify:user:jerblack:playlist:1ywNJTpSpq0FQN3zmUvfqw'
    models.Playlist.fromURI(plURI, function (p) {
        tUris = [];
        found_uris = [];
        not_found_uris = [];
        local_uris = [];
        p.tracks.forEach(function (t) {
            if (count < iterations && t.uri.search('spotify:local:')!= -1) { tUris.push(t.uri); }
            count ++;
        })

        $.post("http://" + serverIP + "/cmd/migrate", {'tracks':tUris.toString()}, function (data){
            data.forEach(function (d) {
                if (d.spotify_uri != undefined) {
                    console.log('found ' + d.spotify_uri);
                    found_uris.push(d.spotify_uri);
                    remove.queue.add(d.local_uri);
                } else {
                    console.log('no spotify track found for ' + d.local_uri);
                    not_found_uris.push(d.local_uri);
                }
                local_uris.push(d.local_uri);
            })

            console.log('Finished Searching, now adding found tracks');
            add.trackArray(found_uris);

            console.log('Separating tracks that were not found')
            models.Playlist.fromURI(not_found_pl, function(nf){
                not_found_uris.forEach(function(nu){
                    nf.add(nu);
                })
            })

            local_uris.forEach(function(l){
                p.remove(l);
            })
            console.log('Finished Migration');
            remove.queue.process();
        });
    })
}

// ----------------- //
// ------ add ------ //
// ----------------- //
add = { album: {}, artist: {} };

add.trackArray = function (tracks) {
    var playlists = [];
    var counts =  [];
    var index;
    var maxplaylistsize = 9999;
    var highcount = 0;
    var highindex = -1;

    spls.forEach(function(p){
        if (p.name.search('Shuffle Playlist') != -1) 
            { playlists.push(p); }
        })

    playlists.forEach(function(p)
        { counts.push(p.length); })

    counts.forEach(function(c){
        var avail = maxplaylistsize - c;
        if (avail >= tracks.length && avail > highcount)
        {
            highcount = avail;
            highindex = counts.indexOf(c);
        }})

    if (highindex != -1) {
        tracks.forEach(function(t){
            playlists[highindex].add(t);
        })
        log('Adding tracks', 'Added ' + tracks.length + ' tracks to ' + playlists[highindex].data.name)
    } else {
        log('Adding tracks', ['No shuffle playlist was found',
                              'with sufficient space for your new tracks',
                              'Creating another shuffle playlist and trying again'])
        utils.shuffle.newSpl(); // returns uri of new spl
        add.trackArray(tracks);
    }
}

add.fromURI = function (uri, local_type) {
    local   = 'spotify:local:' ;
    artist  = 'spotify:artist:';
    album   = 'spotify:album:' ;
    track   = 'spotify:track:' ;
    
    if (uri.search(local) != -1) {
        if (local_type == undefined || local_type == 'artist')
        {
            add.artist.fromURI(uri);
        } else { 
            add.album.fromURI(uri);
        }
    } else if (uri.search(artist) != -1) {
        add.artist.fromURI(uri);
    } else if (uri.search(album) != -1) {
        add.album.fromURI(uri);
    } else if (uri.search(track) != -1) {
        models.Track.fromURI(uri, function (t) {
            var a = t.artists[0].data.uri;
            add.artist.fromURI(a);
        })
    }
}

// ----------------------- //
// ------ add.album ------ //
// ----------------------- //

add.album.current = function () {
    if (player.track.local) {
        add.album.fromURI(player.track.uri);
    } else {
        add.album.fromURI(player.track.album.uri);
    }
}

add.album.fromURI = function (uri) {
    if (uri.search('spotify:album:') != -1) {
        log('Adding Tracks', 'Adding tracks from this album');
        $.getJSON("http://" + serverIP + "/cmd/gettracksforalbum/" + uri,
            function (data) {
                tracks = []
                data.tracks.forEach(function(t){
                    tracks.push(t.href);
                })
                add.trackArray(tracks);
            }) 
    } else if (uri.search('spotify:local:') != -1) {
        log('Adding Tracks', 'Adding all spotify tracks from albums with local track');
        $.getJSON("http://" + serverIP + "/cmd/gettracksforlocal/" + uri,
            function (data) {
                tracks = [];
                if (data.albums != undefined){
                    data.albums.forEach(function(a){
                        inAlbum = false;
                        albTracks = []
                        a.tracks.forEach(function(t){
                            albTracks.push(t.href);
                            if (t.name.toLowerCase() == data.source_name) {
                                inAlbum = true;
                            }
                        })
                        if (inAlbum) {
                            tracks = tracks.concat(albTracks);
                        }
                        })
                add.trackArray(tracks);
                } else {
                    log('Adding Tracks', 'Artist for local track was not found on Spotify');
                }}) 
    } else {
        console.log('Invalid URI passed to add.album.fromURI: ' + uri);
    }}

// ------------------------ //
// ------ add.artist ------ //
// ------------------------ //

add.artist.current = function () {
    if (player.track.local) {
        add.artist.fromURI(player.track.uri);
    } else {
        add.artist.fromURI(player.track.artists[0].uri);
    }
}

add.artist.fromURI = function (uri) {
    if (uri.search('spotify:artist:') != -1) {
        log('Adding Tracks', 'Adding albums from this artist');
        $.getJSON("http://" + serverIP + "/cmd/gettracksforartist/" + uri,
            function (data) {
                console.log(data)
                tracks = [];
                data.albums.forEach(function(a){
                    a.tracks.forEach(function(t){
                        tracks.push(t.href);
                    })})
                add.trackArray(tracks);
        });
    } else if (uri.search('spotify:local:') != -1) {
        $.getJSON("http://" + serverIP + "/cmd/gettracksforlocal/" + uri,
            function (data) {
                tracks = [];
                if (data.albums != undefined){
                    log('Adding Artist', "Adding all tracks for artist '" + data.name + '"');
                    data.albums.forEach(function(a){
                        a.tracks.forEach(function(t){
                            tracks.push(t.href);
                            })
                    })
                    add.trackArray(tracks);
                } else {
                    log('Adding Artist', ['Artist for local track was not found on Spotify',
                                           uri]);
                }
        })
    } else {
        console.log('Invalid URI passed to add.artist.fromURI: ' + uri);
    }
}

// -------------------- //
// ------ dedupe ------ //
// -------------------- //
dedupe = {};

dedupe.find = function () {
    log('Duplicate Remover', ['Starting search for duplicate tracks',
                              'Checking for duplicates across all Shuffle playlists',
                              'Starting at ' + utils.displayTime()]);
    tracks = [];
    $.getJSON("http://" + serverIP + "/cmd/getthumbsdown", function (data) {
        var pl = {}; 
        pl['playlist'] = 'thumbs_down';
        pl['tracks'] = data
        tracks.push(pl);

        config.Playlists.Shuffle_Playlists.forEach(function (p) {
            pl = {};
            pl['playlist'] = p.uri;
            pl['tracks'] = []
            models.Playlist.fromURI(p.uri, function(p){
                p.tracks.forEach(function(t){
                    pl['tracks'].push(t.uri);
                })
            });
            tracks.push(pl);
        });
        utils.worker.do('dedupe', tracks);
    });
}

dedupe.delete = function (dupes) {
    count = 0;
    dupes.forEach(function(d){
        models.Playlist.fromURI(d.playlist, function(p){
            d.tracks.forEach(function(t){
                p.remove(t);
                count++;
            })
        })
    })
    log('Duplicate Remover',['Removed ' + count + ' duplicate tracks from your shuffle playlists',
                             'Finished at '+ utils.displayTime()]);
}

// --------------------------- //
// ------ archive.track ------ //
// --------------------------- //
archive =   {
    track:      {},
    artist:     {},
    album:      {}
            };

archive.track.current = function () {
    archive.track.fromURI(player.track.uri)
    play.next();
}

archive.track.fromURI = function (spTrackUri) {
    var name, artist, album, uri;
    models.Track.fromURI(spTrackUri, function (t){
        if (spTrackUri.search('spotify:local:') != -1) {
            $.getJSON("http://" + serverIP + "/cmd/gettracksforlocal/" + spTrackUri, function (data) {
                name = 
                artist = 
                album = 
                uri = spTrackUri
            })
        } else {
            name = t.toString().decodeForText();
            artist = t.artists[0].name.decodeForText();
            album = t.album.name.decodeForText();
            uri = t.uri;
        }


        var a = config.Archive;
        var pl = [];
        var results = []

        if (a.Archive_from_all_shuffle_playlists) {
            pl = pl.concat(spls);
            }

        if (a.Archive_from_all_favorite_playlists) {
            pl = pl.concat(fpls);
            }

        pl.forEach(function (p) {
            if (p.indexOf(uri) != -1) {
                results.push({
                    'name': p.name,
                    'uri':  p.uri
                });
                while (p.indexOf(uri) != -1){
                    p.remove(uri);
                }
            }
        })
        var archiveData = {
            "name":     name,
            "artist":   artist,
            "album":    album,
            "trackURI": uri,
            "plURIs":   JSON.stringify(results)
        };
        if (results.length > 0) {
            log('Archive', 'Archiving track ' + name);  
            $.post("http://" + serverIP + "/cmd/archive", archiveData);
        }

    })
}

// ---------------------------- //
// ------ archive.artist ------ //
// ---------------------------- //

archive.artist.current = function () {
    var t = player.track;
    play.next();
    if (t.uri.search('spotify:local:') != -1)  {
        // local tracks have no artist uri
        archive.artist.fromURI(t.uri);
        remove.track.fromURI(t.uri);
    } else {
        // but we can be more accurate if we know it
        archive.artist.fromURI(t.artists[0].uri);
    }
}

var j1;
function testjson (uri) {
    $.getJSON("http://" + serverIP + "/cmd/gettracksforlocal/" + uri, function (data) {
        j1 = data;
    })
}

archive.artist.fromURI = function (uri) {
    var cmd;
    if (uri.search('spotify:local:') != -1) {
        cmd = "/cmd/gettracksforlocal/"
    } else {
        cmd = "/cmd/gettracksforartist/"
    }

    $.getJSON("http://" + serverIP + cmd + uri, function (data) {
        tracks = [];
        log('Archiving Artist', "Archiving all tracks for artist '" + data.name + '"');

        if (data.albums != undefined){
            data.albums.forEach(function(a){
                a.tracks.forEach(function(t){
                    tracks.push(t.href);
                    })
                })
                tracks.forEach(function (t) {
                    archive.track.fromURI(t);
                    }
                )
        } else {
            log('Archiving Artist', 'Artist for local track was not found on Spotify');
        }
    })
}

// --------------------------- //
// ------ archive.album ------ //
// --------------------------- //

archive.album.current = function () {
    var t = player.track;
    play.next();
    if (t.uri.search('spotify:local:') != -1)  {
        // local tracks have no artist uri
        archive.album.fromURI(t.uri)
    } else {
        // but we can be more accurate if we know it
        archive.album.fromURI(t.album.uri);
    }
}

archive.album.fromURI = function (uri) {
    var cmd;
    var local = (uri.search('spotify:local:') != -1)
    if (local) {
        cmd = "/cmd/gettracksforlocal/"
    } else {
        cmd = "/cmd/gettracksforalbum/"
    }

    $.getJSON("http://" + serverIP + cmd + uri, function (data) {
        tracks = [];
        log('Archiving Album', "Archiving all tracks for album '" + data.name + '"');

        if (data.albums != undefined) {
            if (local) {
                if (data.found_in_album.length > 0) {
                    data.found_in_album.forEach(function(f) {
                        data.albums.forEach(function (alb) {
                            if (alb.source_uri == f) {
                                alb.tracks.forEach(function (t) {
                                    tracks.push(t.href);
                                })
                            }
                        })
                    })
                    tracks.forEach(function (t) {
                        archive.track.fromURI(t);
                    })
                }
            } else {
                log('Archiving Album', 'Album with track was not found on Spotify');
            }
        }
    })
}

// ------------------ //
// ------ star ------ //
// ------------------ //
star =      {};

star.current = function () {
    star.fromURI(player.track.uri);
}

star.fromURI = function (trackURI) {
    models.Track.fromURI(trackURI, function (t) {
        t.starred = true;
        nowPlaying.update();
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
        log('Thumbs Up', ['Successfully starred \'' + t.toString().decodeForText() + '\'']);
    })
}

star.undo = function () {
    var track = models.player.track;
    log("Star Removed");
    track.starred = false;
    nowPlaying.update();
}

// --------------------------- //
// ------ remove.artist ------ //
// --------------------------- //

remove = {
    track:  {},
    artist: {},
    album:  {},
    later:  {},
    queue:  {}
         };

remove.artist.current = function () {
    if (deleteLaterTrack != undefined){
        remove.later.cancel();
    }
    var t = player.track;
    play.next();
    if (t.uri.search('spotify:local:') != -1)  {
        remove.artist.fromURI(t.uri)
    } else {
        remove.artist.fromURI(t.artists[0].uri);
    }
}

remove.artist.fromURI = function (uri) {
    if (uri.search('spotify:artist:') != -1) {
        models.Artist.fromURI(uri, function(a){
            log("Removing Artist", ["Removing all tracks from artist",
                                    a.name.decodeForText()]);
            var count = 0;
            var pl = fpls.concat(spls);
            pl.forEach(function(p){
            console.log("Now searching playlist '" + p.name.decodeForText() + "'");
            p.tracks.forEach(function (t) {
                if (t.artists[0].uri == uri) {
                    p.remove(t.uri);
                    count++;
                    models.Track.fromURI(t.uri, function(tr){
                        log('', "Removed track '" + tr.toString().decodeForText() + "'");
                    })
                }})
            })
        })
    } else if (uri.search('spotify:local:') != -1) {
        remove.track.fromURI(uri);
        $.getJSON("http://" + serverIP + "/cmd/gettracksforlocal/" + uri, function (data) {
            tracks = [];
            log('Removing Artist', "Removing all tracks for artist '" + data.name + '"');

            if (data.albums != undefined){
                data.albums.forEach(function(a){
                    a.tracks.forEach(function(t){
                        tracks.push(t.href);
                        })
                })
                console.log(tracks)
                var count = 0;
                var pl = fpls.concat(spls);
                pl.forEach(function(p){
                    log('', "Searching playlist '" + p.name + "'")
                    tracks.forEach(function (t) {
                        if (p.indexOf(t) != -1) {
                            p.remove(t);
                            models.Track.fromURI(t, function (tr){
                                log('', "Removed '" + tr.toString() + "'");    
                            })
                            
                        }
                    })
                })
            } else {
                log('Removing Artist', 'Artist for local track was not found on Spotify');
            }
        })
    }  else {
        console.log('Invalid URI passed to remove.artist.fromURI: ' + uri);
    }
}

// -------------------------- //
// ------ remove.album ------ //
// -------------------------- //

remove.album.current = function () {
    if (deleteLaterTrack != undefined){
        remove.later.cancel();
    }
    var t = player.track;
    play.next();
    remove.album.fromURI(t.album.uri);}
  
remove.album.fromURI = function (uri) {
    
    // will only work for spotify artists, will not work for local tracks
    if (uri.search('spotify:local:') != -1)  {
        log('Removing Album',"Sorry, 'Remove Album' is not supported on local tracks");
        return;
    }
    models.Album.fromURI(uri, function(a){
        log("Removing Album", ["Removing all tracks from album", a.name.decodeForText(), 'by ' + a.artist.name.decodeForText()]);

        var count = 0;
        var pl = fpls.concat(spls);
        pl.forEach(function(p){
            console.log("Now searching playlist '" + p.name.decodeForText() + "'");
            p.tracks.forEach(function (t) {
                  if (t.album.uri == uri){
                    p.remove(t.uri);
                    count++;
                    models.Track.fromURI(t.uri,function(tr){
                        log('', "Removed track '" + tr.toString().decodeForText() + "'");
                    });
                   };  
                })
            })

        log('Removing Album', ['Found and removed '+count+' tracks',
                            'from album "' + a.name.decodeForText() + '"',
                            'by "' + a.artist.name.decodeForText() + '"',
                            'from your favorite and shuffle playlists' ]);
    });
}

// -------------------------- //
// ------ remove.track ------ //
// -------------------------- //

remove.track.current = function () {
    if (deleteLaterTrack != undefined){
        remove.later.cancel();
    }
    lastTrack = undefined;
    var t = player.track.uri;
    play.next();
    remove.track.fromURI(t);
}

remove.track.fromURI = function (trackURI) {
    var d = config.Delete;
    var pl = [];
    var foundSomething = false;

    if (d.Delete_from_all_shuffle_playlists) { pl = pl.concat(spls) }
    if (d.Delete_from_all_favorite_playlists) { pl = pl.concat(fpls) }

    pl.forEach(function (p) {
        if (p.indexOf(trackURI) != -1) { p.remove(trackURI); }
    })
    var npData;
    models.Track.fromURI(trackURI, function(t){
        if (trackURI.search('spotify:local:')!=-1){
            npData = { "spURL": trackURI };
            log('Remove Track',['on local track ',trackURI]);
        } else {
            npData =    {
                "spURL": trackURI,
                "name": t.name.decodeForText(),
                "artist": t.artists[0].name.decodeForText(),
                "album": t.album.name.decodeForText()
                        }
            log('Remove Track',
                ['Song: ' + t.name.decodeForText(),
                 'Artist: ' + t.artists[0].name.decodeForText(), 
                 'Album: ' + t.album.name.decodeForText()]);
        }
        t.starred = false;
        $.post("http://" + serverIP + "/cmd/thumbsdown", npData);
    })
}


var deleteLater = 0;
var deleteLaterTrack;      

// -------------------------- //
// ------ remove.later ------ //
// -------------------------- //

remove.later.set = function () {
    var t = player.track;
    deleteLaterTrack = t;
    deleteLater = 1;
    log('Marked for Remove Later', ['Song: ' + t.name, 'Artist: ' + t.album.artist.name, 'Album: ' + t.album.name]);
}

remove.later.process = function () {
    if (deleteLater == 1 && player.track.uri != deleteLaterTrack.uri) {
        remove.track.fromURI(deleteLaterTrack.uri);
        log('Processed Remove Later Request', ["Successfully deleted '" + deleteLaterTrack.toString().decodeForText() + "'"]);
        deleteLaterTrack = null;
        deleteLater = 0;
    }
}

remove.later.cancel = function () {
    if (deleteLaterTrack != undefined){
        log('Cancelled Remove Later Request', 'for ' + deleteLaterTrack.name);
    }
    deleteLaterTrack = null;
    deleteLater = 0;
}

// -------------------------- //
// ------ remove.queue ------ //
// -------------------------- //

remove.queue.add = function (trackURI) {
    models.Playlist.fromURI(config.Delete.Delete_Later_Playlist, function(p){
        log("Adding to 'Remove Later' queue", "Added " + trackURI + " to the 'Remove Later' queue." )
        p.add(trackURI);
        })
    }

remove.queue.process = function () {
    tracks = []
    models.Playlist.fromURI(config.Delete.Delete_Later_Playlist, function(p){
        p.tracks.forEach(function(t){
            tracks.push(t.uri);
        })
        tracks.forEach(function (tUri) {
            remove.track.fromURI(tUri);
            p.remove(tUri);
        })
    })
}








// var dx;
// utils.migrate.fromURI_OLD = function (localURI, count) {
//     if (count == undefined) {
//         count = "";
//     }
//     $.getJSON("http://" + serverIP + "/cmd/getspotifyversion/" + localURI,
//         function (data) {
//             dx = data;

//             if (data.sp_uri != undefined) {
//                 add.trackArray( [data.sp_uri] );
//                 remove.queue.add(localURI);
//                 log('Track Migrated', ["'" + data.name + "' by '"+ data.artist + "'", count]);
//             } else {
//                 log('Migrate Track', ["'" + data.name + "' by '"+ data.artist + "'", 
//                                       'was not found on Spotify']);
//             }

//         })
//     }


