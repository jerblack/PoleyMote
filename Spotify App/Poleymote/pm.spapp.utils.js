utils = {
    sonos:{}
}
dedupe = {};
remove = {
    track: {},
    artist: {},
    album: {},
    later: {},
    queue: {}
}
star = {};

var worker;

utils.startWorker = function() {
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
                case 'shuffle':
                    if (rsp.caller == 'playshuffle'){
                        controls.play.shuffle3.finish(rsp.data);
                    } else if (rsp.caller === 'appendshuffle'){
                        controls.appendToQueue(rsp.data);
                    }
                    break;
                default:
                    console.log(e.data);
                };
            }
        }

utils.doInWorker = function (f,d) {
    if (worker.toString() != '[object Worker]') {
        utils.startWorker;
    }
    worker.postMessage({fn: f, data: d});
    console.log('"' + f + '" passed into web worker');
}

utils.sonos.connect = function () {
    $.get('http://'+serverIP+'/cmd/connectsonos')
}

utils.sonos.disconnect = function () {
    $.get('http://'+serverIP+'/cmd/disconnectsonos')
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
    if(hours > 11){str += "PM"} else {str += "AM"}
    return str;
}

utils.buildOfflinePlaylist = function () {
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

var config;

utils.getSettings = function () {
    $.getJSON("http://" + serverIP + "/cmd/getsettings", function (data) {
        config = data;
        utils.onSettingsLoad();
    })
}

utils.onSettingsLoad = function() {
    dashboard.playlistButtons();
    utils.getPlaylists();
}


var spls = [];
var fpls = [];
utils.getPlaylists = function () {
    spls = [];
    fpls = [];
    config.Playlists.Shuffle_Playlists.forEach(function(spl){
        models.Playlist.fromURI(spl.uri, function(p){
            if (spls.indexOf(p) == -1) {
                spls.push(p);
            }
        })
    })
    config.Playlists.Favorite_Playlists.forEach(function(fpl){
        models.Playlist.fromURI(fpl.uri, function(p){
            if (fpls.indexOf(p) == -1) {
                fpls.push(p);
            }
        })
    })
};


dedupe.find = function () {
    log('Duplicate Remover', ['Starting search for duplicate tracks', 'Checking for duplicates across all Shuffle playlists', 'Starting at '+ utils.displayTime()]);
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
        utils.doInWorker('dedupe', tracks);
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
    log('Duplicate Remover',['Removed ' +count+ ' duplicate tracks from your shuffle playlists','Finished at '+ utils.displayTime()]);
}

remove.artist.current = function () {
    var t = player.track;
    controls.next();
    remove.artist.fromURI(t.artists[0].uri);
    }

remove.artist.fromURI = function (spArtistURI) {
    // will only work for spotify artists, will not work for local tracks
    if (spArtistURI.search('spotify:local:') != -1)  {
        log('Removing Artist',"Sorry, 'Remove Artist' is not supported on local tracks");
        return;
    }
    models.Artist.fromURI(spArtistURI, function(a){
        log("Removing Artist", ["Removing all tracks from artist",
                                a.name.decodeForText()]);
        var count = 0;
        var pl = fpls.concat(spls);
        pl.forEach(function(p){
        console.log("Now searching playlist '" + p.name.decodeForText() + "'");
        p.tracks.forEach(function (t) {
            if (t.artists[0].uri == spArtistURI) {
                p.remove(t.uri);
                count++;
                models.Track.fromURI(t.uri, function(tr){
                    log('', "Removed track '" + tr.toString().decodeForText() + "'");
                })
            }})
        })
    })
}

remove.album.current = function () {
    var t = player.track;
    controls.next();
    remove.album.fromURI(t.album.uri);}
  
remove.album.fromURI = function (spAlbumURI) {
    // will only work for spotify artists, will not work for local tracks
    if (spAlbumURI.search('spotify:local:') != -1)  {
        log('Removing Album',"Sorry, 'Remove Album' is not supported on local tracks");
        return;
    }
    models.Album.fromURI(spAlbumURI, function(a){
        log("Removing Album", ["Removing all tracks from album", a.name.decodeForText(), 'by ' + a.artist.name.decodeForText()]);

        var count = 0;
        var pl = fpls.concat(spls);
        pl.forEach(function(p){
            console.log("Now searching playlist '" + p.name.decodeForText() + "'");
            p.tracks.forEach(function (t) {
                  if (t.album.uri == spAlbumURI){
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


remove.track.current = function () {
    var t = player.track.uri;
    controls.next();
    remove.track.fromURI(t);
}

remove.track.fromURI = function (trackURI) {
    var d = config.Delete;
    var pl = [];
    var foundSomething = false;

    if (d.Delete_from_all_shuffle_playlists) {
        pl = pl.concat(spls);
    }

    if (d.Delete_from_all_favorite_playlists) {
        pl = pl.concat(fpls);
    }

    pl.forEach(function (p) {
        if (p.indexOf(trackURI) != -1) {
            p.remove(trackURI);
                var npData;
                models.Track.fromURI(trackURI, function(t){
                    if (trackURI.search('spotify:local:')!=-1){
                        npData = { "spURL": trackURI };
                        log('Thumbs Down',['on local track ',trackURI]);
                    } else {
                        npData = {  "spURL": trackURI,
                                    "name": t.name.decodeForText(),
                                    "artist": t.artists[0].name.decodeForText(),
                                    "album": t.album.name.decodeForText()
                                }
                    log('Thumbs Down', ['Song: ' + t.name.decodeForText(),
                                        'Artist: ' + t.artists[0].name.decodeForText(), 
                                        'Album: ' + t.album.name.decodeForText()]);
                    }
                    t.starred = false;
                    $.post("http://" + serverIP + "/cmd/thumbsdown", npData);
                })
            }
        })}
              
var deleteLater = 0;
var deleteLaterTrack;      

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
    log('Cancelled Remove Later Request', 'for ' + deleteLaterTrack.name);
    deleteLaterTrack = null;
    deleteLaterPlaylist = null;
    deleteLater = 0;
}

remove.queue.process = function (pl) {
    models.Playlist.fromURI(config.Delete.Delete_Later_Playlist,function(p){
        log("Processing 'Remove Later' Playlist", ["Now removing the " + p.tracks.length + " tracks","in 'Remove Later' playlist "+ p.name, "from your shuffle and favorite playlists"])
       p.tracks.forEach(function (x) {
            remove.track.fromURI(x.uri);
            p.remove(x.uri);
    })})
}

star.current = function () {
    star.fromURI(player.track.uri);
}

star.fromURI = function (trackURI) {
    models.Track.fromURI(trackURI, function (t) {
        t.starred = true;
        nowplaying.dashboard();
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
    nowplaying.dashboard();
}