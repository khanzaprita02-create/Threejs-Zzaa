import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ===== 1. Scene =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

// ===== 2. Camera =====
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(5, 2, 7);

// ===== 3. Renderer =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ===== 4. OrbitControls =====
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.7, 0);
controls.maxPolarAngle = Math.PI / 2 - 0.05; // kamera tidak tembus lantai
controls.minDistance = 3;
controls.maxDistance = 14;

// ===== 5. Lighting =====
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0x88ccff, 1.5);
fillLight.position.set(-5, 2, -5);
scene.add(fillLight);

// ===== 6. Podium showroom =====
const podium = new THREE.Mesh(
  new THREE.CylinderGeometry(3.2, 3.4, 0.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.35 })
);
podium.position.y = -0.1; // permukaan atas di y = 0
scene.add(podium);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(3.2, 0.03, 16, 100),
  new THREE.MeshStandardMaterial({ color: 0x5eead4, emissive: 0x5eead4, emissiveIntensity: 1.5 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.01;
scene.add(ring);

// ===== 7. Bintang background =====
const starCount = 800;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
  starPos[i] = (Math.random() - 0.5) * 120;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })
);
scene.add(stars);

// ===== 8. Load model BMW X6 =====
const loader = new GLTFLoader();
const carContainer = new THREE.Group();
scene.add(carContainer);

let isRotating = true;
const paintMaterials = [];
const loadingEl = document.getElementById('loading');

loader.load(
  '/models/bmw_x6.glb',
  function (gltf) {
    console.log('BMW X6 berhasil dimuat');
    const car = gltf.scene;
    carContainer.add(car);

    // Auto-center & auto-scale (sama seperti modul)
    const box = new THREE.Box3().setFromObject(car);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const targetSize = 4;
    const scale = targetSize / maxSize;

    car.scale.setScalar(scale);
    car.position.set(
      -center.x * scale,
      -box.min.y * scale, // bagian bawah mobil menempel di podium
      -center.z * scale
    );

    console.log('Ukuran mobil:', size);
    console.log('Scale mobil:', scale);

    // Cari material bodi untuk konfigurator warna
    const seen = new Set();
    car.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (!seen.has(m.uuid)) {
            seen.add(m.uuid);
            console.log('Material:', m.name);
          }
        });

        const isPaint = (m) => /paint|body|carpaint|exterior/i.test(m.name);
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => {
            if (isPaint(m)) {
              const c = m.clone();
              paintMaterials.push(c);
              return c;
            }
            return m;
          });
        } else if (isPaint(child.material)) {
          child.material = child.material.clone();
          paintMaterials.push(child.material);
        }
      }
    });

    console.log('Jumlah material cat ditemukan:', paintMaterials.length);
    loadingEl.classList.add('hide');
  },
  function (xhr) {
    if (xhr.total) {
      const percent = Math.round((xhr.loaded / xhr.total) * 100);
      loadingEl.textContent = `Memuat model... ${percent}%`;
    }
  },
  function (error) {
    console.error('Mobil gagal dimuat:', error);
    loadingEl.textContent = 'Gagal memuat model. Cek console.';
  }
);

// ===== 9. "Moon" = bola cahaya pengorbit =====
let angle = 0;

const moonGeometry = new THREE.SphereGeometry(0.15, 32, 32);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0x5eead4,
  emissive: 0x5eead4,
  emissiveIntensity: 2,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(3.5, 1.5, 0);
scene.add(moon);

const moonLight = new THREE.PointLight(0x5eead4, 15, 10);
moon.add(moonLight);

// ===== 10. Animasi / render loop =====
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (isRotating) {
    carContainer.rotation.y += 0.3 * delta;
  }

  // Orbit bola cahaya
  angle += 0.8 * delta;
  moon.position.x = Math.cos(angle) * 3.5;
  moon.position.z = Math.sin(angle) * 3.5;

  stars.rotation.y += 0.01 * delta;

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ===== 11. Interaksi: tombol Space =====
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    isRotating = !isRotating;
  }
});

// ===== 12. Konfigurator warna cat =====
document.querySelectorAll('#panel button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const color = new THREE.Color(btn.dataset.color);
    paintMaterials.forEach((m) => m.color.copy(color));
  });
});

// ===== 13. Responsive =====
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
})