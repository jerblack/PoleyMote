# -*- coding: utf_8 -*-
#!/usr/bin/env python

from gevent import monkey
monkey.patch_all()
from gevent.pywsgi import WSGIServer
import codecs, warnings, web, win32com, time, pythoncom, threading, shutil, os, sys, urllib, requests, json, plistlib, socket, unicodedata
import sqlite3 as sql

from win32com.client import Dispatch, pythoncom
from mutagen import File
from mutagen.id3 import ID3, POPM, PCNT

# from pm_server_airfoil import disconnectSonos, setupAirfoil, connectSonos, ensureAirfoilRunning, isSonosConnected
from pm_server_local import getiTunesLibraryXMLPath, deleteFromItunes, deleteLocalFile, rateLocalFile, increasePlayCount, itunesThumbsDown, itunesThumbsUp, getLocalTrackInfo
from pm_server_logging import log
from pm_server_config import pconfig, readConfig, resetDefaultConfig, local_delete_folder, local_archive_folder, db, sp_app_name, http_port
from pm_server_net import getAddress, fireCommand, startBroadcastServer
web.config.debug = True


bmInfo = {}
qInfo = {}
logo = "/static/apple-touch-icon.png"


#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#


#-------------------#
# /url definitions #
#-------------------#
render = web.template.render('templates/')
urls = (    '/', 'pm_web',
            '/new','pm_web_new', 
            '/controls', 'controls',
            '/cmd/(.*)/(.*)', 'cmd',
            '/cmd/(.*)', 'cmd')

# Serves main page to client
class pm_web:
    def GET(self):
        log("GET","'/' -> render.pm_web() -> template/pm_web.html")
        return render.pm_web()

class pm_web_new:
    def GET(self):
        log("GET","'/' -> render.pm_web_new() -> template/pm_web_new.html")
        return render.pm_web_new()


class controls:
    def GET(self):
        log("GET","'/controls' -> render.pm_controls() -> template/pm_controls.html")
        return render.pm_controls()
    
class cmd:
    def GET(self, cmd, opt=""):
        web.header('Content-Type', 'application/json')
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', 'GET')
        log("GET","'/cmd/" + cmd + "/" + opt + "-> handleCMD")
        return handleCMD(cmd,opt)            
        
                
    def POST(self, cmd):
        web.header('Content-Type', 'application/json')
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', 'POST')
        log("POST","'/cmd/"+cmd+"' -> handleCMD")
        # print web.input()
        # print type(web.input())
        return handleCMD(cmd, web.input())
        

def handleCMD(cmd,opt):
    global trackInfo, tid, bmInfo, qInfo

    if (cmd == 'spotify'):
        fireCommand(sp_app_name + opt)
        return 0

    elif (cmd == "getsettings"):
        log("handleCMD","'/cmd/getsettings' -> downloading settings from server")
        return json.dumps(readConfig())

    elif (cmd == "connectsonos"):
        log("handleCMD","'/cmd/connectsonos -> reconnect to the Sonos")
        from pm_server_airfoil import connectSonos as cs
        cs()

    elif (cmd == "disconnectsonos"):
        log("handleCMD","'/cmd/disconnectsonos -> disconnect from the Sonos")
        from pm_server_airfoil import disconnectSonos as ds
        ds()

    elif (cmd == "artistinfo"):
        log("handleCMD","'/cmd/artistinfo -> artist info page requested from PoleyMote client")
        artistInfo = ''
        artistInfo = getArtistInfo(opt)
        return json.dumps(artistInfo)

    elif (cmd == "gettrackinfo"):
        while (int(opt) == tid):
            time.sleep(1)
        log("handleCMD","'/cmd/gettrackinfo/" + opt + "' -> Sending 'Now Playing' info to PoleyMote client")
        log('gettrackinfo','sending artURL: ' + trackInfo['artURL'])
        return json.dumps(trackInfo)

    elif (cmd == "updatetrackinfo"):
        log("handleCMD","'/cmd/updatetrackinfo' -> trackUpdate(New 'Now Playing' info being received)")
        trackUpdate(opt)
        return 0

    elif (cmd == "getthumbsdown"):
        log("handleCMD","'/cmd/getThumbsDown' -> Sending list of 'thumbs down' tracks")
        return json.dumps(getThumbsDown())
        
    elif (cmd == "requestbookmarks"):
        log("handleCMD","'/cmd/getbookmark/" + opt + "' -> Send WebSocket 'getbookmarks+" + opt + "' to PoleyMote Spotify app. -> Return result")
        bmInfo[opt] = ''
        fireCommand('getbookmarks+' + opt)        
        while (bmInfo[opt] == ''):
            time.sleep(1)
        result = bmInfo[opt]
        return result

    elif ("rcvbookmarks" in cmd):
        cmds = cmd.split('+')        
        user = cmds[1].lower()
        bm = json.dumps(opt)
        # print opt
        #f = open('dict.txt','w')
        #f.write(str(opt))
        ##f.write('bm type: ', type(bm))
        ##f.write('opt type: ', type(opt))
        ##f.write('opt.get(): ', opt.get())
        #f.close()

        #log("handleCMD", "User i)
        #print "user is " + opt.get('user')
        #log("handleCMD","'/cmd/rcvbookmarks/ for " + opt['user'] + "' -> Receiving bookmark data from PoleyMote Spotify app.")
        
        bmInfo[user] = bm
        return 0

    elif (cmd == "updatequeue"):
        log("handleCMD","'/cmd/updatequeue' -> New queue info being received from Spotify app")
        qInfo = json.dumps(opt)
        return 0

    elif (cmd == "getqueue"):
        log("handleCMD","'/cmd/getqueue' -> Client requested current queue")
        return qInfo

    elif (cmd == "thumbsdown"):
        log("handleCMD","'/cmd/thumbsdown' -> thumbs down called on local file")
        thumbsDown(opt)

    elif (cmd == "thumbsup"):
        log("handleCMD","'/cmd/thumbsup' -> thumbs up called on local file")
        thumbsUp(opt)

    elif (cmd == "archive"):
        log("handleCMD","'/cmd/archive' -> track archived")
        archive(opt)

    elif (cmd == "getalbums"):
        log("handleCMD","'/cmd/getalbums' -> retrieving album info for")
        return json.dumps(getAlbumsFromArtist(opt))


# spotify:local:Butterfly+Bones:BIRP%21+March+2010:%3c3:228
def archive(opt):
    t = opt['trackURI']
    pl = json.loads(opt['plURIs'])
    conn = sql.connect(db)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS archive(track TEXT,spURI TEXT, playlists TEXT, date TEXT);''')
    c.execute('''INSERT INTO ARCHIVE VALUES(?,?,?,date('now'));''', (opt['name'],opt['trackURI'],opt['plURIs']))
    conn.commit()
    conn.close()
    if (t.find('spotify:local:'!=-1)):
        if not os.path.isdir(local_archive_folder):
            os.makedirs(local_archive_folder)
        shutil.move(localTrackPath,local_archive_folder)
        log("thumbsDown","Moving '"+localTrackPath+"' to '"+local_archive_folder+"'")
    # select * from archive where date < date('now','+1 day')

# spotify:local:Butterfly+Bones:BIRP%21+March+2010:%3c3:228

def thumbsUp(opt):
    # h = pconfig['Heart']
    name, artist, album = '','',''
    trackURI = opt['spURL']
    if (opt['spURL'].find('spotify:local:')==-1):
        name, artist, album = opt['name'], opt['artist'], opt['album']
    else:
        s = urllib.unquote(opt['spURL'].replace('spotify:local:','').replace(":","|||")).replace('+',' ').encode('ascii','replace').replace('??','?').split('|||')
        artist = s[0]
        album = s[1]
        name = s[2]
        duration = s[3]
        localTrack = [artist,album,name,duration]
        # print localTrack
        # if (h['Rate_5_star_in_iTunes'] == True):
        itunesThumbsUp(localTrack)
        log("thumbsUp","Rated 5-stars:'"+str(localTrack)+"' --> iTunes")
        # if (h['Rate_5_star_in_local_tag'] == True):
        rateLocalFile(localTrack, 252)
        log("thumbsUp","Rated 5-stars:'"+str(localTrack)+"' --> local file")
    conn = sql.connect(db)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS thumbs_up(track TEXT, artist TEXT, album TEXT, trackURI TEXT, date TEXT);''')
    c.execute('''INSERT INTO thumbs_up VALUES(?,?,?,?,date('now'));''', (name,artist,album,trackURI))
    conn.commit()
    conn.close()

def thumbsDown(opt):
    trackURI = opt['spURL']
    name, artist, album = '','',''
    if (opt['spURL'].find('spotify:local:')==-1):
        name, artist, album = opt['name'], opt['artist'], opt['album']
    else:
        s = urllib.unquote(opt['spURL'].replace('spotify:local:','').replace(":","|||")).replace('+',' ').encode('ascii','replace').replace('??','?').split('|||')
        artist = s[0]
        album = s[1]
        name = s[2]
        duration = s[3]
        # d = pconfig['Delete']
        # if (d['Move_to_purgatory_folder'] == True):
        localTrack = [artist,album,name,duration]
        # print localTrack
        log("thumbsDown","Moving '"+str(localTrack)+"' to '"+local_delete_folder+"'")
        deleteLocalFile(localTrack)
        # elif (d['Delete_local_file'] == True):
        #     os.remove(localTrackPath);
        #     log("thumbsDown","Deleted file '"+localTrackPath+"'")
        # elif (d['Rate_1_star_in_local_tag'] == True):
        #     rateLocalFile(localTrackPath,1)
        #     log("thumbsDown","Rated 1 star '"+localTrackPath+"' in local file")
        # if (d['Delete_from_iTunes'] == True):
        # deleteLocalFile(localTrackPath)
        deleteFromItunes(localTrack)

        log("thumbsDown","Deleting '"+str(localTrack)+"' from iTunes")
        # elif (d['Rate_1_star_in_iTunes'] == True):
        #     itunesThumbsDown(localTrackPath)
        #     log("thumbsDown","Rated 1 star '"+localTrackPath+"' in iTunes")
    conn = sql.connect(db)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS thumbs_down(track TEXT, artist TEXT, album TEXT, trackURI TEXT, date TEXT);''')
    c.execute('''INSERT INTO thumbs_down VALUES(?,?,?,?,date('now'));''', (name,artist,album,trackURI))
    conn.commit()
    conn.close()


def getThumbsDown():
    global db
    conn = sql.connect(db)
    c = conn.cursor()
    c.execute('select trackURI from thumbs_down;',())
    r = c.fetchall()
    t = []
    for i in r:
        t.append(i[0])
    return t

#--------------------------#
# End of /url definitions #
#--------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#


#---------------------------------#
# Track and Art Metadata Handling #
#---------------------------------#
def getStarted():
    """
        Called at server startup. Performs initial preparation
        Sends request for current track info and status
        Read settings from 'settings.ini' file into pconfig object
    """
    log("getStarted","Sending 'refresh' message to PoleyMote Spotify app; reading settings")
    fireCommand('refresh')
    readConfig()

trackInfo = {'id':0}
tid = 0

def trackUpdate(d):
    """
        Calling trackUpdate with dict with data POSTed to /trackinfo
        Server copy of now playing info is updated with data from this dict and some other sources
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
    log("trackUpdate","for '" + urllib.unquote(d.song) + "' -> Received 'Now Playing' information")
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
        lt = getLocalTrackInfo(d.spotifyURI)
        trackInfo['artURL'] = lt['img']
        trackInfo['year'] = lt['year']
        trackInfo['artistURI'] = "local"
        trackInfo['albumURI'] = "local"
    trackInfo['id'] += 1
    tid = trackInfo['id']
    log('Now Playing', '\'' + urllib.unquote(d.song) + '\' by \'' + urllib.unquote(d.artist) + '\' on \'' + urllib.unquote(d.album) + '\'')


def getArt(spTrackURL,x=False):
    """
        Takes a uri to a spotify track
        -> Use uri to query Spotify web service for album art path
        -> modify art path to produce 300 px image (larger than default, no logo) 
        -> return art path as string
    """
    if (not x):
        log("getArt","for '" + spTrackURL + "' -> Getting cover art from Spotify")
    spEmbedUrl = 'https://embed.spotify.com/oembed/?url=' + spTrackURL + '&callback=?'
    try:
        r = requests.get(spEmbedUrl)
        while (r.text == ''):
            time.sleep(1)
        t = r.text.split(',')
        for i in t:
            if (i.find('thumbnail_url') != -1):
                t = i
        t = t.replace('"thumbnail_url":"','').replace('"', '').replace('\\','').replace('cover','300')
        #print t
    except:
        t = ''
        #print 'something bad happened when getting art, trying again'
        t = getArt(spTrackURL, True)
    return t


#----------------------------------------#
# End of Track and Art Metadata Handling #
#----------------------------------------#


#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#




#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#


#------#
# main #
#------#
if __name__ == "__main__":
    log('Hello', "Welcome to PoleyMote")
    log('IP','PoleyMote now running on http://'+getAddress())
    # print('Encoding is now ', sys.stdout.encoding)
    # sys.stdout = codecs.getwriter('utf8')(sys.stdout)
    # print('Encoding is now ', sys.stdout.encoding)
    # print(os.environ["PYTHONIOENCODING"])

    app = web.application(urls, globals()).wsgifunc(web.httpserver.StaticMiddleware)
    try:
        threading.Timer(1, startBroadcastServer).start()
        threading.Timer(3, getStarted).start()
        WSGIServer(('',http_port),app).serve_forever()
    except KeyboardInterrupt:
        sys.exit()
#-------------#
# end of main #
#-------------#


#----------------#
# Still Building #
#----------------#


root = 'http://ws.spotify.com/lookup/1/.json?'

def getAlbumsFromArtist(spURI):
    global root

    r = requests.get(root + 'uri=' + spURI + '&extras=album')
    while (r.text == ''):
        time.sleep(0.1)
    x = json.loads(r.text)
    y = x['artist']['albums']
    artistName = x['artist']['name']
    albums = {}
    for i in y:
        if i['album']['artist'] == artistName:
            try:
                if i['album']['availability']['territories'].find('US') != -1:
                    albums[i['album']['name']] = i['album']['href']
            except KeyError:
                pass
    albumInfo = []    
    for key, value in albums.iteritems():
        albumInfo.append(getTracks(value))
    return albumInfo


def getTracks(spURI):
    """
        Look up album uri
        create album object and append trackinfo array
        get track information for each track and append to array
        album: released, name, href
        each track: track-number, name, available, href, length
    """
    global root

    r = requests.get(root + 'uri=' + spURI + '&extras=trackdetail')
    while (r.text == ''):
        time.sleep(0.1)
    x = json.loads(r.text)
    y = x['album']
    album = {}
    album['released'] = y['released']
    album['name'] = y['name']
    album['href'] = y['href']
    album['artist'] = y['artist']
    tracks = []
    for t in y['tracks']:
        tracks.append([t['track-number'],t['name'],t['available'],t['href'],t['length']])
    album['tracks'] = tracks
    return album
