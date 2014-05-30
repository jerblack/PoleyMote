// pm.spapp.utils.js
utils.worker.start
utils.worker.do
utils.sonos.connect
utils.sonos.disconnect
utils.displayTime 
utils.settings.get 
utils.settings.onLoad
utils.settings.update
utils.migrate.whenDone
utils.migrate.fromURI

add.fromURI
add.tracks.fromURIs
add.tracks.onAlbum
add.tracks.byArtist


add.addTracks
add.getTracks
<consolidate>
add.AlbumsFromArtist.fromLocal
add.AlbumsFromArtist
<consolidate>
add.TracksFromAlbum.fromLocal
add.TracksFromAlbum
dedupe.find
dedupe.delete
archive.track.current
archive.track.fromURI
archive.artist.current
archive.artist.fromURI
archive.album.current
archive.album.fromURI
remove.artist.current
<consolidate>
remove.artist.fromSpURI
remove.artist.fromLocal
remove.album.current
remove.album.fromURI
remove.track.current
remove.track.fromURI
remove.later.set
remove.later.process
remove.later.cancel
remove.queue.add
remove.queue.process
star.current
star.fromURI
star.undo
playlist.init
playlist.getURI
playlist.makeOffline
shuffle.getHighest
shuffle.createFolder
playlist.shuffle.moveSplToFolder
playlist.shuffle.newSpl

// pm.spapp.controls.js

controls.play.toggle
controls.next
controls.skipback
controls.play.starred
controls.play.track
controls.play.album
controls.play.playlist
controls.play.shuffle
controls.appendToQueue

// pm.spapp.nowplaying.js

nowplaying.log
nowplaying.dashboard
nowplaying.sendUpdate
nowplaying.localArt

// pm.spapp.js

doRemote
log
handleMsg
dashboard.playlistButtons
dashboard.toolButtons
dashboard.trimLog