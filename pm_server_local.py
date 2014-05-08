# -*- coding: utf_8 -*-
#!/usr/bin/env python
import win32com, pythoncom, os, sys, plistlib, codecs
import urllib as ul
from win32com.client import Dispatch, pythoncom
import struct, binascii, glob
from mutagen import File
from mutagen.id3 import ID3, POPM, PCNT
from pm_server_logging import log
import HTMLParser as hp

library_path = ''
# sys.stdout = codecs.getwriter('utf8')(sys.stdout)


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

def getPID(track):
    #p = 'Z:\\iTunes\\iTunes Media\\Music\\Various Artists\\BIRP! July 2010\\67 Marsh Blood.mp3'
    artist = (track[0].split('?'))[0]
    album = (track[1].split('?'))[0]
    song = (track[2].split('?'))[0]
    # p = localPath
    # if p.find('file://') == -1:
    #     p = (urllib.quote((p.replace("\\",'/'))[5:])).replace("%21","!")
    # p = (urllib.unquote(p)).replace(' ','%20')
    f = getiTunesLibraryXMLPath()
    # print 'p = ',p
    #print "Reading iTunes xml file..."
    x = plistlib.readPlist(f)
    tracks = x['Tracks']

    pid = ''
    for t in tracks.itervalues():
        try:
            if artist in t['Artist']:
                # print 'found artist: ',artist
                if album in t['Album']:
                    # print 'found album: ',album
                    if song in t['Name']:
                        # print 'found song: ', song
                        pid = t['Persistent ID']
        except KeyError:
            # print "Problem: ", t
            pass
    log('getPID','iTunes Persistent ID for track is ' + pid)
    # https://stackoverflow.com/questions/6727041/itunes-persistent-id-music-library-xml-version-and-itunes-hex-version
    hi_lo = struct.unpack('!ii', binascii.a2b_hex(pid))
    return [hi_lo[0],hi_lo[1]]

def getPath(track):
    log('getPath','Called for '+str(track))
    artist = (track[0].split('?'))[0]
    album = (track[1].split('?'))[0]
    song = (track[2].split('?'))[0]
    f = getiTunesLibraryXMLPath()
    x = plistlib.readPlist(f)
    tracks = x['Tracks']
    path = ''
    for t in tracks.itervalues():
        try:
            if artist in t['Artist']:
                # print 'found artist: ',artist
                if album in t['Album']:
                    # print 'found album: ',album
                    if song in t['Name']:
                        # print 'found song: ', song
                        p = t['Location']
                        path = cleanPath(p)
                        break
        except KeyError:
            # print "Problem: ", t
            pass
    log('getPath','Path for track is ' + path)
    return path


def deleteLocalFile(track):
    log('deleteLocalFile','Called on '+str(track))
    localTrackPath = getPath(track)
    if not os.path.isdir(local_delete_folder):
        os.makedirs(local_delete_folder)
    shutil.move(localTrackPath,local_delete_folder)

#Z://iTunes//iTunes%20Media//Music//Johan%20Skugge%20&%20Jukka%20Rintam%C3%A4ki//Soundtrack%20-%20Battlefield%203//13%20Choked.mp3
def cleanPath(path):
    h = hp.HTMLParser()
    p = path.replace('file://localhost/','').replace('/','//')
    p = h.unescape(ul.unquote(p))

    try:
        print p.decode('ascii','replace')
    except:
        print "couldn't do it"
    s = ''
    for i in p:
        try:
            s += i.encode('ascii')
        except:
            s += '*'
    # print p
    p = (glob.glob(s))[0]


    return p


def rateLocalFile(track,rat):
    """
        rateLocalFile is used the set the rating in the local file ID3 tag when rated by the user.
        rate 1 for 1 star
        #rate 252 for 5 star
    """
    log('rateLocalFile','Called on '+str(track))
    p = getPath(track)

    t = ID3(p)
    if t.has_key('PCNT'):
        if str(t['PCNT']).find('rating') != -1:
            t['PCNT'].rating = rat
    else:            
        t.add(POPM(email = u'no@email', rating = rat, count = 1))
    t.update_to_v23()
    t.save(p, 2, 3)


def increasePlayCount(track):
    """
        increasePlayCount increments the playcount in the ID3 tag of a local file whenever it is played in Spotify
    """
    log('increasePlayCount','Called on '+str(track))
    p = getPath(track)
    #p = r"Z:/test/Reflections of the Television.mp3"
    t = ID3(p)
    if t.has_key('PCNT'):
        if str(t['PCNT']).find('count') != -1:
            t['PCNT'].count = 1 + t['PCNT'].count
    else:
        t.add(PCNT(count = 1))
    t.update_to_v23()
    t.save(p, 2, 3)

def deleteFromItunes(track):
    log('deleteFromItunes','Called for '+str(track))

    try:
        win32com.client.pythoncom.CoInitialize()
        iTunes = win32com.client.Dispatch("iTunes.Application")
        sources = iTunes.Sources
        library = sources.ItemByName("Library")
        music = library.Playlists.ItemByName("Music")
        allTracks = music.Tracks
        pid = getPID(track)
        track = allTracks.ItemByPersistentID(pid[0],pid[1])
        track.delete()
    except AttributeError:
        print '| Error | Failed to delete local file from iTunes database'
        print 'track = ', track
        print 'pid = ', pid
    win32com.client.pythoncom.CoUninitialize()



def itunesThumbsDown(track):
    log('itunesThumbsDown','Called for '+str(track))
    pid = getPID(track)
    a, b = pid[0],pid[1]
    win32com.client.pythoncom.CoInitialize()
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    t = music.Tracks.ItemByPersistentID(a,b)
    t.Rating = 20
    win32com.client.pythoncom.CoUninitialize()

def itunesThumbsUp(track):
    log('itunesThumbsUp','Called for '+str(track))
    pid = getPID(track)
    a, b = pid[0],pid[1]
    win32com.client.pythoncom.CoInitialize()
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    t = music.Tracks.ItemByPersistentID(a,b)
    t.Rating = 100
    win32com.client.pythoncom.CoUninitialize()