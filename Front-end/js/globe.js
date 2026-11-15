import { destinations } from '../data/destinations.js';
import { trips } from '../data/trips.js';
import { read } from './storage.js';
import { buildJourneyMapData } from './journey-routes.mjs';

function addPinImage(map, imageId, color) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
            <path d="M32 3C16.5 3 4 15.4 4 30.6 4 49 32 77 32 77s28-28 28-46.4C60 15.4 47.5 3 32 3Z" fill="#14251f" opacity=".96"/>
            <path d="M32 2C16.5 2 4 14.4 4 29.6 4 48 32 76 32 76s28-28 28-46.4C60 14.4 47.5 2 32 2Z" fill="${color}" stroke="#14251f" stroke-width="3"/>
            <circle cx="32" cy="29" r="12" fill="#14251f"/>
            <circle cx="32" cy="29" r="7" fill="#f5f1e8"/>
        </svg>`;

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            try {
                if (!map.hasImage(imageId)) map.addImage(imageId, image, { pixelRatio: 2 });
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        image.onerror = () => reject(new Error('Could not load the journey pin icons.'));
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}

function popupContent(visit) {
    const content = document.createElement('div');
    content.className = 'journey-map-popup';
    const title = document.createElement('strong');
    title.textContent = visit.destination.name;
    const country = document.createElement('span');
    country.textContent = visit.destination.country;
    const status = document.createElement('small');
    status.textContent = visit.state === 'visited' ? 'Visited' : 'Upcoming';
    content.append(title, country, status);
    return content;
}

function renderJourneyList(list, visits, focusOn) {
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
        button.addEventListener('click', () => focusOn(visit));
        item.append(button);
        list.append(item);
    });
}

export async function initJourneyGlobe(bookings = read().bookings, loadError = '') {
    const container = document.querySelector('#journey-globe-map');
    if (!container) return;

    const statusNote = document.querySelector('.globe-empty-note');
    const visitedCount = document.querySelector('#visited-count');
    const upcomingCount = document.querySelector('#upcoming-count');
    try {
        const maplibregl = await import('https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs');
        const today = new Date().toISOString().slice(0, 10);
        const journeyData = buildJourneyMapData(bookings, destinations, trips, today);
        const { markers, visited, upcoming } = journeyData;
        if (visitedCount) visitedCount.textContent = String(new Set(visited.map(visit => visit.destinationId)).size);
        if (upcomingCount) upcomingCount.textContent = String(new Set(upcoming.map(visit => visit.destinationId)).size);
        if (statusNote) {
            statusNote.hidden = !loadError && markers.length > 0;
            if (loadError) statusNote.textContent = `Could not refresh your bookings: ${loadError}`;
        }

        const map = new maplibregl.Map({
            container,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [20, 22],
            zoom: 1.7,
            minZoom: 1.1,
            maxZoom: 19,
            renderWorldCopies: false,
            maxPitch: 60,
            cooperativeGestures: false,
            attributionControl: true
        });
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

        const showVisit = visit => {
            map.flyTo({ center: visit.coordinates, zoom: Math.max(map.getZoom(), 6), speed: 1.2 });
            new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '230px' })
                .setLngLat(visit.coordinates)
                .setDOMContent(popupContent(visit))
                .addTo(map);
        };

        renderJourneyList(document.querySelector('#visited-route-list'), visited, showVisit);
        renderJourneyList(document.querySelector('#upcoming-route-list'), upcoming, showVisit);

        map.on('style.load', async () => {
            try {
                map.setProjection({ type: 'globe' });
                if (typeof map.setFog === 'function') map.setFog({});
                map.addSource('journey-stops', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: markers.map(visit => ({
                            type: 'Feature',
                            properties: {
                                id: visit.destinationId,
                                name: visit.destination.name,
                                country: visit.destination.country,
                                state: visit.state
                            },
                            geometry: {
                                type: 'Point',
                                // GeoJSON coordinates are always [longitude, latitude].
                                coordinates: visit.coordinates
                            }
                        }))
                    }
                });
                await Promise.all([
                    addPinImage(map, 'journey-pin-visited', '#69d4a0'),
                    addPinImage(map, 'journey-pin-upcoming', '#f0bd62')
                ]);
                map.addLayer({
                    id: 'journey-stops-halo',
                    type: 'circle',
                    source: 'journey-stops',
                    paint: {
                        'circle-radius': 13,
                        'circle-color': ['match', ['get', 'state'], 'visited', '#69d4a0', '#f0bd62'],
                        'circle-opacity': 0.34,
                        'circle-blur': 0.2
                    }
                });
                map.addLayer({
                    id: 'journey-stops-marker',
                    type: 'symbol',
                    source: 'journey-stops',
                    layout: {
                        'icon-image': ['match', ['get', 'state'], 'visited', 'journey-pin-visited', 'journey-pin-upcoming'],
                        'icon-size': 0.72,
                        'icon-anchor': 'bottom',
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true
                    }
                });
                map.addLayer({
                    id: 'journey-stops-labels',
                    type: 'symbol',
                    source: 'journey-stops',
                    minzoom: 4.5,
                    layout: {
                        'text-field': ['get', 'name'],
                        'text-size': 12,
                        'text-anchor': 'top',
                        'text-offset': [0, 1.6],
                        'text-max-width': 10,
                        'text-allow-overlap': false
                    },
                    paint: {
                        'text-color': '#f5f1e8',
                        'text-halo-color': '#14251f',
                        'text-halo-width': 2
                    }
                });
                map.on('click', 'journey-stops-marker', event => {
                    const feature = event.features?.[0];
                    if (!feature) return;
                    const visit = markers.find(item =>
                        item.destinationId === feature.properties.id && item.state === feature.properties.state
                    );
                    if (visit) showVisit(visit);
                });
                map.on('mouseenter', 'journey-stops-marker', () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', 'journey-stops-marker', () => { map.getCanvas().style.cursor = ''; });
            } catch (error) {
                console.error('Journey globe pins could not be displayed:', error);
                if (statusNote) {
                    statusNote.hidden = false;
                    statusNote.textContent = 'The journey globe could not display its pins. Reload the page to try again.';
                }
            }
        });

        document.querySelectorAll('[data-globe-reset]').forEach(button => button.addEventListener('click', () => {
            map.flyTo({ center: [20, 22], zoom: 1.7, pitch: 0, bearing: 0, speed: 1.1 });
        }));
        window.addEventListener('resize', () => map.resize(), { passive: true });
        map.once('load', () => requestAnimationFrame(() => map.resize()));
    } catch (error) {
        console.error('Travel globe could not start:', error);
        if (statusNote) {
            statusNote.hidden = false;
            statusNote.textContent = 'The interactive map could not load. Check your internet connection and reload.';
        }
    }
}
