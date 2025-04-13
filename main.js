import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Initialisation de la scène
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const followLight = new THREE.DirectionalLight(0xffffff, 2);
scene.add(followLight);

const lightTarget = new THREE.Object3D();
scene.add(lightTarget);
followLight.target = lightTarget;

// Contrôles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Sélection des éléments UI
const intensitySlider = document.getElementById('lightIntensity');
const backgroundSlider = document.getElementById('backgroundSlider');
const toggleBtn = document.getElementById('toggleTexture');
const toggleAnnotationsBtn = document.getElementById('toggleAnnotations');
const exportAnnotationsBtn = document.getElementById('exportAnnotations');

// Variables globales
let model3D = null;
let isTextured = true;
let annotationsVisible = true;
const originalMaterials = [];
const annotations = [];
const mouse = new THREE.Vector2();

// GLTF Loader
const loader = new GLTFLoader();
loader.load(
  'models/avion test.glb',
  (gltf) => {
    model3D = gltf.scene;
    model3D.traverse((child) => {
      if (child.isMesh) {
        originalMaterials.push({ mesh: child, material: child.material });
      }
    });
    scene.add(model3D);
    loadAnnotationsFromLocalStorage();
  },
  undefined,
  (error) => console.error('Erreur de chargement :', error)
);

// Gestion sliders
intensitySlider.addEventListener('input', () => {
  followLight.intensity = parseFloat(intensitySlider.value);
});

backgroundSlider.addEventListener('input', () => {
  const val = parseFloat(backgroundSlider.value);
  scene.background = new THREE.Color(val, val, val);
});

// Bascule texture
toggleBtn.addEventListener('click', () => {
  if (!model3D) return;
  isTextured = !isTextured;
  model3D.traverse((child) => {
    if (child.isMesh) {
      if (isTextured) {
        const original = originalMaterials.find(o => o.mesh === child);
        if (original) child.material = original.material;
      } else {
        child.material = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true });
      }
    }
  });
});

// Bascule annotations
toggleAnnotationsBtn.addEventListener('click', () => {
  annotationsVisible = !annotationsVisible;
  toggleAnnotationsBtn.textContent = annotationsVisible ? 'Masquer les annotations' : 'Afficher les annotations';
  updateAnnotationVisibility();
});

function updateAnnotationVisibility() {
  annotations.forEach(a => a.mesh.visible = annotationsVisible);
}

// Export JSON
exportAnnotationsBtn.addEventListener('click', () => {
  const data = annotations.map(a => ({
    text: a.text,
    position: a.position
  }));

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'annotations.json';
  a.click();

  URL.revokeObjectURL(url);
});

// Import JSON des annotations
const importInput = document.getElementById('importAnnotations');

importInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const json = e.target.result;
    try {
      const data = JSON.parse(json);

      // Supprime les annotations actuelles
      annotations.forEach(a => scene.remove(a.mesh));
      annotations.length = 0;

      // Ajoute celles du fichier
      data.forEach(({ text, position }) => {
        const pos = new THREE.Vector3(position.x, position.y, position.z);
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        sphere.position.copy(pos);
        scene.add(sphere);
        annotations.push({ mesh: sphere, text, position: pos });
      });

      saveAnnotationsToLocalStorage(); // Met à jour le stockage local
      updateAnnotationVisibility();    // Respecte l’état visible/masqué

    } catch (err) {
      alert('Fichier invalide : ' + err.message);
    }
  };

  reader.readAsText(file);
});

// Suivi souris
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Clic droit pour annotation
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  if (model3D) {
    const intersects = raycaster.intersectObject(model3D, true);
    if (intersects.length > 0) {
      addAnnotation(intersects[0].point, event.clientX, event.clientY);
    }
  }
});

// Clic gauche pour voir/modifier/supprimer une annotation
window.addEventListener('click', (event) => {
  if (!annotationsVisible) return;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const clicked = raycaster.intersectObjects(annotations.map(a => a.mesh));
  if (clicked.length > 0) {
    const clickedMesh = clicked[0].object;
    const annotation = annotations.find(a => a.mesh === clickedMesh);
    if (annotation) {
      showAnnotationPopup(annotation.text, event.clientX, event.clientY, annotation);
    }
  }
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const point = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(10));
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);

  followLight.position.copy(camera.position).add(camDir.multiplyScalar(5));
  lightTarget.position.copy(point);
  followLight.target.updateMatrixWorld();

  renderer.render(scene, camera);
}
animate();

// Ajouter une annotation
function addAnnotation(position, screenX, screenY) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  sphere.position.copy(position);
  scene.add(sphere);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Annotation...';
  Object.assign(input.style, {
    position: 'absolute',
    left: `${screenX}px`,
    top: `${screenY}px`,
    zIndex: 20,
    padding: '4px',
    border: '1px solid #ccc',
    background: 'white'
  });
  document.body.appendChild(input);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = input.value;
      input.remove();
      annotations.push({ mesh: sphere, text, position });
      saveAnnotationsToLocalStorage();
    }
  });
}

// Affiche, modifie ou supprime une annotation
function showAnnotationPopup(text, x, y, annotationObj = null) {
  // Supprime les anciennes popups
  document.querySelectorAll('.annotation-popup').forEach(el => el.remove());

  // Créer le conteneur de la popup
  const container = document.createElement('div');
  container.className = 'annotation-popup';
  Object.assign(container.style, {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    background: 'rgba(255, 255, 255, 0.9)', // Légèrement translucide
    padding: '10px 10px 10px 10px',
    border: '1px solid #444',
    borderRadius: '8px',
    zIndex: 30,
    maxWidth: '300px', // Si le texte dépasse, il se retourne à la ligne
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
    pointerEvents: 'auto',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#333'
  });

  // Bouton de fermeture (croix)
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✖';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '4px',
    right: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#888'
  });
  closeBtn.addEventListener('click', () => {
    container.remove();
  });
  container.appendChild(closeBtn);

  // Contenu texte avec marges pour ne pas être recouvert par la croix
  const textParagraph = document.createElement('p');
  textParagraph.textContent = text;
  Object.assign(textParagraph.style, {
    margin: '20px 0 5px 0',
    wordWrap: 'break-word'
  });
  container.appendChild(textParagraph);

  // Bouton de modification
  const editBtn = document.createElement('button');
  editBtn.textContent = '✏️';
  Object.assign(editBtn.style, {
    marginRight: '4px',
    cursor: 'pointer'
  });
  editBtn.addEventListener('click', () => {
    const newText = prompt('Modifier l’annotation :', text);
    if (newText !== null && annotationObj) {
      annotationObj.text = newText;
      saveAnnotationsToLocalStorage();
      container.remove();
    }
  });
  container.appendChild(editBtn);

  // Bouton de suppression
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  Object.assign(deleteBtn.style, {
    cursor: 'pointer'
  });
  deleteBtn.addEventListener('click', () => {
    if (annotationObj) {
      scene.remove(annotationObj.mesh);
      const index = annotations.indexOf(annotationObj);
      if (index !== -1) annotations.splice(index, 1);
      saveAnnotationsToLocalStorage();
      container.remove();
    }
  });
  container.appendChild(deleteBtn);

  // Ajouter la popup dans le document
  document.body.appendChild(container);

  // Fermer en cliquant ailleurs (hors de la popup)
  const outsideClick = (e) => {
    if (!container.contains(e.target)) {
      container.remove();
      document.removeEventListener('click', outsideClick);
    }
  };
  // Attendre un court instant pour éviter la fermeture immédiate sur le clic initial
  setTimeout(() => document.addEventListener('click', outsideClick), 50);
}



// Enregistrement dans localStorage
function saveAnnotationsToLocalStorage() {
  const data = annotations.map(a => ({ text: a.text, position: a.position }));
  localStorage.setItem('annotations', JSON.stringify(data));
}

// Chargement depuis localStorage
function loadAnnotationsFromLocalStorage() {
  const data = JSON.parse(localStorage.getItem('annotations') || '[]');
  data.forEach(({ text, position }) => {
    const pos = new THREE.Vector3(position.x, position.y, position.z);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    sphere.position.copy(pos);
    scene.add(sphere);
    annotations.push({ mesh: sphere, text, position: pos });
  });
  updateAnnotationVisibility();
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
