
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
    }, 5000);
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
                        npData = {  "spURL": trackURI };
                        log('Thumbs Down',['on local track with URI',trackURI]);}
                    else {
                        npData = {   "spURL": trackURI,
                                     "name": t.name.decodeForText(),
                                     "artist": t.artists[0].name.decodeForText(),
                                     "album": t.album.name.decodeForText()}
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
    var tName = player.track.toString().decodeForText();
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
    var archiveData = {
        "name": tName,
        "trackURI": tUri,
        "plURIs": JSON.stringify(plResultsArray)
    };
    console.log(archiveData);
    $.post("http://" + serverIP + "/cmd/archive", archiveData);
    nextTrack();

}


function undoStar() {
    var track = models.player.track;
    log("Star Removed");
    track.starred = false;
    nowPlaying();
}