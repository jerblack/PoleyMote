import win32com, time, pythoncom, os, sys, subprocess
from win32com.client import Dispatch, pythoncom

def setupAirfoil(source):
    #ensureAirfoilRunning()
    win32com.client.pythoncom.CoInitialize()
    airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    currentSource = airfoilapp.GetCurrentSource().Id().lower()
    connectSpotify()

def connectSonos():
    #ensureAirfoilRunning()
    win32com.client.pythoncom.CoInitialize()
    airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    speakerBox = airfoilapp.GetSpeakers()
    sonosNum = -1
    while (speakerBox.Count() < 3):
        time.sleep(3)
    for i in range(0,speakerBox.Count()):
        speaker = speakerBox.Item(i)
        if speaker.Name() == "iTunes for Sonos":
            sonosNum = i
    sonos = speakerBox.Item(sonosNum)
    sonos.Connect()
    airfoilapp = None
    win32com.client.pythoncom.CoUninitialize()

def disconnectSonos():
    win32com.client.pythoncom.CoInitialize()
    airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    speakerBox = airfoilapp.GetSpeakers()
    sonosNum = 4
    for i in range(0,speakerBox.Count()):
        speaker = speakerBox.Item(i)
        if speaker.Name() == "iTunes for Sonos":
            sonosNum = i
    sonos = speakerBox.Item(sonosNum)
    sonos.Disconnect()
    airfoilapp = None
    win32com.client.pythoncom.CoUninitialize()

def connectSpotify():
    ensureAirfoilRunning()
    win32com.client.pythoncom.CoInitialize()
    airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    soundSources = airfoilapp.GetRunningSources()
    spotifyNum = 11
    for i in range(0,soundSources.Count()):
        thisSource = soundSources[i].Id().lower()
        if thisSource.endswith("spotify.exe"):
            spotifyNum = i
    spotify = soundSources.Item(spotifyNum)
    airfoilapp.SetCurrentSource(spotify)
    airfoilapp=None
    win32com.client.pythoncom.CoUninitialize()

def ensureAirfoilRunning():
    if (subprocess.check_output(['tasklist', '/fo', 'list']).find("Airfoil.exe") != -1):
        subprocess.Popen("C:\Program Files (x86)\Airfoil\Airfoil.exe")
        time.sleep(3)

def isSonosConnected():
    isConn = 0
    if (subprocess.check_output(['tasklist', '/fo', 'list']).find("Airfoil.exe") != -1):
        
        #ensureAirfoilRunning()
        win32com.client.pythoncom.CoInitialize()
        airfoilapp = Dispatch("RogueAmoeba.Airfoil")
        speakerBox = airfoilapp.GetSpeakers()
        sonosNum = -1
        while (speakerBox.Count() < 3):
            time.sleep(3)
        for i in range(0,speakerBox.Count()):
            speaker = speakerBox.Item(i)
            if speaker.Name() == "iTunes for Sonos":
                if(speaker.Connected()):
                    isConn = 1
        airfoilapp = None
        win32com.client.pythoncom.CoUninitialize()
    return isConn