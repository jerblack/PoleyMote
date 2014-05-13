// htc One is 1080x1920
// lumia is 768x1280

var animRate = 200;
var id = 0;
var tInfo;
var user;
var bm;
var config = new Array();

(function () {
    console.log("Startup - Calling checkUser");
    setTimeout(checkUser, 1);

    console.log("Startup - Calling getSettings()");
    setTimeout(getSettings, 1);

    console.log("Startup - Calling getTrackInfo()");
    setTimeout(getTrackInfo, 1);
})();

function getSettings() {
    console.log("Calling getSettings()");
    $.getJSON("/cmd/getsettings", function (data) {
        config = data;
    })}

function sendWebRequest(link) {
    console.log("Calling sendWebRequest('" + link + "')");
    var request = new XMLHttpRequest();
    request.open("GET", link, true);
    request.send(null);
}

function toggleMenuButton(){
    var el = document.getElementById("tbMenuImg");
    if(el.className == "") {
        el.className="tbMenuToggle";
    } else {
        el.className="";
        $("#menu").hide();
        $("#menu").empty();
        menuQueue = new Array();
        $("#tbBack").hide();
    }
}

var menuQueue = new Array();

function menuBack() {
    console.log('calling menuBack()');
    $('#menu').empty();
    menuQueue.pop(menuQueue.length -1);
    $('#menu').append(menuQueue[menuQueue.length -1]);
    if (menuQueue.length < 2){
        $('#tbBack').hide();
    }
}

function drawMenu(entries) {
    $("#menu").empty();
    var menuEntries = $(document.createElement('div')).attr('id','menuEntries')

   /* Menu Entries
   [<fns for onClick> , <text> , <flags> , <optional depending on flag>]
    Flags : 0 = nothing
            1 = Display Done button & toggle menu button
            2 = multiline text
            3 = Expanding buttons
            4 = Images 
            5 = Header*/

    entries.forEach(function(e){
        var fn  =    e[0];
        var txt =    e[1];
        var d   =    $(document.createElement('div')).attr('class','menuButton');
        
        if (e[2] == 1) { //done button/menutoggle
            fn += ' doneButton(); toggleMenuButton();';}

        if (e[2] == 2) { //multiline text
            d.attr('class', 'menuMulti');}

        if (e[2] == 3) { //expanding buttons
            fn += ' expandButton(this);';
            txt += ' ...';}

        if (e[2] == 4) { //images
            var i = $(document.createElement('div')).attr('id','menuImageDiv');
            e[3].forEach(function(uri){
                i.append($(document.createElement('img')).attr('class','menuImages').attr('src', uri));
                menuEntries.append(i);
            });}

        if (e[2] == 5) { //artist summary
            d.attr('class','menuHidden');
            var h = $(document.createElement('div')).attr('id','artistDiv');
            //[arImgx.shift(), arName, arLocation, arStart, arEnd, arURL, arWiki,  arFacebook, arTwitter]
            h.append($(document.createElement('div')).attr('id','artistName').text(e[3][1]));
            
            if (e[3][2] != "0") {//Location
                h.append($(document.createElement('div')).attr('class','artistData').text(e[3][2]));
            }

            if (e[3][3] != '0') {//years active from start to end 
                $(document.createElement('div'))
                    .attr('class', 'artistData')
                    .text(e[3][3] + ' - ' + e[3][4])
                    .appendTo(h);}
            h.append($(document.createElement('img'))
                    .attr('id','artistImg')
                    .attr('src', e[3][0]));

            // Populating Links
            var links = $(document.createElement('div')).attr('id','artistLinks');
            var icons = ['/static/img/web.png',
                         '/static/img/wiki.png',
                         '/static/img/fb.png',
                         '/static/img/twitter.png'];

            for (var i = 5; i < 9; i++) {
                if (e[3][i] != undefined) {
                    links.append($(document.createElement('img'))
                        .attr('class','artistLink')
                        .attr('onclick', 'window.open("'+e[3][i]+'");')
                        .attr('src',icons[i-5]));
                }}
            h.append(links);
            menuEntries.append(h);

        }
        
        d.attr('onclick',fn);
        d.text(txt);

        if (entries.indexOf(e) != entries.length - 1 ) {
            d.append($(document.createElement('div')).attr('class','menuBorder'));}

        menuEntries.append(d);
        })
    
    $("#menu").append(menuEntries).fadeIn(100);
    menuQueue.push(menuEntries);
    if (menuQueue.length > 1) {
        $('#tbBack').show();
    }
}

function expandButton(elem) {
    if ($(elem).next().is(":visible")) {
        $(elem).next().slideUp(animRate);
    } else {
        $(elem).next().slideDown(animRate);
    }
}

function fillTopLevelMenu() {
    var menu = [

['fillPlaylistMenu();'  , ' Play a new playlist ...'    , 0],
['fillBookmarksMenu();' , ' Bookmarks ...'              , 0],
['fillToolsMenu();'     , ' Tools ...'                  , 0]];

    if (tInfo.albumURI != 'local') {
        menu.push(['getArtistInfo("'+tInfo.artistURI+'");', ' Get info about this artist' , 0]);}
    drawMenu(menu);
}

function fillPlaylistMenu() {
    var menu = [

['sendWebRequest("/cmd/spotify/playshuffleplaylists");'       , ' Shuffle All Playlists'  , 1],
['sendWebRequest("/cmd/spotify/playstarred"); '               , ' Starred'                , 1]];

    config.Playlists.Favorite_Playlists.forEach(function (p) {
        menu.push(['sendWebRequest("/cmd/spotify/playplaylist+' + p.uri + '");' , p.Name                    , 1]);});
    drawMenu(menu);
}

function fillToolsMenu() {
    var menu = [

['sendWebRequest("/cmd/spotify/archivetrack");'                      , ' Archive Track'               , 1],
['sendWebRequest("/cmd/connectsonos");'                 , ' Connect Sonos'               , 1],
['sendWebRequest("/cmd/disconnectsonos");'              , ' Disconnect Sonos'            , 1],
['sendWebRequest("/cmd/spotify/removelater");'          , ' Remove Later'                , 1],
['sendWebRequest("/cmd/spotify/cancelremovelater");'    , ' Cancel Remove Later'         , 1],
['sendWebRequest("/cmd/spotify/removeartist");'         , ' Remove this Artist'          , 1],
['sendWebRequest("/cmd/spotify/removealbum");'          , ' Remove this Album'           , 1],
['signOut();'                                           , ' Sign Out'                    , 1],
['pinWPhome();'                                 , ' Pin to Windows Phone Home'   , 1]];

    drawMenu(menu);
}

function fillBookmarksMenu() {
    var menu = [

['sendWebRequest("/cmd/spotify/playbookmarks+' + user + '");'   , ' Play'   , 1],
['sendWebRequest("/cmd/spotify/addbookmark+' + user + '");'     , ' Add'    , 1]];
    //['getBookmarks(user);', ' View', 1]
    drawMenu(menu);
}



var ai;
function getAlbumInfo(spURL) {
    var linky = "/cmd/getalbums/" + spURL;
    $.getJSON(linky, function(alb){
        ai = alb;
        ai.sort(function(a, b){
            var keyA = a['released'], keyB = b['released'];
            if(keyA < keyB) return -1;
            if(keyA > keyB) return 1;
            return 0;
        });

    })
}



// Populate Now Playing Footer. Also handles display of Sonos Disconnected warning,
function getTrackInfo() {

    var linky = "/cmd/gettrackinfo/" + id;
    $.getJSON(linky, function (info) {
        tInfo = info;
        $('#nowPlaying').empty();
        $("<div></div>").attr("class", "song").text(decodeURIComponent(info.song)).appendTo('#nowPlaying');
        $("<div></div>").attr("class", "about").text('by_ ' + decodeURIComponent(info.artist)).appendTo('#nowPlaying');
        $("<div></div>").attr("class", "about").text('on_ ' + decodeURIComponent(info.album) + ' (' + info.year + ')').appendTo('#nowPlaying');
        if (info.playlist != '') {
            $("<div></div>").attr("class", "about").text('in_ \'' + decodeURIComponent(info.playlist) + '\' playlist').appendTo('#nowPlaying');
        }
        //$(".footerSpace").css('height', $("#nowPlaying").outerHeight() + 50);
        if (info.playing == 'true') {
            $("#playpause").attr("src", "static/img/pause.png");
        } else {
            $("#playpause").attr("src", "static/img/play.png");
        }

        if (info.starred == 'true') {
            $("#star").fadeIn(animRate);
        } else {
            $("#star").fadeOut(animRate);
        }
        id = info.id;
        $("#art").attr("src", info.artURL).off('click').click(function () {
            toggleMenuButton();
            getArtistInfo(info.artistURI);

        });
        if (config.AirFoil != undefined && config.AirFoil.Display_warning_if_not_connected) {
            if (info.sonos_connected == 1) {
                $("#sonosDiv").hide();
            } else {
                $("#sonosDiv").show();
            }
        }
        setTimeout(getTrackInfo, 2000);
    });
}

var d1;
function testd(){
    var aURI = 'spotify:artist:7eQZTqEMozBcuSubfu52i4';
    aURI = aURI.replace("spotify:", "spotify-WW:");
    var j;
    //  spotify:artist:7eQZTqEMozBcuSubfu52i4
    // $.getJSON('http://developer.echonest.com/api/v4/artist/profile?api_key=31R971IRKS9GWKNKU&id=' + aURI + '&format=json&bucket=biographies&bucket=blogs&bucket=id:spotify-WW&bucket=id:twitter&bucket=id:facebook&bucket=genre&bucket=images&bucket=reviews&bucket=news&bucket=artist_location&bucket=urls&bucket=years_active', function (data) {

$.getJSON('http://developer.echonest.com/api/v4/song/profile?api_key=31R971IRKS9GWKNKU&id=' + aURI + '&format=json&bucket=id:spotify-WW&bucket=tracks', function (data) {
        d1 = data.response.artist;

        //d1.biographies.forEach(function (b) {if (b.site == 'wikipedia'){console.log(b.url)}})
    })
}


/*
 - Header
    - 1st Image             (arImgx[0])
    <header font>
    - Artist Name           (arName)
    </header font>
    <table with key/value pairs>
    - URL for artist page   (arURL)
    - wikipedia url         (arWiki)
    - Artist Location       (arLocation)
    - Years active          (asStart, arEnd)
    - Facebook page         (arFacebook)
    - Twitter page          (arTwitter)
    </table with key/value pairs>
- Biography (with button)
    - Bio text from last.fm (arBio)
- Photos (with button)
    - artist Images         (arImgx[])
- Albums (with button)      (arAlbums[])
    - albums label
        - Play album
        - View track list for album
            - play individual track
            - add track to playlist
        - Add album to existing playlist
            - <browse to list of playlists>
        - Create playlist from album
    - albums by artist
    - singles label
    - single by artist
- Create Artist playlist    
    - <Add all available artist content to new playlist named for the artist>
- News (with button)
    - <List of recent news stories>
    




// Similar artists
// reviews
// blog posts
// news
*/


function getArtistInfo(spURL) {
    console.log("Calling getArtistInfo('" + spURL + "')");

    var aURI = spURL.replace("spotify:", "spotify-WW:");
    //  spotify:artist:7eQZTqEMozBcuSubfu52i4
    $.getJSON('http://developer.echonest.com/api/v4/artist/profile?api_key=31R971IRKS9GWKNKU&id=' + aURI + '&format=json&bucket=biographies&bucket=blogs&bucket=id:spotify-WW&bucket=id:twitter&bucket=id:facebook&bucket=genre&bucket=images&bucket=reviews&bucket=news&bucket=artist_location&bucket=urls&bucket=years_active', function (data) {
        var a = data.response.artist;

        var arName = a.name;
        var arURL = a.urls.official_url;

        var arLocation, arStart, arEnd;
        var arBio, arWiki, arTwitter, arFacebook;

        if (a.artist_location != undefined) { //Artist Location
            arLocation = (a.artist_location.location != undefined) ? a.artist_location.location : "0";
        } else { arLocation = '0'; }

        if (a.years_active[0] != undefined) { //Years Active
            arStart = (a.years_active[0].start != undefined) ? a.years_active[0].start : '0';
            arEnd = (a.years_active[0].end != undefined) ? a.years_active[0].end : "Current";
        } else {
            arStart = '0';
            arEnd = 'Current'; }

        a.biographies.filter(function (b) { //Biography/ Wikipedia link
            if (b.site == 'last.fm') { arBio = b.text; }
            else if (b.site == 'wikipedia') {arWiki = b.url; }
        });
        
        a.foreign_ids.filter(function (f) { //facebook/twitter links
            if (f.catalog == 'facebook') {
                arFacebook = f.foreign_id.replace('facebook:artist:', 'http://www.facebook.com/profile.php?id=');
            } else if (f.catalog == 'twitter') {
                 arTwitter = f.foreign_id.replace('twitter:artist:', 'http://twitter.com/');}});

        //building image array of last.fm images. 
        //If none, dump images we do have into array
        var arImgx = [];
        a.images.filter(function (i) { if (i.url.indexOf('last.fm') != -1) { arImgx.push(i.url); } })
        if (arImgx.length == 0) {
            a.images.forEach(function (i) {
                arImgx.push(i.url);
            })
        }

    var header = [arImgx.shift(), arName, arLocation, arStart, arEnd, arURL, arWiki, arFacebook, arTwitter];

           /* Menu Entries
   [<fns for onClick> , <text> , <flags> , <optional depending on flag>]
    Flags : 0 = nothing
            1 = Display Done button & toggle menu button
            2 = multiline text
            3 = Expanding buttons
            4 = Images 
            5 = Header */

        var artistInfo = [];
        artistInfo.push(    ['', ''            , 5, header]);

        if (arBio !== undefined) { //last.fm bio as bio
            artistInfo.push(['', ' Biography'  , 3]);
            artistInfo.push(['', arBio         , 2]);
        };

        if (arImgx.length > 0) { //artist images
            artistInfo.push(['', ' Photos'  , 3]);
            artistInfo.push(['', ''         , 4     , arImgx]);
        }
        
        drawMenu(artistInfo);
    //    toggleMenuButton();
    })

}



function pinWPhome() {
    console.log("Calling pinWPhome()");
    var newVisibility = (document.getElementById('TileOverlay').style.visibility == 'visible') ? 'hidden' : 'visible';
    document.getElementById('pinWPhome').style.visibility = newVisibility;

}

function setUser(user) {
    localStorage.user = user;
    $("#userContainer").fadeOut(400);
}

function checkUser() {
    if (localStorage.user != undefined) {
        user = localStorage.user;
    } else {
        $("#userContainer").fadeIn(400);
    }
}

function signOut() {
    localStorage.removeItem('user');
    window.location.reload();
}


function getBookmarks(user) {
    console.log("Calling /cmd/spotify/requestbookmarks('" + user + "')");

    var linky = "/cmd/spotify/requestbookmarks" + user;
    $.getJSON(linky, function (info) {

        bm = JSON.parse(info);
        $('#bmEntries').empty();
        bm.tracks.forEach(function (t) {
            console.log(t.song);
            var track = $(document.createElement('div')).attr('class', 'bmEntry');

            $(document.createElement('div')).attr('class', 'bmsong').text(t.song).appendTo(track);
            $(document.createElement('div')).attr('class', 'bmartist').text('by: ' + t.artist).appendTo(track);
            $(document.createElement('div')).attr('class', 'bmalbum').text('on: ' + t.album).appendTo(track);
            $(document.createElement('div')).attr('class', 'down').appendTo(track);
            track.attr('data-artistURI', t.artistURI);
            track.attr('data-trackURI', t.spotifyURI);
            track.attr('data-albumURI', t.albumURI);

            
            var tmenu = $(document.createElement('div')).attr('class', 'bmMenuContainer');
            //artist info
            $(document.createElement('div')).attr('class', 'bmMenu').text('Artist Info').attr('data-artistURI', t.artistURI).attr('data-local', t.local).appendTo(tmenu).click(function () {
                console.log('artistURI: ' + $(this).attr('data-artistURI'));
                getArtistInfo($(this).attr('data-artistURI'));
            });;
            //play song
            $(document.createElement('div')).attr('class', 'bmMenu').text('Play Song').attr('data-trackURI', t.spotifyURI).attr('data-local', t.local).appendTo(tmenu).click(function () {
                console.log('track URI: ' + $(this).attr('data-trackURI'));
                sendWebRequest('/cmd/spotify/playtrack+' + $(this).attr('data-trackURI'));
            });;
            //play album
            $(document.createElement('div')).attr('class', 'bmMenu').text('Play Album').attr('data-albumURI', t.albumURI).attr('data-local', t.local).appendTo(tmenu).click(function () {
                console.log('album URI: ' + $(this).attr('data-albumURI'));
                sendWebRequest('/cmd/spotify/playalbum+' + $(this).attr('data-albumURI'));
            });;
            //remove from bookmarks
            $(document.createElement('div')).attr('class', 'bmMenu').text('Remove from Bookmarks').attr('data-trackURI', t.spotifyURI).attr('data-local', t.local).appendTo(tmenu).click(function () {
                console.log('track URI: ' + $(this).attr('data-trackURI'));
                sendWebRequest('/cmd/spotify/removebookmark+' + $(this).attr('data-trackURI') + '+' + user);
                



            });;

            track.appendTo('#bmEntries');
            tmenu.appendTo('#bmEntries');
        })
        showInQueue($("#bmDIV"));
        


    });
}




var queue;

function showPlayQueue() {

    console.log("Calling /cmd/getqueue + getting play queue");

    var linky = "/cmd/getqueue ";
    $.getJSON(linky, function (info) {

        queue = JSON.parse(info);
        $('#qEntries').empty();
        queue.forEach(function (t) {
            console.log(t.song +':'+ t.artist+':'+t.album+':'+t.type);
            var track = $(document.createElement('div')).attr('class', 'qEntry');

            $(document.createElement('div')).attr('class', 'qsong').text(t.song).appendTo(track);
            $(document.createElement('div')).attr('class', 'qartist').text('by ' + t.artist).appendTo(track);
            $(document.createElement('div')).attr('class', 'qalbum').text('on ' + t.album).appendTo(track);
            $(document.createElement('div')).attr('class', 'down').appendTo(track);
            track.attr('data-artistURI', t.artistURI);
            track.attr('data-trackURI', t.spotifyURI);
            track.attr('data-albumURI', t.albumURI);

            track.click(function () {
                console.log('artistURI: ' + $(this).attr('data-artistURI'));
                if ($(this).next().is(":visible")) {
                    $(this).next().slideUp(animRate);
                } else {
                    $(this).next().slideDown(animRate);
                }
            });
            
            var tmenu = $(document.createElement('div')).attr('class', 'qMenuContainer');
            //artist info
            $(document.createElement('div')).attr('class', 'qMenu').text('Artist Info').attr('data-artistURI', t.artistURI).attr('data-local', t.local).appendTo(tmenu).click(function () {
                console.log('artistURI: ' + $(this).attr('data-artistURI'));
                getArtistInfo($(this).attr('data-artistURI'));
            });;
            //play song
            $(document.createElement('div')).attr('class', 'qMenu').text('Play Song').attr('data-trackURI', t.spotifyURI).attr('data-local', t.local).appendTo(tmenu).click(function () {
                console.log('track URI: ' + $(this).attr('data-trackURI'));
                sendWebRequest('/spotify/playtrack+' + $(this).attr('data-trackURI'));
            });;
            //play album
            $(document.createElement('div')).attr('class', 'qMenu').text('Play Album').attr('data-albumURI', t.albumURI).attr('data-local', t.local).appendTo(tmenu).click(function () {
                console.log('album URI: ' + $(this).attr('data-albumURI'));
                sendWebRequest('/spotify/playalbum+' + $(this).attr('data-albumURI'));
            });;
            });;
            track.appendTo('#qEntries');
            tmenu.appendTo('#qEntries');
        })
        showInQueue($("#qDIV"));
    }




