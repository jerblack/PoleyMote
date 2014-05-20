
onmessage = function(e){
    // Looking for e.data.fn, e.data.data

    if (e.data.fn === 'dedupe') {
        ddw(e.data.data);
    } else if (e.data.fn === 'shuffle') {
        shuffle(e.data.data);
    }
    // self.close()
};
 
function ddw(input) {
    td = input.shift();
    work = td.tracks;
    dlt = [];
    count = 0;
    input.forEach(function(p){
        tr = p.tracks;
        p  = { playlist:  p.playlist,
               tracks: [] }
        tr.forEach(function(t){
            if (work.indexOf(t) == -1) {
                work.push(t);
            }else{
                p.tracks.push(t);
                count++; 
            }})
        if (p.tracks.length > 0) {
            dlt.push(p);
            }})
    
    if (count > 0) {
        postMessage({fn:'log', title:'Duplicate Remover',
                     text: ['Found '+count+' duplicate tracks across all playlists',
                            'Beginning removal'] });
        postMessage({fn:'dedupe', data: dlt});
    } else {
        postMessage({fn:'log', title:'Duplicate Remover',
             text: 'No duplicates found in your shuffle playlists'});
    }
}


