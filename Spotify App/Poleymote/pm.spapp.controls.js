controls = { play: {} };

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

var q = new models.Playlist();
var qPLs = new Array();

controls.play.shuffle = function() {
    console.log('started at ' + utils.displayTime());
    // var spls = config.Playlists.Shuffle_Playlists;
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
            var pl_index = Math.floor(Math.random() * spls.length);
            var thispl = spls[pl_index];
            q.add(thispl.tracks[Math.floor(Math.random() * thispl.length)]);
            qPLs.push(pl_index);
            };
        console.log('finished at ' + utils.displayTime());
        }, 500)
    }


controls.appendToQueue = function () {
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
