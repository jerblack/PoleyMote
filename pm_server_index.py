# -*- coding: utf_8 -*-
#!/usr/bin/env python
import os, sys, mutagen, time
import sqlite3 as sql
import warnings

music_dir = "Z:\iTunes\iTunes Media\Music"
db = 'poleymote.db'
warnings.filterwarnings("ignore") 


class Index:
    def build(self):
        global music_dir, db
        errors = []
        conn = sql.connect(db)
        conn.text_factory = str
        c = conn.cursor()
        c.execute('''DROP TABLE IF EXISTS music;''')
        c.execute('''CREATE TABLE music(id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, artist TEXT, album TEXT, title TEXT, duration TEXT);''')
        count = 0
        ext = ['.mp3','.m4a','.mp4','.aac']
        for root, dir, files in os.walk(music_dir):
            for name in files:
                if (ext.count(name[-4:].lower()) == 1):
                    path = os.path.join(root,name)
                    try:
                        id3 = ID3(path)
                    except:
                        errors.append(path)
                        id3 = None
                    if id3 != None:
                        # print('.'),
                        count += 1
                        if (count%100 == 0):
                            print count
                        c.execute('''INSERT INTO music(path,artist,album,title,duration) VALUES(?,?,?,?,?);''', (repr(path), id3.artist, id3.album, id3.title, id3.duration))
        conn.commit()
        conn.close()
        if len(errors) > 0:
            print ""
            print "---- Errors ----"
            print ""
            for error in errors:
                print error

class ID3:
    def __init__(self,path):
        self._load(path)

    def _load(self, filename):
        short_tags = full_tags = mutagen.File(filename)
        if isinstance(full_tags, mutagen.mp3.MP3):
            short_tags = mutagen.mp3.MP3(filename, ID3 = mutagen.easyid3.EasyID3)
        self.album = short_tags.get('album', [''])[0]
        self.artist = short_tags.get('artist', [''])[0]
        self.duration = "%u:%.2d" % (full_tags.info.length / 60, full_tags.info.length % 60)
        self.title = short_tags.get('title', [''])[0]

if __name__ == '__main__':
    index = Index()
    index.build()