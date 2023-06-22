/*
    ~ * ~ * ~ * 
    CLIENT
    ~ * ~ * ~ * 
*/

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

let flock = []; //the array of all pointers in the flock
let flockSize; //the quantity of pointers in the flock
let pointerSize = 18; //more or less exact size of my pointer, could fluctuate randomly TODO

//variables for storing and adjusting flocking options
let sliders = []; //overkill to store in array, but w/e, i love arrays
let sliderWidth; //size of the sliders and also the font size
let separationSlider, alignmentSlider, cohesionSlider, speedSlider, forceSlider, seekSlider, flockSlider, trailSlider;
let flockParams = {
  perceptionRadius: 100, //how close is considered in-flock
  maxSpeed: 20, //speed of movement
  maxForce: 0.02, //speed of change to movement
  desiredSeparation: pointerSize * 2, //how far apart should they want to be
  separationBias: 20, //how much they should want to be apart
  alignmentBias: 1, //how much they should want to move in the same direction
  cohesionBias: 0.2, //how much they should want to be close together
  seekBias: 1, //how much they should want to follow the mouse/nose
  flockSize: 50, //quantity of pointers
  trailAmount: 50, //the transparency of the background (adds trail)
}

//posenet stuff
let demoMode = true; //false when clouds, true when webcam
let demoCheckbox; //a checkbox for changing from mouse seek to nose seek
let video;
let poseNet;
let poses = [];
let nosePos;

//
//  ASSET LOAD
//

let pointer; //the loaded pointer png
let clouds; //the loaded background image
let cloudColor; //stores the color we're tinting the clouds
// let labelSize; //the font scale for the label text
let font; // the custom font

function preload() {
  pointer = loadImage("../assets/images/pointer.png");
  clouds = loadImage("../assets/images/clouds.jpg");
  font = loadFont("../assets/fonts/MochiyPopOne-Regular.ttf");
}


//
//  MAIN
//

function setup(){
  createCanvas(windowWidth - 5, windowHeight - 5); //TODO better way of ensuring scrollbars don't show up
  
  //layout
  imageMode(CENTER); //draws the image from center coordinates instead of corner
  textAlign(CENTER, BOTTOM); //aligns the text to the center horizontally, and to the bottom vertically
  textFont(font);
  noStroke();//removes the outline so the text isn't as thick
  colorMode(HSB);

  cloudColor = color("#93a808"); //idk i love this color
  cloudColor.setAlpha(flockParams.trailAmount); //adding transparency so we get some pointer trails when draw() loops
  
  //create some basic sliders so we can adjust the flock settings without changing the code 
  //each slider will update its corresponding part of the flockParams object
  //*NOTE: only for the single player mode*
  separationSlider = createSlider(0, 50, flockParams.separationBias, 0.1);
  separationSlider.changed(updateParams);
  alignmentSlider = createSlider(0, 5, flockParams.alignmentBias, 0.1);
  alignmentSlider.changed(updateParams);
  cohesionSlider = createSlider(0, 1, flockParams.cohesionBias, 0.01);
  cohesionSlider.changed(updateParams);
  speedSlider = createSlider(0.01, 30, flockParams.maxSpeed, 1);
  speedSlider.changed(updateParams);
  forceSlider = createSlider(0.01, 0.1, flockParams.maxForce, 0.01);
  forceSlider.changed(updateParams);
  seekSlider = createSlider(0, 3, flockParams.seekBias, 0.1);
  seekSlider.changed(updateParams);
  flockSlider = createSlider(1, 300, flockParams.flockSize, 1);
  flockSlider.changed(updateFlock);
  trailSlider = createSlider(0, 255, flockParams.trailAmount, 1);
  trailSlider.changed(()=>{cloudColor.setAlpha(trailSlider.value())});
  
  sliders.push(separationSlider, alignmentSlider, cohesionSlider, speedSlider, forceSlider, seekSlider, flockSlider, trailSlider);
  
  sliderWidth = width/(sliders.length+3);
  for (let i = 0; i < sliders.length; i++){
    sliders[i].class("sliders"); //give each slider the css class "sliders" from style.css
    //adjusting the size/position dynamically to fit different screens
    sliders[i].size(sliderWidth);
    sliders[i].position(((width/sliders.length)*i)+(sliderWidth/4), height - (height/15));
  }
  
  //create the flock
  for(i = 0; i < flockParams.flockSize; i++){
    let boidSize = random(pointerSize - 10, pointerSize + 8); //random size for each pointer
    let boidPos = createVector(random(0, width), random(0, height)); //storing position in a 2D Vector, TODO: use normalized (between 0-1) values for X and Y position so it scales to diff screen sizes
    let boidSpeed = random(-5, 5) + flockParams.maxSpeed; //slight variation in speed;
    
    flock.push(new Boid(boidSize, boidPos, boidSpeed, flockParams));
  }
  flockSize = flock.length;
  
  //font scale 
  textSize(sliderWidth/8); 
  
  //poseNet
  nosePos = createVector(width/2,height/2);
  video = createCapture(VIDEO);
  video.size(width, height);
  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);
  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on('pose', function(results) {
    poses = results;
    //need to get the xy of the nose
    nosePos.x = poses[0].pose.keypoints[0].position.x;
    nosePos.y = poses[0].pose.keypoints[0].position.y;

  });
  video.hide();
  
  //switches between demo modes
  demoCheckbox = createCheckbox("WEBCAM DEMO MODE", true);
  demoCheckbox.changed(()=>{demoMode = !demoMode});
  demoCheckbox.position(width/2, (height/15) * 13);
} 

//
//  FUNCTIONS
//

function draw() {
  // background("#93a808"); //not using background
  push(); //isolates the changes to just whatever comes before pop()
  tint(cloudColor);
  if (!demoMode){
    image(clouds, width/2, height/2, width, height); //using half the value of the dimensions because we're drawing the image from the center of the image, not the corner
  } else {
    image(video, width/2, height/2, width, height);
  }
  
  pop();
  image(pointer, mouseX + 3, mouseY + 5, pointerSize - 5, pointerSize - 5); //so we get a trail of our own pointer, size a little off rn
  
  //have the pointers look at the flock and the mouse, update each pointer, and then draw each pointer
  //unless webcam mode on, then do the same but for nose
  let mousePos;
  if (demoMode){
    mousePos = nosePos;
  } else {
    mousePos = createVector(mouseX, mouseY);
  }
  for (let boid of flock){
    boid.flock(flock, mousePos);
  }
  for (let boid of flock){
    boid.update();
    image(pointer, boid.pos.x, boid.pos.y, boid.size, boid.size);
  }
  
  // labels for the sliders -- layout super weird rn
  push();
  fill(0);
  text("SEPARATION", (sliderWidth/4)+(sliderWidth/2), height - (height/13));
  text("ALIGNMENT", (width/sliders.length)+(sliderWidth/4)+(sliderWidth/2), height - (height/13));
  text("COHESION", ((width/sliders.length)*2)+(sliderWidth/4)+(sliderWidth/2), height - (height/13));
  text("MAX SPEED", ((width/sliders.length)*3)+(sliderWidth/4)+(sliderWidth/2), height - (height/13));
  text("MAX FORCE", ((width/sliders.length)*4)+(sliderWidth/4)+(sliderWidth/2), height - (height/13));
  text("MOUSE SEEK", ((width/sliders.length)*5)+(sliderWidth/4)+(sliderWidth/2), height - (height/13));
  text("FLOCK SIZE", ((width/sliders.length)*6)+(sliderWidth/4)+(sliderWidth/2), height - (height/13));
  text("TRAIL FADE", ((width/sliders.length)*7)+(sliderWidth/4)+(sliderWidth/2), height - (height/13));
  pop();
}

function updateFlock(){
  flockParams.flockSize = flockSlider.value();
  if (flockParams.flockSize < flockSize){
    //if decreasing quantity, remove pointers from the flock
    flock = flock.slice(0, flockParams.flockSize);
    flockSize = flock.length;
  } else if (flockParams.flockSize > flockSize){
    //if increasing quantity, add new random pointers to the flock
    for(i = 0; i < flockParams.flockSize; i++){
      let boidSize = random(pointerSize - 10, pointerSize + 8); //random size for each pointer
      let boidPos = createVector(random(0, width), random(0, height)); //storing position in a 2D Vector, TODO: use normalized (between 0-1) values for X and Y position so it scales to diff screen sizes
      let boidSpeed = random(-5, 5) + flockParams.maxSpeed; //slight variation in speed;

      flock.push(new Boid(boidSize, boidPos, boidSpeed, flockParams));
    }
    flockSize = flock.length;
  }
  // updateParams();//needed?
}
function updateParams(){ //anytime a slider value is changed, update all the pointers
  flockParams.separationBias = separationSlider.value();
  flockParams.alignmentBias = alignmentSlider.value();
  flockParams.cohesionBias = cohesionSlider.value();
  flockParams.maxSpeed = speedSlider.value();
  flockParams.maxForce = forceSlider.value();
  flockParams.seekBias = seekSlider.value();
  
  for (let boid of flock){
    //prob a better way to do this but w/e, i've had a few cuba libres
    boid.separationBias = flockParams.separationBias;
    boid.alignmentBias = flockParams.alignmentBias;
    boid.cohesionBias = flockParams.cohesionBias;
    boid.maxSpeed = flockParams.maxSpeed;
    boid.maxForce = flockParams.maxForce;
    boid.seekBias = flockParams.seekBias;
  }
}

function modelReady(){
  console.log("model ready");
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
