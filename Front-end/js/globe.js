import { destinations } from '../data/destinations.js';
import { trips } from '../data/trips.js';
import { read } from './storage.js';
import { buildJourneyMapData } from './journey-routes.mjs';

const EARTH_RADIUS = 1;
const MARKER_RADIUS = 1.018;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let THREE;

function earthPoint([longitude, latitude], radius = EARTH_RADIUS) {
    const longitudeRadians = THREE.MathUtils.degToRad(longitude);
    const latitudeRadians = THREE.MathUtils.degToRad(latitude);
    const latitudeRadius = Math.cos(latitudeRadians) * radius;
    return new THREE.Vector3(
        latitudeRadius * Math.cos(longitudeRadians),
        Math.sin(latitudeRadians) * radius,
        -latitudeRadius * Math.sin(longitudeRadians)
    );
}

function renderJourneyList(list, visits, globe) {
    if (!list) return;
    list.replaceChildren();

    visits.forEach((visit, index) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'globe-route-stop';

        const number = document.createElement('span');
        number.className = 'globe-route-stop-number';
        number.textContent = String(index + 1).padStart(2, '0');

        const place = document.createElement('span');
        place.className = 'globe-route-stop-place';
        const name = document.createElement('strong');
        name.textContent = visit.destination.name;
        const country = document.createElement('small');
        country.textContent = visit.destination.country;
        place.append(name, country);

        const date = document.createElement('time');
        date.className = 'globe-route-stop-date';
        if (visit.date) {
            date.dateTime = visit.date;
            date.textContent = new Date(`${visit.date}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric'
            });
        } else {
            date.textContent = 'Date not set';
        }

        button.append(number, place, date);
        button.addEventListener('click', () => globe.focusOn(visit));
        item.append(button);
        list.append(item);
    });
}

function createLabel(visit) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser could not create a destination label.');

    context.fillStyle = 'rgba(7, 18, 24, 0.84)';
    context.beginPath();
    context.roundRect(5, 5, 502, 102, 48);
    context.fill();
    context.strokeStyle = visit.state === 'visited' ? '#69d4a0' : '#f0bd62';
    context.lineWidth = 5;
    context.stroke();
    context.fillStyle = '#fffaf0';
    context.font = '600 38px Inter, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(visit.destination.name, 256, 57, 455);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
        depthWrite: false
    }));
    sprite.scale.set(0.52, 0.114, 1);
    return sprite;
}

function routeLines(routes) {
    return routes.flatMap(route => {
        const coordinateLines = route.geometry.type === 'MultiLineString'
            ? route.geometry.coordinates
            : [route.geometry.coordinates];
        const material = route.state === 'visited'
            ? new THREE.LineBasicMaterial({ color: '#69d4a0', transparent: true, opacity: 0.96 })
            : new THREE.LineDashedMaterial({
                color: '#f0bd62',
                dashSize: 0.035,
                gapSize: 0.022,
                transparent: true,
                opacity: 0.98
            });

        return coordinateLines.filter(line => line.length > 1).map(coordinates => {
            const points = coordinates.map(coordinate => earthPoint(coordinate, 1.009));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            if (route.state === 'upcoming') line.computeLineDistances();
            line.renderOrder = 2;
            line.userData.state = route.state;
            return line;
        });
    });
}

function destinationMarkers(visits) {
    const markerMaterial = new THREE.MeshStandardMaterial({
        color: '#fffaf0',
        emissive: '#fffaf0',
        emissiveIntensity: 0.18,
        roughness: 0.32
    });
    const visitedMaterial = new THREE.MeshStandardMaterial({
        color: '#69d4a0',
        emissive: '#1e9b69',
        emissiveIntensity: 0.8,
        roughness: 0.3
    });
    const upcomingMaterial = new THREE.MeshStandardMaterial({
        color: '#f0bd62',
        emissive: '#c98222',
        emissiveIntensity: 0.8,
        roughness: 0.3
    });

    return visits.map(visit => {
        const group = new THREE.Group();
        const point = earthPoint(visit.coordinates, MARKER_RADIUS);
        group.position.copy(point);
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), point.clone().normalize());

        const halo = new THREE.Mesh(
            new THREE.SphereGeometry(0.037, 20, 16),
            new THREE.MeshBasicMaterial({
                color: visit.state === 'visited' ? '#69d4a0' : '#f0bd62',
                transparent: true,
                opacity: 0.3,
                depthWrite: false
            })
        );
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.021, 20, 16),
            visit.state === 'visited' ? visitedMaterial : upcomingMaterial
        );
        marker.userData.visit = visit;
        marker.userData.isDestinationMarker = true;
        group.add(halo, marker);

        const label = createLabel(visit);
        label.position.set(0, 0.04, 0.14);
        group.add(label);

        return { group, marker, visit };
    });
}

function buildStars() {
    const positions = [];
    for (let index = 0; index < 900; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const height = Math.random() * 2 - 1;
        const radius = 8 + Math.random() * 16;
        const horizontalRadius = Math.sqrt(1 - height * height);
        positions.push(
            radius * horizontalRadius * Math.cos(angle),
            radius * height,
            radius * horizontalRadius * Math.sin(angle)
        );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.Points(geometry, new THREE.PointsMaterial({
        color: '#d9e8ef',
        size: 0.035,
        transparent: true,
        opacity: 0.72,
        sizeAttenuation: true
    }));
}

function globeOrientation(center) {
    return new THREE.Quaternion().setFromUnitVectors(
        center.clone().normalize(),
        new THREE.Vector3(0, 0, 1)
    );
}

export async function initJourneyGlobe(bookings = read().bookings, loadError = '') {
    const container = document.querySelector('#journey-globe-map');
    if (!container) return;

    const statusNote = document.querySelector('.globe-empty-note');
    const visitedCount = document.querySelector('#visited-count');
    const upcomingCount = document.querySelector('#upcoming-count');
    const visitedLegCount = document.querySelector('#visited-leg-count');
    const upcomingLegCount = document.querySelector('#upcoming-leg-count');
    const infoCard = document.querySelector('#earth-place-info');
    const resetButton = document.querySelector('[data-earth-reset]');

    let renderer;
    try {
        THREE = await import('https://unpkg.com/three@0.180.0/build/three.module.js');
        const today = new Date().toISOString().slice(0, 10);
        const journeyData = buildJourneyMapData(bookings, destinations, trips, today);
        const { markers, routes, visited, upcoming } = journeyData;
        const visits = markers;

        if (visitedCount) visitedCount.textContent = String(new Set(visited.map(visit => visit.destinationId)).size);
        if (upcomingCount) upcomingCount.textContent = String(new Set(upcoming.map(visit => visit.destinationId)).size);
        if (visitedLegCount) visitedLegCount.textContent = `${routes.filter(route => route.state === 'visited').length} legs`;
        if (upcomingLegCount) upcomingLegCount.textContent = `${routes.filter(route => route.state === 'upcoming').length} legs`;
        if (statusNote) {
            statusNote.hidden = !loadError && visits.length > 0;
            if (loadError) statusNote.textContent = `Could not refresh your bookings: ${loadError}`;
        }

        renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        renderer.setClearColor('#030912', 1);
        renderer.domElement.className = 'earth-canvas';
        renderer.domElement.setAttribute('aria-label', 'Interactive 3D satellite globe with your visited and upcoming destinations');
        renderer.domElement.setAttribute('role', 'img');
        container.querySelector('.earth-canvas')?.remove();
        container.prepend(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#030912');
        scene.add(buildStars());

        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0, 4);
        camera.lookAt(0, 0, 0);

        const earthGroup = new THREE.Group();
        scene.add(earthGroup);
        const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 96, 64);
        const texture = await new THREE.TextureLoader().loadAsync(
            new URL('assets/images/earth-satellite.jpg',
                new URL(location.pathname.includes('/Front-end/pages/') ? '../' : 'Front-end/', location.href)).href
        );
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.95,
            metalness: 0
        });
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        earthGroup.add(earth);

        scene.add(new THREE.AmbientLight('#a6bbce', 1.1));
        const sunlight = new THREE.DirectionalLight('#fff0d6', 2.1);
        sunlight.position.set(-4, 2.5, 5);
        scene.add(sunlight);

        const routeObjects = routeLines(routes);
        earthGroup.add(...routeObjects);

        const markerObjects = destinationMarkers(visits);
        earthGroup.add(...markerObjects.map(({ group }) => group));

        if (visits.length) {
            const center = visits.reduce(
                (sum, visit) => sum.add(earthPoint(visit.coordinates).normalize()),
                new THREE.Vector3()
            ).normalize();
            earthGroup.quaternion.copy(globeOrientation(center));
        }
        const initialOrientation = earthGroup.quaternion.clone();

        const updateInfo = visit => {
            if (!infoCard) return;
            const title = infoCard.querySelector('strong');
            const detail = infoCard.querySelector('span');
            if (title) title.textContent = visit.destination.name;
            if (detail) {
                const date = visit.date
                    ? new Date(`${visit.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                    : 'Date not set';
                detail.textContent = `${visit.destination.country} · ${visit.state === 'visited' ? 'Visited' : 'Upcoming'} · ${date}`;
            }
            infoCard.hidden = false;
        };

        const focusOn = visit => {
            earthGroup.quaternion.copy(globeOrientation(earthPoint(visit.coordinates)));
            updateInfo(visit);
        };
        if (visits[0]) updateInfo(visits[0]);
        renderJourneyList(document.querySelector('#visited-route-list'), visited, { focusOn });
        renderJourneyList(document.querySelector('#upcoming-route-list'), upcoming, { focusOn });

        let cameraDistance = camera.position.z;
        const fitAllJourneys = () => {
            earthGroup.quaternion.copy(initialOrientation);
            cameraDistance = 4;
            camera.position.z = cameraDistance;
            if (visits[0]) updateInfo(visits[0]);
        };
        const orientNorthUp = () => {
            earthGroup.quaternion.identity();
            cameraDistance = 4;
            camera.position.z = cameraDistance;
        };
        resetButton?.addEventListener('click', orientNorthUp);

        document.querySelector('[data-earth-zoom-in]')?.addEventListener('click', () => {
            cameraDistance = Math.max(1.9, cameraDistance - 0.35);
            camera.position.z = cameraDistance;
        });
        document.querySelector('[data-earth-zoom-out]')?.addEventListener('click', () => {
            cameraDistance = Math.min(5.5, cameraDistance + 0.35);
            camera.position.z = cameraDistance;
        });
        document.querySelectorAll('[data-globe-reset]').forEach(button => button.addEventListener('click', fitAllJourneys));

        const resize = () => {
            const { width, height } = container.getBoundingClientRect();
            if (!width || !height) return;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let dragStart = null;
        let hasDragged = false;
        renderer.domElement.addEventListener('pointerdown', event => {
            dragStart = { x: event.clientX, y: event.clientY, orientation: earthGroup.quaternion.clone() };
            hasDragged = false;
            renderer.domElement.setPointerCapture(event.pointerId);
        });
        renderer.domElement.addEventListener('pointermove', event => {
            if (!dragStart) return;
            const deltaX = event.clientX - dragStart.x;
            const deltaY = event.clientY - dragStart.y;
            if (Math.abs(deltaX) + Math.abs(deltaY) > 4) hasDragged = true;
            if (!hasDragged) return;
            const dragRotation = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(deltaY * 0.006, deltaX * 0.006, 0, 'YXZ')
            );
            earthGroup.quaternion.copy(dragRotation.multiply(dragStart.orientation));
        });
        renderer.domElement.addEventListener('pointerup', event => {
            if (dragStart && !hasDragged) {
                const bounds = renderer.domElement.getBoundingClientRect();
                pointer.set(
                    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
                    -((event.clientY - bounds.top) / bounds.height) * 2 + 1
                );
                scene.updateMatrixWorld(true);
                raycaster.setFromCamera(pointer, camera);
                const hit = raycaster.intersectObjects(markerObjects.map(({ marker }) => marker), false)[0];
                const earthHit = raycaster.intersectObject(earth, false)[0];
                if (hit && (!earthHit || hit.distance < earthHit.distance)) {
                    focusOn(hit.object.userData.visit);
                }
            }
            dragStart = null;
        });
        renderer.domElement.addEventListener('pointercancel', () => { dragStart = null; });
        renderer.domElement.addEventListener('wheel', event => {
            event.preventDefault();
            cameraDistance = THREE.MathUtils.clamp(cameraDistance + Math.sign(event.deltaY) * 0.2, 1.9, 5.5);
            camera.position.z = cameraDistance;
        }, { passive: false });

        let previousTime = 0;
        const animate = time => {
            if (!renderer.domElement.isConnected) {
                resizeObserver.disconnect();
                texture.dispose();
                earthGeometry.dispose();
                earthMaterial.dispose();
                renderer.dispose();
                return;
            }
            const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
            previousTime = time;
            if (!reducedMotion && !dragStart && !document.hidden) earthGroup.rotateY(delta * 0.075);
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    } catch (error) {
        renderer?.dispose();
        console.error('Travel globe could not start:', error);
        if (statusNote) {
            statusNote.hidden = false;
            statusNote.textContent = 'The interactive 3D Earth could not load. Check WebGL support and reload.';
        }
    }
}
