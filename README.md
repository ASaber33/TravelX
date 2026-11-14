# TravelX

A responsive multi-page luxury travel discovery and booking site built with HTML, CSS, and vanilla JavaScript ES modules. The catalog and authentication use Neon through the Node.js API.

## Run it

To open the homepage directly from `index.html`, first build its standalone browser script. From the project folder, run:

```powershell
npm --prefix Back-end run build
```

Then open `index.html` in your browser. The homepage and public pages use the bundled local catalog; sign-in, bookings, profile saving, and newsletter submission still require the API. To enable those features, start the backend:

```powershell
npm --prefix Back-end start
```

Then open `http://localhost:3001/`.

The Neon CLI configuration, environment, dependencies, and build output are all inside `Back-end/`. Run `neon env pull` there if `.env.local` needs refreshing, then run `npm --prefix Back-end run db:migrate` to apply database migrations.

The project is linked to Neon branch `production`. `Back-end/.env.local` is private and ignored by Git. Never copy database credentials into frontend files or share them in chat.

## Database and authentication

The Node.js API reads the Neon connection from `Back-end/.env.local` and serves the catalog endpoints:

- `GET /api/health`
- `GET /api/destinations`
- `GET /api/trips`
- `GET /api/config` (public Managed Auth base URL only)

The frontend loads destinations and trips from the API. Login, registration, session restoration, protected account pages, and logout use Neon Managed Auth. Existing demo passwords are not migrated; users must create accounts in Neon Auth. Passwords are never stored in LocalStorage.
Upcoming bookings can be edited from My Bookings, including the travel date, guest count, traveller name, and phone number. The booking total is recalculated when the guest count changes.
Profile photos can be cropped, repositioned, zoomed, and previewed in the round avatar frame before saving.

## Pages

Home, Destinations, Destination Details, Search Results, Trip Details, Login, Register, Checkout, Confirmation, Dashboard, My Bookings, Favorites, and Profile & Settings.

## Images and services

Photography loads from Unsplash image URLs (images.unsplash.com). Google Fonts provides Inter and Playfair Display. Destination maps use Leaflet 1.9.4, OpenStreetMap tiles, and the OSM tile service. The interactive travel globe loads Three.js from unpkg and uses locally stored satellite imagery with Esri attribution. A connection is required for these external assets. The landing-page ocean video is stored locally; other photos are referenced by their direct remote URLs.

The homepage ocean hero uses the same locally stored, muted, looping MP4 in both themes at `Front-end/assets/videos/ocean-waves.mp4`, sourced from [Pexels video 13538373](https://www.pexels.com/video/sea-waves-on-beach-13538373/), so the viewpoint stays identical day and night. Its local poster at `Front-end/assets/videos/ocean-waves-poster.jpg` provides the fallback while the video loads or when playback is unavailable. Dark mode grades that moving footage into a night palette and overlays real star-sky footage ([Pexels video 9341428](https://www.pexels.com/video/stars-in-the-the-night-sky-9341428/)), occasional meteor footage ([Pexels video 31952309](https://www.pexels.com/video/starry-night-sky-with-meteor-streaking-across-31952309/)), and one detailed moon video ([Pexels video 29822016](https://www.pexels.com/video/full-moon-in-night-sky-close-up-footage-29822016/)) from `Front-end/assets/videos/hero/`. Reduced-motion preferences pause the hero videos.

## Demo limitations

Theme choice remains in this browser's LocalStorage. Accounts use Neon Auth; profiles, bookings, favorites, and newsletter signups are stored in Postgres. Checkout only simulates a booking and does not accept card information or process payment. The coupon `TRAVELX10` applies a 10% demo discount; taxes are simulated at 8%.

The travel globe shows a rotating 3D Earth with booked destinations and
separate great-circle connections for visited and upcoming journeys. Drag to
rotate it, use the on-globe controls to zoom or orient Earth north-up, and select
a destination in the side list to bring it to the front. The side control fits
all journeys in the starting view. Earth continues rotating unless the device
requests reduced motion. These lines show booking sequence only, not verified
flight paths. The optional source KML file is stored in
`Front-end/assets/maps/Untitled map project.kml`; it contains no place or route
features and is not used by the globe.
