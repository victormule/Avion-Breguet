// Importation des modules depuis Three.js
import * as THREE from 'three'; // Le cœur de Three.js : scènes, caméras, lumières, objets...
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // Permet de faire tourner/zoomer la caméra avec la souris
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'; // Charge les fichiers .glb / .gltf (modèles 3D)

// Création de la scène 3D
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd); // Couleur de fond gris clair

// Création d'une caméra perspective
const camera = new THREE.PerspectiveCamera(
  75, // Champ de vision (FOV)
  window.innerWidth / window.innerHeight, // Ratio de l'écran
  0.1, // Distance minimale visible
  1000 // Distance maximale visible
);
camera.position.set(0, 2, 5); // Position initiale de la caméra (x, y, z)

// Création du moteur de rendu WebGL
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Antialias = bords lissés
renderer.setSize(window.innerWidth, window.innerHeight); // Taille du rendu = taille de la fenêtre
document.body.appendChild(renderer.domElement); // Ajout du canvas au document HTML

// Ajout d'une lumière ambiante (éclaire tout uniformément, sans direction)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Couleur blanche, intensité faible
scene.add(ambientLight);

// Création d'une lumière directionnelle (comme le soleil, éclaire dans une direction)
const followLight = new THREE.DirectionalLight(0xffffff, 2); // Lumière blanche, intensité forte
scene.add(followLight);

// Objet cible que la lumière va "viser" (il faut le placer dans la scène)
const lightTarget = new THREE.Object3D(); // Objet vide servant de point de visée
scene.add(lightTarget);
followLight.target = lightTarget; // On dit à la lumière de viser cet objet

// Ajout des contrôles de la caméra avec la souris (rotation, zoom, déplacement)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Rend les mouvements plus fluides

// Slider pour ajuster l'intensité de la lumière
const intensitySlider = document.getElementById('lightIntensity');
intensitySlider.addEventListener('input', () => {
  followLight.intensity = parseFloat(intensitySlider.value);
});

// Slider pour ajuster la couleur de fond (de blanc à noir)
const backgroundSlider = document.getElementById('backgroundSlider');
backgroundSlider.addEventListener('input', () => {
  const value = parseFloat(backgroundSlider.value);
  // On interpole entre blanc (1,1,1) et noir (0,0,0)
  const color = new THREE.Color(value, value, value);
  scene.background = color;
});

// Chargement d'un modèle 3D au format GLB (GLTF binaire)
const loader = new GLTFLoader();
loader.load(
  'models/avion test.glb', // Chemin vers le modèle
  (gltf) => {
    scene.add(gltf.scene); // Une fois chargé, on ajoute le modèle à la scène
  },
  undefined, // Fonction optionnelle de progression
  (error) => {
    console.error('Erreur de chargement :', error); // En cas d'erreur, on affiche un message
  }
);

// Vecteur pour stocker la position de la souris
const mouse = new THREE.Vector2();

// Événement de mouvement de souris
window.addEventListener('mousemove', (event) => {
  // Conversion des coordonnées pixel en coordonnées normalisées (-1 à +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Fonction d'animation appelée à chaque frame (~60 fois par seconde)
function animate() {
  requestAnimationFrame(animate); // Boucle infinie
  controls.update(); // Mise à jour des contrôles de caméra

  // Création d'un rayon depuis la souris vers la scène
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera); // Rayon depuis la position de la souris à partir de la caméra

  // Point situé à 10 unités dans la direction pointée par la souris
  const targetPos = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(10));

  // On veut que la lumière reste à 5 unités devant la caméra (dans sa direction)
  const lightOffset = 5;
  const cameraDir = new THREE.Vector3(); // Direction vers laquelle la caméra regarde
  camera.getWorldDirection(cameraDir); // Stocke la direction de la caméra dans cameraDir

  // Place la lumière à 5 unités devant la caméra
  followLight.position.copy(camera.position).add(cameraDir.clone().multiplyScalar(lightOffset));

  // Déplace la cible de la lumière vers l'endroit pointé par la souris
  lightTarget.position.copy(targetPos);
  followLight.target.updateMatrixWorld(); // Obligatoire pour que le changement soit pris en compte

  // Rendu de la scène avec la caméra
  renderer.render(scene, camera);
}
animate(); // Démarre la boucle d'animation

// Si la fenêtre est redimensionnée, on ajuste la caméra et le rendu
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; // Met à jour le ratio
  camera.updateProjectionMatrix(); // Recalcule la matrice de projection
  renderer.setSize(window.innerWidth, window.innerHeight); // Redimensionne le rendu
});
