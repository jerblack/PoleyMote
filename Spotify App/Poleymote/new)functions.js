// pm.spapp.js

log

dashboard.playlistButtons
dashboard.toolButtons
dashboard.trimLog

utils.handleMsg
utils.connectServer
utils.worker.start
utils.worker.do
utils.sonos.connect
utils.sonos.disconnect
utils.appendToQueue


utils.displayTime 
utils.dedupe <- consolidated, parameter for finishing
utils.settings.get 
utils.settings.onLoad
utils.settings.update

utils.shuffle.newSpl
utils.shuffle.moveSplToFolder
utils.shuffle.createFolder
utils.shuffle.getHighest

utils.playlist.init
utils.playlist.getURI
utils.playlist.makeOffline

utils.migrate.whenDonePlaying
utils.migrate.fromURI

add.fromURI
add.trackArray
add.album.current
add.album.fromURI
add.artist.current
add.artist.fromURI

remove.artist.current
remove.artist.fromURI
remove.album.current
remove.album.fromURI
remove.track.current
remove.track.fromURI

remove.later.set
remove.later.process
remove.later.cancel

remove.queue.add
remove.queue.process

archive.track.current
archive.track.fromURI
archive.artist.current
archive.artist.fromURI
archive.album.current
archive.album.fromURI

// pm.spapp.controls.js

play.toggle
play.next
play.restart
play.starred
play.track
play.album
play.playlist
play.shuffle

// pm.spapp.nowplaying.js

nowplaying.update
nowplaying.update.log
nowplaying.update.dashboard
nowplaying.update.server
nowplaying.handleEvent
nowplaying.getLocalArtPath



star.current
star.fromURI
star.undo