# -*- coding: utf_8 -*-
#!/usr/bin/env python
import socket
from pm_server_config import http_port

def getAddress(*args):
    global http_port
    ip = socket.gethostbyname(socket.gethostname())
    if len(args) >0 and args[0] == 1:
        return ip
    else:
        return ip + ':' + str(http_port)
