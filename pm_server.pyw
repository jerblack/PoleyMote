# -*- coding: utf_8 -*-
#!/usr/bin/env python

from gevent import monkey
monkey.patch_all()
from gevent.pywsgi import WSGIServer
import web, win32com, time, pythoncom, threading, shutil, os, sys, urllib, requests, json, plistlib, socket, unicodedata
import sqlite3 as sql

from twisted.internet import reactor
from websocket import create_connection
from autobahn.websocket import WebSocketServerFactory, WebSocketServerProtocol, listenWS
from win32com.client import Dispatch, pythoncom
from mutagen import File
from mutagen.id3 import ID3, POPM, PCNT

# from pm_server_airfoil import disconnectSonos, setupAirfoil, connectSonos, ensureAirfoilRunning, isSonosConnected
from pm_server_itunes import getiTunesLibraryXMLPath, getPID, deleteFromItunes, itunesThumbsDown, itunesThumbsUp

web.config.debug = True

#ip = '192.168.0.50'
ip = socket.gethostbyname(socket.gethostname())
port = 80
sp_app_name = 'poleymote:'
local_delete_folder = 'Z:/iTunes/Deleted/'
pm_db_path = "poleymote.db"


bmInfo = {}
qInfo = {}
tid = 0
logo = "/static/apple-touch-icon.png"

#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#

#----------------------------------------#
# Config file for Poleymote Settings #
#----------------------------------------#
pconfig = {}

def readConfig():
    global pconfig
    log('Calling',"readConfig() -> Reads 'pm_settings.ini' into pconfig object")
    #try:
    #    f = open("pm_settings.ini")
    #    pconfig = eval(f.read())
    #    f.close()
    #    return pconfig
    #except IOError:
    log('readConfig',"'pm_settings.ini' not found; calling resetDefaultConfig()")

    return resetDefaultConfig()
    

def resetDefaultConfig():
    global pconfig
    log('Calling',"resetDefaultConfig() -> Changing all settings to default values, creating new 'pm_settings.ini'")

    defaults = { "Local": {
                    "Use_iTunes": True,
                    "Index_Local_Music": True,
                    "Music_Locations": [""]
                    },
                "AirFoil": {
                    "Use_Airfoil":True,
                    "Display_warning_if_not_connected":False
                    },
                "Playlists": {
                    "Favorite_Playlists":  # favorites each get a button under 'play a new playlist' in remote and dash
                        [{"Name":"Coachella :)", "uri":"spotify:user:jerblack:playlist:0WAbJXwfOJbwU7nhz8aOKh"}, 
                         {"Name":"Electronic/Dance", "uri":"spotify:user:jerblack:playlist:0m2cGNVm9Zp6l9e09SiffL"},
                         {"Name":"Ambient/Downtempo", "uri":"spotify:user:jerblack:playlist:7a9mjhowih1tHU94Yve7lx"},
                         {"Name":"24 Hours - The Starck Mix","uri":"spotify:user:jerblack:playlist:1QDcvAyuxjckaGuRueUSVe"},
                         {"Name":"iTunes Music", "uri":"spotify:user:jerblack:playlist:1CgDrOOVdpF34v9QaRvxkq"},
                         {"Name":"Classical","uri":"spotify:user:jerblack:playlist:05owtqQBD8u3X56Hr7tiuw"}
                         ]
                        ,
                    "Shuffle_Playlists":   
                        [{"Name":"Spotify Library 1", "uri":"spotify:user:jerblack:playlist:5XnrfPufI8J3WuDXSJrj3m"}, #spotify library 1
                         {"Name":"Spotify Library 2", "uri":"spotify:user:jerblack:playlist:3L5VxdSBxnUPVhwXCoThiG"}, #spotify library 2
                         {"Name":"Spotify Library 3", "uri":"spotify:user:jerblack:playlist:3HESEQC2UvmA1Ap1q4Q2m1"}, #spotify library 3
                         {"Name": "Electronic/Dance", "uri": "spotify:user:jerblack:playlist:0m2cGNVm9Zp6l9e09SiffL"},
                         {"Name":"iTunes Music", "uri":"spotify:user:jerblack:playlist:1CgDrOOVdpF34v9QaRvxkq"}], #Electronic/Dance
                         # {"Name":"iTunes Music", "uri":"spotify:user:jerblack:playlist:1EbN3FxalGhEojRxpXZuoA"}, #local music
                         
                    "Shuffle_Playlist_Size": 50, #drop-down should have increments of 50
                    "Automatically_add_music_to_queue_when_nearing_end": True
                    },
                "Bookmarks": {
                    "Support_Multiple_Users": True, #Users are created in Settings in the dashboard
                    "Users" : [{"Name":"Jeremy", "uri":"spotify:user:jerblack:playlist:4aSwU3mYsVoMV5Wnxo4AbB"},
                                {"Name":"Maria", "uri":"spotify:user:jerblack:playlist:6b82pMJqlIBygf3cHgZZ5p"}],
                    "Support_Bookmarks": True,
                    "Use_Custom_Playlist": False,
                    "Automatically_star_track_if_bookmarked": True
                    },
                "Delete": {
                    "Delete_from_current_playlist" : True,
                    "Delete_from_all_shuffle_playlists" : True,
                    "Delete_from_all_favorite_playlists" : True,
                    "Save_in_purgatory_playlist" : False,
                    "Custom_purgatory_playlist": "",
                    "Delete_local_file" : True,
                    "Delete_from_iTunes" : True,
                    "Rate_1_star_in_iTunes" : True,
                    "Rate_1_star_in_local_tag" : True,
                    "Move_to_purgatory_folder" : True,
                    "Custom_purgatory_folder": "",
                    "Update_metadata_in_song_file": True, # THIS IS REDUNDANT to Rate_1_star_in_local_tag
                    "Show_option_for_deleting_all_by_artist": True,
                    "Show_option_for_deleting_all_by_album": True,
                    "Delete_Later_Playlist": "spotify:user:jerblack:playlist:67EixlPyzPOax02RdqquBs"
                    },
                "Archive": {
                    "Archive_from_current_playlist" : True, 
                    "Archive_from_all_shuffle_playlists" : True,
                    "Archive_from_all_favorite_playlists" : True,
                    "Archive_duration" : "PLACEHOLDER",
                    "Restore_to_original_playlists" : True,
                    "Restore_to_custom_playlist" : False,
                    "Custom_restore_playlist" : "PLACEHOLDER URI"
                     
                    },
                "Heart": {
                    "Star_in_Spotify": True,
                    "Add_to_bookmarks": True,
                    "Rate_5_star_in_iTunes": True,
                    "Rate_5_star_in_local_tag": True
                    },
                "Logging": {
                    "Log_to_file": True,
                    "Custom_log_filename": "",
                    "Custom_log_path": "",
                    "Verbose_Logging": True
                }

        }
    f = open("pm_settings.ini", "w")
    f.write(str(defaults))
    f.close()
    pconfig = defaults
    return pconfig

#-------------------------------------------#
# End of Config file for Poleymote Settings #
#-------------------------------------------#


#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#


#---------#
# Logging #
#---------#
def log(summary,text):
    v = True    
    try:
        v = pconfig['Logging']['Verbose_Logging']
    except KeyError:
        v = True
    if (v):
        #t = text.decode('ascii','replace')
        try:
            s = '| ' + summary + ' | ' + text
            s = s.decode('ascii','replace') 
            print s
            l = open("static/PoleyMote.log","a")
            l.write(s + "\n")
            l.close()
        except UnicodeEncodeError:
            print '| Log Failure | Failed to decode log request, likely non-ascii character in track data. This only affects logging on the server.'

        
#----------------#
# End of Logging #
#----------------#

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
        log("Calling","'/' -> render.pm_web() -> template/pm_web.html")
        return render.pm_web()

class pm_web_new:
    def GET(self):
        log("Calling","'/' -> render.pm_web_new() -> template/pm_web_new.html")
        return render.pm_web_new()


class controls:
    def GET(self):
        log("Calling","'/controls' -> render.pm_controls() -> template/pm_controls.html")
        return render.pm_controls()
    
class cmd:
    def GET(self, cmd, opt=""):
        web.header('Content-Type', 'application/json')
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', 'GET')
        log("Calling","'/cmd/" + cmd + "/" + opt + "-> handleCMD()")
        return handleCMD(cmd,opt)            
        
                
    def POST(self, cmd):
        web.header('Content-Type', 'application/json')
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', 'POST')
        log("Calling","POST '/cmd/"+cmd+"' -> handleCMD()")
        print web.input()
        print type(web.input())
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
        connectSonos()
        return 0

    elif (cmd == "disconnectsonos"):
        log("handleCMD","'/cmd/disconnectsonos -> disconnect from the Sonos")
        disconnectSonos()
        return 0

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
        print opt
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
        thumbsDown(opt.spURL)

    elif (cmd == "thumbsup"):
        log("handleCMD","'/cmd/thumbsup' -> thumbs up called on local file")
        thumbsUp(opt.spURL)

    elif (cmd == "archive"):
        log("handleCMD","'/cmd/archive' -> track archived")
        archive(opt)

    elif (cmd == "getalbums"):
        log("handleCMD","'/cmd/getalbums' -> retrieving album info for")
        return json.dumps(getAlbumsFromArtist(opt))


      


def thumbsUp(trackURI):
    localTrackPath = getLocalPath(trackURI)
    h = pconfig['Heart']
    if (h['Rate_5_star_in_iTunes'] == True):
        itunesThumbsUp(localTrackPath)
        log("thumbsUp","Rated 5-stars in '"+localTrackPath+"' in iTunes")
    if (h['Rate_5_star_in_local_tag'] == True):
        rateLocalFile(localTrackPath, 252)
        log("thumbsUp","Rated 5-stars in '"+localTrackPath+"' in local file")


def thumbsDown(trackURI):
    localTrackPath = getLocalPath(trackURI)
    d = pconfig['Delete']
    if (d['Move_to_purgatory_folder'] == True):
        if not os.path.isdir(local_delete_folder):
            os.makedirs(local_delete_folder)
        shutil.move(localTrackPath,local_delete_folder)
        log("thumbsDown","Moving '"+localTrackPath+"' to '"+local_delete_folder+"'")
    elif (d['Delete_local_file'] == True):
        os.remove(localTrackPath);
        log("thumbsDown","Deleted file '"+localTrackPath+"'")
    elif (d['Rate_1_star_in_local_tag'] == True):
        rateLocalFile(localTrackPath,1)
        log("thumbsDown","Rated 1 star '"+localTrackPath+"' in local file")
    if (d['Delete_from_iTunes'] == True):
        deleteFromItunes(localTrackPath)
        log("thumbsDown","Deleting '"+localTrackPath+"' from iTunes")
    elif (d['Rate_1_star_in_iTunes'] == True):
        itunesThumbsDown(localTrackPath)
        log("thumbsDown","Rated 1 star '"+localTrackPath+"' in iTunes")

def rateLocalFile(trackURI,rat):
    """
        rateLocalFile is used the set the rating in the local file ID3 tag when rated by the user.
        rate 1 for 1 star
        #rate 252 for 5 star
    """
    p = getLocalPath(trackURI)
    t = ID3(p)
    if t.has_key('PCNT'):
        if str(t['PCNT']).find('rating') != -1:
            t['PCNT'].rating = rat
    else:            
        t.add(POPM(email = u'no@email', rating = rat, count = 1))
    t.update_to_v23()
    t.save(p, 2, 3)





def increasePlayCount(trackURI):
    """
        increasePlayCount increments the playcount in the ID3 tag of a local file whenever it is played in Spotify
    """
    p = getLocalPath(trackURI)
    #p = r"Z:/test/Reflections of the Television.mp3"
    t = ID3(p)
    if t.has_key('PCNT'):
        if str(t['PCNT']).find('count') != -1:
            t['PCNT'].count = 1 + t['PCNT'].count
    else:
        t.add(PCNT(count = 1))
    t.update_to_v23()
    t.save(p, 2, 3)



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
    log("Calling","getStarted() -> Sending 'refresh' message to PoleyMote Spotify app; reading settings")
    fireCommand('refresh')
    readConfig()

trackInfo = {'song':'','artist':'','album':'','starred':'','playing':'','id':0,'year':'','artURL':'', 'sonos_connected':1}

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
    log("Calling","trackUpdate(for '" + urllib.unquote(d.song) + "') -> Received 'Now Playing' information")
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
        localTrackPath = getLocalPath(d.spotifyURI)
        localTrack = getLocalArt(localTrackPath)
        trackInfo['artURL'] = localTrack['uri']
        trackInfo['year'] = localTrack['year']
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
        log("Calling","getArt('" + spTrackURL + "') -> Getting cover art from Spotify")
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


def getLocalArt(localTrackPath):
    """
        Takes a file path
        -> uses that to extract album art
        -> returns dict {'uri':uri,'year':year}
    """
    global ip
    log("Calling","getLocalArt() -> Retrieving cover art from local media file -> static/output.png")
    log("getLocalArt","Extracting art from '" + localTrackPath + "'")
    try:
        file = File(localTrackPath)
        try:
            year = str(file.tags['TDRC'].text[0])
        except KeyError:
            year = ""
        try:
            artwork = file.tags['APIC:'].data
            with open('static\output.png', 'wb') as img:
                img.write(artwork)
            return { 'uri':'http://' + ip + '/static/output.png?' + str(time.time()), 'year': year }
        except KeyError:
            return { 'uri':'http://' + ip + logo, 'year': year }
    except IOError:
        return { 'uri':'http://' + ip + logo, 'year': "" }


def getLocalPath(spURL):
    """
        Take a spotify uri for a local file 
        -> extract the artist, album, title, and duration 
        -> use those to search the local music index
        -> return the path to the file

        spotify URI:    spotify:local:The+Whiskers:BIRP%21+July+2010:Marsh+Blood:220
        path to file:   Z:\\iTunes\\iTunes Media\\Music\\Various Artists\\BIRP! July 2010\\67 Marsh Blood.mp3'
    """
    global pm_db_path
    log("Calling","getLocalPath() -> Using Spotify uri to find path of local file in index")
    s = urllib.unquote(spURL.replace('spotify:local:','').replace(":","|||")).replace('+',' ').encode('ascii','replace').replace('??','?').split('|||')
    info = []
    for i in s:
        info.append(i.split('?'))

    artist = info[0][0]
    album = info[1][0]
    title = info[2][0]
    
    sec = int(s[3]) % 60
    if sec < 10:
        sec = '0' + str(sec)
    else:
        sec = str(sec)
    duration = str(int(s[3]) / 60) + ":" + sec
    log('getLocalPath',"Called for '" + spURL + "'")
    log('getLocalPath',"Searching index using artist: '" + urllib.unquote(artist) + "', album: '" + urllib.unquote(album) + "', title: '" + urllib.unquote(album) + "', duration: '" + duration + "'")

    conn = sql.connect(pm_db_path)
    c = conn.cursor()
    c.execute('''SELECT path FROM music WHERE artist = ? AND album = ? AND title = ? AND duration = ?;''', (artist, album, title, duration))
    r = c.fetchone()
    conn.close()
    log('getLocalPath',"Result: '" + r[0] + "'")
    return r[0]

def archive(opt):
    t = opt['trackURI']
    pl = json.loads(opt['plURIs'])
    print t
    for i in pl:
        print i
    conn = sql.connect(pm_db_path)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS archive(track TEXT, playlists TEXT, date TEXT);''')
    c.execute('''INSERT INTO ARCHIVE VALUES(?,?,date('now'));''', (opt['trackURI'],opt['plURIs']))
    conn.commit()
    conn.close()
    # select * from archive where date < date('now','+1 day')

#----------------------------------------#
# End of Track and Art Metadata Handling #
#----------------------------------------#


#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#


#----------------------------------------#
# Websocket Client and Server Components #
#----------------------------------------#

# spapp websocket interface
ws_url = 'ws://' + ip + ':9000'

def fireCommand(msg):
    """ Send provided message to spapp using websockets """

    log('Calling',"fireCommand() -> Sending message '" + msg + "' to PM Spotify app using WebSockets")
    ws = create_connection(ws_url)
    ws.send(msg)
    ws.close()

# broadcast server components
class BroadcastServerProtocol(WebSocketServerProtocol):
    def onOpen(self):
        self.factory.register(self)

    def onMessage(self, msg, binary):
        self.factory.broadcast(msg)

    def connectionLost(self, reason):
        WebSocketServerProtocol.connectionLost(self, reason)
        self.factory.unregister(self)

class BroadcastServerFactory(WebSocketServerFactory):
    def __init__(self, ws_url):
        WebSocketServerFactory.__init__(self, ws_url)
        self.clients = []

    def register(self, client):
       if not client in self.clients:
            self.clients.append(client)

    def unregister(self, client):
       if client in self.clients:
            self.clients.remove(client)

    def broadcast(self, msg):
        for client in self.clients:
            client.sendMessage(msg)

def startBroadcastServer():
    factory = BroadcastServerFactory(ws_url)
    factory.protocol = BroadcastServerProtocol
    factory.setProtocolOptions(allowHixie76 = True)
    listenWS(factory)
    reactor.run(installSignalHandlers=False)

#-----------------------------------------------#
# end of Websocket Client and Server Components #
#-----------------------------------------------#

#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#


#------#
# main #
#------#
if __name__ == "__main__":
    log('Hello', "Welcome to PoleyMote")
    log('IP','PoleyMote now running on http://'+ip)
    app = web.application(urls, globals()).wsgifunc(web.httpserver.StaticMiddleware)
    try:
        threading.Timer(1, startBroadcastServer).start()
        threading.Timer(3, getStarted).start()
        WSGIServer(('',port),app).serve_forever()
    except KeyboardInterrupt:
        sys.exit()
#-------------#
# end of main #
#-------------#