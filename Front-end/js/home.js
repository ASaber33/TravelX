import { destinations } from '../data/destinations.js';
import { trips } from '../data/trips.js';
import { read, write } from './storage.js';
import { initLandingMotion } from './animations.js';
import { saveFavorite, subscribeNewsletter } from './runtime.js';

const $$ = (q, root = document) => [...root.querySelectorAll(q)], one = (q, root = document) => root.querySelector(q);
const img = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
const page = (name, query = '') => `pages/${name}${query}`;
const photo = (id, alt, w = 1200) => `<img src="${img(id, w)}" alt="${alt}" loading="lazy" onerror="this.classList.add('image-failed')">`;
const normalizePlaceName = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let transitionDark = read().theme === 'dark', oceanThemeController = null;

function playBackgroundVideo(video) {
    video.play().catch(error => {
        if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
            console.warn(`Background video could not start (${video.className}).`, error);
        }
    });
}

function initOceanScene(startDark) {
    const hero = one('.ocean-hero'), day = one('.ocean-video'), moon = one('.moon-video');
    const stars = one('.night-sky-video'), meteors = one('.meteor-video');
    if (!hero || !day || !moon || !stars || !meteors) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let isVisible = false;
    const pauseNightVideos = () => {
        stars.pause();
        meteors.pause();
        moon.pause();
    };
    const syncPlayback = () => {
        const shouldPlay = isVisible && !document.hidden && !reducedMotion.matches;
        day.autoplay = shouldPlay;
        if (!shouldPlay) {
            day.pause();
            pauseNightVideos();
            return;
        }
        playBackgroundVideo(day);
        if (hero.classList.contains('is-night')) {
            stars.playbackRate = 1;
            meteors.playbackRate = 1;
            playBackgroundVideo(stars);
            playBackgroundVideo(meteors);
            playBackgroundVideo(moon);
        } else {
            pauseNightVideos();
        }
    };
    const observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback();
    });
    observer.observe(hero);
    reducedMotion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
    if (startDark) hero.classList.add('is-night');
    return dark => {
        hero.classList.toggle('is-night', dark);
        syncPlayback();
    };
}

function initSignatureBackground() {
    const video = one('.signature-video');
    if (!video) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const section = video.closest('.signature-journey');
    if (!section) return;
    let isVisible = false;
    const syncPlayback = () => {
        video.autoplay = !reducedMotion.matches && !document.hidden && isVisible;
        if (video.autoplay) playBackgroundVideo(video);
        else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback();
    }, { rootMargin: '160px 0px' });
    observer.observe(section);
    syncPlayback();
    reducedMotion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
}

function initWhyCarousel() {
    const section = one('.why-section');
    const track = one('.benefit-list', section);
    const slides = $$('.benefit', track);
    if (!section || !track || !slides.length) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0;
    let timer;
    let isVisible = false;
    const renderSlide = index => {
        if (index === active) return;
        const previous = active;
        active = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            slide.setAttribute('aria-hidden', String(slideIndex !== active));
            slide.classList.remove('is-entering', 'is-leaving');
        });
        slides[previous].classList.add('is-leaving');
        slides[active].classList.add('is-entering');
    };
    const stopAutoplay = () => {
        clearInterval(timer);
        timer = undefined;
    };
    const syncAutoplay = () => {
        stopAutoplay();
        if (!isVisible || document.hidden || reducedMotion.matches) return;
        timer = setInterval(() => renderSlide(active + 1), 4200);
    };

    slides.forEach(slide => slide.addEventListener('animationend', () => {
        slide.classList.remove('is-entering', 'is-leaving');
    }));
    document.addEventListener('visibilitychange', syncAutoplay);
    reducedMotion.addEventListener('change', syncAutoplay);

    const observer = new IntersectionObserver(([entry]) => {
        const becameVisible = entry.isIntersecting && !isVisible;
        isVisible = entry.isIntersecting;
        if (becameVisible && !reducedMotion.matches) renderSlide(active + 1);
        syncAutoplay();
    });
    observer.observe(section);
}

function initSaleCountdown() {
    const countdown = one('.sale-countdown');
    if (!countdown) return;

    const expiresAt = Date.parse(countdown.dataset.expiresAt);
    const label = one('.sale-countdown-label', countdown);
    const values = $$('.sale-countdown-value', countdown);
    let timer;
    const updateCountdown = () => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
            label.textContent = 'OFFER ENDED';
            values.forEach(value => { value.textContent = '00' });
            clearInterval(timer);
            return;
        }
        const units = [
            Math.floor(remaining / 86400000),
            Math.floor(remaining / 3600000) % 24,
            Math.floor(remaining / 60000) % 60,
            Math.floor(remaining / 1000) % 60,
        ];
        values.forEach((value, index) => {
            value.textContent = String(units[index]).padStart(index === 0 ? 1 : 2, '0');
        });
    };

    updateCountdown();
    if (expiresAt > Date.now()) timer = setInterval(updateCountdown, 1000);
}

function initExperienceRoad() {
    const section = one('.experience-section');
    const video = one('.experience-road-video');
    const source = one('.experience-road-video source');
    if (!section || !video || !source) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let isVisible = false;
    let sourceLoaded = false;
    const syncPlayback = () => {
        if (reducedMotion.matches || !isVisible || document.hidden) {
            video.pause();
            return;
        }
        if (!sourceLoaded) {
            source.src = source.dataset.src;
            sourceLoaded = true;
            video.load();
        }
        playBackgroundVideo(video);
    };
    const observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback();
    }, {rootMargin: '240px 0px'});

    observer.observe(section);
    reducedMotion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
}

const places = [
    { id: 'maldives', title: 'The Maldives', country: 'Indian Ocean', copy: 'Barefoot days, reef-blue waters and nights beneath an endless sky.', price: 2890, image: 'photo-1514282401047-d79a71a590e8', className: 'place-maldives' },
    { id: 'switzerland', title: 'The Swiss Alps', country: 'Switzerland', copy: 'A slower way through high peaks, quiet lakes and alpine villages.', price: 2140, image: 'photo-1531366936337-7c912a4589a7', className: 'place-swiss' },
    { id: 'bali', title: 'Bali, Indonesia', country: 'Indonesia', copy: 'Temple mornings, emerald terraces and the generous warmth of island life.', price: 1680, image: 'photo-1537996194471-e657df975ab4', className: 'place-bali' },
    { id: 'paris', title: 'Paris, France', country: 'France', copy: 'A city of grand gestures, intimate tables and beautiful everyday rituals.', price: 1950, image: 'photo-1502602898657-3e91760cbb34', className: 'place-paris' },
    { id: 'egypt', title: 'Egypt & the Red Sea', country: 'Egypt', copy: 'Ancient stories by day, clear-water stillness by the shore.', price: 1370, image: 'photo-1539768942893-daf53e448371', className: 'place-egypt' },
    { id: 'santorini', title: 'Santorini', country: 'Greece', copy: 'Whitewashed lanes, volcanic cliffs and the Aegean at golden hour.', price: 2250, image: 'photo-1533105079780-92b9be482077', className: 'place-santorini' }
];
const experiences = [
    { title: 'Private Island Escapes', type: 'ISLAND LIVING', copy: 'Let the tide set the pace.', image: 'photo-1540202404-a2f29016b523', search: 'maldives' },
    { title: 'Mountain Adventures', type: 'WILD & WIDE', copy: 'Find your way above the ordinary.', image: 'photo-1464822759023-fed622ff2c3b', search: 'switzerland' },
    { title: 'Cultural Discoveries', type: 'LOCAL STORIES', copy: 'Go deeper into the places you meet.', image: 'photo-1539768942893-daf53e448371', search: 'egypt' },
    { title: 'Luxury City Breaks', type: 'CITY NOTES', copy: 'A few days, beautifully considered.', image: 'photo-1499856871958-5b9627545d1a', search: 'paris' }
];
const stories = [
    { category: 'PLACES', date: '12 MAY 2026', title: 'The most beautiful places to visit in 2027', image: 'photo-1470770841072-f978cf4d019e', id: 'switzerland' },
    { category: 'ISLAND LIFE', date: '28 APR 2026', title: 'A guide to the world’s most private island escapes', image: 'photo-1500375592092-40eb2168fd21', id: 'maldives' },
    { category: 'SLOW TRAVEL', date: '06 APR 2026', title: 'Discovering the hidden beauty of Switzerland', image: 'photo-1500530855697-b586d89ba3ee', id: 'switzerland' },
    { category: 'PERSPECTIVES', date: '19 MAR 2026', title: 'The art of travelling slowly, and seeing more', image: 'photo-1476514525535-07fb3b4ae5f1', id: 'bali' }
];
const testimonials = [
    { quote: 'The Maldives felt like a world of our own. Every quiet detail was taken care of, which let us be completely present.', name: 'Amelia & James', country: 'London, United Kingdom', trip: 'A private island week', avatar: 'photo-1534528741775-53994a69daeb' },
    { quote: 'We found the Switzerland we had imagined and then the one we could never have planned for ourselves.', name: 'Sofia M.', country: 'Milan, Italy', trip: 'Alpine rail & lakes', avatar: 'photo-1544005313-94ddf0286df2' },
    { quote: 'A beautiful rhythm of early temple visits, long lunches and evenings we did not want to end.', name: 'Daniel K.', country: 'Toronto, Canada', trip: 'Bali, slowly', avatar: 'photo-1500648767791-00dcc994a43e' }
];

function renderHeader() { return `<header class="topbar landing-nav" id="top"><div class="container nav-inner"><a class="brand" href="#top" aria-label="TravelX home"><img class="brand-emblem" src="assets/images/Luxury%20TravelX%20Globe%20Emblem.png" alt="TravelX"></a><nav class="nav-links" id="landing-menu" aria-label="Main navigation"><a href="#top">Home</a><a href="#destinations">Destinations</a><a href="#about">About</a><a href="#experiences">Experiences</a><a href="#testimonials">Reviews</a><a href="#journal">Journal</a><a href="#contact">Contact</a><div class="mobile-account-links"><a class="mobile-login-link" href="${page('login.html')}">Log in</a><a class="mobile-signup-link" href="${page('register.html')}">Sign up</a></div></nav><div class="nav-actions"><button class="icon-btn theme-toggle" aria-label="Toggle dark mode"><svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.1 15.2A8.5 8.5 0 0 1 8.8 3.9 8.7 8.7 0 1 0 20.1 15.2Z"/><path d="m16.7 3.2.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5Z"/></svg></button><a class="login-link" href="${page('login.html')}">Log in</a><button class="icon-btn mobile-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="landing-menu">☰</button></div></div></header>` }

function destinationMosaic() { return places.map((p, i) => `<article class="editorial-place ${p.className} reveal reveal-clip"><a class="place-image" href="${page('destination-details.html', `?id=${p.id}`)}" aria-label="Explore ${p.title}">${photo(p.image, `${p.title} landscape`, i === 0 ? 1600 : 1100)}<span class="place-shade"></span></a><button class="place-favorite" data-fav="${p.id}" aria-label="Save ${p.title} to favorites">♡</button><div class="place-copy"><span>${p.country}</span><h3>${p.title}</h3><p>${p.copy}</p><div class="place-bottom"><small>JOURNEYS FROM <b>$${p.price.toLocaleString()}</b></small><a href="${page('destination-details.html', `?id=${p.id}`)}" aria-label="Discover ${p.title}">Discover <i>↗</i></a></div></div></article>`).join('') }

function renderExperienceStops() {
    return experiences.map((experience, index) => {
        const destination = places.find(place => place.id === experience.search);
        const nextId = index < experiences.length - 1 ? `journey-stop-${index + 2}` : 'signature-journey';
        const nextTitle = experiences[index + 1]?.title || 'The journey of the season';
        return `<article class="journey-stop reveal" id="journey-stop-${index + 1}"><div class="journey-stop-meta">${experience.type}</div><h3>${experience.title}</h3><p>${experience.copy}</p><div class="journey-stop-actions"><a class="journey-destination" href="${page('destination-details.html', `?id=${destination?.id || experience.search}`)}">Discover ${destination?.title || 'this journey'} <i>↗</i></a><a class="journey-next" href="#${nextId}" aria-label="Continue to ${nextTitle}">↓</a></div></article>`;
    }).join('');
}

function initExperienceConnectors() {
    const route = one('.journey-route');
    const stops = $$('.journey-stop', route);
    if (!route || stops.length < 2) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('journey-connectors');
    svg.setAttribute('aria-hidden', 'true');

    const arrows = [];
    const paths = stops.slice(0, -1).map((_, index) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('journey-connector');
        path.setAttribute('pathLength', '1');
        svg.append(path);
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrow.classList.add('journey-connector-arrow');
        arrow.setAttribute('d', 'M -7 -5 L 0 0 L -7 5');
        arrow.style.opacity = '0';
        svg.append(arrow);
        arrows.push(arrow);
        return path;
    });
    route.prepend(svg);

    let scrollFrame = 0;
    const updateProgress = () => {
        scrollFrame = 0;
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        stops.slice(0, -1).forEach((stop, index) => {
            const next = stops[index + 1];
            const startY = stop.getBoundingClientRect().top + scrollY + stop.offsetHeight * .42;
            const endY = next.getBoundingClientRect().top + scrollY - 8;
            const startScroll = startY - viewportHeight * .75;
            const endScroll = endY - viewportHeight * .45;
            const progress = Math.max(0, Math.min(1, (scrollY - startScroll) / (endScroll - startScroll)));
            paths[index].style.strokeDashoffset = String(1 - progress);
            const length = paths[index].getTotalLength();
            const point = paths[index].getPointAtLength(length * progress);
            const previous = paths[index].getPointAtLength(Math.max(0, length * progress - 1));
            const angle = Math.atan2(point.y - previous.y, point.x - previous.x) * 180 / Math.PI;
            arrows[index].setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
            arrows[index].style.opacity = progress > 0 ? '1' : '0';
        });
    };
    const requestProgressUpdate = () => {
        if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateProgress);
    };

    const updatePaths = () => {
        const routeRect = route.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${route.clientWidth} ${route.scrollHeight}`);
        svg.setAttribute('width', route.clientWidth);
        svg.setAttribute('height', route.scrollHeight);
        stops.slice(0, -1).forEach((stop, index) => {
            const next = stops[index + 1];
            const currentRect = stop.getBoundingClientRect();
            const nextRect = next.getBoundingClientRect();
            const direction = index % 2 === 0 ? -1 : 1;
            const startX = (direction < 0 ? currentRect.left : currentRect.right) - routeRect.left;
            const startY = currentRect.top - routeRect.top + currentRect.height * .42;
            const endX = (nextRect.left + nextRect.width * .5) - routeRect.left;
            const endY = nextRect.top - routeRect.top - 8;
            const curve = Math.min(110, route.clientWidth * .22);
            paths[index].setAttribute('d', `M ${startX} ${startY} C ${startX + direction * curve} ${startY + 36}, ${endX - direction * curve} ${endY - 90}, ${endX} ${endY}`);
        });
        requestProgressUpdate();
    };

    const resizeObserver = new ResizeObserver(updatePaths);
    resizeObserver.observe(route);
    stops.forEach(stop => resizeObserver.observe(stop));
    window.addEventListener('resize', updatePaths);
    window.addEventListener('scroll', requestProgressUpdate, { passive: true });
    updatePaths();
}

function scrollLandingTarget(hash, behavior = 'smooth') {
    const section = document.getElementById(hash.replace(/^#/, ''));
    if (!section) return;
    const scrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior;
    if (section.id === 'top' || section.id === 'hero') {
        window.scrollTo({ top: 0, behavior: scrollBehavior });
        return;
    }

    const targetSelector = {
        about: '.feeling-copy',
        experiences: '.experience-section',
        testimonials: '.testimonial-lead',
    }[section.id] || '.section-heading';
    const target = section.id === 'search' || section.id === 'contact' ? section : section.querySelector(targetSelector) || section;
    if (target.classList.contains('reveal')) target.classList.add('is-visible');
    const navOffset = innerWidth <= 760 ? 64 : 72;
    const targetGap = section.id === 'search' || section.id === 'contact' || section.id === 'experiences' ? 0 : 18;
    const top = window.scrollY + target.getBoundingClientRect().top - navOffset - targetGap;
    window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
}

function renderHome() {
    document.body.classList.toggle('dark', transitionDark);
    document.body.innerHTML = `${renderHeader()}<main>
  <section class="ocean-hero" id="hero" aria-label="Tropical ocean welcome">
   <video class="ocean-video" autoplay muted loop playsinline preload="metadata" poster="assets/videos/ocean-waves-poster.jpg" aria-hidden="true"><source src="assets/videos/ocean-waves.mp4" type="video/mp4"></video><video class="night-sky-video" muted loop playsinline preload="none" src="assets/videos/hero/night-stars-hd.mp4" aria-hidden="true"></video><video class="meteor-video" muted loop playsinline preload="none" src="assets/videos/hero/shooting-star.mp4" aria-hidden="true"></video><video class="moon-video" muted loop playsinline preload="none" src="assets/videos/hero/moon-closeup.mp4" aria-hidden="true"></video><span class="moon-halo" aria-hidden="true"></span><div class="ocean-atmosphere" aria-hidden="true"></div>
   <div class="container hero-shell"><div class="ocean-copy"><span class="hero-kicker"><i></i> THE ART OF TRAVEL</span><h1><span>Discover The World.</span><span>Experience The <i class="gold-italic">Extraordinary.</i></span></h1><p>Where endless horizons meet extraordinary journeys.</p><div class="hero-actions"><a class="btn btn-gold magnetic" href="#destinations">Explore destinations <span>↗</span></a><a class="hero-text-link" href="#experiences">Discover experiences <span>→</span></a></div></div>
   </div><a href="#search" class="scroll-cue" aria-label="10 percent off sale, scroll down to explore"><span class="scroll-sale-row"><span class="scroll-sale-mark" aria-label="10 percent"><strong>10%</strong></span><span class="scroll-sale-off">OFF</span><span class="scroll-sale-copy">SALE</span></span><span class="scroll-arrow" aria-hidden="true">↓</span></a>
  </section>
  <section class="search-section" id="search" aria-label="Find a trip and special offer"><div class="container"><div class="search-intro"><span class="eyebrow">YOUR NEXT ESCAPE STARTS HERE</span><h2>Find the trip that <em>feels like yours.</em></h2><p>Choose your dates, pick a place, and let the good part begin.</p></div><form class="search-form landing-search"><div class="field"><label for="search-destination">YOUR DESTINATION</label><input id="search-destination" name="destination" placeholder="Where would you like to go?" list="landing-destinations"><datalist id="landing-destinations">${places.map(p => `<option value="${p.title}">`).join('')}</datalist></div><div class="field"><label for="landing-start">CHECK IN</label><input id="landing-start" name="start" type="date"></div><div class="field"><label for="landing-end">CHECK OUT</label><input id="landing-end" name="end" type="date"></div><div class="field"><label for="landing-guests">TRAVELLERS</label><select id="landing-guests" name="guests"><option value="2">2 travellers</option><option value="1">1 traveller</option><option value="3">3 travellers</option><option value="4">4 travellers</option><option value="5">5 travellers</option></select></div><button class="btn btn-forest search-submit" aria-label="Search journeys">Find your journey <span>↗</span></button></form><div class="sale-banner"><div class="sale-visual" aria-hidden="true">${photo('photo-1540202404-a2f29016b523', 'Overwater villas in the Maldives', 1200)}</div><div class="sale-copy"><span class="sale-kicker">A LITTLE SOMETHING EXTRA</span><h2>Your next journey.<br><em>10% less.</em></h2><p>Book any journey and use your code at checkout to save 10%.</p><div class="sale-actions"><span class="sale-code">Use code <strong>TRAVELX10</strong></span><a class="sale-button" href="${page('search-results.html')}">Explore journeys <span>↗</span></a></div><div class="sale-countdown" data-expires-at="2026-11-18T23:59:59+02:00" role="timer" aria-label="Offer countdown"><span class="sale-countdown-label">OFFER ENDS IN</span><span class="sale-countdown-part"><strong class="sale-countdown-value">00</strong><small>DAYS</small></span><span class="sale-countdown-part"><strong class="sale-countdown-value">00</strong><small>HRS</small></span><span class="sale-countdown-part"><strong class="sale-countdown-value">00</strong><small>MIN</small></span><span class="sale-countdown-part"><strong class="sale-countdown-value">00</strong><small>SEC</small></span></div></div><span class="sale-discount" aria-label="10 percent off">10<small>% OFF</small></span></div></div></section>
  <section class="destination-section section" id="destinations"><div class="container"><div class="section-heading reveal"><div><span class="eyebrow">A WORLD WELL TRAVELLED</span><h2 class="section-title">Places that stay<br><em>with you.</em></h2></div><p class="heading-note">A collection of remarkable corners, chosen for the feeling they leave behind. Find the one that feels like yours.</p><span class="section-number">01 / DESTINATIONS</span></div><div class="destination-mosaic">${destinationMosaic()}</div><div class="section-action"><span>Six of the many places we love</span><a class="text-arrow" href="${page('destinations.html')}">View all destinations <i>↗</i></a></div></div></section>
  <section class="feeling-section" id="about"><div class="container feeling-layout"><div class="feeling-images reveal reveal-left"><div class="feeling-image main-feeling">${photo('photo-1476514525535-07fb3b4ae5f1', 'A still turquoise lake among the mountains', 1200)}<span class="image-caption">A morning in the Dolomites</span></div><div class="feeling-image inset-feeling">${photo('photo-1518837695005-2083093ee35b', 'Soft ocean waves in warm light', 800)}<span class="image-stamp">TRAVEL<br>WELL</span></div><span class="feeling-index">FIELD NOTES &nbsp; / &nbsp; 01</span></div><div class="feeling-copy reveal reveal-right"><span class="eyebrow">THE TRAVELX EXPERIENCE</span><h2 class="section-title">Travel is not just about places. <em>It's how they make you feel.</em></h2><p class="feeling-intro">The best journeys leave room for surprise. We bring considered details and local perspective together, then let the place do what it does best.</p><div class="numbered-features"><div><span>01</span><b>Curated journeys</b><small>Thoughtfully shaped around you.</small></div><div><span>02</span><b>Exceptional stays</b><small>Places with a story of their own.</small></div><div><span>03</span><b>Personal experiences</b><small>Closer to the character of a place.</small></div><div><span>04</span><b>Seamless planning</b><small>Every detail, quietly taken care of.</small></div></div><a class="text-arrow" href="${page('destinations.html')}">Get to know TravelX <i>↗</i></a></div></div></section>
  <section class="experience-section section" id="experiences" aria-label="Experiences along the road"><div class="experience-road-backdrop" aria-hidden="true"><video class="experience-road-video" muted loop playsinline preload="none" poster="assets/videos/journey-road-poster.jpg"><source data-src="assets/videos/journey-road.mp4" type="video/mp4"></video></div><div class="experience-road-shade" aria-hidden="true"></div><div class="container experience-content"><div class="section-heading reveal"><div><span class="eyebrow">MOMENTS THAT MOVE YOU</span><h2 class="section-title">Travel, in its<br><em>many moods.</em></h2></div><p class="heading-note">Every road opens a different kind of journey. Choose a feeling and follow it.</p></div><div class="journey-route">${renderExperienceStops()}</div></div></section>
  <section class="signature-journey" id="signature-journey"><div class="signature-backdrop"><video class="signature-video" muted loop playsinline preload="none" poster="assets/videos/signature-maldives-poster.jpg" aria-hidden="true"><source src="assets/videos/signature-maldives.mp4" type="video/mp4"></video></div><div class="signature-shade"></div><div class="signature-orbit orbit-one"></div><div class="signature-orbit orbit-two"></div><div class="container signature-content reveal"><span class="eyebrow">THE JOURNEY OF THE SEASON</span><h2>Your next<br><em>extraordinary escape.</em></h2><p>Slow down to island time. A private villa, the reef at your doorstep, and nothing on the agenda but the horizon.</p><div class="signature-details"><span><small>DESTINATION</small>THE MALDIVES</span><span><small>DURATION</small>7 NIGHTS</span><span><small>FROM</small>$2,890 <small>PER PERSON</small></span></div><a class="btn btn-gold magnetic" href="${page('trip-details.html', '?id=maldives-retreat')}">Book this journey <span>↗</span></a></div><div class="price-seal"><span>YOUR PRIVATE</span><strong>ISLAND<br>ESCAPE</strong><i>✳</i></div></section>
  <section class="why-section section" aria-label="The TravelX difference"><div class="why-backdrop" aria-hidden="true"><span class="why-shade"></span></div><div class="container"><div class="section-heading reveal"><div><span class="eyebrow">THE TRAVELX DIFFERENCE</span><h2 class="section-title">Considered, from<br><em>the very beginning.</em></h2></div><p class="heading-note">Good journeys feel effortless. Behind the scenes, every choice is made with care.</p></div><div class="benefit-carousel" role="region" aria-label="TravelX benefits" aria-roledescription="carousel"><div class="benefit-viewport"><div class="benefit-list">${[['Tailor-made journeys', 'Made around your own pace, preferences and sense of wonder.'], ['Handpicked luxury stays', 'Distinctive places selected for character, comfort and a true sense of place.'], ['Dedicated travel support', 'A thoughtful human touch before, during and whenever you need us.'], ['Seamless booking', 'One considered plan, with the details brought together beautifully.']].map(([title, copy], index) => `<article class="benefit" role="group" aria-roledescription="slide" aria-label="${index + 1} of 4" aria-hidden="${index !== 0}"><div><h3>${title}</h3><p>${copy}</p></div></article>`).join('')}</div></div></div></div></section>
  <section class="numbers-band"><div class="container numbers-inner">${[['120', '+', 'Destinations'], ['15', 'K+', 'Happy travellers'], ['350', '+', 'Curated journeys'], ['98', '%', 'Guest satisfaction']].map(([n, s, l]) => `<div class="number-cell reveal"><strong><span class="count" data-count="${n}">0</span>${s}</strong><small>${l}</small></div>`).join('')}</div></section>
  <section class="testimonial-section section" id="testimonials"><div class="container testimonial-layout"><div class="testimonial-lead reveal"><span class="eyebrow">POSTCARDS FROM THE ROAD</span><h2 class="section-title">The memories<br>we <em>make room for.</em></h2></div><div class="testimonial-stage reveal" aria-live="polite">${testimonials.map((t, i) => `<article class="testimonial-slide ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-hidden="${i !== 0}"><span class="quote-mark">“</span><blockquote>${t.quote}</blockquote><div class="testimonial-person">${photo(t.avatar, `Portrait of ${t.name}`, 160)}<div><strong>${t.name}</strong><small>${t.country}</small></div><span class="testimonial-trip">${t.trip}</span></div></article>`).join('')}<div class="slider-controls">${testimonials.map((_, i) => `<button class="slider-dot ${i === 0 ? 'active' : ''}" aria-label="Show traveller story ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}</div></div></div><p class="container demo-note">Traveller stories are illustrative demo content.</p></section>
  <section class="journal-section section" id="journal"><div class="container"><div class="section-heading reveal"><div><span class="eyebrow">THE TRAVELX JOURNAL</span><h2 class="section-title">A little inspiration<br><em>for the road.</em></h2></div><a class="text-arrow heading-journal-link" href="${page('destinations.html')}">Explore the world with us <i>↗</i></a><span class="section-number">04 / FIELD NOTES</span></div><div class="journal-grid">${stories.map((s, i) => `<article class="journal-story reveal"><a href="${page('destination-details.html', `?id=${s.id}`)}" class="journal-photo ${i === 0 ? 'journal-photo-tall' : ''}">${photo(s.image, s.title, 1000)}<span class="journal-read">READ STORY ↗</span></a><div class="journal-meta"><span>${s.category}</span><span>${s.date}</span></div><h3><a href="${page('destination-details.html', `?id=${s.id}`)}">${s.title}</a></h3><a class="journal-link" href="${page('destination-details.html', `?id=${s.id}`)}">Read the story <i>→</i></a></article>`).join('')}</div></div></section>
  <section class="newsletter-section" id="newsletter"><div class="newsletter-image">${photo('photo-1500534623283-312aade485b7', 'A winding road through an open landscape', 1600)}</div><div class="newsletter-overlay"></div><div class="container newsletter-content reveal"><span class="eyebrow">LET THE WORLD INSPIRE YOU</span><h2>Somewhere wonderful<br>is calling.</h2><p>Receive travel inspiration, exclusive journeys, and carefully selected experiences.</p><form class="newsletter-form landing-newsletter"><label class="sr-only" for="newsletter-email">Email address</label><input id="newsletter-email" type="email" name="email" placeholder="Your email address" required><button class="btn btn-gold">Sign me up <span>↗</span></button></form><small class="newsletter-feedback" aria-live="polite">A considered note, now and then. Unsubscribe any time.</small></div><span class="newsletter-side-note">LET THE HORIZON FIND YOU</span></section>
 </main>${renderFooter()}<div class="toast" role="status" aria-live="polite"></div><button class="back-top" aria-label="Back to top"><span class="back-top-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg></span><span class="back-top-label">BACK TO TOP</span></button><div class="page-wash" aria-hidden="true"></div>`;
    const localData = read();
    const signedInUser = localData.users.find(user => user.email === localData.currentUser);
    if (signedInUser) {
        const accountLink = one('.landing-nav .login-link');
        accountLink.href = page('dashboard.html');
        accountLink.textContent = 'My account';
        const mobileAccount = one('.mobile-account-links');
        if (mobileAccount) mobileAccount.innerHTML = `<a href="${page('dashboard.html')}">My account</a>`;
        const joinLink = one('.landing-footer .footer-links a[href$="register.html"]');
        if (joinLink) { joinLink.href = page('profile.html'); joinLink.textContent = 'Your profile'; }
    }
    bindLanding(); initLandingMotion();
    if (location.hash) requestAnimationFrame(() => scrollLandingTarget(location.hash, 'instant'));
}

function renderFooter() { return `<footer class="landing-footer" id="contact"><div class="container"><div class="footer-top"><div class="footer-brand-column"><a class="brand" href="#top" aria-label="TravelX home"><img class="brand-emblem" src="assets/images/Luxury%20TravelX%20Globe%20Emblem.png" alt="TravelX"></a><p>The world, thoughtfully yours.<br>Journeys made for the way you want to feel.</p><div class="social-links"><a href="https://instagram.com" aria-label="Instagram">ig</a><a href="https://pinterest.com" aria-label="Pinterest">p</a><a href="https://facebook.com" aria-label="Facebook">f</a></div></div><div class="footer-links"><h3>EXPLORE</h3><a href="${page('destinations.html')}">Destinations</a><a href="#experiences">Experiences</a><a href="#journal">Travel journal</a><a href="${page('search-results.html')}">Find a journey</a></div><div class="footer-links"><h3>TRAVELX</h3><a href="#about">Our approach</a><a href="#testimonials">Traveller stories</a><a href="${page('register.html')}">Join TravelX</a><a href="${page('profile.html')}">Your account</a></div><div class="footer-links"><h3>DEVELOPERS</h3><a href="${page('developers.html')}">Meet the team</a></div><div class="footer-links"><h3>WE'RE HERE</h3><a href="mailto:jfkghodiks@gmail.com">jfkghodiks@gmail.com</a><a href="tel:+201004062440">+20 1004062440</a><span>Available around the world,<br>whenever you need us.</span></div></div><div class="footer-bottom"><span>© 2026 TRAVELX JOURNEYS</span><span>MADE FOR THE WAY YOU WANT TO FEEL</span><a href="#top">BACK TO THE BEGINNING ↑</a></div></div></footer>` }

function bindLanding() {
    const menu = one('#landing-menu'), toggle = one('.mobile-toggle');
    const closeMenu = restoreFocus => {
        if (!menu || !toggle) return;
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        if (restoreFocus) toggle.focus();
    };
    toggle?.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu?.classList.contains('open')) closeMenu(true);
    });
    document.addEventListener('pointerdown', event => {
        if (menu?.classList.contains('open') && !menu.contains(event.target) && !toggle.contains(event.target)) closeMenu(false);
    });
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', event => {
        const hash = a.getAttribute('href');
        if (!hash?.startsWith('#')) {
            closeMenu(false);
            return;
        }
        event.preventDefault();
        closeMenu(false);
        history.pushState(null, '', hash);
        scrollLandingTarget(hash, 'smooth');
    }));
    window.addEventListener('popstate', () => scrollLandingTarget(location.hash, 'instant'));
    initWhyCarousel();
    initSaleCountdown();
    initExperienceRoad();
    initExperienceConnectors();
    initSignatureBackground();
    oceanThemeController = initOceanScene(transitionDark);
    $$('.theme-toggle').forEach(b => b.addEventListener('click', () => { transitionDark = !transitionDark; document.body.classList.toggle('dark', transitionDark); write({ theme: transitionDark ? 'dark' : 'light' }); oceanThemeController?.(transitionDark) }));
    const form = one('.landing-search');
    const checkIn = one('#landing-start', form), checkOut = one('#landing-end', form);
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    checkIn.min = today.toISOString().slice(0, 10);
    const syncDateConstraints = () => {
        checkOut.min = checkIn.value;
        checkIn.setCustomValidity(checkOut.value && !checkIn.value ? 'Choose a check-in date as well.' : '');
        checkOut.setCustomValidity(
            checkIn.value && !checkOut.value
                ? 'Choose a check-out date as well.'
                : checkIn.value && checkOut.value && checkOut.value <= checkIn.value
                    ? 'Check-out must be after check-in.'
                    : ''
        );
    };
    checkIn.addEventListener('change', syncDateConstraints);
    checkOut.addEventListener('change', syncDateConstraints);
    form.addEventListener('submit', event => {
        event.preventDefault();
        syncDateConstraints();
        if (!form.reportValidity()) return;
        const searchData = new FormData(form);
        const query = normalizePlaceName(searchData.get('destination'));
        const selectedPlace = places.find(place => {
            const destination = destinations.find(item => item.id === place.id);
            return [place.title, destination?.name, destination?.country]
                .some(name => normalizePlaceName(name) === query);
        });
        if (selectedPlace) {
            const destination = destinations.find(item => item.id === selectedPlace.id);
            if (destination) searchData.set('destination', destination.name);
        }
        location.href = page('search-results.html', '?' + new URLSearchParams(searchData));
    });
    $$('.place-favorite').forEach(b => { const id = b.dataset.fav; const paint = () => { const yes = read().favorites.includes(id); b.textContent = yes ? '♥' : '♡'; b.setAttribute('aria-pressed', String(yes)) }; paint(); b.addEventListener('click', async () => { const saved = !read().favorites.includes(id); try { await saveFavorite(id, saved); paint(); toast(saved ? 'Saved to favourites.' : 'Removed from favourites.') } catch (error) { toast(error.message,'error') } }) });
    $$('.landing-newsletter').forEach(f => f.addEventListener('submit', async e => { e.preventDefault(); const feedback = f.parentElement.querySelector('.newsletter-feedback'), button = f.querySelector('button'), email = String(new FormData(f).get('email') || '').trim().toLowerCase(); button.disabled = true; feedback.classList.remove('is-success', 'is-error'); feedback.textContent = 'Saving your subscription…'; try { await subscribeNewsletter(email); feedback.textContent = 'Thank you — your subscription has been saved.'; feedback.classList.add('is-success'); f.reset() } catch (error) { feedback.textContent = error.message; feedback.classList.add('is-error') } finally { button.disabled = false } }));
    one('.back-top').addEventListener('click', () => window.scrollTo({
        top: 0,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    }));
    const backTop = one('.back-top');
    const footerAction = one('.landing-footer .footer-bottom a');
    let backTopFrame = 0;
    const updateBackTop = () => {
        backTopFrame = 0;
        const beforeFooterAction = !footerAction || footerAction.getBoundingClientRect().top > window.innerHeight + 80;
        backTop.classList.toggle('visible', window.scrollY > 650 && beforeFooterAction);
    };
    window.addEventListener('scroll', () => {
        if (!backTopFrame) backTopFrame = requestAnimationFrame(updateBackTop);
    }, { passive: true });
    updateBackTop();
    if (footerAction) {
        const footerObserver = new IntersectionObserver(([entry]) => {
            backTop.classList.toggle('near-footer', entry.isIntersecting);
        }, { rootMargin: '0px 0px 80px 0px' });
        footerObserver.observe(footerAction);
    }
    const slides = $$('.testimonial-slide'), dots = $$('.slider-dot'), stage = one('.testimonial-stage');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0, autoplayTimer, resumeTimer, wheelEndTimer, wheelDeltaX = 0, wheelGestureLocked = false, isPointerDown = false, activePointerId = null, pointerStartX = null, stageVisible = false;
    const renderSlide = n => {
        active = (n + slides.length) % slides.length;
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === active);
            slide.setAttribute('aria-hidden', String(index !== active));
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === active);
            dot.setAttribute('aria-pressed', String(index === active));
        });
    };
    const canAutoplay = () => stageVisible && !document.hidden && !reducedMotion.matches;
    const clearAutoplay = () => {
        clearTimeout(autoplayTimer);
        clearInterval(autoplayTimer);
        clearTimeout(resumeTimer);
        autoplayTimer = resumeTimer = undefined;
    };
    const scheduleAutoplay = (delay = 3000) => {
        clearAutoplay();
        if (!canAutoplay()) return;
        resumeTimer = setTimeout(() => {
            resumeTimer = undefined;
            if (!canAutoplay()) return;
            renderSlide(active + 1);
            autoplayTimer = setInterval(() => renderSlide(active + 1), 4500);
        }, Math.max(delay, 1));
    };
    const moveSlide = step => { renderSlide(active + step); scheduleAutoplay() };
    dots.forEach((dot, index) => dot.addEventListener('click', () => {
        renderSlide(index);
        scheduleAutoplay();
    }));
    stage.addEventListener('wheel', event => {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        if (event.cancelable) event.preventDefault();
        clearAutoplay();
        wheelDeltaX += event.deltaX * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? stage.clientWidth : 1);
        if (!wheelGestureLocked && Math.abs(wheelDeltaX) >= 40) {
            renderSlide(active + (wheelDeltaX > 0 ? 1 : -1));
            wheelGestureLocked = true;
        }
        clearTimeout(wheelEndTimer);
        wheelEndTimer = setTimeout(() => {
            wheelDeltaX = 0;
            wheelGestureLocked = false;
            scheduleAutoplay();
        }, 220);
    }, { passive: false });
    stage.addEventListener('pointerdown', event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)
            || (event.target instanceof Element && event.target.closest('.slider-dot'))) return;
        isPointerDown = true;
        activePointerId = event.pointerId;
        pointerStartX = event.clientX;
        clearAutoplay();
        if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
    });
    const releasePointer = (event, cancelled = false) => {
        if (!isPointerDown || event.pointerId !== activePointerId) return;
        if (pointerStartX !== null && !cancelled) {
            const distance = event.clientX - pointerStartX;
            if (Math.abs(distance) > 45) renderSlide(active + (distance < 0 ? 1 : -1));
        }
        pointerStartX = null;
        isPointerDown = false;
        activePointerId = null;
        scheduleAutoplay();
    };
    window.addEventListener('pointerup', event => releasePointer(event));
    window.addEventListener('pointercancel', event => releasePointer(event, true));
    stage.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); moveSlide(-1) }
        if (event.key === 'ArrowRight') { event.preventDefault(); moveSlide(1) }
    });
    document.addEventListener('visibilitychange', () => scheduleAutoplay());
    reducedMotion.addEventListener('change', () => scheduleAutoplay());
    const stageObserver = new IntersectionObserver(([entry]) => {
        stageVisible = entry.isIntersecting;
        scheduleAutoplay();
    }, { threshold: .2 });
    stageObserver.observe(stage);
    stage.setAttribute('tabindex', '0');
}
function toast(text, type = 'success') { const el = one('.toast'); el.textContent = text; el.classList.toggle('is-error', type === 'error'); el.classList.add('show'); clearTimeout(el.dismissTimer); el.dismissTimer = setTimeout(() => el.classList.remove('show'), 3200) }
export { renderHome };
