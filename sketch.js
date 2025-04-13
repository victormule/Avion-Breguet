let objet3D;
let objet3D2;
let textureImage1;
let textureImage2;

// Variables pour la rotation
let angleY = 0;
let autoRotate = false;

function preload() {
  objet3D = loadModel('aviontest1.obj', true);
  objet3D2 = loadModel('aviontest2.obj', true);
  textureImage1 = loadImage('recto.png');
  textureImage2 = loadImage('verso.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  
  // --- Création du bouton ---
  let btn = createButton("Lancer/Stop rotation X");
  btn.position(10, 10); // position en pixels depuis le coin supérieur gauche
  btn.mousePressed(() => {
    autoRotate = !autoRotate; // on inverse l'état
  });
}

function draw() {
  background(200);
  orbitControl();

  // Lumière ambiante
  ambientLight(150);

  // Direction de la lumière selon la souris
  let dx = map(mouseX, 0, width, -5, 5);
  let dy = map(mouseY, 0, height, -5, 5);
  let dz = -1;
  let dx2 = map(mouseX, 0, width, -5, 5);
  let dy2 = map(mouseY, 0, height, -5, 5);
  let dz2 = 1;

  // --- Rotation automatique sur X ---
  if (autoRotate) {
    angleY += 0.005; // ajuste la vitesse si besoin
  }

  // Applique la rotation sur X, en plus de la rotation initiale
  rotateX(-250 +angleY);
  rotateY(29.8);


  // Objet 1
  push();
  directionalLight(255, 255, 255, dx2, dy2, dz2);
  texture(textureImage1);
  scale(2);
  translate(0, 2);
  model(objet3D);
  pop();

  // Objet 2
  push();
  directionalLight(255, 255, 255, dx, dy, dz);
  texture(textureImage2);
  scale(2);
  model(objet3D2);
  pop();
}


