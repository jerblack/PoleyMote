controls ={
    play: {}
}

controls.play.toggle = function () {
    if (player.playing) {
        log('Music Paused');
    } else {
        log('Music Resumed');
    }
    player.playing = !(player.playing);
    nowplaying.sendUpdate();
}

controls.next = function () {
    log('Track Skipped');
    player.next();
}

controls.skipback = function () {
    log('Track Restarted');
    player.playTrack(player.track);
}

controls.play.starred = function () {
    var p = models.library.starredPlaylist;
    var i = Math.floor(Math.random() * (p.length + 1))
    log('Now Playing', ['Track #' + i + ' in \'Starred\' Playlist']);
    player.play(p.tracks[i].uri, p.uri);
}

controls.play.track = function(spURL) {
    player.playTrack(spURL);
}

controls.play.album = function(spURL) {
    var album = models.Album.fromURI(spURL, function (album) {
        log('Now Playing Album', ['\'' + album.name + '\'', 'by \'' + album.artist.name + '\'']);
    });
    player.play(spURL);
}

controls.play.playlist = function(spURL) {
    var pl = models.Playlist.fromURI(spURL);
    player.play(pl.tracks[Math.floor(Math.random() * pl.length)], pl);
    log('Now Playing', ['\'' + pl.name + '\' Playlist']);
}


controls.play.shuffle = function() {
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
    }, 3000);
}

controls.appendToQueue = function () {
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

controls.archiveTrack = function () {
    var tName = player.track.toString().decodeForText();
    var tArtist = player.track.artists[0].name.decodeForText();
    var tAlbum = player.track.album.name.decodeForText();
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
        "artist": tArtist,
        "album": tAlbum,
        "trackURI": tUri,
        "plURIs": JSON.stringify(plResultsArray)
    };
    $.post("http://" + serverIP + "/cmd/archive", archiveData);
    controls.next();

}


