# -*- coding: utf_8 -*-
# !/usr/bin/env python

from gevent import monkey
monkey.patch_all()
from gevent.pywsgi import WSGIServer
import web, time, threading, os, sys, urllib, requests, json
import sqlite3 as sql

from pm_server_logging import log
import pm_server_local as local
import pm_server_config as config
import pm_server_net as net
web.config.debug = True


bmInfo = {}
qInfo = {}
logo = "/static/apple-touch-icon.png"


# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #

# ---------------- #
# /url definitions #
# ---------------- #
render = web.template.render('templates/')
urls = ('/', 'pm_web',
        '/new', 'pm_web_new',
        '/controls', 'controls',
        '/cmd/(.*)/(.*)', 'cmd',
        '/cmd/(.*)', 'cmd')


# Serves main page to client
class pm_web:
    def GET(self):
        log("GET", "'/' -> render.pm_web() -> template/pm_web.html")
        return render.pm_web()


class pm_web_new:
    def GET(self):
        log("GET",
            "'/' -> render.pm_web_new() -> template/pm_web_new.html")
        return render.pm_web_new()


class controls:
    def GET(self):
        log("GET",
            "'/controls' -> render.pm_controls() -> template/pm_controls.html")
        return render.pm_controls()


class cmd:
    def GET(self, cmd, opt=""):
        web.header('Content-Type', 'application/json')
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', 'GET')
        log("GET", "'/cmd/" + cmd + "/" + opt + "-> handleCMD")
        return handleCMD(cmd, opt)

    def POST(self, cmd):
        web.header('Content-Type', 'application/json')
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', 'POST')
        log("POST", "'/cmd/" + cmd + "' -> handleCMD")
        # print web.input()
        # print type(web.input())
        return handleCMD(cmd, web.input())


def handleCMD(cmd, opt):
    global trackInfo, tid, bmInfo, qInfo

    if (cmd == 'spotify'):
        net.fireCommand(config.sp_app_name + opt)
        return 0

    elif (cmd == "getsettings"):
        log("handleCMD",
            "'/cmd/getsettings' -> downloading settings from server")
        return json.dumps(config.readConfig())

    elif (cmd == "updatesettings"):
        log("handleCMD",
            "'/cmd/updatesettings' -> settings are being updated")
        config.updateConfig(opt)
        return

    elif (cmd == "connectsonos"):
        log("handleCMD",
            "'/cmd/connectsonos -> reconnect to the Sonos")
        from pm_server_airfoil import connectSonos as cs
        cs()

    elif (cmd == "disconnectsonos"):
        log("handleCMD",
            "'/cmd/disconnectsonos -> disconnect from the Sonos")
        from pm_server_airfoil import disconnectSonos as ds
        ds()

    elif (cmd == "gettrackinfo"):
        while (int(opt) == tid):
            time.sleep(1)
        log("handleCMD",
            "'/cmd/gettrackinfo/" + opt +
            "' -> Sending 'Now Playing' info to PoleyMote client")
        log('gettrackinfo',
            'sending artURL: ' + trackInfo['artURL'])
        return json.dumps(trackInfo)

    elif (cmd == "updatetrackinfo"):
        log("handleCMD",
            "'/cmd/updatetrackinfo' -> " +
            "trackUpdate(New 'Now Playing' info being received)")
        trackUpdate(opt)
        return 0

    elif (cmd == "getthumbsdown"):
        log("handleCMD",
            "'/cmd/getThumbsDown' -> Sending list of 'thumbs down' tracks")
        return json.dumps(getThumbsDown())

    # elif (cmd == "requestbookmarks"):
    #     log("handleCMD",
    #         "'/cmd/getbookmark/" + opt +
    #         "' -> Send WebSocket 'getbookmarks+" + opt +
    #         "' to PoleyMote Spotify app. -> Return result")
    #     bmInfo[opt] = ''
    #     net.fireCommand('getbookmarks+' + opt)
    #     while (bmInfo[opt] == ''):
    #         time.sleep(1)
    #     result = bmInfo[opt]
    #     return result

    # elif ("rcvbookmarks" in cmd):
    #     cmds = cmd.split('+')
    #     user = cmds[1].lower()
    #     bm = json.dumps(opt)
        # print opt
        # f = open('dict.txt','w')
        # f.write(str(opt))
        # #f.write('bm type: ', type(bm))
        # #f.write('opt type: ', type(opt))
        # #f.write('opt.get(): ', opt.get())
        # f.close()

        # log("handleCMD", "User i)
        # print "user is " + opt.get('user')
        # log("handleCMD","'/cmd/rcvbookmarks/ for " +
        # opt['user'] +
        # "' -> Receiving bookmark data from PoleyMote Spotify app.")

        # bmInfo[user] = bm
        # return 0

    # elif (cmd == "updatequeue"):
    #     log("handleCMD",
    #         "'/cmd/updatequeue' -> " +
    #         "New queue info being received from Spotify app")
    #     qInfo = json.dumps(opt)
    #     return 0

    # elif (cmd == "getqueue"):
    #     log("handleCMD",
    #         "'/cmd/getqueue' -> " +
    #         "Client requested current queue")
    #     return qInfo

    elif (cmd == "thumbsdown"):
        log("handleCMD", "'/cmd/thumbsdown' -> " +
            "thumbs down called on local file")
        thumbsDown(opt)

    elif (cmd == "thumbsup"):
        log("handleCMD", "'/cmd/thumbsup' -> " +
            "thumbs up called on local file")
        thumbsUp(opt)

    elif (cmd == "archive"):
        log("handleCMD", "'/cmd/archive' -> " +
            "track archived")
        archive(opt)

    elif (cmd == "gettracksforartist"):
        log("handleCMD", "'/cmd/gettracksforartist' -> " + opt)
        return json.dumps(getTracksForArtist(opt))

    elif (cmd == "gettracksforalbum"):
        log("handleCMD", "'/cmd/gettracksforalbum' -> " + opt)
        return json.dumps(getTracksForAlbum(opt))

    elif (cmd == "gettracksforlocal"):
        log("handleCMD", "'/cmd/gettracksforlocal' -> " + opt)
        return json.dumps(getSpURIsForLocal(opt))


# spotify:local:Butterfly+Bones:BIRP%21+March+2010:%3c3:228
def archive(opt):
    t = opt['trackURI']
    abs_path = ''
    if (t.find('spotify:local:') != -1):
        info = local.getLocalTrackInfo(t)
        dst_path = config.local_archive_folder
        split = os.path.split(info['location'])
        src_path, fname = split[0], split[1]
        abs_path = os.path.join(dst_path, fname)
        if not os.path.isdir(config.local_archive_folder):
            os.makedirs(config.local_archive_folder)
        log("thumbsDown",
            "Moving '" + fname + "' to '" + dst_path + "'")

        try:
            os.rename(os.path.join(src_path, fname), abs_path)
        except WindowsError:
            pass

    conn = sql.connect(config.db)
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS archive' +
              '(track TEXT,spURI TEXT, playlists TEXT,' +
              ' date TEXT, path TEXT);')
    c.execute('''INSERT INTO ARCHIVE VALUES(?,?,?,date('now'),?);''',
              (opt['name'], opt['trackURI'], opt['plURIs'], abs_path))
    conn.commit()
    conn.close()

    # select * from archive where date < date('now','+1 day')
    # spotify:local:Butterfly+Bones:BIRP%21+March+2010:%3c3:228


def thumbsUp(opt):
    # h = pconfig['Heart']
    name, artist, album = '', '', ''
    trackURI = opt['spURL']
    if (opt['spURL'].find('spotify:local:') == -1):
        name, artist, album = opt['name'], opt['artist'], opt['album']
    else:
        s = opt['spURL'].replace('spotify:local:', '').replace(":", "|||")
        s = urllib.unquote(s)
        s = s.replace('+', ' ')
        s = s.encode('ascii', 'replace')
        s = s.replace('??', '?')
        s = s.split('|||')
        artist, album, name, duration = s[0], s[1], s[2], s[3]
        localTrack = [artist, album, name, duration]
        # print localTrack
        # if (h['Rate_5_star_in_iTunes'] == True):
        local.itunesThumbsUp(localTrack)
        log("thumbsUp",
            "Rated 5-stars:'" + str(localTrack) + "' --> iTunes")
        # if (h['Rate_5_star_in_local_tag'] == True):
        local.rateLocalFile(localTrack, 252)
        log("thumbsUp",
            "Rated 5-stars:'" + str(localTrack) + "' --> local file")
    conn = sql.connect(config.db)
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS thumbs_up(track TEXT' +
              ', artist TEXT, album TEXT, trackURI TEXT, date TEXT);')
    c.execute("INSERT INTO thumbs_up VALUES(?, ?, ?, ?, date('now'));",
              (name, artist, album, trackURI))
    conn.commit()
    conn.close()


def thumbsDown(opt):
    trackURI = opt['spURL']
    name, artist, album = '', '', ''
    if (opt['spURL'].find('spotify:local:') == -1):
        name, artist, album = opt['name'], opt['artist'], opt['album']
        conn = sql.connect(config.db)
        c = conn.cursor()
        c.execute('CREATE TABLE IF NOT EXISTS thumbs_down(track TEXT'
                  ', artist TEXT, album TEXT, trackURI TEXT, date TEXT);')
        c.execute("INSERT INTO thumbs_down VALUES(?, ?, ? , ?, date('now'));",
                  (name, artist, album, trackURI))
        conn.commit()
        conn.close()
    else:
        s = opt['spURL'].replace('spotify:local:', '').replace(":", "|||")
        s = urllib.unquote(s)
        s = s.replace('+', ' ')
        s = s.encode('ascii', 'replace')
        s = s.replace('??', '?')
        s = s.split('|||')
        artist, album, name, duration = s[0], s[1], s[2], s[3]
        # d = pconfig['Delete']
        # if (d['Move_to_purgatory_folder'] == True):
        localTrack = [artist, album, name, duration]
        # print localTrack
        log("thumbsDown",
            "Moving '" + str(localTrack) +
            "' to '" + config.local_delete_folder + "'")
        # elif (d['Delete_local_file'] == True):
        local.deleteLocalFile(localTrack)
        # elif (d['Rate_1_star_in_local_tag'] == True):
        #     local.rateLocalFile(localTrackPath,1)
        #     log("thumbsDown","Rated 1 star '"+localTrackPath+
        #                      "' in local file")
        # if (d['Delete_from_iTunes'] == True):
        local.deleteFromItunes(localTrack)
        log("thumbsDown", "Deleting '" + str(localTrack) + "' from iTunes")
        # elif (d['Rate_1_star_in_iTunes'] == True):
        #     itunesThumbsDown(localTrackPath)
        #     log("thumbsDown","Rated 1 star '"+localTrackPath+"' in iTunes")


def getThumbsDown():
    conn = sql.connect(config.db)
    c = conn.cursor()
    c.execute('SELECT trackURI FROM thumbs_down;', ())
    r = c.fetchall()
    t = []
    for i in r:
        t.append(i[0])
    return t

# ----------------------- #
# End of /url definitions #
# ----------------------- #
# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #
# ------------------------------- #
# Track and Art Metadata Handling #
# ------------------------------- #


def getStarted():
    """
        Called at server startup. Performs initial preparation
        Sends request for current track info and status
        Read settings from 'settings.ini' file into pconfig object
    """
    log("getStarted",
        "Sending 'refresh' message to PoleyMote Spotify app; reading settings")
    net.fireCommand('refresh')
    config.readConfig()

trackInfo = {'id': 0}
tid = 0


def trackUpdate(d):
    """
        Calling trackUpdate with dict with data POSTed to /trackinfo
        Server copy of now playing info is updated
        with data from this dict and some other sources
        Includes:
            - song
            - artist
            - album
            - starred
            - year
            - arturl
            - playlist name
            - play/pause state
            - sonos connected state
            - spotify uris for artist, album
            - flag indicating if track is local
            - local track path (if local)

    """
    global trackInfo, tid
    log("trackUpdate",
        "for '" + urllib.unquote(d.song) +
        "' -> Received 'Now Playing' information")
    trackInfo['song'] = d.song
    trackInfo['artist'] = d.artist
    trackInfo['album'] = d.album
    trackInfo['starred'] = d.starred
    trackInfo['playing'] = d.playing
    trackInfo['playlist'] = d.playlist
    # trackInfo['sonos_connected'] = isSonosConnected()
    if (d.local == 'false'):
        trackInfo['year'] = d.year
        trackInfo['artURL'] = getArt(d.spotifyURI)
        trackInfo['artistURI'] = d.artistURI
        trackInfo['albumURI'] = d.albumURI
    elif (d.local == 'true'):
        lt = local.getLocalTrackInfo(d.spotifyURI)
        if lt is not None:
            trackInfo['artURL'] = lt['img']
            trackInfo['year'] = lt['year']
            trackInfo['artistURI'] = "local"
            trackInfo['albumURI'] = "local"
        else:
            trackInfo['artURL'] = '/static/artwork/no_art.png'
            trackInfo['year'] = '2048'
            trackInfo['artistURI'] = "local"
            trackInfo['albumURI'] = "local"
    trackInfo['id'] += 1
    tid = trackInfo['id']
    log('Now Playing',
        '\'' + urllib.unquote(d.song) +
        '\' by \'' + urllib.unquote(d.artist) +
        '\' on \'' + urllib.unquote(d.album) + '\'')


def getArt(spTrackURL, x=False):
    """
        Takes a uri to a spotify track
        -> Use uri to query Spotify web service for album art path
        -> modify art path to produce 300 px image
            (larger than default, no logo)
        -> return art path as string
    """
    if (not x):
        log("getArt",
            "for '" + spTrackURL + "' -> Getting cover art from Spotify")
    spEmbedUrl = ('https://embed.spotify.com/oembed/?url=' +
                  spTrackURL + '&callback=?')
    try:
        r = requests.get(spEmbedUrl)
        while (r.text == ''):
            time.sleep(1)
        t = r.text.split(',')
        for i in t:
            if (i.find('thumbnail_url') != -1):
                t = i
        t = t.replace('"thumbnail_url":"', '')
        t = t.replace('"', '')
        t = t.replace('\\', '')
        t = t.replace('cover', '300')
        # print t
    except:
        t = ''
        # print 'something bad happened when getting art, trying again'
        t = getArt(spTrackURL, True)
    return t


# -------------------------------------- #
# End of Track and Art Metadata Handling #
# -------------------------------------- #

# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #

# ---- #
# main #
# ---- #
if __name__ == "__main__":
    log('Hello', "Welcome to PoleyMote")
    log('IP', 'PoleyMote now running on http://' + net.getAddress())
    mw = web.httpserver.StaticMiddleware
    app = web.application(urls, globals()).wsgifunc(mw)
    try:
        threading.Timer(1, net.startBroadcastServer).start()
        threading.Timer(3, getStarted).start()
        WSGIServer(('', config.http_port), app).serve_forever()
    except KeyboardInterrupt:
        sys.exit()
# ----------- #
# end of main #
# ----------- #


# -------------- #
# Still Building #
# -------------- #


lookup_uri = 'http://ws.spotify.com/lookup/1/.json?'
search_uri = 'http://ws.spotify.com/search/1/artist.json?q='

pho = 'spotify:artist:1xU878Z1QtBldR7ru9owdU'


def getSpURIsForLocal(local_uri):
    track = local.parseSPurl(local_uri)
    name = track[2].lower()
    artist = track[0].lower()
    r = requests.get(search_uri + artist)
    while (r.text == ''):
        time.sleep(0.1)
    x = json.loads(r.text)
    found_in_album = []
    for a in x['artists']:
        # try:
        if artist == a['name'].lower():
            uri = a['href']
            artist_info = getTracksForArtist(uri)
            albums = artist_info['albums']
            for a in albums:
                found = 0
                for t in a['tracks']:
                    if (found == 0):
                        if (name == t['name'].lower()):
                            found_in_album.append(a['href'])
                            found = 1
            artist_info['found_in_album'] = found_in_album
            artist_info['source_name'] = name
            artist_info['source_uri'] = local_uri
            return artist_info
    #     except:
    #         pass
    return {}


def getTracksForArtist(spURI):
    global lookup_uri
    r = requests.get(lookup_uri + 'uri=' + spURI + '&extras=album')
    while (r.text == ''):
        time.sleep(0.1)
    x = json.loads(r.text)
    artist_albums = {}
    artist_albums['name'] = x['artist']['name']
    artist_albums['uri'] = x['artist']['href']
    artist_albums['source_uri'] = spURI
    artist_albums['albums'] = []
    # print x
    for alb in x['artist']['albums']:
        a = alb['album']
        if a['artist'] == artist_albums['name']:
            try:
                if a['availability']['territories'].find('US') != -1:
                    t = getTracksForAlbum(a['href'])
                    artist_albums['albums'].append(t)
            except KeyError:
                pass
    return artist_albums
    # albumInfo = []
    # for key, value in albums.iteritems():
    #     albumInfo.append(getTracksForAlbum(value))
    # return albumInfo


def getTracksForAlbum(spURI):
    """
        Look up album uri
        create album object and append track array
        get track information for each track and append to array
        album: released, name, href
        each track: track-number, name, href, length
    """
    global lookup_uri

    r = requests.get(lookup_uri + 'uri=' + spURI + '&extras=trackdetail')
    while (r.text == ''):
        time.sleep(0.1)
    x = json.loads(r.text)
    y = x['album']
    album = {}
    album['released'] = y['released']
    album['name'] = y['name']
    album['href'] = y['href']
    album['artist'] = y['artist']
    album['source_uri'] = spURI

    album['tracks'] = []
    # print x
    for t in y['tracks']:
        l = t['length']
        minute = str(int(round(l / 60)))
        sec = ''
        if l % 60 < 10:
            sec = '0' + str(int(round(l % 60)))
        else:
            sec = str(int(round(l % 60)))
        dur = minute + ':' + sec

        album['tracks'].append({
                               'tracknumber': t['track-number'],
                               'name': t['name'],
                               'href': t['href'],
                               'length': dur
                               })
    return album
