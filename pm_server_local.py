# -*- coding: utf_8 -*-
# !/usr/bin/env python
import os, plistlib, warnings, urllib, struct, binascii, glob, HTMLParser
import sqlite3 as sql
from win32com.client import Dispatch, pythoncom
from mutagen import File
from mutagen.id3 import ID3, POPM, PCNT

from pm_server_logging import log
import pm_server_net as net
import pm_server_config as config


library_path = ''
# mosaic uri local file paths
# spotify:mosaic:localfileimage%3AZ%253A%255CiTunes%255C
# iTunes%2520Media%255CMusic%255CHundred%2520Hands%255C
# IndieFeed_%2520Alternative%2520_%2520Modern%2520Rock%2520Mus%255CDisaster.mp3
# sys.stdout = codecs.getwriter('utf8')(sys.stdout)


def getiTunesLibraryXMLPath():
    global library_path
    if (library_path != ''):
        return library_path
    else:
        pythoncom.CoInitialize()
        iTunes = Dispatch("iTunes.Application")
        library_path = iTunes.LibraryXMLPath
        pythoncom.CoUninitialize()
        return library_path


def indexItunesLibrary():
    f = getiTunesLibraryXMLPath()
    x = plistlib.readPlist(f)
    tracks = x['Tracks']
    conn = sql.connect(config.db)
    conn.text_factory = str
    cx = conn.cursor()
    cx.execute('''DROP TABLE IF EXISTS itunes;''')
    cx.execute('''CREATE TABLE itunes(id INTEGER PRIMARY KEY AUTOINCREMENT,location TEXT, artist TEXT, album TEXT, name TEXT, year TEXT, track_number TEXT, duration TEXT, persistent_id TEXT, pid_low TEXT, pid_high TEXT, img TEXT);''')
    count = 0
    warnings.filterwarnings("ignore")

    for t in tracks.itervalues():
        a = 'Track Type' in t
        b = t['Track Type'] == 'File'
        c = t['Location'][-4:].lower() in {'.mp3', '.m4a', '.aac'}
        if a and b and c:
            location = cleanPath(t['Location']) if 'Location' in t else ''
            d = location != ''
            e = location.find('//iTunes Media//Podcasts//') == -1
            if d and e:
                artist = t['Artist'] if 'Artist' in t else ''
                album = t['Album'] if 'Album' in t else ''
                name = t['Name'] if 'Name' in t else ''
                year = t['Year'] if 'Year' in t else ''
                track_number = t['Track Number'] if 'Track Number' in t else ''
                pid = t['Persistent ID']
                duration = t['Total Time']
                duration = str(duration / 1000)

                imgPath = ''

                if not os.path.exists(r'static/artwork/' + pid + '.png'):
                    try:
                        f = File(location)
                        try:
                            artwork = f.tags['APIC:'].data
                            with open('static/artwork/' + pid +
                                      '.png', 'wb') as img:
                                img.write(artwork)
                            imgPath = 'static/artwork/' + pid + '.png'
                        except KeyError:
                            imgPath = '/static/artist/no_art.png'
                    except IOError:
                        imgPath = '/static/artist/no_art.png'
                else:
                    imgPath = 'static/artwork/' + pid + '.png'

                hi_lo = struct.unpack('!ii', binascii.a2b_hex(pid))
                pid_low = hi_lo[0]
                pid_high = hi_lo[1]

                # try:
                count += 1
                if (count % 100 == 0):
                    print count
                cx.execute('''INSERT INTO itunes(location,artist,album,name,year,track_number,duration, persistent_id, pid_low, pid_high, img) VALUES(?,?,?,?,?,?,?,?,?,?,?);''',
                          (repr(location), artist, album, name, year,track_number, duration, pid, pid_low, pid_high, imgPath))
    conn.commit()
    conn.close()



def parseSPurl(spURL):
    if 'spotify:local:' in spURL:
        m = spURL.replace('spotify:local:', '')
        m = m.split(':')
        a = []
        for i in m:
            s = urllib.unquote(i)
            s = s.replace('+', ' ')
            s = s.encode('ascii', 'replace')
            s = s.replace('??', '?')
            s = s.split('?')
            a.append(s[0])

        artist = a[0]
        album = a[1]
        title = a[2]
        duration = a[3]
        return [artist, album, title, duration]
    else:
        return None


def getLocalTrackInfo(track):
    s = track
    if type(s) == str or type(s) == unicode:
        s = parseSPurl(s)
    # log("getLocalTrackInfo","Finding local file in index")
    artist = '%' + (s[0].split('?'))[0] + '%'
    album = '%' + (s[1].split('?'))[0] + '%'
    title = '%' + (s[2].split('?'))[0] + '%'
    duration = s[3]
    log('getLocalTrackInfo', "Called for '" + str(s) + "'")
    log('getLocalTrackInfo', "Searching index using artist:'" +
                             urllib.unquote(s[0]) + "', album: '" +
                             urllib.unquote(s[1]) + "', title: '" +
                             urllib.unquote(s[2]) + "', duration: '" +
                             duration + "'")

    conn = sql.connect(config.db)
    c = conn.cursor()
    c.execute('SELECT * FROM itunes WHERE artist LIKE ? AND album ' +
              'LIKE ? AND name LIKE ? AND duration = ?;',
              (artist, album, title, duration))
    r = c.fetchone()
    if type(r) != tuple:
        c.execute('SELECT * FROM itunes WHERE artist LIKE ?' +
                  ' AND album LIKE ? AND name LIKE ?;',
                  (artist, album, title))
        r = c.fetchone()
    if type(r) != tuple:
        c.execute('SELECT * FROM itunes WHERE artist LIKE ? AND name LIKE ?;',
                  (artist, title))
        r = c.fetchone()

    if r is not None:
        t = {}
        t['location'] = eval(r[1])
        t['artist'] = r[2]
        t['album'] = r[3]
        t['name'] = r[4]
        t['year'] = r[5]
        t['track'] = r[6]
        t['duration'] = r[7]
        t['persistent_id'] = r[8]
        t['pid_low'] = r[9]
        t['pid_high'] = r[10]
        t['img'] = 'http://' + net.getAddress() + '/' + r[11]
        conn.close()
        return t
    else:
        t = None
        conn.close()
        return t


def deleteLocalFile(track):
    log('deleteLocalFile', 'Called on ' + str(track))
    lp = (getLocalTrackInfo(track))['location']
    # Z://iTunes//iTunes Media//Music//Following//
    # KCRW's Today's Top Tune//Following.mp3
    dst_path = config.local_delete_folder
    # Z:/iTunes/Deleted/
    split = os.path.split(lp)
    src_path = split[0]
    fname = split[1]

    if not os.path.isdir(dst_path):
        os.makedirs(dst_path)

    try:
        os.rename(os.path.join(src_path, fname), os.path.join(dst_path, fname))
    except WindowsError:
        pass


def cleanPath(path):
    hp = HTMLParser.HTMLParser()
    p = path.replace('file://localhost/', '').replace('/', '//')
    p = hp.unescape(urllib.unquote(p))
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


def rateLocalFile(track, rat):
    """
        rateLocalFile is used the set the rating
        in the local file ID3 tag when rated by the user.
        rate 1 for 1 star
        rate 252 for 5 star
    """
    log('rateLocalFile', 'Called on ' + str(track))
    p = (getLocalTrackInfo(track))['location']

    t = ID3(p)
    if 'PCNT' in t:
        if str(t['PCNT']).find('rating') != -1:
            t['PCNT'].rating = rat
    else:
        t.add(POPM(email=u'no@email', rating=rat, count=1))
    t.update_to_v23()
    t.save(p, 2, 3)


def increasePlayCount(track):
    """
        increasePlayCount increments the playcount
        in the ID3 tag of a local file whenever
        it is played in Spotify
    """
    log('increasePlayCount', 'Called on ' + str(track))
    p = (getLocalTrackInfo(track))['location']
    # p = r"Z:/test/Reflections of the Television.mp3"
    t = ID3(p)
    if 'PCNT' in t:
        if str(t['PCNT']).find('count') != -1:
            t['PCNT'].count = 1 + t['PCNT'].count
    else:
        t.add(PCNT(count=1))
    t.update_to_v23()
    t.save(p, 2, 3)


def deleteFromItunes(track):
    log('deleteFromItunes', 'Called for ' + str(track))
    try:
        pythoncom.CoInitialize()
        iTunes = Dispatch("iTunes.Application")
        sources = iTunes.Sources
        library = sources.ItemByName("Library")
        music = library.Playlists.ItemByName("Music")
        allTracks = music.Tracks
        t = getLocalTrackInfo(track)
        tr = allTracks.ItemByPersistentID(t['pid_low'], t['pid_high'])
        tr.delete()
    except AttributeError:
        pass
    pythoncom.CoUninitialize()


def itunesThumbsDown(track):
    log('itunesThumbsDown', 'Called for ' + str(track))
    t = getLocalTrackInfo(track)
    pythoncom.CoInitialize()
    iTunes = Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    tr = allTracks.ItemByPersistentID(t['pid_low'], t['pid_high'])
    tr.Rating = 20
    pythoncom.CoUninitialize()


def itunesThumbsUp(track):
    log('itunesThumbsUp', 'Called for ' + str(track))
    t = getLocalTrackInfo(track)
    pythoncom.CoInitialize()
    iTunes = Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    tr = allTracks.ItemByPersistentID(t['pid_low'], t['pid_high'])
    tr.Rating = 100
    pythoncom.CoUninitialize()
