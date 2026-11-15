import {destinations} from '../data/destinations.js';import {trips} from '../data/trips.js';import {reviews} from '../data/reviews.js';import {read,write,update,activeUser} from './storage.js';
import { authenticate, bootstrapTravelX, cancelBooking, completePasswordReset, createBooking, deleteBooking, refreshAccountSnapshot, saveFavorite, sendPasswordReset, subscribeNewsletter, updateAccountProfile, updateBooking } from './runtime.js';
import { initJourneyGlobe } from './globe.js?v=earth-3d-20261114-v2';

let bookingsPage;
bootstrapTravelX().then(() => {
bookingsPage = editableBookingsPage;
const path=location.pathname, inPages=/\/pages\//.test(path), rootEntry=!path.includes('/Front-end/')&&!inPages, root=inPages?'../':'./', pageName=path.split('/').pop()||'index.html';
const img=(id,w=900)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=82`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(p)=>p==='index.html'||p.startsWith('index.html#')?root+'../'+p:root+'pages/'+p;
const $=(q,el=document)=>el.querySelector(q), $$=(q,el=document)=>[...el.querySelectorAll(q)];
const data=read();document.body.classList.toggle('dark',data.theme==='dark');
function image(id,alt,w){return `<img src="${img(id,w)}" alt="${esc(alt)}" loading="lazy" onerror="this.style.display='none';this.parentElement.style.background='#d9ded8'">`}
function avatarSource(value){return String(value||'').startsWith('data:image/')?value:img(value||'photo-1534528741775-53994a69daeb',180)}
function brandMarkup(){return `<img class="brand-emblem" src="${root}assets/images/Luxury%20TravelX%20Globe%20Emblem.png" alt="TravelX">`}
function header(){const user=activeUser();return `<header class="topbar"><div class="container nav-inner"><a class="brand" href="${link('index.html')}" aria-label="TravelX home">${brandMarkup()}</a><nav class="nav-links" id="site-menu" aria-label="Main navigation">${[['Home','index.html'],['Destinations','destinations.html'],['About','index.html#about'],['Experiences','search-results.html'],['Reviews','index.html#testimonials'],['Journal','index.html#journal'],['Contact','index.html#contact']].map(([x,y])=>`<a href="${y.includes('#')?root+y:link(y)}">${x}</a>`).join('')}</nav><div class="nav-actions"><button class="icon-btn theme-toggle" aria-label="Toggle theme">☼</button>${data.currentUser?`<a class="account-chip" href="${link('profile.html')}"><img class="account-avatar" src="${esc(avatarSource(user?.avatar))}" alt=""><span>${esc(user?.name||'My account')}</span></a>`:`<a class="login-link" href="${link('login.html')}">Log in</a><a class="btn btn-gold" href="${link('register.html')}">Get started</a>`}<button class="icon-btn mobile-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-menu">☰</button></div></div></header>`}
function footer(){return `<footer class="footer" id="contact"><div class="container"><div class="footer-grid"><div><a class="brand" href="${link('index.html')}" style="color:white">${brandMarkup()}</a><p class="muted">The world, thoughtfully yours.<br>Journeys made for the way you want to feel.</p></div><div><h4>Explore</h4><a href="${link('destinations.html')}">Destinations</a><a href="${link('search-results.html')}">Experiences</a><a href="${link('dashboard.html')}">Your trips</a></div><div><h4>TravelX</h4><a href="${link('index.html#about')}">Our story</a><a href="${link('index.html#contact')}">Contact</a><a href="${link('profile.html')}">Profile</a></div><div><h4>Stay inspired</h4><p class="muted">Thoughtful travel notes, occasionally.</p><form class="newsletter-form"><input type="email" name="email" required placeholder="Email address" aria-label="Email address"><button class="btn btn-gold">Join</button></form></div></div><div class="footer-bottom">© 2025 TravelX. A thoughtful way to see the world.</div></div></footer><div class="toast" role="status" aria-live="polite"></div>`}
function initAuthPageBackground(){const page=$('.auth-page'),form=$('#auth-form, #forgot-form, #reset-form');if(!page||!form)return;document.body.classList.add('auth-screen');const video=document.createElement('video');video.className='auth-page-video';video.autoplay=true;video.muted=true;video.loop=true;video.playsInline=true;video.setAttribute('aria-hidden','true');video.poster=root+'assets/videos/auth-beach-poster.jpg';const source=document.createElement('source');source.src=root+'assets/videos/auth-beach-background.mp4';source.type='video/mp4';video.append(source);page.prepend(video);const copy=$('.form-photo .auth-photo-copy');if(copy){form.prepend(copy);$('.form-photo')?.remove()}$('.footer')?.remove()}
function shell(content){const accountWorkspace=data.currentUser&&['dashboard.html','bookings.html','favorites.html','journeys.html','profile.html'].includes(pageName);document.body.classList.toggle('account-shell',Boolean(accountWorkspace));if(!accountWorkspace)document.body.insertAdjacentHTML('afterbegin',header());document.body.insertAdjacentHTML('beforeend',content+(accountWorkspace?'<div class="toast" role="status" aria-live="polite"></div>':footer()));if(['login.html','register.html','forgot-password.html','reset-password.html'].includes(pageName))initAuthPageBackground();wireShared();wireNavigation()}
function toast(msg,type='success'){const t=$('.toast');if(!t)return;t.textContent=msg;t.classList.toggle('is-error',type==='error');t.classList.add('show');clearTimeout(t.dismissTimer);t.dismissTimer=setTimeout(()=>t.classList.remove('show'),3200)}
function formFeedback(element,message,type='success'){if(!element)return;element.textContent=message;element.classList.toggle('is-success',Boolean(message)&&type==='success');element.classList.toggle('is-error',Boolean(message)&&type==='error')}
function cards(items){return items.map(d=>`<article class="card reveal"><div class="card-image"><a href="${link('destination-details.html')}?id=${d.id}">${image(d.image,d.name+' landscape')}</a><button class="fav" data-fav="${d.id}" aria-label="Save ${d.name}">♡</button></div><div class="card-body"><div class="card-meta"><span>${d.country} · ${d.category}</span><span>★ ${d.rating}</span></div><h3>${d.name}</h3><p class="muted">${d.description}</p><div class="card-foot"><span>From <b class="price">$${d.price.toLocaleString()}</b> / person</span><a class="btn btn-outline" href="${link('destination-details.html')}?id=${d.id}">Discover →</a></div></div></article>`).join('')}
function home(){const featured=destinations.slice(0,3);shell(`<main><section class="hero"><div class="container hero-content"><span class="eyebrow">The art of going well</span><h1>Travel Beyond<br>Ordinary.</h1><p>Considered journeys for curious souls. Discover the world at your own pace, with every detail thoughtfully arranged.</p><div class="hero-buttons"><a class="btn btn-gold" href="${link('destinations.html')}">Explore destinations ↗</a><a class="btn btn-outline" href="${link('search-results.html')}">Discover experiences</a></div></div></section><div class="container search-panel"><form class="search-form"><div class="field"><label>Where to?</label><input name="destination" placeholder="Search a destination" list="dest-list"><datalist id="dest-list">${destinations.map(x=>`<option>${x.name}</option>`).join('')}</datalist></div><div class="field"><label>Check in</label><input name="start" type="date"></div><div class="field"><label>Check out</label><input name="end" type="date"></div><div class="field"><label>Guests</label><select name="guests"><option>2</option><option>1</option><option>3</option><option>4</option><option>5</option></select></div><button class="btn btn-forest">Search trips →</button></form></div><section class="section"><div class="container"><div class="home-intro"><span class="eyebrow">Places to linger</span><h2 class="section-title">A world of possibility</h2><p class="muted">From quiet shores to storied cities, find the place that feels like yours.</p></div><div class="grid">${cards(featured)}</div><div style="text-align:center;margin-top:30px"><a class="btn btn-outline" href="${link('destinations.html')}">View all destinations →</a></div></div></section><section class="section" style="background:var(--surface)"><div class="container split"><div>${image('photo-1476514525535-07fb3b4ae5f1','A peaceful alpine lake',1100).replace('<img','<img class="split-image"')}<span class="tag" style="margin-top:14px">Curated with care</span></div><div><span class="eyebrow">Why TravelX</span><h2 class="section-title">The details make the journey.</h2><p class="muted">We believe great travel is about more than where you go. It is how a place makes you feel, and the people and moments that stay with you.</p><div class="feature-list"><div><strong>Thoughtful curation</strong><span class="muted">Every stay and experience chosen with intention.</span></div><div><strong>Local perspective</strong><span class="muted">Meaningful encounters, beyond the usual path.</span></div><div><strong>Seamless planning</strong><span class="muted">We take care of the details, so you can be present.</span></div><div><strong>Travel your way</strong><span class="muted">Flexible journeys built around you.</span></div></div><a class="btn btn-gold" style="margin-top:25px" href="${link('destinations.html')}">Find your journey →</a></div></div></section><section class="section"><div class="container"><div class="center"><span class="eyebrow">Kind words</span><h2 class="section-title">Stories worth bringing home</h2></div><div class="grid">${reviews.map(r=>`<article class="review"><div class="stars">★★★★★</div><p>“${r.text}”</p><strong>${r.name}</strong><div class="muted">Travelled to ${r.place}</div></article>`).join('')}</div></div></section><section class="newsletter"><div class="container"><span class="eyebrow">A note from the world</span><h2 class="section-title">Inspiration, delivered thoughtfully.</h2><p>Join our list for new journeys and considered travel notes.</p><form class="newsletter-form"><input type="email" required placeholder="Your email address" aria-label="Your email address"><button class="btn btn-gold">Subscribe →</button></form></div></section></main>`);const f=$('.search-form');f.addEventListener('submit',e=>{e.preventDefault();const q=new URLSearchParams(new FormData(f));location.href=link('search-results.html')+'?'+q});}
function destinationsPage(){shell(`<main class="container"><div class="page-head"><span class="eyebrow">Find your somewhere</span><h1 class="section-title">Destinations</h1><p class="muted">Places that stay with you long after you leave.</p></div><div class="filters"><input id="dest-search" type="search" placeholder="Search destinations" aria-label="Search destinations"><select id="category" aria-label="Filter by category"><option value="">All categories</option>${['Beach','Adventure','Cultural','Luxury','Nature'].map(x=>`<option>${x}</option>`).join('')}</select><select id="sort" aria-label="Sort destinations"><option value="popular">Most loved</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><input id="max-price" type="number" min="0" step="any" placeholder="Max budget ($)" aria-label="Maximum budget"></div><div class="grid" id="dest-grid">${cards(destinations)}</div></main>`);$('#dest-search').addEventListener('input',filterDest);$('#max-price').addEventListener('input',filterDest);$('#category').addEventListener('change',filterDest);$('#sort').addEventListener('change',filterDest);filterDest();}
function filterDest(){const term=$('#dest-search').value.trim().toLocaleLowerCase(),cat=$('#category').value,maxText=$('#max-price').value.trim(),max=maxText===''?null:Number(maxText),sort=$('#sort').value;let list=destinations.filter(d=>(d.name.toLocaleLowerCase().includes(term)||d.country.toLocaleLowerCase().includes(term))&&(!cat||d.category===cat)&&(max===null||(Number.isFinite(max)&&max>=0&&Number(d.price)<=max)));if(sort==='low')list.sort((a,b)=>Number(a.price)-Number(b.price));else if(sort==='high')list.sort((a,b)=>Number(b.price)-Number(a.price));else list.sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)||Number(b.reviews||0)-Number(a.reviews||0));$('#dest-grid').innerHTML=list.length?cards(list):`<div class="empty" style="grid-column:1/-1"><h3>Nothing found just yet</h3><p class="muted">Try adjusting your search.</p></div>`;bindFavs();}
function detailsPage(){const d=destinations.find(x=>x.id===new URLSearchParams(location.search).get('id'))||destinations[0],related=trips.filter(t=>t.destinationId===d.id);shell(`<main><section class="detail-hero" style="background-image:linear-gradient(0deg,#101a16aa,transparent),url('${img(d.image,1700)}')"><div class="container"><span class="eyebrow">${d.country} · ${d.category}</span><h1 class="section-title" style="color:white;font-size:4rem">${d.name}</h1><p>★ ${d.rating} · ${d.reviews} thoughtful traveller reviews</p></div></section><div class="container content-section"><div class="detail-layout"><div><span class="eyebrow">A sense of place</span><h2 class="section-title">Discover ${d.name}</h2><p class="muted">${d.description}</p><div class="gallery">${[d.image,related[0]?.image||d.image,'photo-1470770841072-f978cf4d019e'].map((im,i)=>image(im,`${d.name} view ${i+1}`,800)).join('')}</div><h2 class="section-title" style="font-size:2rem;margin-top:35px">A few highlights</h2><ul>${d.attractions.map(x=>`<li>${x}</li>`).join('')}</ul><h2 class="section-title" style="font-size:2rem;margin-top:35px">Journeys here</h2>${related.map(tripRow).join('')||'<p>New journeys coming soon.</p>'}<h2 class="section-title" style="font-size:2rem;margin-top:35px">Find it on the map</h2><div class="map"><div id="map" data-lat="${d.lat}" data-lng="${d.lng}" data-name="${d.name}"></div></div></div><aside class="panel"><span class="eyebrow">Make it yours</span><h3 class="section-title" style="font-size:1.8rem">From $${d.price.toLocaleString()}</h3><p class="muted">per person · thoughtfully planned</p><p>★★★★★ &nbsp; ${d.rating} (${d.reviews} reviews)</p><button class="btn btn-gold" style="width:100%" onclick="location.href='${link('search-results.html')}?destination=${d.name}'">Explore trips →</button><button class="btn btn-outline" style="width:100%;margin-top:10px" data-fav="${d.id}">♡ Save to favourites</button></aside></div></div></main>`);}
function tripRow(t){return `<article class="booking-row"><a href="${link('trip-details.html')}?id=${t.id}">${image(t.image,t.title,400)}</a><div><a href="${link('trip-details.html')}?id=${t.id}"><strong>${t.title}</strong></a><div class="muted">${t.duration} days · from $${t.price.toLocaleString()}</div></div><a class="btn btn-outline row-action" href="${link('trip-details.html')}?id=${t.id}">View trip →</a></article>`}
function searchPage(){const params=new URLSearchParams(location.search),term=(params.get('destination')||'').trim().toLocaleLowerCase(),matched=destinations.filter(d=>!term||d.name.toLocaleLowerCase().includes(term)||d.country.toLocaleLowerCase().includes(term)),tripList=trips.filter(t=>matched.some(d=>d.id===t.destinationId));shell(`<main class="container"><div class="page-head"><span class="eyebrow">Your next chapter</span><h1 class="section-title">${term?'Journeys for '+esc(params.get('destination')):'Experiences'}</h1><p class="muted">${tripList.length} considered journeys · ${params.get('guests')||2} travellers</p></div><div class="filters"><select id="duration-filter" aria-label="Filter by trip duration"><option value="0">Any duration</option><option value="5">5+ days</option><option value="7">7+ days</option></select><select id="price-filter" aria-label="Filter by maximum trip price"><option value="0">Any price</option><option value="1800">Under $1,800</option><option value="2400">Under $2,400</option></select><select id="trip-sort" aria-label="Sort journeys"><option value="popular">Recommended</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div><div id="trip-results">${tripList.length?tripList.map(tripRow).join(''):`<div class="empty"><h3>No journeys match this search</h3><p class="muted">Explore all destinations to find your fit.</p><a class="btn btn-gold" href="${link('destinations.html')}">Browse destinations</a></div>`}</div></main>`);const apply=()=>{const minDuration=Number($('#duration-filter').value),maxPrice=Number($('#price-filter').value),sort=$('#trip-sort').value;let results=tripList.filter(trip=>(!minDuration||Number(trip.duration)>=minDuration)&&(!maxPrice||Number(trip.price)<=maxPrice));if(sort==='low')results.sort((a,b)=>Number(a.price)-Number(b.price));else if(sort==='high')results.sort((a,b)=>Number(b.price)-Number(a.price));else results.sort((a,b)=>Number(destinations.find(d=>d.id===b.destinationId)?.rating||0)-Number(destinations.find(d=>d.id===a.destinationId)?.rating||0));$('#trip-results').innerHTML=results.length?results.map(tripRow).join(''):'<div class="empty">No trips match those filters.</div>'};$$('#duration-filter,#price-filter,#trip-sort').forEach(el=>el.addEventListener('change',apply));apply();}
function tripPage() {
    const trip = trips.find(item => item.id === new URLSearchParams(location.search).get('id')) || trips[0];
    const destination = destinations.find(item => item.id === trip.destinationId);

    shell(`
        <main class="container trip-details-page">
            <header class="page-head">
                <span class="eyebrow">${esc(destination.name)} · ${trip.duration} days</span>
                <h1 class="section-title">${esc(trip.title)}</h1>
                <p class="muted">A carefully considered journey in ${esc(destination.country)}.</p>
            </header>
            <div class="two-col trip-layout">
                <div class="trip-content">
                    <div class="gallery trip-gallery">
                        ${[trip.image, destination.image, 'photo-1500530855697-b586d89ba3ee']
                            .map((asset, index) => image(asset, `${trip.title} scene ${index + 1}`, 900)).join('')}
                    </div>
                    <section class="trip-overview" aria-labelledby="trip-overview-title">
                        <span class="eyebrow">A sense of place</span>
                        <h2 class="section-title" id="trip-overview-title">The journey</h2>
                        <p class="muted">${esc(destination.description)}</p>
                    </section>
                    <section class="trip-itinerary" aria-labelledby="trip-itinerary-title">
                        <div class="trip-section-heading">
                            <div>
                                <span class="eyebrow">Your days, thoughtfully planned</span>
                                <h3 id="trip-itinerary-title">Day by day</h3>
                            </div>
                            <span class="trip-duration">${trip.duration} days</span>
                        </div>
                        <ol class="itinerary">
                            ${trip.itinerary.map((stop, index) => `
                                <li><span class="itinerary-day">Day ${String(index + 1).padStart(2, '0')}</span><span>${esc(stop)}</span></li>
                            `).join('')}
                        </ol>
                    </section>
                    <div class="trip-inclusions" aria-label="Journey inclusions">
                        <section class="trip-inclusion-card">
                            <h3>Included</h3>
                            <ul class="check-list">${trip.included.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
                        </section>
                        <section class="trip-inclusion-card">
                            <h3>Not included</h3>
                            <ul>${trip.excluded.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
                        </section>
                    </div>
                </div>
                <aside class="panel trip-booking-panel">
                    <span class="eyebrow">A journey to remember</span>
                    <h2 class="section-title" style="font-size:2rem">From $${trip.price.toLocaleString()}</h2>
                    <p class="muted">per person · ${esc(trip.dates)}</p>
                    <label>Preferred travel date
                        <input class="form-control" type="date" id="travel-date" min="${new Date().toISOString().slice(0, 10)}" style="width:100%;margin:8px 0">
                    </label>
                    <label>Guests
                        <select class="form-control" id="guest-count" style="width:100%;margin:8px 0">
                            <option>2</option><option>1</option><option>3</option><option>4</option><option>5</option>
                        </select>
                    </label>
                    <button class="btn btn-gold" id="reserve-trip" style="width:100%;margin-top:14px">Reserve this journey →</button>
                    <p class="muted" style="font-size:.8rem;text-align:center">No payment is taken in this demo.</p>
                    <p>★ ${destination.rating} · ${destination.reviews} reviews</p>
                </aside>
            </div>
        </main>`);

    $('#reserve-trip').addEventListener('click', () => {
        const query = new URLSearchParams({ trip: trip.id, guests: $('#guest-count').value });
        if ($('#travel-date').value) query.set('date', $('#travel-date').value);
        location.href = link('checkout.html') + '?' + query;
    });
}
function authPage(register = false) {
    const title = register ? 'Create your account' : 'Welcome back';
    shell(`<main class="form-page auth-page"><section class="form-photo" aria-hidden="true"><div class="auth-photo-copy"><span>TRAVELX PRIVATE</span><strong>Travel begins<br>with a feeling.</strong><small>Made for the way you want to feel.</small></div></section><div class="form-wrap"><form class="form-box" id="auth-form"><div class="auth-card-head"><span class="eyebrow">${register ? 'YOUR TRAVELX ACCOUNT' : 'WELCOME TO TRAVELX'}</span><span>01</span></div><h1>${title}</h1><p class="muted">${register ? 'Start planning journeys that feel like yours.' : 'Sign in to continue your journey.'}</p><p id="auth-error" class="muted" role="alert" aria-live="polite" hidden></p>${register ? `<label>Full name<input class="form-control" name="name" required autocomplete="name" placeholder="Your full name"></label>` : ''}<label>Email address<input class="form-control" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label>Password<div class="password-wrap"><input class="form-control" name="password" type="password" required minlength="${register ? 8 : 1}" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="${register ? 'At least 8 characters' : 'Your password'}"><button type="button" class="show-password">Show</button></div></label>${register ? `<label>Confirm password<input class="form-control" name="confirm" type="password" required placeholder="Repeat your password"></label>` : `<div class="auth-options"><label><input name="remember" type="checkbox"> Remember me</label><a class="muted" href="${link('forgot-password.html')}" id="forgot">Forgot password?</a></div>`}<button class="btn btn-gold" type="submit">${register ? 'Create account' : 'Log in'} <span>↗</span></button><p class="auth-switch muted">${register ? 'Already have an account?' : 'New to TravelX?'} <a href="${link(register ? 'login.html' : 'register.html')}">${register ? 'Log in' : 'Create an account'}</a></p></form></div></main>`);

    const form = $('#auth-form');
    const errorMessage = $('#auth-error');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.hidden = true;

        const formData = new FormData(form);
        if (register && formData.get('password') !== formData.get('confirm')) {
            errorMessage.textContent = 'Passwords do not match.';
            errorMessage.hidden = false;
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            const result = await authenticate(formData, register);
            if (result.verificationRequired) {
                errorMessage.textContent = 'Account created. Verify your email, then sign in.';
                errorMessage.hidden = false;
                return;
            }

            location.href = link('dashboard.html');
        } catch (error) {
            errorMessage.textContent = error.message || 'Authentication failed. Please try again.';
            errorMessage.hidden = false;
        } finally {
            submitButton.disabled = false;
        }
    });

    $('.show-password').addEventListener('click', (event) => {
        const input = $('[name="password"]');
        input.type = input.type === 'password' ? 'text' : 'password';
        event.currentTarget.textContent = input.type === 'password' ? 'Show' : 'Hide';
    });
}

function forgotPasswordPage(){shell(`<main class="form-page auth-page"><section class="form-photo" aria-hidden="true"><div class="auth-photo-copy"><span>TRAVELX ACCOUNT</span><strong>A fresh start<br>is one email away.</strong><small>We’ll send you a secure password reset link.</small></div></section><div class="form-wrap"><form class="form-box" id="forgot-form"><div class="auth-card-head"><span class="eyebrow">ACCOUNT RECOVERY</span><span>01</span></div><h1>Reset your password</h1><p class="muted">Enter the email address linked to your TravelX account.</p><p id="forgot-message" class="form-feedback" role="status" aria-live="polite" hidden></p><label>Email address<input class="form-control" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label><button class="btn btn-gold" type="submit">Send reset link <span>↗</span></button><p class="auth-switch muted"><a href="${link('login.html')}">Back to log in</a></p></form></div></main>`);initAuthPageBackground();const form=$('#forgot-form'),message=$('#forgot-message');form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;formFeedback(message,'Sending reset link…','neutral');message.hidden=false;try{await sendPasswordReset(new FormData(form).get('email'));formFeedback(message,'If an account exists for this email, a password reset link is on its way.');form.reset()}catch(error){formFeedback(message,error.message,'error')}finally{button.disabled=false}})}

function resetPasswordPage(){const token=new URLSearchParams(location.search).get('token');shell(`<main class="form-page auth-page"><section class="form-photo" aria-hidden="true"><div class="auth-photo-copy"><span>TRAVELX ACCOUNT</span><strong>Choose a new<br>password.</strong><small>Your new password keeps your journeys secure.</small></div></section><div class="form-wrap"><form class="form-box" id="reset-form"><div class="auth-card-head"><span class="eyebrow">SECURE YOUR ACCOUNT</span><span>02</span></div><h1>Set a new password</h1><p class="muted">Choose a password with at least 8 characters.</p><p id="reset-message" class="form-feedback" role="alert" aria-live="polite" ${token?'hidden':''}>This reset link is missing or invalid. Request a new one.</p><label>New password<input class="form-control" name="password" type="password" required minlength="8" autocomplete="new-password"></label><label>Confirm new password<input class="form-control" name="confirm" type="password" required minlength="8" autocomplete="new-password"></label><button class="btn btn-gold" type="submit" ${token?'':'disabled'}>Update password <span>↗</span></button><p class="auth-switch muted"><a href="${link('login.html')}">Back to log in</a></p></form></div></main>`);initAuthPageBackground();const form=$('#reset-form'),message=$('#reset-message');form.addEventListener('submit',async event=>{event.preventDefault();if(!token)return;if(form.elements.password.value!==form.elements.confirm.value){formFeedback(message,'The passwords do not match.','error');message.hidden=false;return}const button=form.querySelector('button[type="submit"]');button.disabled=true;formFeedback(message,'Updating your password…','neutral');message.hidden=false;try{await completePasswordReset(token,form.elements.password.value);formFeedback(message,'Your password has been updated. You can now log in.');form.reset()}catch(error){formFeedback(message,error.message,'error')}finally{button.disabled=false}})}
function currentGuard(){if(!window.__TRAVELX_AUTHENTICATED__){location.href=link('login.html');return false}return true}
function checkoutPage(){const t=trips.find(x=>x.id===new URLSearchParams(location.search).get('trip'))||trips[0],d=destinations.find(x=>x.id===t.destinationId),u=activeUser(),params=new URLSearchParams(location.search),count=Number(params.get('guests'))||2;const calc=()=>{const n=Number($('#checkout-guests').value)||1,sub=t.price*n,tax=Math.round(sub*.08),discount=$('#coupon-code').value.trim().toUpperCase()==='TRAVELX10'?Math.round(sub*.1):0;$('#subtotal').textContent='$'+sub.toLocaleString();$('#tax').textContent='$'+tax.toLocaleString();$('#discount').textContent='−$'+discount.toLocaleString();$('#total').textContent='$'+(sub+tax-discount).toLocaleString()};shell(`<main class="container"><div class="page-head"><span class="eyebrow">One step closer</span><h1 class="section-title">Review your journey</h1><p class="muted">Your booking is a simulated demo; no real payment will be collected.</p></div><form id="checkout-form" class="detail-layout"><div><section class="panel"><h2 class="section-title" style="font-size:1.8rem">Traveller details</h2><label>Full name<input class="form-control" name="name" required value="${esc(u?.name||'')}"></label><label>Email<input class="form-control" name="email" type="email" required value="${esc(u?.email||'')}" readonly></label><label>Phone<input class="form-control" name="phone" type="tel" required value="${esc(u?.phone||'')}" placeholder="+1 555 0100"></label><label>Travel date<input class="form-control" name="date" type="date" min="${new Date().toISOString().slice(0,10)}" value="${esc(params.get('date')||'')}" required></label><label>Number of guests<select class="form-control" id="checkout-guests" name="guests"><option ${count===1?'selected':''}>1</option><option ${count===2?'selected':''}>2</option><option ${count===3?'selected':''}>3</option><option ${count===4?'selected':''}>4</option><option ${count===5?'selected':''}>5</option></select></label><label>Coupon code<input class="form-control" id="coupon-code" placeholder="Try TRAVELX10"></label><p class="muted">Use <b>TRAVELX10</b> for 10% off this demo booking.</p></section></div><aside><section class="panel"><div class="booking-row" style="grid-template-columns:90px 1fr">${image(t.image,t.title,400)}<div><strong>${t.title}</strong><div class="muted">${d.name} · ${t.duration} days</div></div></div><h3>Price summary</h3><p>Subtotal <b style="float:right" id="subtotal"></b></p><p>Taxes (8%) <b style="float:right" id="tax"></b></p><p>Discount <b style="float:right" id="discount"></b></p><hr><p>Total <b style="float:right;font-size:1.25rem" id="total"></b></p><p id="checkout-status" class="form-feedback" role="status" aria-live="polite"></p><button id="checkout-submit" class="btn btn-gold" style="width:100%">Confirm demo booking →</button><p class="muted" style="font-size:.78rem">This frontend demo does not process payment.</p></section></aside></form></main>`);$('#checkout-guests').addEventListener('change',calc);$('#coupon-code').addEventListener('input',calc);calc();$('#checkout-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,status=$('#checkout-status'),button=$('#checkout-submit'),fields=new FormData(form);button.disabled=true;formFeedback(status,'Saving your booking…','neutral');try{const booking=await createBooking({tripId:t.id,date:String(fields.get('date')),guests:Number(fields.get('guests')),traveller:String(fields.get('name')).trim(),phone:String(fields.get('phone')).trim(),couponCode:$('#coupon-code').value});formFeedback(status,'Booking saved. Opening your confirmation…');location.href=link('confirmation.html')+'?ref='+encodeURIComponent(booking.ref)}catch(error){formFeedback(status,error.message,'error');button.disabled=false}});}
function confirmationPage(){const b=read().bookings.find(x=>x.ref===new URLSearchParams(location.search).get('ref'))||read().bookings.at(-1),t=trips.find(x=>x.id===b?.tripId)||trips[0],d=destinations.find(x=>x.id===t.destinationId);shell(`<main class="container content-section"><section class="panel" id="confirmation" style="max-width:760px;margin:auto;text-align:center;padding:50px"><span class="eyebrow">It’s official</span><h1 class="section-title">Your journey awaits.</h1><p class="form-feedback is-success" role="status">Your booking was saved to your account.</p><div style="text-align:left;background:var(--ivory);padding:24px;margin:28px 0"><p>Booking reference <strong>${esc(b?.ref||'—')}</strong></p><p>Journey <strong>${t.title} · ${d.name}</strong></p><p>Travel date <strong>${esc(b?.date||'—')}</strong></p><p>Guests <strong>${b?.guests||'—'}</strong></p><p>Total <strong>$${(b?.total||0).toLocaleString()}</strong></p></div><a class="btn btn-gold" href="${link('dashboard.html')}">Back to dashboard →</a> <button class="btn btn-outline" id="print-confirm">Print confirmation</button></section></main>`);$('#print-confirm').addEventListener('click',()=>window.print());}
function bookingRowsWithEditor(bookings) {
   const minDate = new Date().toISOString().slice(0, 10);
   return bookings.map(booking => {
       const trip = trips.find(item => item.id === booking.tripId) || trips[0];
       const destination = destinations.find(item => item.id === trip.destinationId);
       const cancelled = booking.status === 'Cancelled';
       const editable = booking.status === 'Upcoming';
       const archived = cancelled || booking.status === 'Completed';
       return `
           <article class="booking-row">
               ${image(trip.image, trip.title, 300)}
               <div>
                   <strong>${esc(trip.title)}</strong>
                   <div class="muted">${esc(destination?.name || 'Destination')} · ${esc(booking.date || 'Date not set')} · ${Number(booking.guests) || 0} guests</div>
                   <span class="tag${cancelled ? ' is-cancelled' : ''}">${esc(booking.status)}</span>
               </div>
               <div class="row-action">
                   <strong>$${Number(booking.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                   <br>
                   ${editable ? `
                       <button class="btn btn-outline edit-booking" type="button" aria-expanded="false">Edit booking</button>
                       <button class="btn btn-outline cancel-booking" type="button" data-ref="${esc(booking.ref)}">Cancel booking</button>
                   ` : ''}
                   ${archived ? `<button class="booking-delete" type="button" data-ref="${esc(booking.ref)}" aria-label="Delete booking" title="Delete booking">♲</button>` : ''}
               </div>
               ${editable ? `
                   <div class="booking-edit-panel" hidden>
                       <form class="booking-edit-form" data-ref="${esc(booking.ref)}">
                           <label>Travel date
                               <input class="form-control" name="date" type="date" min="${minDate}" value="${esc(booking.date || minDate)}" required>
                           </label>
                           <label>Number of guests
                               <input class="form-control" name="guests" type="number" min="1" max="20" value="${Number(booking.guests) || 1}" required>
                           </label>
                           <label>Traveller name
                               <input class="form-control" name="traveller" type="text" maxlength="150" value="${esc(booking.traveller || '')}" required>
                           </label>
                           <label>Phone number
                               <input class="form-control" name="phone" type="tel" maxlength="40" value="${esc(booking.phone || '')}" required>
                           </label>
                           <div class="booking-edit-actions">
                               <button class="btn btn-gold" type="submit">Save changes</button>
                               <button class="btn btn-outline close-booking-edit" type="button">Cancel</button>
                           </div>
                       </form>
                   </div>
               ` : ''}
           </article>
       `;
   }).join('');
}

function editableBookingsPage() {
   if (!currentGuard()) return;
   const initial = read().bookings;
   shell(`<main class="dashboard account-dashboard">${dashNav('bookings.html')}
       <section class="dash-main profile-main">
           <div class="account-main-top">
               <span class="eyebrow">YOUR TRAVELX ACCOUNT</span>
               <button class="icon-btn theme-toggle" aria-label="Toggle light and dark theme" title="Toggle theme">☼</button>
           </div>
           <span class="eyebrow">Every journey</span>
           <h1 class="section-title">My bookings</h1>
           <div class="filters">
               <select id="booking-filter" aria-label="Filter bookings">
                   <option value="all">All bookings</option>
                   <option>Upcoming</option>
                   <option>Completed</option>
                   <option>Cancelled</option>
               </select>
           </div>
           <div id="booking-list" aria-live="polite"></div>
       </section>
   </main>`);

   const list = $('#booking-list');
   const render = (bookings, error = '') => {
       if (error) {
           list.innerHTML = `<div class="empty"><h3>Could not refresh bookings</h3><p class="muted">${esc(error)}</p><button type="button" class="btn btn-outline" id="retry-bookings">Try again</button></div>`;
           $('#retry-bookings')?.addEventListener('click', load);
           return;
       }

       const filter = $('#booking-filter').value;
       const filtered = bookings.filter(booking => filter === 'all' || booking.status === filter);
       list.innerHTML = filtered.length
           ? bookingRowsWithEditor(filtered)
           : `<div class="empty"><h3>${bookings.length ? 'No bookings in this category.' : 'No bookings yet'}</h3>
               ${bookings.length ? '' : `<p class="muted">Your next story is waiting to be written.</p><a class="btn btn-gold" href="${link('destinations.html')}">Explore destinations</a>`}
           </div>`;
       bindCancels();
       bindDeleteButtons();
       bindBookingEditors();
   };
   const load = async () => {
       list.innerHTML = '<p class="muted">Loading your bookings…</p>';
       try {
           const snapshot = await refreshAccountSnapshot();
           render(snapshot.bookings || []);
       } catch (error) {
           render(initial, error.message);
       }
   };

   $('#booking-filter').addEventListener('change', () => render(read().bookings));
   load();
}

function bindBookingEditors() {
   $$('.edit-booking').forEach(button => {
       button.addEventListener('click', () => {
           const panel = button.closest('.booking-row')?.querySelector('.booking-edit-panel');
           if (!panel) return;
           const willOpen = panel.hidden;
           $$('.booking-edit-panel').forEach(item => { item.hidden = true; });
           $$('.edit-booking').forEach(item => item.setAttribute('aria-expanded', 'false'));
           panel.hidden = !willOpen;
           button.setAttribute('aria-expanded', String(willOpen));
       });
   });

   $$('.close-booking-edit').forEach(button => {
       button.addEventListener('click', () => {
           const row = button.closest('.booking-row');
           const panel = row?.querySelector('.booking-edit-panel');
           if (panel) panel.hidden = true;
           row?.querySelector('.edit-booking')?.setAttribute('aria-expanded', 'false');
       });
   });

   $$('.booking-edit-form').forEach(form => {
       form.addEventListener('submit', async event => {
           event.preventDefault();
           const submit = form.querySelector('[type="submit"]');
           const fields = new FormData(form);
           submit.disabled = true;
           try {
               await updateBooking(form.dataset.ref, {
                   date: String(fields.get('date')),
                   guests: Number(fields.get('guests')),
                   traveller: String(fields.get('traveller')).trim(),
                   phone: String(fields.get('phone')).trim()
               });
               toast('Booking updated successfully.');
               const currentFilter = $('#booking-filter').value;
               const refreshed = read().bookings.filter(booking => currentFilter === 'all' || booking.status === currentFilter);
               $('#booking-list').innerHTML = refreshed.length
                   ? bookingRowsWithEditor(refreshed)
                   : '<div class="empty">No bookings in this category.</div>';
               bindCancels();
               bindDeleteButtons();
               bindBookingEditors();
           } catch (error) {
               submit.disabled = false;
               toast(error.message, 'error');
           }
       });
   });
}

function dashNav(active){
 const u=activeUser();
 const items=[['dashboard.html','Overview'],['bookings.html','My bookings'],['favorites.html','Favourites'],['journeys.html','Travel globe'],['profile.html','Profile & settings']];
 return `<nav class="side-nav"><a class="account-brand" href="${link('index.html')}" aria-label="TravelX home">${brandMarkup()}</a><a class="account-identity" href="${link('profile.html')}"><img class="account-avatar" src="${esc(avatarSource(u?.avatar))}" alt=""><span><strong>${esc(u?.name||'My account')}</strong><small>Account settings</small></span></a><div class="side-nav-links">${items.map(([page,label])=>`<a class="${active===page?'active':''}" href="${link(page)}">${label}</a>`).join('')}</div><a href="#" class="logout side-logout">Log out <span aria-hidden="true">↗</span></a></nav>`
}function dashboardPage(){if(!currentGuard())return;const u=activeUser(),d=read(),mine=d.bookings,upcoming=mine.filter(b=>b.status==='Upcoming').sort((a,b)=>String(a.date).localeCompare(String(b.date))),done=mine.filter(b=>b.status==='Completed'),next=upcoming[0],nextTrip=trips.find(t=>t.id===next?.tripId),nextDestination=destinations.find(x=>x.id===nextTrip?.destinationId),recent=mine.slice(0,6),firstName=String(u.name||'traveller').trim().split(/\s+/)[0];shell(`<main class="dashboard account-dashboard">${dashNav('dashboard.html')}<section class="dash-main overview-main"><div class="account-main-top"><span class="eyebrow">YOUR TRAVELX ACCOUNT</span><button class="icon-btn theme-toggle" aria-label="Toggle light and dark theme" title="Toggle theme">☼</button></div><header class="overview-heading"><div><span class="eyebrow">YOUR JOURNEYS, AT A GLANCE</span><h1 class="section-title">Welcome back, ${esc(firstName)}.</h1><p class="muted">A little space to plan what’s next and revisit what you’ve loved.</p></div><a class="btn btn-gold overview-explore" href="${link('destinations.html')}">Explore journeys <span>↗</span></a></header><section class="overview-stat-grid" aria-label="Travel account summary"><article class="overview-stat"><span class="overview-stat-icon">✳</span><span class="muted">All bookings</span><strong>${mine.length}</strong><small>Across your journeys</small></article><article class="overview-stat"><span class="overview-stat-icon">↗</span><span class="muted">Upcoming</span><strong>${upcoming.length}</strong><small>Journeys ahead</small></article><article class="overview-stat"><span class="overview-stat-icon">✦</span><span class="muted">Completed</span><strong>${done.length}</strong><small>Stories collected</small></article><article class="overview-stat"><span class="overview-stat-icon">♡</span><span class="muted">Saved places</span><strong>${d.favorites.length}</strong><small>Waiting for you</small></article></section><div class="overview-content-grid"><section class="overview-next-card"><div class="overview-section-heading"><div><span class="eyebrow">UP NEXT</span><h2>Your next journey</h2></div><a class="text-button" href="${link('bookings.html')}">All bookings <span>↗</span></a></div>${next&&nextTrip&&nextDestination?`<article class="next-journey"><div class="next-journey-image">${image(nextTrip.image,nextTrip.title,800)}<span class="next-journey-badge">${esc(next.status)}</span></div><div class="next-journey-content"><span class="muted">${esc(nextDestination.country)} · ${nextTrip.duration} days</span><h3>${esc(nextTrip.title)}</h3><p>${esc(next.date)} <span>·</span> ${next.guests} ${Number(next.guests)===1?'traveller':'travellers'}</p><div class="next-journey-footer"><strong>$${Number(next.total).toLocaleString()}</strong><a class="btn btn-outline" href="${link('bookings.html')}">View details</a></div></div></article>`:`<div class="overview-empty"><span class="overview-empty-icon">↗</span><h3>Your next story starts somewhere.</h3><p class="muted">Browse considered journeys and find the one that feels like yours.</p><a class="btn btn-forest" href="${link('destinations.html')}">Discover destinations</a></div>`}</section><aside class="overview-side-stack"><section class="overview-shortcuts"><span class="eyebrow">QUICK LINKS</span><h2>Make it yours.</h2><a href="${link('favorites.html')}"><span class="shortcut-icon">♡</span><span><strong>Favourite places</strong><small>Return to the places you saved</small></span><i>↗</i></a><a href="${link('bookings.html')}"><span class="shortcut-icon">▤</span><span><strong>Booking history</strong><small>See dates and trip details</small></span><i>↗</i></a><a href="${link('profile.html')}"><span class="shortcut-icon">○</span><span><strong>Profile & settings</strong><small>Update your personal details</small></span><i>↗</i></a></section><div class="overview-note"><span>✦</span><p>Travel thoughtfully.<br><strong>Make every journey your own.</strong></p></div></aside></div><section class="overview-recent"><div class="overview-section-heading"><div><span class="eyebrow">RECENT ACTIVITY</span><h2>Your bookings</h2></div><a class="text-button" href="${link('bookings.html')}">View all <span>↗</span></a></div>${recent.length?`<div class="overview-booking-list">${bookingRows(recent)}</div>`:`<div class="overview-no-bookings"><span>No bookings yet</span><p class="muted">Your bookings will appear here once you plan your first journey.</p></div>`}</section></section></main>`);refreshAccountSnapshot().then(snapshot=>{const bookings=snapshot.bookings||[];const upcoming=bookings.filter(b=>b.status==='Upcoming').sort((a,b)=>String(a.date).localeCompare(String(b.date)));const completed=bookings.filter(b=>b.status==='Completed');const setText=(selector,value)=>{const node=$(selector);if(node)node.textContent=String(value)};setText('.overview-stat:nth-child(1) strong',bookings.length);setText('.overview-stat:nth-child(2) strong',upcoming.length);setText('.overview-stat:nth-child(3) strong',completed.length);const recent=bookings.slice(0,6),recentNode=$('.overview-booking-list'),emptyNode=$('.overview-no-bookings');if(recent.length){if(recentNode)recentNode.innerHTML=bookingRows(recent);else if(emptyNode)emptyNode.outerHTML='<div class="overview-booking-list">'+bookingRows(recent)+'</div>'}const next=upcoming[0],trip=trips.find(t=>t.id===next?.tripId),destination=destinations.find(item=>item.id===trip?.destinationId),emptyNext=$('.overview-empty');if(next&&trip&&destination&&emptyNext)emptyNext.outerHTML='<article class="next-journey"><div class="next-journey-image">'+image(trip.image,trip.title,800)+'<span class="next-journey-badge">'+esc(next.status)+'</span></div><div class="next-journey-content"><span class="muted">'+esc(destination.country)+' · '+trip.duration+' days</span><h3>'+esc(trip.title)+'</h3><p>'+esc(next.date)+' · '+next.guests+' guests</p><div class="next-journey-footer"><strong>$'+Number(next.total).toLocaleString()+'</strong><a class="btn btn-outline" href="'+link('bookings.html')+'">View details</a></div></div></article>'}).catch(error=>toast('Could not refresh bookings: '+error.message,'error'));}
function bookingRows(list){return list.map(b=>{const t=trips.find(x=>x.id===b.tripId)||trips[0],d=destinations.find(x=>x.id===t.destinationId),cancelled=b.status==='Cancelled',archived=cancelled||b.status==='Completed';return `<article class="booking-row">${image(t.image,t.title,300)}<div><strong>${esc(t.title)}</strong><div class="muted">${esc(d.name)} · ${esc(b.date||'Date not set')} · ${Number(b.guests)||0} guests</div><span class="tag">${esc(b.status)}</span></div><div class="row-action"><strong>$${Number(b.total||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><br>${cancelled?'':`<button class="btn btn-outline cancel-booking" data-ref="${esc(b.ref)}">Cancel booking</button>`}${archived?`<button class="booking-delete" type="button" data-ref="${esc(b.ref)}" aria-label="Delete booking" title="Delete booking">♲</button>`:''}</div></article>`}).join('')}function bookingsPage(){if(!currentGuard())return;const initial=read().bookings;const draw=(bookings,error='')=>{const mine=bookings;const list=$('#booking-list');if(!list)return;list.innerHTML=error?`<div class="empty"><h3>Could not refresh bookings</h3><p class="muted">${esc(error)}</p><button type="button" class="btn btn-outline" id="retry-bookings">Try again</button></div>`:mine.length?bookingRows(mine):`<div class="empty"><h3>No bookings yet</h3><p class="muted">Your next story is waiting to be written.</p><a class="btn btn-gold" href="${link('destinations.html')}">Explore destinations</a></div>`;if(error)$('#retry-bookings')?.addEventListener('click',load);else {bindCancels();bindDeleteButtons()}};const load=async()=>{const list=$('#booking-list');if(list)list.innerHTML='<p class="muted">Loading your bookings…</p>';try{const snapshot=await refreshAccountSnapshot();draw(snapshot.bookings||[])}catch(error){draw(initial,error.message)}};shell(`<main class="dashboard account-dashboard">${dashNav('bookings.html')}<section class="dash-main profile-main"><div class="account-main-top"><span class="eyebrow">YOUR TRAVELX ACCOUNT</span><button class="icon-btn theme-toggle" aria-label="Toggle light and dark theme" title="Toggle theme">☼</button></div><span class="eyebrow">Every journey</span><h1 class="section-title">My bookings</h1><div class="filters"><select id="booking-filter"><option value="all">All bookings</option><option>Upcoming</option><option>Completed</option><option>Cancelled</option></select></div><div id="booking-list">${initial.length?bookingRows(initial):`<p class="muted">Loading your bookings…</p>`}</div></section></main>`);$('#booking-filter').addEventListener('change',()=>{const val=$('#booking-filter').value;const list=read().bookings.filter(b=>val==='all'||b.status===val);$('#booking-list').innerHTML=list.length?bookingRows(list):'<div class="empty">No bookings in this category.</div>';bindCancels();bindDeleteButtons()});load()}function favoritesPage(){if(!currentGuard())return;const fav=read().favorites,list=destinations.filter(d=>fav.includes(d.id));shell(`<main class="dashboard account-dashboard">${dashNav('favorites.html')}<section class="dash-main profile-main"><div class="account-main-top"><span class="eyebrow">YOUR TRAVELX ACCOUNT</span><button class="icon-btn theme-toggle" aria-label="Toggle light and dark theme" title="Toggle theme">☼</button></div><span class="eyebrow">Kept close</span><h1 class="section-title">Your favourites</h1><div class="grid">${list.length?cards(list):`<div class="empty" style="grid-column:1/-1"><h3>Your list is waiting</h3><p class="muted">Save the places that call to you.</p><a class="btn btn-gold" href="${link('destinations.html')}">Explore destinations</a></div>`}</div></section></main>`);}
function ensureAvatarCropper() {
    let cropper = $('#avatar-cropper');
    if (cropper) return cropper;

    cropper = document.createElement('section');
    cropper.id = 'avatar-cropper';
    cropper.className = 'avatar-cropper';
    cropper.hidden = true;
    cropper.setAttribute('role', 'dialog');
    cropper.setAttribute('aria-modal', 'true');
    cropper.setAttribute('aria-labelledby', 'avatar-crop-title');
    cropper.innerHTML = `
        <div class="avatar-crop-dialog">
            <header class="avatar-crop-header">
                <div><span class="eyebrow">PROFILE PHOTO</span><h2 id="avatar-crop-title">Crop your photo</h2></div>
                <p>Drag the image to position it. Your photo will appear in a round frame.</p>
            </header>
            <div class="avatar-crop-content">
                <div class="avatar-crop-stage">
                    <canvas id="avatar-crop-canvas" width="480" height="480" aria-label="Drag to position your photo"></canvas>
                    <div class="avatar-crop-circle" aria-hidden="true"></div>
                </div>
                <div class="avatar-crop-preview-wrap">
                    <span class="eyebrow">PREVIEW</span>
                    <canvas id="avatar-crop-preview" width="112" height="112" aria-label="Preview of your profile photo"></canvas>
                    <label for="avatar-crop-zoom">Zoom</label>
                    <input id="avatar-crop-zoom" type="range" min="1" max="3" step="0.01" value="1">
                </div>
            </div>
            <div class="avatar-crop-actions">
                <button class="btn btn-outline" id="avatar-crop-cancel" type="button">Cancel</button>
                <button class="btn btn-gold" id="avatar-crop-use" type="button">Use this photo</button>
            </div>
        </div>`;
    document.body.append(cropper);
    return cropper;
}

function compressAvatar(file) {
    return new Promise((resolve, reject) => {
        openAvatarCropper(file, resolve, reject);
    });
}

function openAvatarCropper(file, onCrop, onError) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        onError(new Error('Choose a JPEG, PNG, or WebP image.'));
        return () => {};
    }
    if (file.size > 8 * 1024 * 1024) {
        onError(new Error('Choose an image smaller than 8 MB.'));
        return () => {};
    }

    const cropper = ensureAvatarCropper();
    const canvas = $('#avatar-crop-canvas');
    const selection = document.createElement('canvas');
    selection.width = 480;
    selection.height = 480;
    const preview = $('#avatar-crop-preview');
    const zoomControl = $('#avatar-crop-zoom');
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    let zoom = 1;
    let offsetX = 0;
    let offsetY = 0;
    let drag = null;
    let closed = false;

    const close = () => {
        if (closed) return;
        closed = true;
        image.onload = null;
        URL.revokeObjectURL(objectUrl);
        cropper.hidden = true;
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerup', handlePointerUp);
        canvas.removeEventListener('pointercancel', handlePointerUp);
        zoomControl.removeEventListener('input', handleZoom);
        $('#avatar-crop-use').removeEventListener('click', handleUse);
        $('#avatar-crop-cancel').removeEventListener('click', handleCancel);
        window.removeEventListener('resize', drawCrop);
    };

    const drawCrop = () => {
        if (!image.complete || !image.naturalWidth || closed) return;
        const context = canvas.getContext('2d');
        const size = canvas.width;
        const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
        const displayedWidth = image.naturalWidth * scale;
        const displayedHeight = image.naturalHeight * scale;
        const maxX = Math.max(0, (displayedWidth - size) / 2);
        const maxY = Math.max(0, (displayedHeight - size) / 2);
        offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
        offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
        const cropSize = size * 0.76;
        const sourceSize = cropSize / scale;
        const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceSize,
            image.naturalWidth / 2 - offsetX / scale - sourceSize / 2));
        const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceSize,
            image.naturalHeight / 2 - offsetY / scale - sourceSize / 2));
        const selectionContext = selection.getContext('2d');
        selectionContext.clearRect(0, 0, selection.width, selection.height);
        selectionContext.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, selection.width, selection.height);
        context.clearRect(0, 0, size, size);
        context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight,
            size / 2 - displayedWidth / 2 + offsetX,
            size / 2 - displayedHeight / 2 + offsetY, displayedWidth, displayedHeight);
        const previewContext = preview.getContext('2d');
        previewContext.clearRect(0, 0, preview.width, preview.height);
        previewContext.drawImage(selection, 0, 0, preview.width, preview.height);
    };

    const handlePointerDown = event => {
        drag = { x: event.clientX, y: event.clientY, offsetX, offsetY };
        canvas.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = event => {
        if (!drag) return;
        const bounds = canvas.getBoundingClientRect();
        const ratio = canvas.width / bounds.width;
        offsetX = drag.offsetX + (event.clientX - drag.x) * ratio;
        offsetY = drag.offsetY + (event.clientY - drag.y) * ratio;
        drawCrop();
    };
    const handlePointerUp = () => { drag = null; };
    const handleZoom = () => {
        zoom = Number(zoomControl.value);
        offsetX = 0;
        offsetY = 0;
        drawCrop();
    };
    const handleUse = () => {
        drawCrop();
        onCrop(selection.toDataURL('image/jpeg', 0.84));
        close();
    };
    const handleCancel = () => {
        close();
        onError(new Error('Photo cropping cancelled. Your current photo was not changed.'));
    };

    image.onload = () => {
        cropper.hidden = false;
        zoom = 1;
        offsetX = 0;
        offsetY = 0;
        zoomControl.value = '1';
        drawCrop();
        $('#avatar-crop-use').addEventListener('click', handleUse);
        $('#avatar-crop-cancel').addEventListener('click', handleCancel);
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointercancel', handlePointerUp);
        zoomControl.addEventListener('input', handleZoom);
        window.addEventListener('resize', drawCrop);
    };
    image.onerror = () => {
        close();
        onError(new Error('The selected image could not be opened.'));
    };
    image.src = objectUrl;
    return close;
}
function journeysPage() {
    if (!currentGuard()) return;
    shell(`
        <main class="dashboard account-dashboard">
            ${dashNav('journeys.html')}
            <section class="dash-main journeys-main">
                <div class="account-main-top">
                    <span class="eyebrow">YOUR TRAVELX ACCOUNT</span>
                    <button class="icon-btn theme-toggle" aria-label="Toggle light and dark theme" title="Toggle theme">☼</button>
                </div>
                <header class="journeys-page-heading">
                    <span class="eyebrow">YOUR WORLD, YOUR JOURNEYS</span>
                    <h1 class="section-title">Your journeys on Earth.</h1>
                    <p class="muted">Follow the places you’ve been and the journeys still ahead.</p>
                </header>
                <section class="journey-globe-panel">
                    <div class="journey-globe-layout">
                        <div class="journey-globe-wrap">
                            <div id="journey-globe-map" aria-label="Interactive globe map with visited and upcoming trip markers" role="application"></div>
                        </div>
                        <aside class="globe-side-legend">
                            <span class="eyebrow">YOUR TRAVEL GLOBE</span>
                            <h2>Your places.</h2>
                            <div class="globe-legend">
                                <span><i class="visited-dot"></i>Visited <b id="visited-count">0</b></span>
                                <span><i class="upcoming-dot"></i>Upcoming <b id="upcoming-count">0</b></span>
                            </div>
                            <p class="globe-empty-note" role="status" hidden>Your booked destinations will appear here.</p>
                            <div class="globe-route-groups">
                                <section class="globe-route-group">
                                    <h3><span><i class="visited-dot"></i>Visited</span></h3>
                                    <ol id="visited-route-list" aria-label="Visited destinations in travel-date order"></ol>
                                </section>
                                <section class="globe-route-group">
                                    <h3><span><i class="upcoming-dot"></i>Upcoming</span></h3>
                                    <ol id="upcoming-route-list" aria-label="Upcoming destinations in travel-date order"></ol>
                                </section>
                            </div>
                            <p class="globe-hint">Zoom in to reveal city and region names. Select a place to focus the globe there.</p>
                            <button type="button" data-globe-reset class="text-button globe-reset-link">Fit all journeys ↺</button>
                        </aside>
                    </div>
                </section>
            </section>
        </main>`);
    refreshAccountSnapshot()
        .then(snapshot => initJourneyGlobe(snapshot.bookings || []))
        .catch(error => {
            console.error('Could not refresh bookings for the travel globe:', error);
            initJourneyGlobe(read().bookings, error.message);
        });
}
function profilePage(){if(!currentGuard())return;const u=activeUser(),defaultAvatar='photo-1534528741775-53994a69daeb';let selectedAvatar=u.avatar||defaultAvatar;shell(`<main class="dashboard account-dashboard">${dashNav('profile.html')}<section class="dash-main profile-main"><div class="account-main-top"><span class="eyebrow">YOUR TRAVELX ACCOUNT</span><button class="icon-btn theme-toggle" aria-label="Toggle light and dark theme" title="Toggle theme">☼</button></div><header class="profile-page-heading"><div><span class="eyebrow">PROFILE & PREFERENCES</span><h1 class="section-title">Make it yours.</h1><p class="muted">Keep your details and travel preferences up to date.</p></div><span class="profile-step">ACCOUNT <b>01</b></span></header><div class="profile-settings-grid"><form class="profile-card" id="profile-form"><div class="profile-card-heading"><div><span class="eyebrow">PERSONAL DETAILS</span><h2>Your profile</h2></div><span class="profile-private">PRIVATE</span></div><div class="avatar-editor"><img id="avatar-preview" src="${esc(avatarSource(selectedAvatar))}" alt="Profile photo"><div class="avatar-editor-copy"><strong>Profile photo</strong><p>Use a clear image, up to 8 MB. We’ll resize it before saving.</p><div class="avatar-actions"><label class="btn btn-outline upload-photo" for="avatar-file">Upload photo</label><input id="avatar-file" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp"><button class="text-button" id="remove-photo" type="button">Remove</button></div></div></div><div class="profile-fields"><label>Full name<input class="form-control" name="name" required autocomplete="name" value="${esc(u.name)}"></label><label>Email address<input class="form-control" type="email" value="${esc(u.email)}" readonly><small>Managed securely by Neon Auth</small></label><label>Phone number<input class="form-control" name="phone" type="tel" autocomplete="tel" value="${esc(u.phone)}" placeholder="Add a contact number"></label><label>Country<input class="form-control" name="country" autocomplete="country-name" value="${esc(u.country)}" placeholder="Where are you based?"></label></div><div class="profile-save-row"><p id="profile-status" class="form-feedback" role="status" aria-live="polite"></p><button class="btn btn-gold" type="submit">Save profile <span>↗</span></button></div></form><aside class="profile-side-stack"><section class="profile-info-card"><span class="profile-card-icon" aria-hidden="true">✳</span><span class="eyebrow">ACCOUNT SECURITY</span><h2>Password & sign-in</h2><p>Your password is managed by Neon Auth and never stored in your TravelX profile.</p><button class="text-button" type="button" id="profile-reset-password">Email me a password reset link <span>↗</span></button><p class="profile-security-status" id="password-reset-status" class="form-feedback" role="status" aria-live="polite"></p></section><section class="profile-info-card preference-card"><span class="eyebrow">YOUR EXPERIENCE</span><h2>Appearance</h2><p>Choose the theme that feels right for your next journey.</p><button type="button" class="preference-toggle theme-toggle"><span class="theme-switch-track" aria-hidden="true"><i></i></span><span>Toggle light / dark mode</span></button></section></aside></div></section></main>`);initJourneyGlobe();const form=$('#profile-form'),status=$('#profile-status'),preview=$('#avatar-preview'),fileInput=$('#avatar-file');fileInput.addEventListener('change',async()=>{const file=fileInput.files?.[0];if(!file)return;formFeedback(status,'Preparing your photo…','neutral');try{selectedAvatar=await compressAvatar(file);preview.src=selectedAvatar;formFeedback(status,'Photo ready. Save your profile to keep it.','neutral')}catch(error){formFeedback(status,error.message,'error');fileInput.value=''}});$('#remove-photo').addEventListener('click',()=>{selectedAvatar=defaultAvatar;preview.src=avatarSource(defaultAvatar);fileInput.value='';formFeedback(status,'Default portrait selected.','neutral')});form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;formFeedback(status,'Saving your profile…','neutral');const fields=new FormData(form);try{await updateAccountProfile({name:String(fields.get('name')).trim(),phone:String(fields.get('phone')).trim(),country:String(fields.get('country')).trim(),avatar:selectedAvatar});formFeedback(status,'Your profile is saved to your TravelX account.')}catch(error){status.textContent=error.message}finally{button.disabled=false}});$('#profile-reset-password').addEventListener('click',async event=>{const button=event.currentTarget,message=$('#password-reset-status');button.disabled=true;formFeedback(message,'Sending reset link…','neutral');try{await sendPasswordReset(u.email);formFeedback(message,'If an account exists for this email, a reset link is on its way.')}catch(error){formFeedback(message,error.message,'error')}finally{button.disabled=false}})}
function wireShared(){$$('.theme-toggle').forEach(b=>{b.classList.toggle('is-on',document.body.classList.contains('dark'));b.addEventListener('click',()=>{const on=!document.body.classList.contains('dark');document.body.classList.toggle('dark',on);$$('.theme-toggle').forEach(button=>button.classList.toggle('is-on',on));write({theme:on?'dark':'light'})})});$('.mobile-toggle')?.addEventListener('click',()=>$('.nav-links').classList.toggle('open'));window.addEventListener('scroll',()=>$('.topbar')?.classList.toggle('scrolled',scrollY>12),{passive:true});$$('.newsletter-form').forEach(f=>f.addEventListener('submit',async e=>{e.preventDefault();const email=String(new FormData(f).get('email')||'').trim().toLowerCase();try{await subscribeNewsletter(email);f.reset();toast('You’re on the list. Thank you!')}catch(error){toast(error.message,'error')}}));bindFavs();bindCancels();}
function wireNavigation(){const nav=$('.topbar .nav-links'),toggle=$('.topbar .mobile-toggle');if(!nav||!toggle)return;toggle.addEventListener('click',()=>toggle.setAttribute('aria-expanded',String(nav.classList.contains('open'))));nav.addEventListener('click',event=>{if(event.target.closest('a')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}})}
function bindFavs(){$$('[data-fav]').forEach(b=>{const id=b.dataset.fav;b.textContent=read().favorites.includes(id)?'♥':'♡';b.onclick=async()=>{const saved=!read().favorites.includes(id);try{await saveFavorite(id,saved);b.textContent=saved?'♥':'♡';toast(saved?'Saved to favourites.':'Removed from favourites.')}catch(error){toast(error.message,'error')}}})}
function bindCancels(){$$('.cancel-booking').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await cancelBooking(button.dataset.ref);const row=button.closest('.booking-row'),status=row?.querySelector('.tag'),reference=button.dataset.ref;button.remove();if(status){status.textContent='Cancelled';status.classList.add('is-cancelled')}if(row&&!row.querySelector('.booking-delete'))row.querySelector('.row-action')?.insertAdjacentHTML('beforeend',`<button class="booking-delete" type="button" data-ref="${esc(reference)}" aria-label="Delete booking" title="Delete booking">♲</button>`);bindDeleteButtons();toast('Booking cancelled.')}catch(error){button.disabled=false;toast(error.message,'error')}});bindDeleteButtons()}
function bindDeleteButtons(){$$('.booking-delete').forEach(button=>button.onclick=async()=>{if(!confirm('Permanently delete this cancelled or completed booking?'))return;button.disabled=true;try{await deleteBooking(button.dataset.ref);button.closest('.booking-row')?.remove();toast('Booking removed from your history.')}catch(error){button.disabled=false;toast(error.message,'error')}})}function maps(){const el=$('#map');if(!el)return;const {lat,lng,name}=el.dataset;const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.onload=()=>import('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js').then(()=>{const map=L.map(el).setView([Number(lat),Number(lng)],6);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);L.marker([Number(lat),Number(lng)]).addTo(map).bindPopup(name).openPopup()}).catch(()=>el.innerHTML='<p class="panel">Map unavailable. Please check your connection.</p>');document.head.append(css)}
const routes={'index.html':home,'destinations.html':destinationsPage,'destination-details.html':detailsPage,'search-results.html':searchPage,'trip-details.html':tripPage,'login.html':()=>authPage(false),'register.html':()=>authPage(true),'forgot-password.html':forgotPasswordPage,'reset-password.html':resetPasswordPage,'checkout.html':checkoutPage,'confirmation.html':confirmationPage,'dashboard.html':dashboardPage,'bookings.html':bookingsPage,'favorites.html':favoritesPage,'journeys.html':journeysPage,'profile.html':profilePage};if(pageName==='index.html'){import('./home.js').then(module=>module.renderHome());}else{(routes[pageName]||home)();document.documentElement.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.08});$$('.reveal').forEach(el=>observer.observe(el));maps();}
}).catch(error=>console.error('TravelX startup failed:',error));
