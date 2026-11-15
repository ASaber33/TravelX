import { destinations } from '../data/destinations.js';
import { trips } from '../data/trips.js';
import { read } from './storage.js';
import { buildJourneyMapData } from './journey-routes.mjs';

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

        map.on('style.load', () => {
            map.setProjection({ type: 'globe' });
            map.setFog({});
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
                type: 'circle',
                source: 'journey-stops',
                paint: {
                    'circle-radius': 7,
                    'circle-color': ['match', ['get', 'state'], 'visited', '#69d4a0', '#f0bd62'],
                    'circle-stroke-color': '#10251e',
                    'circle-stroke-width': 2
                }
            });
            map.on('click', 'journey-stops-marker', event => {
                const feature = event.features?.[0];
                if (!feature) return;
                const visit = markers.find(item => item.destinationId === feature.properties.id);
                if (visit) showVisit(visit);
            });
            map.on('mouseenter', 'journey-stops-marker', () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', 'journey-stops-marker', () => { map.getCanvas().style.cursor = ''; });
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
