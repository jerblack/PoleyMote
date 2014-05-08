import win32com, pythoncom, os, sys, urllib, plistlib, urlparse
from win32com.client import Dispatch, pythoncom
import struct, binascii
import HTMLParser as hp


library_path = ''

def getiTunesLibraryXMLPath():
    global library_path
    if (library_path != ''):
        return library_path
    else:
        win32com.client.pythoncom.CoInitialize()
        iTunes = win32com.client.Dispatch("iTunes.Application")
        library_path = iTunes.LibraryXMLPath
        win32com.client.pythoncom.CoUninitialize()
        return library_path

def cleanPath(path):
    pass

def getPID():
    p = 'Z:\iTunes\iTunes Media\Music\Various Artists\BIRP! March 2009\17 Can You Tell.mp3'
    artist = 'Ra Ra Riot'
    album = 'BIRP! March 2009'
    song = 'Can You Tell'
    artist,album,song = 'Emilie Mover', 'IndieFeed: Indie Pop Music', 'No Words'
    # p = localPath
    # if p.find('file://') == -1:
    #     p = (urllib.quote((p.replace("\\",'/'))[5:])).replace("%21","!")
    # # p = (urllib.unquote(p)).replace(' ','%20')
    # p =  unicode(urlparse.unquote(urlparse.urlparse(p)),"utf8")

    f = getiTunesLibraryXMLPath()
    # print 'p = ',p
    #print "Reading iTunes xml file..."
    x = plistlib.readPlist(f)
    tracks = x['Tracks']

    pid = ''
    for t in tracks.itervalues():
        try:
            if artist in t['Artist']:
                print 'found artist: ',artist
                if album in t['Album']:
                    print 'found album: ',album
                    if song in t['Name']:
                        print 'found song: ', song
                        pid = t['Persistent ID']
        except KeyError:
            # print "Problem: ", t
            pass
    print '| Calling | getPID() -> iTunes Persistent ID for track is ' + pid

    # https://stackoverflow.com/questions/6727041/itunes-persistent-id-music-library-xml-version-and-itunes-hex-version
    hi_lo = struct.unpack('!ii', binascii.a2b_hex(pid))
    for i in hi_lo:
        print type(i)
    return [hi_lo[0],hi_lo[1]]
# spotify:local:Ra+Ra+Riot:BIRP%21+March+2009:Can+You+Tell:162

def itunesThumbsUp():
    a,b = -1870815648, 647412688
    # a,b = 544516553, -1752541554
    win32com.client.pythoncom.CoInitialize()
    # 5 stars on a scale of 0-100. Whole stars are increments of 20
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    track = allTracks.ItemByPersistentID(a,b)
    print dir(track)
    print track.name, track.artist, track.album
    track.delete()
    # pid = getPID(track)
    # print pid
    # # track = allTracks.ItemByPersistentID(pid[0],pid[1])
    # track.Rating = 100
    win32com.client.pythoncom.CoUninitialize()


'Z:/iTunes/iTunes%20Media/Music/Various%20Artists/BIRP!%20March%202012/81%20Runner.mp3'

'Z:\iTunes\iTunes Media\Music\Johan Skugge & Jukka RintamΣki\Soundtrack - Battlefield 3\13 Choked.mp3'
