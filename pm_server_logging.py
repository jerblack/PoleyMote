# -*- coding: utf_8 -*-
#!/usr/bin/env python
#---------#
# Logging #
#---------#
def log(summary,text):
    # v = True    
    # try:
    #     v = pconfig['Logging']['Verbose_Logging']
    # except KeyError:
    #     v = True
    # if (v):
        #t = text.decode('ascii','replace')
    try:
        s = '| ' + summary + ' | ' + text
        s = s.decode('ascii','replace') 
        # print s
        l = open("static/PoleyMote.log","a")
        l.write(s + "\n")
        l.close()
    except UnicodeEncodeError:
        s = '| ' + summary + ' | ' + repr(text)
        s = s.decode('ascii','replace') 
        # print s
        l = open("static/PoleyMote.log","a")
        l.write(s + "\n")
        l.close()