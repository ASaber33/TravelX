import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildJourneyMapData,
  createGreatCircleGeometry,
  getVisitState
} from "../../Front-end/js/journey-routes.mjs";

const destinations = [
  { id: "paris", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { id: "rome", name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { id: "bali", name: "Bali", country: "Indonesia", lat: -8.4095, lng: 115.1889 },
  { id: "tokyo", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 }
];
const trips = destinations.map((destination) => ({
  id: `${destination.id}-trip`,
  destinationId: destination.id
}));

test("classifies completed, expired, upcoming, and cancelled bookings", () => {
  assert.equal(getVisitState({ status: "Completed" }, "2026-11-14"), "visited");
  assert.equal(getVisitState({ status: "Confirmed", date: "2026-11-13" }, "2026-11-14"), "visited");
  assert.equal(getVisitState({ status: "Upcoming", date: "2026-11-20" }, "2026-11-14"), "upcoming");
  assert.equal(getVisitState({ status: "Cancelled", date: "2026-11-20" }, "2026-11-14"), null);
});

test("orders booked stops by date and keeps past and future routes separate", () => {
  const bookings = [
    { tripId: "bali-trip", status: "Upcoming", date: "2026-12-10" },
    { tripId: "paris-trip", status: "Completed", date: "2025-06-02" },
    { tripId: "rome-trip", status: "Completed", date: "2025-06-08" },
    { tripId: "tokyo-trip", status: "Upcoming", date: "2027-01-03" },
    { tripId: "bali-trip", status: "Cancelled", date: "2026-11-21" }
  ];

  const result = buildJourneyMapData(bookings, destinations, trips, "2026-11-14");

  assert.deepEqual(result.visited.map((visit) => visit.destinationId), ["paris", "rome"]);
  assert.deepEqual(result.upcoming.map((visit) => visit.destinationId), ["bali", "tokyo"]);
  assert.deepEqual(result.routes.map((route) => route.state), ["visited", "upcoming"]);
  assert.deepEqual(result.routes.map((route) => [route.from, route.to]), [
    ["Paris", "Rome"],
    ["Bali", "Tokyo"]
  ]);
});

test("Egypt bookings map to Hurghada with GeoJSON longitude-first coordinates", () => {
  const egypt = {
    id: "egypt",
    name: "Egypt & Red Sea",
    country: "Egypt",
    lat: 27.2579,
    lng: 33.8116
  };
  const result = buildJourneyMapData(
    [{ tripId: "egypt-trip", status: "Upcoming", date: "2026-11-20" }],
    [egypt],
    [{ id: "egypt-trip", destinationId: "egypt" }],
    "2026-11-14"
  );

  assert.deepEqual(result.markers[0].coordinates, [33.8116, 27.2579]);
  assert.equal(result.markers[0].destination.name, "Egypt & Red Sea");
});

test("great-circle lines follow the curvature of the earth", () => {
  const geometry = createGreatCircleGeometry([2.3522, 48.8566], [139.6503, 35.6762]);

  assert.equal(geometry.type, "LineString");
  assert.ok(geometry.coordinates.length > 12);
  assert.ok(geometry.coordinates.some(([, latitude]) => latitude > 55));
  assert.ok(geometry.coordinates.every(([longitude, latitude]) =>
    Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90));
});

test("great-circle lines split cleanly where they cross the date line", () => {
  const geometry = createGreatCircleGeometry([139.6503, 35.6762], [-157.8583, 21.3069]);

  assert.equal(geometry.type, "MultiLineString");
  assert.ok(geometry.coordinates.length > 1);
  for (const line of geometry.coordinates) {
    for (let index = 1; index < line.length; index += 1) {
      assert.ok(Math.abs(line[index][0] - line[index - 1][0]) <= 180);
    }
  }
});
