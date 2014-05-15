# -*- coding: utf_8 -*-
# !/usr/bin/env python
import socket
from pm_server_logging import log
import pm_server_config as config

from twisted.internet import reactor
from websocket import create_connection
from autobahn.websocket import (WebSocketServerFactory,
                                WebSocketServerProtocol, listenWS)


def getAddress(*args):
    ip = socket.gethostbyname(socket.gethostname())
    if len(args) > 0 and args[0] == 1:
        return ip
    else:
        return ip + ':' + str(config.http_port)

# -------------------------------------- #
# Websocket Client and Server Components #
# -------------------------------------- #

# spapp websocket interface
ws_url = 'ws://' + getAddress(1) + ':9000'


def fireCommand(msg):
    """ Send provided message to spapp using websockets """

    log('fireCommand',
        "Sending message '" + msg + "' to PM Spotify app using WebSockets")
    ws = create_connection(ws_url)
    ws.send(msg)
    ws.close()


# broadcast server components
class BroadcastServerProtocol(WebSocketServerProtocol):
    def onOpen(self):
        self.factory.register(self)

    def onMessage(self, msg, binary):
        self.factory.broadcast(msg)

    def connectionLost(self, reason):
        WebSocketServerProtocol.connectionLost(self, reason)
        self.factory.unregister(self)


class BroadcastServerFactory(WebSocketServerFactory):
    def __init__(self, ws_url):
        WebSocketServerFactory.__init__(self, ws_url)
        self.clients = []

    def register(self, client):
        if client not in self.clients:
            self.clients.append(client)

    def unregister(self, client):
        if client in self.clients:
            self.clients.remove(client)

    def broadcast(self, msg):
        for client in self.clients:
            client.sendMessage(msg)


def startBroadcastServer():
    factory = BroadcastServerFactory(ws_url)
    factory.protocol = BroadcastServerProtocol
    factory.setProtocolOptions(allowHixie76=True)
    listenWS(factory)
    reactor.run(installSignalHandlers=False)

# --------------------------------------------- #
# end of Websocket Client and Server Components #
# --------------------------------------------- #
