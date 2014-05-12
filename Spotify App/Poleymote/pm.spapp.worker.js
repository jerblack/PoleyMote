
onmessage = function(e){
    x = e.data.data;
    postMessage(x.length);
    postMessage(x)

    // if ( x[0] === "start" ) {
    //     start();
    // } else
    self.close()
};
 
function start(){
  // Send back the results to the parent page
  postMessage('hello!');
  // postMessage(x);
  self.close();
}

function ddw(data){
    console.log(data.length);
}
