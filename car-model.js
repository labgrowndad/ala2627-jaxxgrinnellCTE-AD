import * as THREE from './assets/three/build/three.module.js';
import { GLTFLoader } from './assets/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './assets/three/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector('#civic-canvas');
const loadingMessage = document.querySelector('#civic-loading');
const cameraResetButton = document.querySelector('#civic-camera-reset');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const controls = new OrbitControls(camera, canvas);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const garageCars = new THREE.Group();
const garageBays = [
  { carId: 'civicTypeR', x: -5.4 },
  { carId: 'hellcat', x: -1.8 },
  { carId: 'futureOne', x: 1.8 },
  { carId: 'futureTwo', x: 5.4 },
];
const garageModels = new Map();
let selectedGarageCar = 'civicTypeR';
let garageModelTemplate;
let hellcatModelTemplate;
const fixedCameraPosition = new THREE.Vector3(14, 6.5, -17);
const fixedCameraTarget = new THREE.Vector3(0, 0.2, 0.3);

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
scene.background = new THREE.Color('#11171c');

const hemiLight = new THREE.HemisphereLight('#dce8ef', '#11171c', 1.8);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight('#e8f3f8', 3.6);
keyLight.position.set(4, 7, 6);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight('#e60012', 1.1);
rimLight.position.set(-5, 3, -6);
scene.add(rimLight);

const garageLight = new THREE.PointLight('#dff3ff', 12, 12, 2);
garageLight.position.set(0, 5.8, 0.5);
scene.add(garageLight);

function createGarageFloorTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = '#626d72';
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = 'rgba(207, 220, 224, .22)';
  context.lineWidth = 4;
  for (let position = 0; position <= 512; position += 128) {
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, 512);
    context.stroke();
    context.beginPath();
    context.moveTo(0, position);
    context.lineTo(512, position);
    context.stroke();
  }
  context.fillStyle = 'rgba(255, 255, 255, .08)';
  for (let index = 0; index < 180; index += 1) {
    const x = (index * 83) % 512;
    const y = (index * 137) % 512;
    context.fillRect(x, y, 2, 2);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSurfaceTexture(baseColor, accentColor, pattern) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = baseColor;
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = accentColor;
  context.fillStyle = accentColor;
  context.lineWidth = 2;
  if (pattern === 'wall') {
    for (let position = 18; position < 256; position += 48) {
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, 256);
      context.stroke();
    }
    for (let position = 32; position < 256; position += 64) {
      context.fillRect(0, position, 256, 2);
    }
  }
  if (pattern === 'metal') {
    for (let position = -256; position < 512; position += 18) {
      context.beginPath();
      context.moveTo(position, 256);
      context.lineTo(position + 256, 0);
      context.stroke();
    }
  }
  if (pattern === 'rubber') {
    context.lineWidth = 8;
    for (let position = -256; position < 512; position += 30) {
      context.beginPath();
      context.moveTo(position, 256);
      context.lineTo(position + 256, 0);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const garageFloorTexture = createGarageFloorTexture();
const garageWallTexture = createSurfaceTexture('#20282e', 'rgba(104, 121, 130, .18)', 'wall');
const garageMetalTexture = createSurfaceTexture('#65727a', 'rgba(220, 232, 236, .16)', 'metal');
const garageRubberTexture = createSurfaceTexture('#11161a', 'rgba(76, 88, 94, .28)', 'rubber');
const garageMaterials = {
  wall: new THREE.MeshStandardMaterial({ map: garageWallTexture, roughness: 0.9 }),
  floor: new THREE.MeshStandardMaterial({ map: garageFloorTexture, roughness: 0.96 }),
  trim: new THREE.MeshStandardMaterial({ color: '#e60012', roughness: 0.55 }),
  metal: new THREE.MeshStandardMaterial({ map: garageMetalTexture, metalness: 0.55, roughness: 0.35 }),
  panel: new THREE.MeshStandardMaterial({ map: garageWallTexture, color: '#303b42', roughness: 0.78 }),
  rubber: new THREE.MeshStandardMaterial({ map: garageRubberTexture, roughness: 0.9 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#f3bd35', roughness: 0.6 }),
  white: new THREE.MeshStandardMaterial({ color: '#dce7eb', roughness: 0.55 }),
  orange: new THREE.MeshStandardMaterial({ color: '#e87532', roughness: 0.65 }),
  light: new THREE.MeshStandardMaterial({
    color: '#eaf8ff',
    emissive: '#eaf8ff',
    emissiveIntensity: 1.8,
  }),
};

function addGarageBox(size, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  scene.add(mesh);
}

function addRoundedGarageBox(size, position, material, radius = 0.08) {
  const [width, height, depth] = size;
  const corner = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + corner, -height / 2);
  shape.lineTo(width / 2 - corner, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + corner);
  shape.lineTo(width / 2, height / 2 - corner);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - corner, height / 2);
  shape.lineTo(-width / 2 + corner, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - corner);
  shape.lineTo(-width / 2, -height / 2 + corner);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + corner, -height / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: corner * 0.45,
    bevelThickness: corner * 0.45,
    curveSegments: 3,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  scene.add(mesh);
}

function addGarageTire(position, rotation = [0, 0, 0]) {
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.16, 12, 24), garageMaterials.rubber);
  tire.position.set(...position);
  tire.rotation.set(...rotation);
  scene.add(tire);
}

function addGarageCylinder(radius, height, position, material, rotation = [0, 0, 0]) {
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), material);
  cylinder.position.set(...position);
  cylinder.rotation.set(...rotation);
  scene.add(cylinder);
}

function addGarageCrane(position) {
  const crane = new THREE.Group();
  const addPart = (geometry, partPosition, material, rotation = [0, 0, 0]) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(...partPosition);
    part.rotation.set(...rotation);
    crane.add(part);
  };
  const beam = (size, partPosition, material, rotation = [0, 0, 0]) => {
    addPart(new THREE.BoxGeometry(...size), partPosition, material, rotation);
  };
  const cylinder = (radius, height, partPosition, material, rotation = [0, 0, 0]) => {
    addPart(new THREE.CylinderGeometry(radius, radius, height, 16), partPosition, material, rotation);
  };

  beam([0.22, 0.16, 2.7], [-0.55, 0.08, 0.25], garageMaterials.yellow);
  beam([0.22, 0.16, 2.7], [0.55, 0.08, 0.25], garageMaterials.yellow);
  beam([1.5, 0.16, 0.18], [0, 0.08, -1.05], garageMaterials.yellow);
  beam([1.5, 0.16, 0.18], [0, 0.08, 1.55], garageMaterials.yellow);
  beam([0.25, 2.8, 0.25], [0.55, 1.42, 1.25], garageMaterials.yellow);
  beam([0.3, 0.22, 0.3], [0.55, 2.85, 1.25], garageMaterials.metal);
  beam([2.5, 0.22, 0.25], [-0.65, 2.75, 1.25], garageMaterials.yellow, [0, 0, -0.04]);
  beam([0.28, 0.25, 0.3], [-1.9, 2.75, 1.25], garageMaterials.metal);
  cylinder(0.1, 1.65, [-0.1, 1.82, 1.25], garageMaterials.metal, [0, 0, -0.52]);
  cylinder(0.08, 0.8, [-1.9, 2.12, 1.25], garageMaterials.rubber);
  addPart(new THREE.TorusGeometry(0.18, 0.05, 10, 18, Math.PI * 1.55), [-1.9, 1.68, 1.25], garageMaterials.metal, [Math.PI / 2, 0, 0]);
  cylinder(0.28, 0.1, [-0.55, -0.02, -1.05], garageMaterials.rubber, [Math.PI / 2, 0, 0]);
  cylinder(0.28, 0.1, [0.55, -0.02, -1.05], garageMaterials.rubber, [Math.PI / 2, 0, 0]);
  cylinder(0.28, 0.1, [-0.55, -0.02, 1.55], garageMaterials.rubber, [Math.PI / 2, 0, 0]);
  cylinder(0.28, 0.1, [0.55, -0.02, 1.55], garageMaterials.rubber, [Math.PI / 2, 0, 0]);
  crane.position.set(...position);
  crane.scale.setScalar(1.45);
  scene.add(crane);
}

addGarageBox([18, 11, 0.25], [0, 4, 3.5], garageMaterials.wall);
addGarageBox([18, 0.12, 8], [0, -1.2, 0], garageMaterials.floor);
addGarageBox([0.25, 8, 8], [-8.2, 2.8, 0], garageMaterials.wall);
addGarageBox([0.25, 8, 8], [8.2, 2.8, 0], garageMaterials.wall);
addGarageBox([18, 0.2, 8], [0, 8.4, 0], garageMaterials.wall);
addGarageBox([0.28, 8, 0.4], [-6.8, 2.2, 2.8], garageMaterials.metal);
addGarageBox([0.28, 8, 0.4], [6.8, 2.2, 2.8], garageMaterials.metal);
addGarageBox([18, 0.16, 0.2], [0, 2.5, 3.3], garageMaterials.trim);
addGarageBox([18, 0.08, 0.12], [0, 0.4, 3.32], garageMaterials.metal);
addGarageBox([18, 0.08, 0.12], [0, 4.8, 3.32], garageMaterials.metal);
addGarageBox([18, 0.08, 0.12], [0, 7.2, 3.32], garageMaterials.metal);
addGarageBox([5.2, 0.12, 0.45], [0, 8.1, 2.8], garageMaterials.metal);
addGarageBox([4.2, 0.06, 0.5], [0, 8.0, 2.45], garageMaterials.light);

addGarageBox([0.08, 7.5, 0.12], [-4.6, 3.9, 3.31], garageMaterials.metal);
addGarageBox([0.08, 7.5, 0.12], [0, 3.9, 3.31], garageMaterials.metal);
addGarageBox([0.08, 7.5, 0.12], [4.6, 3.9, 3.31], garageMaterials.metal);
addGarageBox([17.2, 0.08, 0.12], [0, 6.9, 3.31], garageMaterials.metal);
addGarageBox([2.9, 2.4, 0.12], [5.4, 1.15, 3.3], garageMaterials.panel);
addGarageBox([3.2, 0.08, 0.16], [5.4, 2.4, 3.2], garageMaterials.trim);
addGarageBox([0.1, 2.6, 0.16], [3.9, 1.15, 3.2], garageMaterials.metal);
addGarageBox([0.1, 2.6, 0.16], [6.9, 1.15, 3.2], garageMaterials.metal);

addRoundedGarageBox([1.7, 1.8, 0.7], [-6.2, -0.15, 3.05], garageMaterials.panel, 0.12);
addRoundedGarageBox([1.85, 0.08, 0.75], [-6.2, 0.45, 2.68], garageMaterials.metal, 0.04);
addRoundedGarageBox([1.85, 0.08, 0.75], [-6.2, -0.1, 2.68], garageMaterials.metal, 0.04);
addRoundedGarageBox([2.2, 0.12, 0.8], [-5.8, 1.15, 3.05], garageMaterials.metal, 0.05);
addRoundedGarageBox([2.4, 0.12, 0.15], [-5.8, 2.1, 3.05], garageMaterials.yellow, 0.04);
addGarageTire([-5.5, 1.15, 3.55], [Math.PI / 2, 0, 0]);
addGarageTire([-6.5, 1.15, 3.55], [Math.PI / 2, 0, 0]);

addGarageBox([3.6, 0.08, 0.45], [-3.4, 7.95, 1.3], garageMaterials.light);
addGarageBox([3.6, 0.08, 0.45], [3.4, 7.95, 1.3], garageMaterials.light);
addGarageBox([0.18, 0.03, 2.2], [-3.4, -1.1, -1.2], garageMaterials.yellow);
addGarageBox([0.18, 0.03, 2.2], [3.4, -1.1, -1.2], garageMaterials.yellow);
addGarageBox([5.2, 0.03, 0.16], [0, -1.1, 2.1], garageMaterials.trim);

addGarageBox([0.18, 0.2, 7.2], [-5.2, 7.75, 0.2], garageMaterials.metal);
addGarageBox([0.18, 0.2, 7.2], [5.2, 7.75, 0.2], garageMaterials.metal);
addGarageBox([17, 0.12, 0.18], [0, 5.8, 3.2], garageMaterials.panel);
addGarageBox([17, 0.12, 0.18], [0, 6.3, 3.2], garageMaterials.metal);
addGarageBox([17, 0.12, 0.18], [0, 6.8, 3.2], garageMaterials.panel);
addGarageBox([17, 0.12, 0.18], [0, 7.3, 3.2], garageMaterials.metal);

addRoundedGarageBox([0.52, 4.5, 0.56], [-4.2, 1.1, 1.1], garageMaterials.yellow, 0.08);
addRoundedGarageBox([0.52, 4.5, 0.56], [4.2, 1.1, 1.1], garageMaterials.yellow, 0.08);
addGarageBox([0.56, 0.22, 0.6], [-4.2, 2.25, 1.1], garageMaterials.rubber);
addGarageBox([0.56, 0.22, 0.6], [4.2, 2.25, 1.1], garageMaterials.rubber);
addGarageBox([0.56, 0.22, 0.6], [-4.2, 1.2, 1.1], garageMaterials.rubber);
addGarageBox([0.56, 0.22, 0.6], [4.2, 1.2, 1.1], garageMaterials.rubber);
addGarageBox([0.7, 0.16, 0.86], [-4.2, 3.35, 1.1], garageMaterials.metal);
addGarageBox([0.7, 0.16, 0.86], [4.2, 3.35, 1.1], garageMaterials.metal);
addGarageCylinder(0.1, 2.2, [-4.2, 1.05, 1.1], garageMaterials.metal);
addGarageCylinder(0.1, 2.2, [4.2, 1.05, 1.1], garageMaterials.metal);
addGarageCylinder(0.13, 0.08, [-4.2, -1.12, 1.1], garageMaterials.metal, [Math.PI / 2, 0, 0]);
addGarageCylinder(0.13, 0.08, [4.2, -1.12, 1.1], garageMaterials.metal, [Math.PI / 2, 0, 0]);
addGarageCylinder(0.06, 0.1, [-4.2, 3.47, 0.88], garageMaterials.metal, [Math.PI / 2, 0, 0]);
addGarageCylinder(0.06, 0.1, [-4.2, 3.47, 1.32], garageMaterials.metal, [Math.PI / 2, 0, 0]);
addGarageCylinder(0.06, 0.1, [4.2, 3.47, 0.88], garageMaterials.metal, [Math.PI / 2, 0, 0]);
addGarageCylinder(0.06, 0.1, [4.2, 3.47, 1.32], garageMaterials.metal, [Math.PI / 2, 0, 0]);
addGarageCrane([4.6, -1.08, -1.8]);

addRoundedGarageBox([2.3, 2.1, 0.7], [-7.1, -0.15, 2.9], garageMaterials.panel, 0.12);
addRoundedGarageBox([2.5, 0.12, 0.8], [-7.1, 0.95, 2.9], garageMaterials.metal, 0.04);
addRoundedGarageBox([2.5, 0.1, 0.8], [-7.1, 1.65, 2.9], garageMaterials.metal, 0.04);
addGarageTire([-7.45, 2.45, 3.05], [Math.PI / 2, 0, 0]);
addGarageTire([-6.75, 2.45, 3.05], [Math.PI / 2, 0, 0]);
addGarageTire([-7.1, 3.15, 3.05], [Math.PI / 2, 0, 0]);

addGarageCylinder(0.18, 2.6, [-5.8, 0.1, -1.5], garageMaterials.orange);
addGarageCylinder(0.18, 2.6, [5.8, 0.1, -1.5], garageMaterials.orange);
addGarageBox([0.7, 0.08, 0.7], [-5.8, 1.38, -1.5], garageMaterials.yellow);
addGarageBox([0.7, 0.08, 0.7], [5.8, 1.38, -1.5], garageMaterials.yellow);
addGarageCylinder(0.25, 0.08, [-6.2, -1.05, -2.2], garageMaterials.orange);
addGarageCylinder(0.25, 0.08, [6.2, -1.05, -2.2], garageMaterials.orange);

addGarageBox([0.08, 1.6, 0.08], [-7.9, 3.9, 1.8], garageMaterials.light);
addGarageBox([0.08, 1.6, 0.08], [-7.9, 5.6, 1.8], garageMaterials.light);
addGarageBox([0.1, 1.6, 0.08], [7.9, 3.9, 1.8], garageMaterials.light);
addGarageBox([0.1, 1.6, 0.08], [7.9, 5.6, 1.8], garageMaterials.light);

camera.position.copy(fixedCameraPosition);
controls.target.copy(fixedCameraTarget);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 7;
controls.maxDistance = 22;
controls.maxPolarAngle = Math.PI * 0.48;
controls.update();

function getGarageState() {
  try {
    const savedGame = JSON.parse(localStorage.getItem('jaxx-civic-clicker') || '{}');
    return {
      selectedCar: savedGame.selectedCar || 'civicTypeR',
      cars: savedGame.cars || { civicTypeR: { owned: true } },
    };
  } catch {
    return { selectedCar: 'civicTypeR', cars: { civicTypeR: { owned: true } } };
  }
}

function createGarageBay(x, index) {
  addGarageBox([3.2, 0.05, 5.4], [x, -1.12, 0], garageMaterials.panel);
  addGarageBox([3.2, 0.04, 0.08], [x, -1.08, -2.7], garageMaterials.trim);
  addGarageBox([3.2, 0.04, 0.08], [x, -1.08, 2.7], garageMaterials.trim);
  addGarageBox([0.08, 0.04, 5.4], [x - 1.6, -1.08, 0], garageMaterials.metal);
  addGarageBox([0.08, 0.04, 5.4], [x + 1.6, -1.08, 0], garageMaterials.metal);
  addGarageBox([2.4, 0.03, 0.03], [x, -1.04, -2.15], garageMaterials.yellow);
  addGarageBox([2.4, 0.03, 0.03], [x, -1.04, 2.15], garageMaterials.yellow);
  addGarageBox([0.08, 0.08, 1.2], [x - 1.35, 1.2, 2.85], garageMaterials.light);
  addGarageBox([0.08, 0.08, 1.2], [x + 1.35, 1.2, 2.85], garageMaterials.light);
  addGarageBox([2.4, 0.08, 0.08], [x, 1.8, 2.85], garageMaterials.light);
  const bayMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 24),
    new THREE.MeshBasicMaterial({ color: index < 2 ? '#f3bd35' : '#65727a', side: THREE.DoubleSide }),
  );
  bayMarker.rotation.x = -Math.PI / 2;
  bayMarker.position.set(x, -1.01, -2.25);
  scene.add(bayMarker);
}

garageBays.forEach((bay, index) => createGarageBay(bay.x, index));
scene.add(garageCars);

function focusGarageCar(carId, notify = true, moveCamera = true) {
  const model = garageModels.get(carId);
  if (!model) return;
  selectedGarageCar = carId;
  controls.target.set(model.position.x, -0.15, model.position.z);
  if (moveCamera) camera.position.set(model.position.x + 6.4, 3.1, model.position.z - 7.6);
  controls.update();
  if (notify) window.dispatchEvent(new CustomEvent('garage-car-focused', { detail: { carId } }));
}

function resetGarageCamera() {
  camera.position.copy(fixedCameraPosition);
  controls.target.copy(fixedCameraTarget);
  controls.update();
}

function createHellcatModel() {
  const hellcat = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: '#b21f32', metalness: 0.55, roughness: 0.25 });
  const bodyDark = new THREE.MeshStandardMaterial({ color: '#68131f', metalness: 0.4, roughness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#152733', metalness: 0.35, roughness: 0.18 });
  const black = new THREE.MeshStandardMaterial({ color: '#080b0e', roughness: 0.72 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#aeb9bc', metalness: 0.92, roughness: 0.18 });
  const headlight = new THREE.MeshStandardMaterial({ color: '#dff8ff', emissive: '#bdefff', emissiveIntensity: 2 });
  const taillight = new THREE.MeshStandardMaterial({ color: '#ff263d', emissive: '#ff102b', emissiveIntensity: 1.8 });
  const rim = new THREE.MeshStandardMaterial({ color: '#9ca8ad', metalness: 0.85, roughness: 0.2 });

  const profile = (points, depth, position, material) => {
    const shape = new THREE.Shape();
    shape.moveTo(...points[0]);
    points.slice(1).forEach((point) => shape.lineTo(...point));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.07,
      bevelThickness: 0.06,
    });
    geometry.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    hellcat.add(mesh);
  };
  const box = (size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    hellcat.add(mesh);
  };

  profile([
    [-2.55, -0.32], [-2.48, 0.18], [-2.16, 0.48], [-1.42, 0.54], [-0.92, 0.98],
    [-0.25, 1.13], [0.5, 1.06], [1.02, 0.64], [1.85, 0.55], [2.48, 0.38],
    [2.58, -0.26],
  ], 1.94, [0, 0, 0], body);
  box([4.65, 0.18, 1.98], [0, -0.37, 0], black);
  profile([
    [-1.18, 0.68], [-0.82, 0.98], [-0.28, 1.07], [0.38, 1.01], [0.78, 0.68],
    [0.48, 0.6], [-1.02, 0.61],
  ], 0.06, [0, 0, 0.99], glass);
  profile([
    [-1.18, 0.68], [-0.82, 0.98], [-0.28, 1.07], [0.38, 1.01], [0.78, 0.68],
    [0.48, 0.6], [-1.02, 0.61],
  ], 0.06, [0, 0, -0.99], glass);
  box([0.11, 0.68, 2.02], [-2.55, 0.04, 0], black);
  box([0.12, 0.34, 1.45], [2.58, 0.12, 0], black);
  box([0.1, 0.22, 1.4], [2.65, 0.2, 0], chrome);
  box([0.08, 0.22, 0.52], [2.7, 0.2, -0.58], headlight);
  box([0.08, 0.22, 0.52], [2.7, 0.2, 0.58], headlight);
  box([0.08, 0.2, 1.35], [-2.62, 0.16, 0], taillight);
  box([2.75, 0.06, 0.14], [0.25, 0.42, 0], chrome);
  box([2.7, 0.045, 0.1], [0.25, 0.45, 0], black);
  box([1.4, 0.1, 0.18], [-1.05, 1.34, 0], black);
  box([0.12, 0.12, 1.6], [-1.75, 0.66, 0], bodyDark);
  box([0.42, 0.13, 1.55], [-1.55, 0.82, 0], body);

  [-1.45, 1.45].forEach((x) => {
    [-1.02, 1.02].forEach((z) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.28, 32), black);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, -0.3, z);
      hellcat.add(tire);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.3, 24), rim);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, -0.3, z);
      hellcat.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 16), chrome);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, -0.3, z);
      hellcat.add(hub);
    });
  });
  return hellcat;
}

function renderGarageCars() {
  garageCars.clear();
  garageModels.clear();
  const garageState = getGarageState();
  selectedGarageCar = garageState.selectedCar;
  garageBays.forEach((bay) => {
    const template = bay.carId === 'hellcat' ? hellcatModelTemplate : garageModelTemplate;
    if (!garageState.cars[bay.carId]?.owned || !template) return;
    const model = template.clone(true);
    fitModel(model);
    model.scale.multiplyScalar(bay.carId === 'hellcat' ? 0.82 : 0.68);
    model.rotation.y = bay.carId === 'hellcat' ? -Math.PI / 2 : 0;
    model.position.x = bay.x;
    model.position.z = 0;
    model.userData.carId = bay.carId;
    model.traverse((object) => {
      if (object.isMesh) object.userData.carId = bay.carId;
    });
    garageCars.add(model);
    garageModels.set(bay.carId, model);
  });
  if (!garageModels.has(selectedGarageCar)) selectedGarageCar = 'civicTypeR';
  if (garageModels.has(selectedGarageCar)) focusGarageCar(selectedGarageCar, false, false);
}

function fitModel(model) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 4.7 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  model.updateMatrixWorld(true);
  const groundedBounds = new THREE.Box3().setFromObject(model);
  model.position.y += -1.12 - groundedBounds.min.y;
  model.rotation.y = 0;
  model.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material.map) material.map.anisotropy = 4;
      if ('envMapIntensity' in material) material.envMapIntensity = 1.5;
    });
  });
}

new GLTFLoader().load(
  './assets/fl5.glb',
  (gltf) => {
    garageModelTemplate = gltf.scene;
    renderGarageCars();
    loadingMessage.hidden = true;
  },
  undefined,
  (error) => {
    console.error('Unable to load local Civic Type R model.', error);
    loadingMessage.textContent = 'Civic model could not load';
  }
);

new GLTFLoader().load(
  './assets/hellcat.glb',
  (gltf) => {
    hellcatModelTemplate = gltf.scene;
    renderGarageCars();
  },
  undefined,
  (error) => {
    console.error('Unable to load local Hellcat model.', error);
  }
);

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

canvas.addEventListener('pointerdown', (event) => {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const [hit] = raycaster.intersectObjects(garageCars.children, true);
  if (hit?.object.userData.carId) focusGarageCar(hit.object.userData.carId);
});

window.addEventListener('civic-garage-updated', renderGarageCars);
cameraResetButton.addEventListener('click', resetGarageCamera);

new ResizeObserver(resize).observe(canvas);
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
