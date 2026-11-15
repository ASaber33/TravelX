const VISITED_STATUSES = new Set(["completed"]);
const UPCOMING_STATUSES = new Set(['upcoming', 'confirmed', 'pending']);

export function getVisitState(booking, today) {
    const status = String(booking.status || '').trim().toLowerCase();
    if (status === 'cancelled' || status === 'canceled') return null;

    const date = String(booking.date || '').slice(0, 10);
    if (VISITED_STATUSES.has(status) || (date && date < today)) return 'visited';
    if (UPCOMING_STATUSES.has(status) || (date && date >= today)) return 'upcoming';
    return null;
}

function coordinatesFor(destination) {
    const latitude = Number(destination.lat);
    const longitude = Number(destination.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
        || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return [longitude, latitude];
}

function toVector([longitude, latitude]) {
    const lambda = longitude * Math.PI / 180;
    const phi = latitude * Math.PI / 180;
    return [
        Math.cos(phi) * Math.cos(lambda),
        Math.cos(phi) * Math.sin(lambda),
        Math.sin(phi)
    ];
}

function toCoordinates([x, y, z]) {
    return [
        Math.atan2(y, x) * 180 / Math.PI,
        Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI
    ];
}

function splitAtDateLine(points) {
    const lines = [[]];

    for (const point of points) {
        const line = lines.at(-1);
        const previous = line.at(-1);
        if (!previous) {
            line.push(point);
            continue;
        }

        const [previousLongitude, previousLatitude] = previous;
        const [longitude, latitude] = point;
        const longitudeDelta = longitude - previousLongitude;

        if (longitudeDelta > 180 || longitudeDelta < -180) {
            const adjustedLongitude = longitudeDelta > 180 ? longitude - 360 : longitude + 360;
            const boundaryLongitude = longitudeDelta > 180 ? -180 : 180;
            const crossingRatio = (boundaryLongitude - previousLongitude)
                / (adjustedLongitude - previousLongitude);
            const crossingLatitude = previousLatitude
                + (latitude - previousLatitude) * crossingRatio;
            line.push([boundaryLongitude, crossingLatitude]);
            lines.push([[boundaryLongitude === 180 ? -180 : 180, crossingLatitude], point]);
        } else {
            line.push(point);
        }
    }

    return lines.filter(line => line.length > 1);
}

export function createGreatCircleGeometry(start, end) {
    const startVector = toVector(start);
    const endVector = toVector(end);
    const dot = Math.max(-1, Math.min(1,
        startVector.reduce((sum, value, index) => sum + value * endVector[index], 0)));
    const angle = Math.acos(dot);
    const steps = Math.max(12, Math.min(96, Math.ceil(angle * 180 / Math.PI / 2)));
    const coordinates = [];

    for (let step = 0; step <= steps; step += 1) {
        const fraction = step / steps;
        let vector;

        if (angle < 1e-8) {
            vector = startVector;
        } else if (Math.abs(Math.sin(angle)) < 1e-8) {
            vector = startVector.map((value, index) =>
                value * (1 - fraction) + endVector[index] * fraction);
        } else {
            const startWeight = Math.sin((1 - fraction) * angle) / Math.sin(angle);
            const endWeight = Math.sin(fraction * angle) / Math.sin(angle);
            vector = startVector.map((value, index) =>
                value * startWeight + endVector[index] * endWeight);
        }

        coordinates.push(toCoordinates(vector));
    }

    const lines = splitAtDateLine(coordinates);
    return lines.length > 1
        ? { type: 'MultiLineString', coordinates: lines }
        : { type: 'LineString', coordinates: lines[0] || coordinates };
}

export function buildJourneyMapData(bookings, destinations, trips, today) {
    const destinationById = new Map(destinations.map(destination => [destination.id, destination]));
    const tripById = new Map(trips.map(trip => [trip.id, trip]));
    const visits = bookings.flatMap((booking, originalIndex) => {
        const state = getVisitState(booking, today);
        if (!state) return [];

        const trip = tripById.get(booking.tripId);
        const destinationId = booking.destinationId || trip?.destinationId;
        const destination = destinationById.get(destinationId);
        const coordinates = destination && coordinatesFor(destination);
        if (!destination || !coordinates) return [];

        return [{
            destination,
            destinationId,
            coordinates,
            date: String(booking.date || '').slice(0, 10),
            state,
            originalIndex
        }];
    }).sort((left, right) => {
        if (left.date && right.date) return left.date.localeCompare(right.date)
            || left.originalIndex - right.originalIndex;
        if (left.date) return -1;
        if (right.date) return 1;
        return left.originalIndex - right.originalIndex;
    });

    const visited = visits.filter(visit => visit.state === 'visited');
    const upcoming = visits.filter(visit => visit.state === 'upcoming');
    const markerByDestinationAndState = new Map();
    for (const visit of visits) {
        const markerKey = `${visit.destinationId}:${visit.state}`;
        const previous = markerByDestinationAndState.get(markerKey);
        if (!previous || (visit.state === 'visited' && visit.date > previous.date)) {
            markerByDestinationAndState.set(markerKey, visit);
        }
    }

    const routes = ['visited', 'upcoming'].flatMap(state => {
        const routeVisits = state === 'visited' ? visited : upcoming;
        return routeVisits.slice(1).flatMap((visit, index) => {
            const previous = routeVisits[index];
            if (previous.destinationId === visit.destinationId) return [];
            return [{
                state,
                from: previous.destination.name,
                to: visit.destination.name,
                geometry: createGreatCircleGeometry(previous.coordinates, visit.coordinates)
            }];
        });
    });

    return {
        markers: [...markerByDestinationAndState.values()],
        routes,
        visited,
        upcoming
    };
}
