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
add = {}
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
                // case 'shuffle':
                //     if (rsp.caller == 'playshuffle'){
                //         controls.play.shuffle3.finish(rsp.data);
                //     } else if (rsp.caller === 'appendshuffle'){
                //         controls.appendToQueue(rsp.data);
                //     }
                //     break;
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

utils.updateSettings = function(new_config) {
    console.log('update settings')
    console.log(new_config);
    $.post("http://" + serverIP + "/cmd/updatesettings", new_config, function () {
            utils.getSettings();
    })
}


var spls = [];
var fpls = [];
utils.getPlaylists = function () {
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


utils.getPlaylistUri = function (name) {
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


utils.getHighestSpl = function () {
    var pl_base_name = config.Playlists.Spl_base_name;
    var highest_spl = 0;
    var shuffles = [];
    var allPls = sp.core.library.getPlaylistsUri();
    allPls.forEach(function(p){
        if (p.name != undefined && p.name.search(pl_base_name) != -1 && p.type == 'playlist') {
            shuffles.push(p.name);
        }})
    shuffles.forEach(function(s){
        idx = s.replace(pl_base_name, '').trim();
        idx = parseInt(idx)
        if (idx > highest_spl) {
            highest_spl = idx;
            }})
    return highest_spl;
}

utils.createSplFolder = function () {
    var folder = config.Playlists.Spl_folder;
    var allPls = sp.core.library.getPlaylistsUri();
    var found = false;
    allPls.forEach(function(p){
        if (p.name != undefined && p.name.search(folder) != -1 && p.type == 'start-group') {
                found = true;
            }})
    if (!found) {
        sp.core.library.createPlaylistGroup(folder);
    }
    return 0;
}

utils.moveSplToFolder = function (playlist) {
    utils.createSplFolder();
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
        if (p.name != undefined && p.name.search(playlist) != -1 && p.type == 'playlist') {
            pl_index = allPls.indexOf(p);
        }
    })
    folder_indexes.forEach(function(f){
        if (f >= folder_begin && folder_end == -1) {
            folder_end = f;
        }})

    sp.core.library.movePlaylist(pl_index, folder_end);
    return;
}

utils.migrate = function () {
    if (lastTrack != undefined && lastTrack.search('spotify:local:') != -1) {
        utils.migrateLocalTrackToSp(lastTrack);
    }
    setTimeout(function(){
        lastTrack = player.track.uri;
    }, 1000);
    remove.later.cancel
}

utils.migrateLocalTrackToSp = function (localURI) {
    $.getJSON("http://" + serverIP + "/cmd/gettrackslocal/" + localURI, function (data) {
        var found = false;
        if (data.albums != undefined){
            data.albums.forEach(function(a){
                if (a.tracks != undefined) {
                    a.tracks.forEach(function(t){
                    if (t.name.toLowerCase() == data.source_name && found == false) {
                        found = true;
                        add.addTracks([t.href]);
                        remove.queue.add(localURI);
                        log('Migrate Track', ['A spotify version of this track was found and added to your shuffle playlists',
                                              'The local copy will be removed when it is finished playing']);
                        }
                    })
                }  
            })
        } else {
            log('Migrate Track', 'Artist for local track was not found on Spotify');
        }
    })
}

add.newShufflePlaylist = function () {
    var pl_base_name = config.Playlists.Spl_base_name;
    var idx = utils.getHighestSpl() + 1;
    var newName = pl_base_name + ' ' + idx;
    var pl = new models.Playlist(newName);
    utils.moveSplToFolder(newName);
    var new_pl = {
        Name: newName,
        uri: utils.getPlaylistUri(newName)
    }
    var new_config = config;
    new_config.Playlists.Shuffle_Playlists.push(new_pl)
    utils.updateSettings(new_config);
    return  new_pl.uri;

    }

add.addTracks = function (tracks) {
    var pls = [];
    var counts =  [];
    var idx;
    var maxPlSize = 9999;
    var highcount = 0;
    var highindex = -1;

    spls.forEach(function(p){
        if (p.name.search('Shuffle Playlist') != -1) {
            pls.push(p);
        }})

    pls.forEach(function(p){
        counts.push(p.length);
    })


    counts.forEach(function(c){
        var avail = maxPlSize - c;
        if (avail >= tracks.length && avail > highcount){
            highcount = avail;
            highindex = counts.indexOf(c);
        }
    })
    if (highindex != -1) {
        tracks.forEach(function(t){
            pls[highindex].add(t);
        })
        log('Adding tracks', 'Added ' + tracks.length + ' tracks to ' + pls[highindex].data.name)
    } else {
        log('Adding tracks', ['No shuffle playlist was found','with sufficient space for your new tracks','Creating another shuffle playlist and trying again'])
        var uri = add.newShufflePlaylist();
        add.addTracks(tracks);
    }
}

add.getTracks = function (uri, local_type) {
    local = 'spotify:local:';
    artist = 'spotify:artist:';
    album = 'spotify:album:';
    track = 'spotify:track:';
    
    if (uri.search(local) != -1) {
        if (local_type == undefined || local_type == 'artist'){
            add.AlbumsFromArtist.fromLocal(uri)
        } else { 
            add.TracksFromAlbum.fromLocal(uri)
        }
    } else if (uri.search(artist) != -1) {
        add.AlbumsFromArtist(uri);
    } else if (uri.search(album) != -1) {
        add.TracksFromAlbum(uri);
    } else if (uri.search(track) != -1) {
        models.Track.fromURI(uri, function (t) {
            var a = t.artists[0].data.uri;
            add.AlbumsFromArtist(a);
        })
    }
}

add.TracksFromAlbum = function (albumURI) {
    log('Adding Tracks', 'Adding tracks from this album');
    $.getJSON("http://" + serverIP + "/cmd/getalltracks/" + albumURI, function (data) {
        tracks = []
        data.tracks.forEach(function(t){
            tracks.push(t.href);
        })
        add.addTracks(tracks);
    })}

add.AlbumsFromArtist = function (artistURI) {
    log('Adding Tracks', 'Adding albums from this artist');
    $.getJSON("http://" + serverIP + "/cmd/getallalbums/" + artistURI, function (data) {
        tracks = [];
        data.albums.forEach(function(a){
            a.tracks.forEach(function(t){
                tracks.push(t.href);
            })})
        add.addTracks(tracks);
    });}


add.TracksFromAlbum.fromLocal = function (localURI) {
    log('Adding Tracks', 'Adding all spotify tracks from albums with local track');
    $.getJSON("http://" + serverIP + "/cmd/gettrackslocal/" + localURI, function (data) {
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
        add.addTracks(tracks);
        } else {
            log('Adding Tracks', 'Artist for local track was not found on Spotify');
        }
    })
}

add.AlbumsFromArtist.fromLocal = function (localURI) {
    log('Adding Tracks', 'Adding all tracks from artist for local track');
    $.getJSON("http://" + serverIP + "/cmd/gettrackslocal/" + localURI, function (data) {
        tracks = [];
        if (data.albums != undefined){
            data.albums.forEach(function(a){
            a.tracks.forEach(function(t){
                tracks.push(t.href);
                })
            })
        add.addTracks(tracks);
        } else {
            log('Adding Tracks', 'Artist for local track was not found on Spotify');
        }
    })
}




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
    log('Duplicate Remover',['Removed ' + count + ' duplicate tracks from your shuffle playlists','Finished at '+ utils.displayTime()]);
}

remove.artist.current = function () {
    if (deleteLaterTrack != undefined){
        remove.later.cancel();
    }
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
    if (deleteLaterTrack != undefined){
        remove.later.cancel();
    }
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
    if (deleteLaterTrack != undefined){
        remove.later.cancel();
    }
    lastTrack = undefined;
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
    if (deleteLaterTrack != undefined){
        log('Cancelled Remove Later Request', 'for ' + deleteLaterTrack.name);
    }
    deleteLaterTrack = null;
    deleteLater = 0;
}

remove.queue.add = function (trackURI) {
    models.Playlist.fromURI(config.Delete.Delete_Later_Playlist, function(p){
        log("Adding to 'Remove Later' queue", "Added " + trackURI + " to the 'Remove Later' queue." )
        p.add(trackURI);
        })
    }


remove.queue.process = function () {
    models.Playlist.fromURI(config.Delete.Delete_Later_Playlist, function(p){
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