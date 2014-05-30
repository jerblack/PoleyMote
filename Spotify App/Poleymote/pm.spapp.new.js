
function addToBookmarks(user) {
    var t = player.track;
        thumbsUp(player.track.uri);
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
    $.post("http://" + serverIP + "/" + uName, JSON.stringify(bmData));
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

function t1() {
    console.log('t1');
}


// controls.play.shuffle3 = function() {
//     console.log('started at ' + utils.displayTime());

//     var spls = config.Playlists.Shuffle_Playlists;
//     var spl_size = config.Playlists.Shuffle_Playlist_Size;

//     log('Now Playing', ["Now playing in shuffle mode.", "Playing random tracks from shuffle playlists."]);
    
//     q = new models.Playlist();
//     qPLs = new Array();

//     // add first song to get music started immediately
//     models.Playlist.fromURI(spls[Math.floor(Math.random() * spls.length)].uri, function(p){
//         q.add(p.tracks[Math.floor(Math.random() * p.length)]);
//         qPLs.push(pl_index);
//         player.play(q.tracks[0], q);
//     })
//     setTimeout(function(){
//         var data = {
//                     caller: 'playshuffle',
//                     num_playlists: spls.length,
//                     playlist_counts: [],
//                     chunks: spl_size
//                    };
//         spls.forEach(function(spl){
//             count = models.Playlist.fromURI(spl.uri).tracks.length;
//             data.playlist_counts.push(count);
//             })
//         utils.doInWorker('shuffle', data);
//     },1000)
// }



// controls.play.shuffle3.finish = function (input) {
    

//     input.forEach(function(t){
//         t = pl[t.pl].tracks[t.track]
//         if (t != undefined){
//             q.add(t);
//             qPLs.push(pl[t.pl]);
//         }
//     })
//     console.log('finished at ' + utils.displayTime());
// }
