import win32com, pythoncom, os, sys, urllib, plistlib
from win32com.client import Dispatch, pythoncom
import struct, binascii

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

def getPID(localPath):
    #p = 'Z:\\iTunes\\iTunes Media\\Music\\Various Artists\\BIRP! July 2010\\67 Marsh Blood.mp3'
    p = localPath
    if p.find('file://') == -1:
        p = (urllib.quote((p.replace("\\",'/'))[5:])).replace("%21","!")
    f = getiTunesLibraryXMLPath()

    #print "Reading iTunes xml file..."
    x = plistlib.readPlist(f)
    tracks = x['Tracks']

    pid = ''
    for key in tracks.iterkeys():
        if p in tracks[key]['Location']:
            pid = tracks[key]['Persistent ID']
    print '| Calling | getPID() -> iTunes Persistent ID for track is ' + pid
    # https://stackoverflow.com/questions/6727041/itunes-persistent-id-music-library-xml-version-and-itunes-hex-version
    hi_lo = struct.unpack('!ii', binascii.a2b_hex(pid))
    return [hi_lo[0],hi_lo[1]]


def deleteFromItunes(localPath):
    win32com.client.pythoncom.CoInitialize()
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    pid = getPID(localPath)
    track = allTracks.ItemByPersistentID(pid[0],pid[1])
    track.Delete()
    win32com.client.pythoncom.CoUninitialize()


def itunesThumbsDown(localPath):
    win32com.client.pythoncom.CoInitialize()
    # 1 star on a scale of 0-100. Whole stars are increments of 20
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    pid = getPID(localPath)
    track = allTracks.ItemByPersistentID(pid[0],pid[1])
    track.Rating = 20
    win32com.client.pythoncom.CoUninitialize()

def itunesThumbsUp(localPath):
    win32com.client.pythoncom.CoInitialize()
    # 5 stars on a scale of 0-100. Whole stars are increments of 20
    iTunes = win32com.client.Dispatch("iTunes.Application")
    sources = iTunes.Sources
    library = sources.ItemByName("Library")
    music = library.Playlists.ItemByName("Music")
    allTracks = music.Tracks
    pid = getPID(localPath)
    track = allTracks.ItemByPersistentID(pid[0],pid[1])
    track.Rating = 100
    win32com.client.pythoncom.CoUninitialize()