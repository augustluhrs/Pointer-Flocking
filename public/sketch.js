/*
    ~ * ~ * ~ * 
    CLIENT
    ~ * ~ * ~ * 
*/

//
//  ASSET LOAD
//


function preload() {
  
}

//
//  SOCKET SERVER STUFF
//

//open and connect the input socket
let socket = io('/');

//listen for the confirmation of connection 
socket.on('connect', () => {
  console.log('now connected to server');
});

//
//  VARIABLES
//



//
//  MAIN
//

function setup(){
  createCanvas(windowWidth - 5, windowHeight - 5); //TODO better way of ensuring scrollbars don't show up
  
  //layout
  imageMode(CENTER);
  angleMode(RADIANS);
  // textFont(font);
  textAlign(CENTER, CENTER);
  // strokeWeight(2);

} 

//
//  FUNCTIONS
//

function draw(){
  
}

//
//  MOUSE FUNCTIONS
//

// for clicking speed UI
function mouseClicked(){
  
}


//
//  SHOW FUNCTIONS
//


//
//  MISC FUNCTIONS
//
