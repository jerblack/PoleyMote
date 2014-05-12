function connectSonos() {
    $.get('http://'+serverIP+'/cmd/connectsonos')
}
function disconnectSonos() {
    $.get('http://'+serverIP+'/cmd/disconnectsonos')
}

function processDeleteQueue(pl) {
    var d = models.Playlist.fromURI(pl);
    d.tracks.forEach(function (x) {
        deleteTrack(x.uri);
        d.remove(x.uri);
    })
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

function t1() {
    console.log('t1');
}

function doInWorker(f,d) {
    var w = new Worker('pm.spapp.worker.js'); 
    w.onmessage = function(e){
        console.log(e.data)
    }; 
    w.postMessage({fn:f,data:d});
}

function dd() {
    tracks = [];
    $.getJSON("http://" + serverIP + "/cmd/getthumbsdown", function (data) {
        pl = {}; 
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

        doInWorker('dd', tracks);

    });
}

function gtd() {
    $.getJSON("http://" + serverIP + "/cmd/getthumbsdown", function (data) {
        console.log(data.length);
    })
}