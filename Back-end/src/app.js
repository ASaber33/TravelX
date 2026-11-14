import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyNeonToken } from "./auth.js";

const DEFAULT_ORIGINS = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...Array.from({ length: 10 }, (_, index) => 3001 + index)
    .flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`])
];

export function createApp(database, configuredOrigins = process.env.FRONTEND_ORIGINS) {
  const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const builtRoot = resolve(fileURLToPath(new URL("..", import.meta.url)), "dist");
  const staticRoot = existsSync(resolve(builtRoot, "index.html")) ? builtRoot : projectRoot;
  const allowedOrigins = new Set(
    (configuredOrigins || DEFAULT_ORIGINS.join(","))
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
  const app = express();

  app.disable("x-powered-by");
  app.use((request, response, next) => {
    const origin = request.get("origin");
    const forwardedProtocol = request.get("x-forwarded-proto")?.split(",")[0].trim();
    const requestOrigin = `${forwardedProtocol || request.protocol}://${request.get("host")}`;
    const localDevelopmentOrigin = /^http:\/\/(?:localhost|127\.0\.0\.1):(?:300[1-9]|3010)$/.test(origin || "");

    if (origin && (origin === requestOrigin || allowedOrigins.has(origin) || localDevelopmentOrigin)) {
      response.set("Access-Control-Allow-Origin", origin);
      response.set("Vary", "Origin");
      response.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    } else if (origin) {
      return response.status(403).json({ error: "Origin not allowed." });
    }

    if (request.method === "OPTIONS") {
      return response.sendStatus(204);
    }

    next();
  });
  app.use(express.json({ limit: "1mb" }));

  const privateApi = express.Router();
  privateApi.use(async (request, response, next) => {
    const authorization = request.get("authorization") || "";
    const match = authorization.match(/^Bearer ([^\s]+)$/i);
    const claims = match ? await verifyNeonToken(match[1]) : null;

    if (!claims) {
      return response.status(401).json({ error: "Please sign in again to continue." });
    }

    request.authUser = claims;

    try {
      await database.query(`
        INSERT INTO public.users (id, full_name, email, email_verified_at)
        VALUES ($1, $2, lower($3), CASE WHEN $4 THEN now() ELSE NULL END)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          email_verified_at = COALESCE(public.users.email_verified_at, EXCLUDED.email_verified_at)
      `, [claims.sub, claims.name, claims.email, claims.emailVerified === true]);
      next();
    } catch (error) {
      next(error);
    }
  });

  async function getAccountSnapshot(userId) {
    const [userResult, favoritesResult, bookingsResult] = await Promise.all([
      database.query(`
        SELECT id, full_name AS name, email, phone, country,
          avatar_image_id AS "avatarImageId",
          avatar_data_url AS "avatarDataUrl"
        FROM public.users WHERE id = $1
      `, [userId]),
      database.query(`
        SELECT destination_id AS id
        FROM public.favorites WHERE user_id = $1 ORDER BY created_at DESC
      `, [userId]),
      database.query(`
        SELECT bookings.reference AS ref,
          bookings.id,
          bookings.trip_id AS "tripId",
          trips.destination_id AS "destinationId",
          destinations.latitude AS lat,
          destinations.longitude AS lng,
          bookings.travel_date::text AS date,
          bookings.guests,
          bookings.phone,
          bookings.total,
          CASE bookings.status
            WHEN 'pending' THEN 'Upcoming'
            WHEN 'confirmed' THEN 'Upcoming'
            WHEN 'completed' THEN 'Completed'
            ELSE 'Cancelled'
          END AS status,
          bookings.created_at AS created,
          bookings.traveller_name AS traveller,
          bookings.email
        FROM public.bookings
        INNER JOIN public.trips ON trips.id = bookings.trip_id
        INNER JOIN public.destinations ON destinations.id = trips.destination_id
        WHERE bookings.user_id = $1
        ORDER BY bookings.created_at DESC
      `, [userId])
    ]);

    return {
      user: {
        ...userResult.rows[0],
        avatar: userResult.rows[0]?.avatarDataUrl
          || userResult.rows[0]?.avatarImageId
          || "photo-1534528741775-53994a69daeb"
      },
      favorites: favoritesResult.rows.map((row) => row.id),
      bookings: bookingsResult.rows.map((row) => ({
        ...row,
        total: Number(row.total),
        user: row.email
      }))
    };
  }

  privateApi.get("/session", async (request, response, next) => {
    try {
      response.json(await getAccountSnapshot(request.authUser.sub));
    } catch (error) {
      next(error);
    }
  });

  privateApi.patch("/profile", async (request, response, next) => {
    const { name, phone, country, avatar } = request.body || {};
    if (typeof name !== "string" || !name.trim()) {
      return response.status(400).json({ error: "A name is required." });
    }
    const safeAvatarId = /^photo-[a-zA-Z0-9-]{8,100}$/.test(String(avatar || ""));
    const safeAvatarData = typeof avatar === "string"
      && avatar.length <= 850_000
      && /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(avatar);
    if (!safeAvatarId && !safeAvatarData) {
      return response.status(400).json({ error: "Choose a valid profile image." });
    }

    try {
      await database.query(`
        UPDATE public.users
        SET full_name = $2, phone = $3, country = $4,
          avatar_image_id = CASE WHEN $5 THEN $6 ELSE NULL END,
          avatar_data_url = CASE WHEN $5 THEN NULL ELSE $7 END
        WHERE id = $1
      `, [request.authUser.sub, name.trim(), String(phone || "").trim(),
        String(country || "").trim(), safeAvatarId,
        safeAvatarId ? avatar : null, safeAvatarData ? avatar : null]);
      response.json(await getAccountSnapshot(request.authUser.sub));
    } catch (error) {
      next(error);
    }
  });

  privateApi.put("/favorites/:destinationId", async (request, response, next) => {
    try {
      const result = await database.query(`
        INSERT INTO public.favorites (user_id, destination_id)
        SELECT $1, id FROM public.destinations WHERE id = $2 AND is_active = true
        ON CONFLICT (user_id, destination_id) DO NOTHING
        RETURNING destination_id
      `, [request.authUser.sub, request.params.destinationId]);
      if (!result.rowCount) {
        const exists = await database.query(
          "SELECT 1 FROM public.favorites WHERE user_id = $1 AND destination_id = $2",
          [request.authUser.sub, request.params.destinationId]
        );
        if (!exists.rowCount) return response.status(404).json({ error: "Destination not found." });
      }
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  privateApi.delete("/favorites/:destinationId", async (request, response, next) => {
    try {
      await database.query(
        "DELETE FROM public.favorites WHERE user_id = $1 AND destination_id = $2",
        [request.authUser.sub, request.params.destinationId]
      );
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  privateApi.post("/bookings", async (request, response, next) => {
    const { tripId, date, guests, traveller, phone, couponCode } = request.body || {};
    const guestCount = Number(guests);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date || "") || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20 || !String(traveller || "").trim() || !String(phone || "").trim()) {
      return response.status(400).json({ error: "Enter a valid date, traveller, phone number, and guest count." });
    }

    try {
      const tripResult = await database.query(`
        SELECT price_per_person AS price
        FROM public.trips
        WHERE id = $1 AND is_active = true
      `, [tripId]);
      if (!tripResult.rowCount) return response.status(404).json({ error: "This journey is unavailable." });

      const price = Number(tripResult.rows[0].price);
      const subtotal = Math.round(price * guestCount * 100) / 100;
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const coupon = String(couponCode || "").trim().toUpperCase() === "TRAVELX10" ? "TRAVELX10" : null;
      const discount = coupon ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const total = Math.round((subtotal + tax - discount) * 100) / 100;
      const reference = `TX-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;

      await database.query(`
        INSERT INTO public.bookings (
          reference, user_id, trip_id, status, travel_date, guests,
          traveller_name, email, phone, price_per_person, subtotal,
          tax_amount, discount_amount, total, coupon_code
        ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, lower($7), $8, $9, $10, $11, $12, $13, $14)
      `, [reference, request.authUser.sub, tripId, date, guestCount,
        String(traveller).trim(), request.authUser.email, String(phone).trim(),
        price, subtotal, tax, discount, total, coupon]);

      response.status(201).json({
        ref: reference, user: request.authUser.email, tripId, date,
        guests: guestCount, total, status: "Upcoming", created: new Date().toISOString(),
        traveller: String(traveller).trim(), email: request.authUser.email
      });
    } catch (error) {
      next(error);
    }
  });

  privateApi.delete("/bookings/:reference", async (request, response, next) => {
    try {
      const result = await database.query(`
        UPDATE public.bookings SET status = 'cancelled'
        WHERE reference = $1 AND user_id = $2 AND status IN ('pending', 'confirmed')
        RETURNING reference
      `, [request.params.reference, request.authUser.sub]);
      if (!result.rowCount) return response.status(404).json({ error: "Booking not found or already completed." });
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  privateApi.patch("/bookings/:reference", async (request, response, next) => {
    const { date, guests, traveller, phone } = request.body || {};
    const guestCount = Number(guests);
    const dateValue = new Date(`${date}T00:00:00.000Z`);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date || "")
      && !Number.isNaN(dateValue.valueOf())
      && dateValue.toISOString().slice(0, 10) === date;
    const today = new Date().toISOString().slice(0, 10);
    const travellerName = typeof traveller === "string" ? traveller.trim() : "";
    const phoneNumber = typeof phone === "string" ? phone.trim() : "";

    if (!validDate || date < today
      || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20
      || !travellerName || travellerName.length > 150
      || !phoneNumber || phoneNumber.length > 40) {
      return response.status(400).json({
        error: "Enter a valid future date, traveller name, phone number, and guest count."
      });
    }

    try {
      const current = await database.query(`
        SELECT bookings.id, bookings.coupon_code,
          trips.price_per_person AS price
        FROM public.bookings
        INNER JOIN public.trips ON trips.id = bookings.trip_id
        WHERE bookings.reference = $1 AND bookings.user_id = $2
          AND bookings.status IN ('pending', 'confirmed')
      `, [request.params.reference, request.authUser.sub]);
      if (!current.rowCount) {
        return response.status(404).json({ error: "Only upcoming bookings can be edited." });
      }

      const { id, coupon_code: couponCode, price } = current.rows[0];
      const subtotal = Math.round(Number(price) * guestCount * 100) / 100;
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const discount = couponCode ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const total = Math.round((subtotal + tax - discount) * 100) / 100;
      const updated = await database.query(`
        UPDATE public.bookings
        SET travel_date = $3, guests = $4, traveller_name = $5, phone = $6,
          subtotal = $7, tax_amount = $8, discount_amount = $9, total = $10,
          updated_at = now()
        WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'confirmed')
        RETURNING reference AS ref, trip_id AS "tripId",
          travel_date::text AS date, guests, traveller_name AS traveller,
          phone, total
      `, [id, request.authUser.sub, date, guestCount, travellerName, phoneNumber,
        subtotal, tax, discount, total]);
      if (!updated.rowCount) {
        return response.status(404).json({ error: "Only upcoming bookings can be edited." });
      }
      response.json({ ...updated.rows[0], total: Number(updated.rows[0].total), status: "Upcoming" });
    } catch (error) {
      next(error);
    }
  });

  privateApi.delete("/bookings/:reference/permanent", async (request, response, next) => {
    try {
      const result = await database.query(`
        DELETE FROM public.bookings
        WHERE reference = $1 AND user_id = $2 AND status IN ('cancelled', 'completed')
        RETURNING reference
      `, [request.params.reference, request.authUser.sub]);
      if (!result.rowCount) return response.status(404).json({ error: "Only cancelled or completed bookings can be removed." });
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/private", privateApi);

  app.post("/api/newsletter", async (request, response, next) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({ error: "Enter a valid email address." });
    }

    try {
      await database.query(`
        INSERT INTO public.newsletter_subscribers (email, is_active, unsubscribed_at)
        VALUES ($1, true, NULL)
        ON CONFLICT (lower(email)) DO UPDATE SET
          is_active = true,
          unsubscribed_at = NULL
      `, [email]);
      response.status(201).json({ subscribed: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/config", (request, response) => {
    const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

    if (!authBaseUrl) {
      return response.status(503).json({ error: "Neon Auth is not configured for this branch." });
    }

    response.json({ authBaseUrl });
  });

  app.get("/api/health", async (request, response, next) => {
    try {
      const { rows } = await database.query(`
        SELECT
          current_database() AS database,
          current_schema() AS schema,
          to_regclass('public.destinations') IS NOT NULL AS destinations_ready,
          to_regclass('public.trips') IS NOT NULL AS trips_ready
      `);
      const health = rows[0];
      const ready = health.destinations_ready && health.trips_ready;

      response.status(ready ? 200 : 503).json({
        status: ready ? "ok" : "schema_not_initialized",
        database: health.database,
        schema: health.schema,
        authConfigured: Boolean(process.env.NEON_AUTH_BASE_URL),
        tables: {
          destinations: health.destinations_ready,
          trips: health.trips_ready
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/destinations", async (request, response, next) => {
    try {
      const { rows } = await database.query(`
        SELECT
          id,
          name,
          country,
          category,
          starting_price AS price,
          average_rating AS rating,
          review_count AS reviews,
          tag,
          image_id AS image,
          description,
          latitude AS lat,
          longitude AS lng,
          attractions
        FROM public.destinations
        WHERE is_active = true
        ORDER BY name
      `);

      response.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/trips", async (request, response, next) => {
    try {
      const { rows } = await database.query(`
        SELECT
          trips.id,
          trips.destination_id AS "destinationId",
          destinations.name AS "destinationName",
          trips.title,
          trips.duration_days AS duration,
          trips.price_per_person AS price,
          trips.date_label AS dates,
          trips.trip_type AS type,
          trips.image_id AS image,
          trips.included_items AS included,
          trips.excluded_items AS excluded,
          trips.itinerary
        FROM public.trips
        INNER JOIN public.destinations
          ON destinations.id = trips.destination_id
        WHERE trips.is_active = true
          AND destinations.is_active = true
        ORDER BY trips.title
      `);

      response.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  app.get("/", (request, response) => {
    response.sendFile(resolve(staticRoot, "index.html"));
  });
  app.get("/Front-end", (request, response) => {
    response.redirect(302, "/");
  });
  app.get("/Front-end/", (request, response) => {
    response.redirect(302, "/");
  });
  app.get("/Front-end/index.html", (request, response) => {
    response.redirect(302, "/");
  });
  app.use("/Front-end", express.static(resolve(staticRoot, "Front-end")));

  app.use((error, request, response, next) => {
    console.error("API request failed:", error.message);

    if (response.headersSent) {
      return next(error);
    }

    if (error.code === "42P01") {
      return response.status(503).json({
        error: "Database schema is missing. Run the initial schema SQL in the intended database."
      });
    }

    if (error.code === "23503") {
      return response.status(400).json({ error: "The selected journey or account is no longer available. Refresh the page and try again." });
    }

    if (error.code === "23514" || error.code === "22007" || error.code === "22008") {
      return response.status(400).json({ error: "Some booking details were rejected. Check the date, guest count, and totals, then try again." });
    }

    response.status(500).json({ error: "An unexpected server error occurred." });
  });

  return app;
}
