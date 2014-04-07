#!/usr/bin/env python

import shelve, os, sys, mutagen, sqlite3, unicodedata, re, time
music_dir = "Z:\iTunes\iTunes Media\Music"
db = 'pm_localmusic.db'

class Index:
    def build(self):
        global music_dir
        errors = []
        analyzer = Analyzer()
        d = shelve.open(db)
        d['count'] = 0
        for root, dir, files in os.walk(music_dir):
            for name in files:
                if name[-4:].lower() == '.mp3':
                    path = os.path.join(root,name)
                    try:
                        id3 = ID3(path)
                    except:
                        errors.append(path)
                        id3 = None
                    if id3 != None:
                        d[str(d['count'])] = { "path": path, "artist": id3.artist, "title": id3.title, "album": id3.album, "duration":id3.duration}
                        d['count'] += 1
        d.close()
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
        comments = []
        if isinstance(full_tags, mutagen.mp3.MP3):
            for key in short_tags:
                if key[0:4] == 'COMM':
                    if(short_tags[key].desc == ''):
                        comments.append(short_tags[key].text[0])
            short_tags = mutagen.mp3.MP3(filename, ID3 = mutagen.easyid3.EasyID3)
        comments.append('');
        self.album = short_tags.get('album', [''])[0]
        self.artist = short_tags.get('artist', [''])[0]
        self.duration = "%u:%.2d" % (full_tags.info.length / 60, full_tags.info.length % 60)
        self.title = short_tags.get('title', [''])[0]

class Analyzer:
    """
    Analyze string and remove stop words
    """

    def analyze(self, text):
        words = []
        text = self.strip_accents(text)
        text = re.compile('[\'`?"]').sub(" ", text)
        text = re.compile('[^A-Za-z0-9]').sub(" ", text)
        for word in text.split(" "):
            word = word.strip()
            if word != "":#and not word in self.stop_words
                #if not isinstance(word, unicode):
                words.append(word.lower())
                #else:
                #    words.append(word.lower())
        return words

    def strip_accents(self,s):
        s = unicode(s)
        return ''.join((c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn'))

if __name__ == '__main__':
    index = Index()
    index.build()
    #if len(sys.argv) < 3:
    #    print 'Usage: tags.py index-build [your music dir]'
    #else:
    #    index = Index()
    #    if sys.argv[1] == 'index-build':
    #        index.build(sys.argv[2])
    #    elif sys.argv[1] == 'search':
    #        index.search(sys.argv[2])