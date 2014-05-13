nowplaying = {};

nowplaying.log = function (includePL, shuffle) {
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
                'Playlist: Starred']);}}
    } else {
        log('Track Changed', ['Song: ' + t.name.decodeForText(),
            'Artist: ' + t.artists[0].name.decodeForText(),
            'Album: ' + t.album.name.decodeForText()]);}}


nowplaying.dashboard = function () {
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
            localImg = nowplaying.localArt();
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
    nowplaying.sendUpdate()
}

nowplaying.sendUpdate = function () {
    var pl = '';
    if (player.context != undefined) {
        if (player.context.search(":starred") != -1) {
                pl = 'Starred';
        } else if (player.context.search("internal:temp_playlist") != -1) {
            if (queuePLs.length > 0) {
                pl = models.Playlist.fromURI(queuePLs[queue.indexOf(player.track)]).name;
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

nowplaying.localArt = function () {
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
