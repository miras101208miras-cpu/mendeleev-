// 3D Interactive Periodic Table of Elements (with Secret SARA Layout)
// Powered by Three.js CSS3DRenderer & TWEEN.js

let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [], secret: [] };
let currentLayout = 'table';

// Category Russian translations
const CATEGORY_NAMES_RU = {
    "nonmetal": "Неметалл",
    "noble": "Благородный газ",
    "alkali": "Щелочной металл",
    "alkaline-earth": "Щелочноземельный",
    "metalloid": "Полуметалл",
    "halogen": "Галоген",
    "transition": "Переходный металл",
    "post-transition": "Постпереходный металл",
    "lanthanide": "Лантаноид",
    "actinide": "Актиноид"
};

// Letter point coordinates for S, A, R, A (28 + 30 + 30 + 30 = 118 exact points)
const SARA_LETTERS = {
    S: [
        [1,0],[2,0],[3,0],[4,0],
        [0,1],[1,1],[4,1],[5,1],
        [0,2],[1,2],
        [0,3],[1,3],
        [1,4],[2,4],[3,4],[4,4],
        [4,5],[5,5],
        [4,6],[5,6],
        [0,7],[1,7],[4,7],[5,7],
        [1,8],[2,8],[3,8],[4,8]
    ], // 28
    A1: [
        [2,0],[3,0],
        [1,1],[2,1],[3,1],[4,1],
        [1,2],[4,2],
        [0,3],[1,3],[4,3],[5,3],
        [0,4],[5,4],
        [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],
        [0,6],[1,6],[4,6],[5,6],
        [0,7],[1,7],[4,7],[5,7],
        [0,8],[5,8]
    ], // 30
    R: [
        [0,0],[1,0],[2,0],[3,0],[4,0],
        [0,1],[1,1],[4,1],[5,1],
        [0,2],[1,2],[4,2],[5,2],
        [0,3],[1,3],[2,3],[3,3],[4,3],
        [0,4],[1,4],[3,4],[4,4],
        [0,5],[1,5],[3,5],[4,5],
        [0,6],[1,6],[4,6],[5,6],
        [0,7],[1,7],[4,7],[5,7],
        [0,8],[1,8],[5,8]
    ], // 30
    A2: [
        [2,0],[3,0],
        [1,1],[2,1],[3,1],[4,1],
        [1,2],[4,2],
        [0,3],[1,3],[4,3],[5,3],
        [0,4],[5,4],
        [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],
        [0,6],[1,6],[4,6],[5,6],
        [0,7],[1,7],[4,7],[5,7],
        [0,8],[5,8]
    ]  // 30
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
    initStarfield();
    animate();
    initControlsUI();
    initModal();
    initSearch();
});

function init() {
    const container = document.getElementById('container');

    // Camera setup
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 2500;

    // Scene
    scene = new THREE.Scene();

    // Build 118 3D Elements
    ELEMENTS_DATA.forEach((item, i) => {
        const element = document.createElement('div');
        element.className = 'element-card';
        element.setAttribute('data-cat', item.category);
        element.setAttribute('data-index', i);

        element.innerHTML = `
            <div class="card-header">
                <span class="card-number">${item.number}</span>
                <span class="card-mass">${item.mass}</span>
            </div>
            <div class="card-symbol">${item.symbol}</div>
            <div class="card-footer">
                <div class="card-name">${item.name_ru}</div>
                <span class="card-cat-badge">${CATEGORY_NAMES_RU[item.category] || item.category}</span>
            </div>
        `;

        // Card Click Event: Open Details Modal
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.soundFX) window.soundFX.playClick();
            openElementModal(item);
        });

        const objectCSS = new THREE.CSS3DObject(element);
        // Start randomly scattered in space for entrance animation
        objectCSS.position.x = Math.random() * 4000 - 2000;
        objectCSS.position.y = Math.random() * 4000 - 2000;
        objectCSS.position.z = Math.random() * 4000 - 2000;

        scene.add(objectCSS);
        objects.push(objectCSS);
    });

    // 1. Calculate TABLE layout targets
    ELEMENTS_DATA.forEach((item) => {
        const object = new THREE.Object3D();
        object.position.x = (item.col * 140) - 1330;
        object.position.y = -(item.row * 180) + 990;
        object.position.z = 0;
        targets.table.push(object);
    });

    // 2. Calculate SPHERE layout targets (Fibonacci sphere distribution)
    const vector = new THREE.Vector3();
    const l = objects.length;
    for (let i = 0; i < l; i++) {
        const phi = Math.acos(-1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;

        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords(800, phi, theta);

        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);

        targets.sphere.push(object);
    }

    // 3. Calculate HELIX layout targets (as seen in the TikTok video)
    for (let i = 0; i < l; i++) {
        const theta = i * 0.175 + Math.PI;
        const y = -(i * 8) + 450;

        const object = new THREE.Object3D();
        object.position.setFromCylindricalCoords(900, theta, y);

        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;
        object.lookAt(vector);

        targets.helix.push(object);
    }

    // 4. Calculate GRID layout targets (5x5x5 cube)
    for (let i = 0; i < l; i++) {
        const object = new THREE.Object3D();
        object.position.x = (i % 5) * 400 - 800;
        object.position.y = (-(Math.floor(i / 5) % 5) * 400) + 800;
        object.position.z = (Math.floor(i / 25)) * 1000 - 2000;
        targets.grid.push(object);
    }

    // 5. Calculate SECRET layout targets (Word "S A R A")
    const letterKeys = ['S', 'A1', 'R', 'A2'];
    const letterOffsets = [-980, -330, 330, 980];
    let secretIndex = 0;

    letterKeys.forEach((key, kIdx) => {
        const pts = SARA_LETTERS[key];
        const offX = letterOffsets[kIdx];

        pts.forEach(([gridX, gridY]) => {
            if (secretIndex < l) {
                const object = new THREE.Object3D();
                // Map grid (0..5, 0..8) to 3D world units
                object.position.x = offX + (gridX - 2.5) * 95;
                object.position.y = (4 - gridY) * 115;
                object.position.z = (Math.sin(gridX * 0.8 + gridY * 0.5) * 35); // Subtle 3D wave curve

                object.rotation.set(0, 0, 0); // Directly face the camera
                targets.secret.push(object);
                secretIndex++;
            }
        });
    });

    // Renderer setup
    renderer = new THREE.CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Trackball Controls
    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.15;

    // Window Resize
    window.addEventListener('resize', onWindowResize);

    // Start with Table layout animation
    transform(targets.table, 2000);
}

// 3D Smooth Layout Transition using TWEEN
function transform(targetList, duration = 2000) {
    TWEEN.removeAll();

    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targetList[i];

        if (!target) continue;

        new TWEEN.Tween(object.position)
            .to({
                x: target.position.x,
                y: target.position.y,
                z: target.position.z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(object.rotation)
            .to({
                x: target.rotation.x,
                y: target.rotation.y,
                z: target.rotation.z
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    }

    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();

    // Gentle float effect in Secret mode
    if (currentLayout === 'secret') {
        const time = Date.now() * 0.0015;
        objects.forEach((obj, idx) => {
            obj.position.z = Math.sin(time + idx * 0.2) * 20;
        });
    }

    render();
}

function render() {
    renderer.render(scene, camera);
}

// --- Menu Navigation & Controls ---

function initControlsUI() {
    const buttons = {
        table: document.getElementById('table-btn'),
        sphere: document.getElementById('sphere-btn'),
        helix: document.getElementById('helix-btn'),
        grid: document.getElementById('grid-btn'),
        secret: document.getElementById('secret-btn'),
    };

    function setActiveBtn(activeKey) {
        Object.entries(buttons).forEach(([key, btn]) => {
            btn.classList.toggle('active', key === activeKey);
            btn.setAttribute('aria-selected', key === activeKey);
        });
    }

    function switchLayout(layoutName, duration = 2000) {
        currentLayout = layoutName;
        setActiveBtn(layoutName);

        if (layoutName === 'secret') {
            document.body.classList.add('secret-mode-active');
            if (window.soundFX) window.soundFX.playSecret();

            // Smoothly move camera straight in front of SARA
            new TWEEN.Tween(camera.position)
                .to({ x: 0, y: 0, z: 2700 }, 1500)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
            controls.reset();
        } else {
            document.body.classList.remove('secret-mode-active');
            if (window.soundFX) window.soundFX.playWhoosh();
        }

        transform(targets[layoutName], duration);
    }

    buttons.table.addEventListener('click', () => switchLayout('table'));
    buttons.sphere.addEventListener('click', () => switchLayout('sphere'));
    buttons.helix.addEventListener('click', () => switchLayout('helix'));
    buttons.grid.addEventListener('click', () => switchLayout('grid'));
    buttons.secret.addEventListener('click', () => switchLayout('secret'));

    // Sound Toggle
    const soundBtn = document.getElementById('sound-btn');
    soundBtn.addEventListener('click', () => {
        const enabled = window.soundFX.toggle();
        soundBtn.textContent = enabled ? '🔊' : '🔇';
    });

    // Reset Camera Button
    const resetCamBtn = document.getElementById('reset-cam-btn');
    resetCamBtn.addEventListener('click', () => {
        if (window.soundFX) window.soundFX.playClick();
        new TWEEN.Tween(camera.position)
            .to({ x: 0, y: 0, z: currentLayout === 'secret' ? 2700 : 2500 }, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
        controls.reset();
    });
}

// --- Detail Modal Dialog (Modern Web Best Practices) ---

function initModal() {
    const dialog = document.getElementById('element-dialog');
    const closeBtn = document.getElementById('dialog-close-btn');

    // Close when clicking the close button
    closeBtn.addEventListener('click', () => {
        dialog.close();
    });

    // Light dismiss: close when clicking on the backdrop
    dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
            rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
            dialog.close();
        }
    });
}

function openElementModal(item) {
    const dialog = document.getElementById('element-dialog');

    document.getElementById('dialog-num').textContent = item.number;
    document.getElementById('dialog-sym').textContent = item.symbol;
    document.getElementById('dialog-element-title').textContent = item.name_ru;
    document.getElementById('dialog-en-name').textContent = item.name;
    document.getElementById('dialog-cat').textContent = CATEGORY_NAMES_RU[item.category] || item.category;
    document.getElementById('dialog-mass').textContent = `${item.mass} а.е.м.`;
    document.getElementById('dialog-position').textContent = `Период ${item.row}, Группа ${item.col}`;
    document.getElementById('dialog-desc').textContent = item.desc;

    // Set dynamic category accent color on dialog
    const colorVar = getComputedStyle(document.documentElement).getPropertyValue(`--cat-${item.category}`).trim();
    dialog.style.setProperty('--modal-cat-color', colorVar || '#00ffcc');

    dialog.showModal();
}

// --- Real-time Search & Filter ---

function initSearch() {
    const searchInput = document.getElementById('element-search');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        objects.forEach((obj, idx) => {
            const data = ELEMENTS_DATA[idx];
            const cardEl = obj.element;

            if (!query) {
                cardEl.classList.remove('is-dimmed', 'is-highlighted');
                return;
            }

            const matches = (
                data.symbol.toLowerCase() === query ||
                data.symbol.toLowerCase().startsWith(query) ||
                data.name.toLowerCase().includes(query) ||
                data.name_ru.toLowerCase().includes(query) ||
                data.number.toString() === query
            );

            if (matches) {
                cardEl.classList.remove('is-dimmed');
                cardEl.classList.add('is-highlighted');
            } else {
                cardEl.classList.add('is-dimmed');
                cardEl.classList.remove('is-highlighted');
            }
        });
    });

    // Pressing enter zooms into first matching element
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstMatch = objects.find(obj => obj.element.classList.contains('is-highlighted'));
            if (firstMatch) {
                new TWEEN.Tween(camera.position)
                    .to({
                        x: firstMatch.position.x,
                        y: firstMatch.position.y,
                        z: firstMatch.position.z + 600
                    }, 1000)
                    .easing(TWEEN.Easing.Cubic.Out)
                    .start();
                controls.target.copy(firstMatch.position);
            }
        }
    });
}

// --- Dynamic Cosmic Starfield & Floating Hearts in Secret Mode ---

function initStarfield() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    });

    const numStars = 160;
    const stars = Array.from({ length: numStars }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.3 + 0.05
    }));

    const hearts = [];

    function renderStarfield() {
        ctx.clearRect(0, 0, w, h);

        const isSecret = document.body.classList.contains('secret-mode-active');

        // Draw Stars
        stars.forEach(star => {
            star.y -= star.speed;
            if (star.y < 0) {
                star.y = h;
                star.x = Math.random() * w;
            }

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = isSecret
                ? `rgba(255, 180, 220, ${star.alpha})`
                : `rgba(180, 240, 255, ${star.alpha})`;
            ctx.fill();
        });

        // Spawn occasional romantic hearts in secret mode
        if (isSecret && Math.random() < 0.06 && hearts.length < 35) {
            hearts.push({
                x: Math.random() * w,
                y: h + 20,
                size: Math.random() * 14 + 10,
                speedY: Math.random() * 1.5 + 0.8,
                speedX: (Math.random() - 0.5) * 0.6,
                alpha: 0.8,
                rotation: (Math.random() - 0.5) * 0.4
            });
        }

        // Draw and update hearts
        for (let i = hearts.length - 1; i >= 0; i--) {
            const ht = hearts[i];
            ht.y -= ht.speedY;
            ht.x += ht.speedX;
            ht.alpha -= 0.003;

            if (ht.alpha <= 0 || ht.y < -30) {
                hearts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(ht.x, ht.y);
            ctx.rotate(ht.rotation);
            ctx.fillStyle = `rgba(255, 105, 180, ${ht.alpha})`;
            ctx.beginPath();
            const topCurveHeight = ht.size * 0.3;
            ctx.moveTo(0, topCurveHeight);
            ctx.bezierCurveTo(0, 0, -ht.size / 2, 0, -ht.size / 2, topCurveHeight);
            ctx.bezierCurveTo(-ht.size / 2, (ht.size + topCurveHeight) / 2, 0, (ht.size + topCurveHeight) / 2, 0, ht.size);
            ctx.bezierCurveTo(0, (ht.size + topCurveHeight) / 2, ht.size / 2, (ht.size + topCurveHeight) / 2, ht.size / 2, topCurveHeight);
            ctx.bezierCurveTo(ht.size / 2, 0, 0, 0, 0, topCurveHeight);
            ctx.fill();
            ctx.restore();
        }

        requestAnimationFrame(renderStarfield);
    }

    renderStarfield();
}
