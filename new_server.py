import time, os, sys, urllib, requests, json,  socket, threading, unicodedata, shutil,plistlib
import cherrypy as cp
import sqlite3 as sql
from twisted.internet import reactor
from websocket import create_connection
from autobahn.websocket import WebSocketServerFactory, WebSocketServerProtocol, listenWS
from mutagen import File
from mutagen.id3 import ID3, POPM, PCNT

current_dir = os.path.dirname(os.path.abspath(__file__))
ip = socket.gethostbyname(socket.gethostname())
port = 84
sp_app_name = 'poleymote-dev:'
local_delete_folder = 'Z:/iTunes/Deleted/'
pm_db_path = "poleymote.db"

pconfig, bminfo, qInfo, trackInfo, tid = {}, {}, {}, {}, 0
logo = "/static/apple-touch-icon.png"
sp_lookup_uri = 'http://ws.spotify.com/lookup/1/.json?'
ws_url = 'ws://' + ip + ':9001'

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
                    "Favorite_Playlists":
                        [{"Name":"Coachella :)", "uri":"spotify:user:jerblack:playlist:0WAbJXwfOJbwU7nhz8aOKh"},
                         {"Name":"Classical", "uri":"spotify:user:jerblack:playlist:695tkzllIgTDYjq8S8KJGx"},
                         {"Name":"Electronic/Dance", "uri":"spotify:user:jerblack:playlist:0m2cGNVm9Zp6l9e09SiffL"},
                         {"Name":"Ambient/Downtempo", "uri":"spotify:user:jerblack:playlist:7a9mjhowih1tHU94Yve7lx"}],
                    "Shuffle_Playlists":   
                        [{"Name":"Spotify Library 1", "uri":"spotify:user:jerblack:playlist:5XnrfPufI8J3WuDXSJrj3m"},
                         {"Name":"Spotify Library 2", "uri":"spotify:user:jerblack:playlist:3L5VxdSBxnUPVhwXCoThiG"},
                         {"Name":"Spotify Library 3", "uri":"spotify:user:jerblack:playlist:3HESEQC2UvmA1Ap1q4Q2m1"},
                         {"Name": "Electronic/Dance", "uri": "spotify:user:jerblack:playlist:0m2cGNVm9Zp6l9e09SiffL"}],                         
                    "Shuffle_Playlist_Size": 50,
                    "Automatically_add_music_to_queue_when_nearing_end": True
                    },
                "Bookmarks": {
                    "Support_Multiple_Users": True,
                    "Users" : [ {"Name":"Jeremy", "uri":"spotify:user:jerblack:playlist:4aSwU3mYsVoMV5Wnxo4AbB"},
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
                    "Rate_1_star_in_local_file" : True,
                    "Move_to_purgatory_folder" : True,
                    "purgatory_folder_path": "",
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

class log:
    def __init__(self,summary,text):
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
                s = '| ' + summary + ' | ' + repr(text)
                print s
                l = open("static/PoleyMote.log","a")
                l.write(s + "\n")
                l.close()
            # print '| Log Failure | Failed to decode log request, likely non-ascii character in track data. This only affects logging on the server.'



#----------------------------------------#
# End of Track and Art Metadata Handling #
#----------------------------------------#





#--------------------------#
# End of /url definitions #
#--------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#
#--------------------------------------------------------------------------------------------------------------------------------------------------#


def trackUpdate(d):
    global trackInfo, tid
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
    log("Calling","trackUpdate(for '" + urllib.unquote(d['song']) + "') -> Received 'Now Playing' information")
    trackInfo['song'] = d['song']
    trackInfo['artist'] = d['artist']
    trackInfo['album'] = d['album']
    trackInfo['starred'] = d['starred']
    trackInfo['playing'] = d['playing']
    trackInfo['playlist'] = d['playlist']
    # trackInfo['sonos_connected'] = isSonosConnected()
    if (d['local'] == 'false'):
        trackInfo['year'] = d['year']
        trackInfo['artURL'] = getArt(d['spotifyURI'])
        trackInfo['artistURI'] = d['artistURI']
        trackInfo['albumURI'] = d['albumURI']
    elif (d['local'] == 'true'):
        localTrackPath = getLocalPath(d['spotifyURI'])
        localTrack = getLocalArt(localTrackPath)
        trackInfo['artURL'] = localTrack['uri']
        trackInfo['year'] = localTrack['year']
        trackInfo['artistURI'] = "local"
        trackInfo['albumURI'] = "local"
    tid += 1
    trackInfo['id'] = tid
    log('Now Playing', '\'' + urllib.unquote(d['song']) + '\' by \'' + urllib.unquote(d['artist']) + '\' on \'' + urllib.unquote(d['album']) + '\'')

def fireCommand(msg):
    """ Send provided message to spapp using websockets """

    log('Calling',"fireCommand() -> Sending message '" + msg + "' to PM Spotify app using WebSockets")
    ws = create_connection(ws_url)
    ws.send(msg)
    ws.close()

#--------------------------------------------------------------------------------------------------------------------------------------------------#

def handleCMD(cmd, opt):
    global trackInfo, tid, bmInfo, qInfo

    if (cmd == 'spotify'):
        fireCommand(sp_app_name + opt)
        return 0

    elif (cmd == "getsettings"):
        log("handleCMD","'/cmd/getsettings' -> downloading settings from server")
        return json.dumps(readConfig())

    elif (cmd == "connectsonos"):
        log("handleCMD","'/cmd/connectsonos -> reconnect to the Sonos")
        # connectSonos()
        return 0

    elif (cmd == "disconnectsonos"):
        log("handleCMD","'/cmd/disconnectsonos -> disconnect from the Sonos")
        # disconnectSonos()
        return 0

    elif (cmd == "artistinfo"):
        log("handleCMD","'/cmd/artistinfo -> artist info page requested from PoleyMote client")
        # artistInfo = ''
        # artistInfo = getArtistInfo(opt)
        # return json.dumps(artistInfo)

    elif (cmd == "gettrackinfo"):
        # while (int(opt) == tid):
        #     time.sleep(1)
        log("handleCMD","'/cmd/gettrackinfo/" + opt + "' -> Sending 'Now Playing' info to PoleyMote client")
        log('gettrackinfo','sending artURL: ' + trackInfo['artURL'])
        print 'current trackInfo is ', trackInfo
        # return json.dumps(trackInfo)

    elif (cmd == "updatetrackinfo"):
        log("handleCMD","'/cmd/updatetrackinfo' -> trackUpdate(New 'Now Playing' info being received)")
        print opt
        # trackUpdate(opt)
        return 0

    elif (cmd == "thumbsdown"):
        log("handleCMD","'/cmd/thumbsdown' -> thumbs down called on local file")
        thumbsDown(opt.spURL)

    elif (cmd == "thumbsup"):
        log("handleCMD","'/cmd/thumbsup' -> thumbs up called on local file")
        thumbsUp(opt.spURL)

    elif (cmd == "archive"):
        log("handleCMD","'/cmd/archive' -> track archived")
        archive(opt)

    # elif (cmd == "getalbums"):
    #     log("handleCMD","'/cmd/getalbums' -> retrieving album info for")
    #     return json.dumps(getAlbumsFromArtist(opt))


def thumbsUp(trackURI):
    localTrackPath = getLocalPath(trackURI)
    h = pconfig['Heart']
    if (h['Rate_5_star_in_iTunes'] == True):
        itunesThumbsUp(localTrackPath)
        log("thumbsUp","Rated 5-stars in '"+localTrackPath+"' in iTunes")
    # if (h['Rate_5_star_in_local_tag'] == True):
    #     rateLocalFile(localTrackPath, 252)
    #     log("thumbsUp","Rated 5-stars in '"+localTrackPath+"' in local file")


def thumbsDown(trackURI):
    localTrackPath = getLocalPath(trackURI)
    d = pconfig['Delete']
    # if (d['Move_to_purgatory_folder'] == True):
    if not os.path.isdir(local_delete_folder):
        os.makedirs(local_delete_folder)
    shutil.move(localTrackPath,local_delete_folder)
    log("thumbsDown","Moving '"+localTrackPath+"' to '"+local_delete_folder+"'")
    # elif (d['Delete_local_file'] == True):
    #     os.remove(localTrackPath);
    #     log("thumbsDown","Deleted file '"+localTrackPath+"'")
    # elif (d['Rate_1_star_in_local_tag'] == True):
    #     rateLocalFile(localTrackPath,1)
    #     log("thumbsDown","Rated 1 star '"+localTrackPath+"' in local file")
    # if (d['Delete_from_iTunes'] == True):
    #     deleteFromItunes(localTrackPath)
    #     log("thumbsDown","Deleting '"+localTrackPath+"' from iTunes")
    # elif (d['Rate_1_star_in_iTunes'] == True):
    #     itunesThumbsDown(localTrackPath)
    #     log("thumbsDown","Rated 1 star '"+localTrackPath+"' in iTunes")

# def rateLocalFile(trackURI,rat):
#     """
#         rateLocalFile is used the set the rating in the local file ID3 tag when rated by the user.
#         rate 1 for 1 star
#         #rate 252 for 5 star
#     """
#     p = getLocalPath(trackURI)
#     t = ID3(p)
#     if t.has_key('PCNT'):
#         if str(t['PCNT']).find('rating') != -1:
#             t['PCNT'].rating = rat
#     else:            
#         t.add(POPM(email = u'no@email', rating = rat, count = 1))
#     t.update_to_v23()
#     t.save(p, 2, 3)

# def increasePlayCount(trackURI):
#     """
#         increasePlayCount increments the playcount in the ID3 tag of a local file whenever it is played in Spotify
#     """
#     p = getLocalPath(trackURI)
#     #p = r"Z:/test/Reflections of the Television.mp3"
#     t = ID3(p)
#     if t.has_key('PCNT'):
#         if str(t['PCNT']).find('count') != -1:
#             t['PCNT'].count = 1 + t['PCNT'].count
#     else:
#         t.add(PCNT(count = 1))
#     t.update_to_v23()
#     t.save(p, 2, 3)





# def getAlbumsFromArtist(spURI):
#     global sp_lookup_uri

#     r = requests.get(sp_lookup_uri + 'uri=' + spURI + '&extras=album')
#     while (r.text == ''):
#         time.sleep(0.1)
#     x = json.loads(r.text)
#     y = x['artist']['albums']
#     artistName = x['artist']['name']
#     albums = {}
#     for i in y:
#         if i['album']['artist'] == artistName:
#             try:
#                 if i['album']['availability']['territories'].find('US') != -1:
#                     albums[i['album']['name']] = i['album']['href']
#             except KeyError:
#                 pass
#     albumInfo = []    
#     for key, value in albums.iteritems():
#         albumInfo.append(getTracks(value))
#     return albumInfo


# def getTracks(spURI):
#     """
#         Look up album uri
#         create album object and append trackinfo array
#         get track information for each track and append to array
#         album: released, name, href
#         each track: track-number, name, available, href, length
#     """
#     global sp_lookup_uri

#     r = requests.get(sp_lookup_uri + 'uri=' + spURI + '&extras=trackdetail')
#     while (r.text == ''):
#         time.sleep(0.1)
#     x = json.loads(r.text)
#     y = x['album']
#     album = {}
#     album['released'] = y['released']
#     album['name'] = y['name']
#     album['href'] = y['href']
#     album['artist'] = y['artist']
#     tracks = []
#     for t in y['tracks']:
#         tracks.append([t['track-number'],t['name'],t['available'],t['href'],t['length']])
#     album['tracks'] = tracks
#     return album



#     artist = info[0][0]
#     album = info[1][0]
#     title = info[2][0]
    
#     sec = int(s[3]) % 60
#     if sec < 10:
#         sec = '0' + str(sec)
#     else:
#         sec = str(sec)
#     duration = str(int(s[3]) / 60) + ":" + sec
#     log('getLocalPath',"Called for '" + spURL + "'")
#     log('getLocalPath',"Searching index using artist: '" + urllib.unquote(artist) + "', album: '" + urllib.unquote(album) + "', title: '" + urllib.unquote(album) + "', duration: '" + duration + "'")

#     conn = sql.connect(pm_db_path)
#     c = conn.cursor()
#     c.execute('''SELECT path FROM music WHERE artist = ? AND album = ? AND title = ? AND duration = ?;''', (artist, album, title, duration))
#     r = c.fetchone()
#     conn.close()
#     log('getLocalPath',"Result: '" + r[0] + "'")
#     return r[0]

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




def getArt(spTrackURL,x=False):
    """
        Takes a uri to a spotify track
        -> Use uri to query Spotify web service for album art path
        -> modify art path to produce 300 px image (larger than default, no logo) 
        -> return art path as string
    """
    pass
    # if (not x):
    #     log("Calling","getArt('" + spTrackURL + "') -> Getting cover art from Spotify")
    # spEmbedUrl = 'https://embed.spotify.com/oembed/?url=' + spTrackURL + '&callback=?'
    # try:
    #     r = requests.get(spEmbedUrl)
    #     while (r.text == ''):
    #         time.sleep(1)
    #     t = r.text.split(',')
    #     for i in t:
    #         if (i.find('thumbnail_url') != -1):
    #             t = i
    #     t = t.replace('"thumbnail_url":"','').replace('"', '').replace('\\','').replace('cover','300')
    #     #print t
    # except:
    #     t = ''
    #     #print 'something bad happened when getting art, trying again'
    #     t = getArt(spTrackURL, True)
    # return t


def getLocalArt(localTrackPath):
    """
        Takes a file path
        -> uses that to extract album art
        -> returns dict {'uri':uri,'year':year}
    """
    pass
    # global ip
    # log("Calling","getLocalArt() -> Retrieving cover art from local media file -> static/output.png")
    # log("getLocalArt","Extracting art from '" + localTrackPath + "'")
    # try:
    #     file = File(localTrackPath)
    #     try:
    #         year = str(file.tags['TDRC'].text[0])
    #     except KeyError:
    #         year = ""
    #     try:
    #         artwork = file.tags['APIC:'].data
    #         with open('static\output.png', 'wb') as img:
    #             img.write(artwork)
    #         return { 'uri':'http://' + ip + '/static/output.png?' + str(time.time()), 'year': year }
    #     except KeyError:
    #         return { 'uri':'http://' + ip + logo, 'year': year }
    # except IOError:
    #     return { 'uri':'http://' + ip + logo, 'year': "" }


def getLocalPath(spURL):
    """
        Take a spotify uri for a local file 
        -> extract the artist, album, title, and duration 
        -> use those to search the local music index
        -> return the path to the file

        spotify URI:    spotify:local:The+Whiskers:BIRP%21+July+2010:Marsh+Blood:220
        path to file:   Z:\\iTunes\\iTunes Media\\Music\\Various Artists\\BIRP! July 2010\\67 Marsh Blood.mp3'
    """
    pass
    # global pm_db_path
    # log("Calling","getLocalPath() -> Using Spotify uri to find path of local file in index")
    # s = urllib.unquote(spURL.replace('spotify:local:','').replace(":","|||")).replace('+',' ').encode('ascii','replace').replace('??','?').split('|||')
    # info = []
    # for i in s:
    #     info.append(i.split('?'))

    # artist = info[0][0]
    # album = info[1][0]
    # title = info[2][0]
    
    # sec = int(s[3]) % 60
    # if sec < 10:
    #     sec = '0' + str(sec)
    # else:
    #     sec = str(sec)
    # duration = str(int(s[3]) / 60) + ":" + sec
    # log('getLocalPath',"Called for '" + spURL + "'")
    # log('getLocalPath',"Searching index using artist: '" + urllib.unquote(artist) + "', album: '" + urllib.unquote(album) + "', title: '" + urllib.unquote(album) + "', duration: '" + duration + "'")

    # conn = sql.connect(pm_db_path)
    # c = conn.cursor()
    # c.execute('''SELECT path FROM music WHERE artist = ? AND album = ? AND title = ? AND duration = ?;''', (artist, album, title, duration))
    # r = c.fetchone()
    # conn.close()
    # log('getLocalPath',"Result: '" + r[0] + "'")
    # return r[0]

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

















class Root:
    # Definition of '/'
    @cp.expose
    def index(self):
        log("Loading page","'/' -> templates/pm_web.html")
        return cp.lib.static.serve_file(os.path.join(current_dir,'templates','pm_web.html'))

    # Definition of '/controls'    
    @cp.expose
    def controls(self):
        log("Loading page","'controls' -> templates/pm_controls.html")
        return cp.lib.static.serve_file(os.path.join(current_dir,'templates','pm_controls.html'))

    # Definition of '/test'    
    @cp.expose
    def json(self):
        log("Loading page","'json' -> templates/json.html")
        return cp.lib.static.serve_file(os.path.join(current_dir,'templates','json.html'))

    @cp.expose
    def cmd(self,cmd,opt=None):
        cp.response.headers["Access-Control-Allow-Origin"] = '*'
        cp.response.headers["Access-Control-Allow-Headers"] = "x-poleymote"
        cp.response.headers['Access-Control-Allow-Methods'] = 'GET'
        # print cmd, opt, cp.response.headers
        if 'X-Poleymote' in cp.request.headers:
            update = json.loads(cp.request.headers['X-Poleymote'])
            print 'myTEST++++   ', type(update['song']), type(update['year']), type(update['local'])
            return handleCMD(cmd, update)
        # else:
        #     return handleCMD(cmd, opt)

    @cp.expose
    @cp.tools.json_out()
    def test(self, limit=4):
        return list(range(int(limit)))

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


def getStarted():
    """
        Called at server startup. Performs initial preparation
        Sends request for current track info and status
        Read settings from 'settings.ini' file into pconfig object
    """
    log("Calling","getStarted() -> Sending 'refresh' message to PoleyMote Spotify app; reading settings")
    fireCommand('refresh')
    readConfig()

class startCherryPy:
    def __init__(self):
        cp.config.update({  'server.socket_host': ip,
                            'server.socket_port': port,
                            'log.error_file': 'pilot.log',
                            'log.screen': True,
                       })
        conf = {'/static': {
                    'tools.staticdir.on': True,
                    'tools.staticdir.dir': os.path.join(current_dir, 'static'),
                    'tools.staticdir.index': 'index.html'
                    }}
        cp.quickstart(Root(), '/', config=conf)

class startBroadcastServer:
    def __init__(self):
        factory = BroadcastServerFactory(ws_url)
        factory.protocol = BroadcastServerProtocol
        factory.setProtocolOptions(allowHixie76 = True)
        listenWS(factory)
        reactor.run(installSignalHandlers=False)

if __name__ == '__main__':
    log('Hello', "Welcome to PoleyMote")
    log('IP','PoleyMote now running on http://'+ip)
    threading.Timer(1, startBroadcastServer).start()
    threading.Timer(5, getStarted).start()
    startCherryPy()




