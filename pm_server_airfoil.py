import time, subprocess
from win32com.client import Dispatch, pythoncom


def setupAirfoil(source):
    pythoncom.CoInitialize()
    #airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    #currentSource = airfoilapp.GetCurrentSource().Id().lower()
    connectSpotify()


def connectSonos():
    pythoncom.CoInitialize()
    airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    speakerBox = airfoilapp.GetSpeakers()
    sonosNum = -1
    while (speakerBox.Count() < 3):
        time.sleep(3)
    for i in range(0, speakerBox.Count()):
        speaker = speakerBox.Item(i)
        if speaker.Name() == "iTunes for Sonos":
            sonosNum = i
    sonos = speakerBox.Item(sonosNum)
    sonos.Connect()
    airfoilapp = None
    pythoncom.CoUninitialize()


def disconnectSonos():
    pythoncom.CoInitialize()
    airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    speakerBox = airfoilapp.GetSpeakers()
    sonosNum = 4
    for i in range(0, speakerBox.Count()):
        speaker = speakerBox.Item(i)
        if speaker.Name() == "iTunes for Sonos":
            sonosNum = i
    sonos = speakerBox.Item(sonosNum)
    sonos.Disconnect()
    airfoilapp = None
    pythoncom.CoUninitialize()


def connectSpotify():
    ensureAirfoilRunning()
    pythoncom.CoInitialize()
    airfoilapp = Dispatch("RogueAmoeba.Airfoil")
    soundSources = airfoilapp.GetRunningSources()
    spotifyNum = 11
    for i in range(0, soundSources.Count()):
        thisSource = soundSources[i].Id().lower()
        if thisSource.endswith("spotify.exe"):
            spotifyNum = i
    spotify = soundSources.Item(spotifyNum)
    airfoilapp.SetCurrentSource(spotify)
    airfoilapp = None
    pythoncom.CoUninitialize()


def ensureAirfoilRunning():
    a = subprocess.check_output(['tasklist', '/fo', 'list'])
    if (a.find("Airfoil.exe") != -1):
        subprocess.Popen("C:\Program Files (x86)\Airfoil\Airfoil.exe")
        time.sleep(3)


def isSonosConnected():
    isConn = 0
    a = subprocess.check_output(['tasklist', '/fo', 'list'])
    if (a.find("Airfoil.exe") != -1):
        pythoncom.CoInitialize()
        airfoilapp = Dispatch("RogueAmoeba.Airfoil")
        speakerBox = airfoilapp.GetSpeakers()
        while (speakerBox.Count() < 3):
            time.sleep(3)
        for i in range(0, speakerBox.Count()):
            speaker = speakerBox.Item(i)
            if speaker.Name() == "iTunes for Sonos":
                if(speaker.Connected()):
                    isConn = 1
        airfoilapp = None
        pythoncom.CoUninitialize()
    return isConn
