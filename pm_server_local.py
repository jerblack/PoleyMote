# -*- coding: utf_8 -*-
#!/usr/bin/env python
import win32com, pythoncom, os, sys, plistlib, codecs, shutil, warnings, socket, urllib
import urllib as ul
from win32com.client import Dispatch, pythoncom
import struct, binascii, glob
from mutagen import File
from mutagen.id3 import ID3, POPM, PCNT
from pm_server_logging import log
from pm_server_net import getAddress
from pm_server_config import local_delete_folder, local_archive_folder, db
import HTMLParser as hp
import sqlite3 as sql


library_path = ''
# mosaic uri local file paths
# spotify:mosaic:localfileimage%3AZ%253A%255CiTunes%255CiTunes%2520Media%255CMusic%255CHundred%2520Hands%255CIndieFeed_%2520Alternative%2520_%2520Modern%2520Rock%2520Mus%255CDisaster.mp3
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

def indexItunesLibrary():
    global db
    f = getiTunesLibraryXMLPath()
    x = plistlib.readPlist(f)
    tracks = x['Tracks']
    conn = sql.connect(db)
    conn.text_factory = str
    c = conn.cursor()
    c.execute('''DROP TABLE IF EXISTS itunes;''')
    c.execute('''CREATE TABLE itunes(id INTEGER PRIMARY KEY AUTOINCREMENT, location TEXT, artist TEXT, album TEXT, name TEXT, year TEXT, track_number TEXT, duration TEXT, persistent_id TEXT, pid_low TEXT, pid_high TEXT, img TEXT);''')
    count = 0
    warnings.filterwarnings("ignore") 

    for t in tracks.itervalues():
        if 'Track Type' in t and t['Track Type'] == 'File' and t['Location'][-4:].lower() in {'.mp3','.m4a','.aac'}:
            location = cleanPath(t['Location']) if  'Location' in t else ''
            if location != '' and location.find('//iTunes Media//Podcasts//') == -1:
                artist = t['Artist'] if 'Artist' in t else ''
                album = t['Album'] if 'Album' in t else ''
                name = t['Name'] if 'Name' in t else ''
                year = t['Year'] if 'Year' in t else ''
                track_number = t['Track Number'] if 'Track Number' in t else ''
                persistent_id = t['Persistent ID']
                duration = t['Total Time']
                duration = str(duration/1000)

                imgPath = ''

                if not os.path.exists(r'static/artwork/'+persistent_id+'.png'):
                    try:
                        file = File(location)
                        try:
                            artwork = file.tags['APIC:'].data
                            with open('static/artwork/' + persistent_id + '.png', 'wb') as img:
                                img.write(artwork)
                            imgPath = 'static/artwork/' + persistent_id + '.png'
                        except KeyError:
                            imgPath = '/static/artist/no_art.png'
                    except IOError:
                        imgPath = '/static/artist/no_art.png'
                else:
                    imgPath = 'static/artwork/' + persistent_id + '.png'
                
                hi_lo = struct.unpack('!ii', binascii.a2b_hex(persistent_id))
                pid_low = hi_lo[0]
                pid_high = hi_lo[1]

                # try:
                count += 1
                if (count%100 == 0):
                    print count
                c.execute('''INSERT INTO itunes(location,artist,album,name,year,track_number, duration, persistent_id, pid_low, pid_high, img) VALUES(?,?,?,?,?,?,?,?,?,?,?);''', (repr(location), artist, album, name, year, track_number, duration, persistent_id, pid_low, pid_high, imgPath ))
    conn.commit()
    conn.close()

def parseSPurl(spURL):
    m = urllib.unquote(spURL.replace('spotify:local:','').replace(":","|||")).replace('+',' ').encode('ascii','replace').replace('??','?').split('|||')
    s = []
    for i in m:
        s.append((i.split('?'))[0])
    artist = s[0]
    album = s[1]
    title = s[2]
    duration = s[3]
    return [artist,album,title,duration]



def getLocalTrackInfo(track):
    global db
    s = track
    if type(s) == str or type(s)==unicode:
        s = parseSPurl(s)
    # log("getLocalTrackInfo","Finding local file in index")
    artist = '%'+(s[0].split('?'))[0]+'%'
    album = '%'+(s[1].split('?'))[0]+'%'
    title = '%'+(s[2].split('?'))[0]+'%'
    duration = s[3]
    # log('getLocalTrackInfo',"Called for '" + spURL + "'")
    # log('getLocalTrackInfo',"Searching index using artist: '" + urllib.unquote(s[0]) + "', album: '" + urllib.unquote(s[1]) + "', title: '" + urllib.unquote(s[2]) + "', duration: '" + duration + "'")

    conn = sql.connect(db)
    c = conn.cursor()
    c.execute('SELECT * FROM itunes WHERE artist LIKE ? AND album LIKE ? AND name LIKE ? AND duration = ?;',(artist,album,title,duration))
    r = c.fetchone()
    if type(r) != tuple:
        c.execute('SELECT * FROM itunes WHERE artist LIKE ? AND album LIKE ? AND name LIKE ?;',(artist,album,title))
        r = c.fetchone()
    if type(r) != tuple:
        c.execute('SELECT * FROM itunes WHERE artist LIKE ? AND name LIKE ?;',(artist,title))
        r = c.fetchone()
    # print 'r is : ', str(r)
    # print r
    # print 's is : ', str(s)
    # print 'type : ',type(r)
    # print track
    if r != None:
        t = {}
        t['location']       = eval(r[1])
        t['artist']         = r[2]
        t['album']          = r[3]
        t['name']           = r[4]
        t['year']           = r[5]
        t['track']          = r[6]
        t['duration']       = r[7]
        t['persistent_id']  = r[8]
        t['pid_low']        = r[9]
        t['pid_high']       = r[10]
        t['img']            = 'http://' + getAddress() + '/' + r[11]
        conn.close()
        return t
    else:
        t = None;
        conn.close()
        return t
    

def deleteLocalFile(track):
    log('deleteLocalFile','Called on '+str(track))
    localTrackPath = (getLocalTrackInfo(track))['location']
    if not os.path.isdir(local_delete_folder):
        os.makedirs(local_delete_folder)
    print 'localTrackPath',localTrackPath
    new_path = os.path.join(local_delete_folder + os.path.basename(localTrackPath))
    print 'new_path', new_path
    if os.path.exists(new_path):
        os.rename(new_path, local_delete_folder+'_' + os.path.basename(new_path))
    os.rename(localTrackPath,new_path)

def cleanPath(path):
    h = hp.HTMLParser()
    p = path.replace('file://localhost/','').replace('/','//')
    p = h.unescape(ul.unquote(p))
    if not (os.path.exists(p)):
        s = ''
        for i in p:
            try:
                s += i.encode('ascii')
            except:
                s += '*'
        try:
            p = (glob.glob(s))[0]
        except IndexError:
            # print 'File missing in iTunes:  ', s
            p = ''
    return p


def rateLocalFile(track,rat):
    """
        rateLocalFile is used the set the rating in the local file ID3 tag when rated by the user.
        rate 1 for 1 star
        #rate 252 for 5 star
    """
    log('rateLocalFile','Called on '+str(track))
    p = (getLocalTrackInfo(track))['location']

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
    p = (getLocalTrackInfo(track))['location']
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
        t = getLocalTrackInfo(track)
        tr = allTracks.ItemByPersistentID(t['pid_low'],t['pid_high'])
        tr.delete()
    except AttributeError:
        print '| Error | Failed to delete local file from iTunes database'
        print 'track = ', track
    win32com.client.pythoncom.CoUninitialize()



def itunesThumbsDown(track):
    log('itunesThumbsDown','Called for '+str(track))
    t = getLocalTrackInfo(track)
    win32com.client.pythoncom.CoInitialize()
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    tr = allTracks.ItemByPersistentID(t['pid_low'],t['pid_high'])
    tr.Rating = 20
    win32com.client.pythoncom.CoUninitialize()

def itunesThumbsUp(track):
    log('itunesThumbsUp','Called for '+str(track))
    t = getLocalTrackInfo(track)
    win32com.client.pythoncom.CoInitialize()
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    tr = allTracks.ItemByPersistentID(t['pid_low'],t['pid_high'])
    tr.Rating = 100
    win32com.client.pythoncom.CoUninitialize()