import { createAuthClient } from '@neondatabase/neon-js/auth';
import { destinations } from '../data/destinations.js';
import { trips } from '../data/trips.js';
import { read, write } from './storage.js';

const API_BASE_URL = window.TRAVELX_API_URL
    || (['localhost', '127.0.0.1'].includes(location.hostname)
        ? `${location.protocol}//${location.hostname}:3001`
        : location.origin);
let authClientPromise;

function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
    const candidates = [
        typeof error === 'string' ? error : null,
        error?.message,
        error?.error?.message,
        typeof error?.error === 'string' ? error.error : null
    ];
    const message = candidates.find(value =>
        typeof value === 'string' && value.trim() && value.trim() !== '[object Object]'
    );
    return message?.trim() || fallback;
}

async function getApiData(path) {
    const response = await fetch(new URL(path, `${API_BASE_URL}/`), {
        headers: { Accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(errorMessage(payload?.error, `API request failed (${response.status}).`));
    }

    return payload;
}

async function getAuthClient() {
    if (!authClientPromise) {
        authClientPromise = getApiData('/api/config').then(({ authBaseUrl }) => {
            if (!authBaseUrl) {
                throw new Error('Neon Auth is not configured for this branch.');
            }

            return createAuthClient(authBaseUrl);
        }).catch(error => {
            throw new Error(errorMessage(error, 'Could not connect to Neon Auth.'));
        });
    }

    return authClientPromise;
}

function syncLocalUser(authUser, snapshot = null) {
    const data = read();
    const account = snapshot?.user || authUser;
    const existingUser = data.users.find((user) => user.email === account.email);
    const users = data.users
        .filter((user) => user.email !== account.email)
        .map(({ password, ...user }) => user);

    users.push({
        id: account.id || authUser.id,
        name: account.name || authUser.name || authUser.email,
        email: account.email || authUser.email,
        country: account.country || existingUser?.country || '',
        phone: account.phone ?? existingUser?.phone ?? '',
        avatar: account.avatar || existingUser?.avatar || 'photo-1534528741775-53994a69daeb'
    });

    write({
        ...data,
        users,
        currentUser: account.email || authUser.email,
        ...(snapshot ? {
            favorites: snapshot.favorites || [],
            bookings: snapshot.bookings || []
        } : {})
    });
    window.__TRAVELX_AUTHENTICATED__ = true;
}

async function apiRequest(path, { method = 'GET', body, publicRequest = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    if (!publicRequest) {
        const auth = await getAuthClient();
        const sessionResult = await auth.getSession();
        if (sessionResult.error) {
            throw new Error(errorMessage(sessionResult.error, 'Could not load the active session.'));
        }
        const token = sessionResult.data?.session?.token;
        if (!token) throw new Error('Your session has expired. Please sign in again.');
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(new URL(path, `${API_BASE_URL}/`), {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(errorMessage(payload?.error, `API request failed (${response.status}).`));
    }
    return payload;
}

export async function saveFavorite(destinationId, saved) {
    await apiRequest(`/api/private/favorites/${encodeURIComponent(destinationId)}`, {
        method: saved ? 'PUT' : 'DELETE'
    });
    const data = read();
    data.favorites = saved
        ? [...new Set([...data.favorites, destinationId])]
        : data.favorites.filter((id) => id !== destinationId);
    write(data);
}

export async function createBooking(details) {
    const booking = await apiRequest('/api/private/bookings', { method: 'POST', body: details });
    const data = read();
    data.bookings = [booking, ...data.bookings.filter((item) => item.ref !== booking.ref)];
    write(data);
    return booking;
}

export async function cancelBooking(reference) {
    await apiRequest(`/api/private/bookings/${encodeURIComponent(reference)}`, { method: 'DELETE' });
    const data = read();
    data.bookings = data.bookings.map((booking) =>
        booking.ref === reference ? { ...booking, status: 'Cancelled' } : booking
    );
    write(data);
}

export async function updateBooking(reference, details) {
    const booking = await apiRequest(`/api/private/bookings/${encodeURIComponent(reference)}`, {
        method: 'PATCH',
        body: details
    });
    const data = read();
    data.bookings = data.bookings.map((item) =>
        item.ref === reference ? { ...item, ...booking } : item
    );
    write(data);
    return booking;
}

export async function deleteBooking(reference) {
    await apiRequest(`/api/private/bookings/${encodeURIComponent(reference)}/permanent`, { method: 'DELETE' });
    const data = read();
    data.bookings = data.bookings.filter((booking) => booking.ref !== reference);
    write(data);
}

export async function refreshAccountSnapshot() {
    const snapshot = await apiRequest('/api/private/session');
    const auth = await getAuthClient();
    const sessionResult = await auth.getSession();
    if (sessionResult.error) throw new Error(sessionResult.error.message || 'Could not load the active session.');
    const user = sessionResult.data?.user;
    if (!user) throw new Error('Your session has expired. Please sign in again.');
    syncLocalUser(user, snapshot);
    return snapshot;
}

export async function updateAccountProfile(profile) {
    const snapshot = await apiRequest('/api/private/profile', { method: 'PATCH', body: profile });
    syncLocalUser(snapshot.user, snapshot);
    return snapshot.user;
}

export async function subscribeNewsletter(email) {
    return apiRequest('/api/newsletter', {
        method: 'POST',
        body: { email },
        publicRequest: true
    });
}

function clearLocalAuth() {
    const data = read();
    const users = data.users.map(({ password, ...user }) => user);

    write({ ...data, users, currentUser: null, favorites: [], bookings: [] });
    window.__TRAVELX_ACCOUNT_DATA__ = null;
    window.__TRAVELX_AUTHENTICATED__ = false;
}

function pageUrl(pageName) {
    const pagesPath = location.pathname.match(/^(.*\/pages\/)/)?.[1];
    return pagesPath
        ? `${pagesPath}${pageName}`
        : new URL(`pages/${pageName}`, document.baseURI).href;
}

function renderStartupError(error) {
    console.error('TravelX startup failed:', error);
    const main = document.createElement('main');
    main.style.cssText = 'max-width:680px;margin:12vh auto;padding:32px;border:1px solid #d6c49d;border-radius:18px;background:#f5f1e8;color:#14251f;font:16px/1.6 system-ui';
    const heading = document.createElement('h1');
    heading.textContent = 'TravelX is temporarily unavailable';
    const details = document.createElement('p');
    details.setAttribute('role', 'alert');
    details.textContent = errorMessage(error, 'The service could not be reached. Please try again.');
    const instruction = document.createElement('p');
    instruction.textContent = 'Check your connection, then reload TravelX to try again.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Reload TravelX';
    retry.style.cssText = 'border:0;border-radius:6px;background:#c8a665;color:#14251f;padding:12px 20px;font:inherit;font-weight:600;cursor:pointer';
    retry.addEventListener('click', () => location.reload());
    main.append(heading, details, instruction, retry);
    document.body.replaceChildren(main);
}

export async function bootstrapTravelX() {
    if (location.protocol === 'file:') {
        window.__TRAVELX_AUTHENTICATED__ = false;
        return;
    }

    try {
        const [destinationPayload, tripPayload] = await Promise.all([
            getApiData('/api/destinations'),
            getApiData('/api/trips')
        ]);

        if (!Array.isArray(destinationPayload.data) || !Array.isArray(tripPayload.data)) {
            throw new Error('The catalog API returned an invalid response.');
        }

        destinations.splice(0, destinations.length, ...destinationPayload.data.map((item) => ({
            ...item,
            price: Number(item.price),
            rating: item.rating === null ? null : Number(item.rating)
        })));
        trips.splice(0, trips.length, ...tripPayload.data.map((item) => ({
            ...item,
            duration: Number(item.duration),
            price: Number(item.price)
        })));

        window.__TRAVELX_AUTHENTICATED__ = false;
        const pageName = location.pathname.split('/').pop();
        const authPages = new Set([
            'login.html',
            'register.html',
            'dashboard.html',
            'checkout.html',
            'confirmation.html',
            'bookings.html',
            'favorites.html',
            'journeys.html',
            'profile.html'
        ]);

        const auth = await getAuthClient();
        const { data, error } = await auth.getSession();

        if (error) {
            throw new Error(error.message || 'Could not restore the Neon Auth session.');
        }

        const user = data?.user || null;
        if (user) {
            const snapshot = await apiRequest('/api/private/session');
            syncLocalUser(user, snapshot);
            if (pageName === 'login.html' || pageName === 'register.html') {
                location.replace(pageUrl('dashboard.html'));
            }
        } else {
            clearLocalAuth();
            if (authPages.has(pageName) && !['login.html', 'register.html'].includes(pageName)) {
                location.replace(pageUrl('login.html'));
            }
        }
    } catch (error) {
        renderStartupError(error);
        throw error;
    }
}

export async function authenticate(formData, register) {
    try {
        const auth = await getAuthClient();
        const email = String(formData.get('email')).trim().toLowerCase();
        const password = String(formData.get('password'));
        const result = register
            ? await auth.signUp.email({
                name: String(formData.get('name')).trim(),
                email,
                password
            })
            : await auth.signIn.email({ email, password });

        if (result?.error) {
            throw new Error(errorMessage(result.error, 'Authentication failed.'));
        }

        const sessionResult = await auth.getSession();
        if (sessionResult.error) {
            throw new Error(errorMessage(sessionResult.error, 'Could not load the new session.'));
        }

        const user = sessionResult.data?.user || result.data?.user || null;
        if (!user || !sessionResult.data?.session) {
            if (register) {
                return { verificationRequired: true };
            }

            throw new Error('Sign-in completed without an active session. Check browser cookie settings and retry.');
        }

        const snapshot = await apiRequest('/api/private/session');
        syncLocalUser(user, snapshot);
        return { user: snapshot.user };
    } catch (error) {
        throw new Error(errorMessage(error, 'Authentication failed. Please try again.'));
    }
}

export async function sendPasswordReset(email) {
    try {
        const auth = await getAuthClient();
        const redirectTo = new URL(linkPageUrl('reset-password.html'), document.baseURI).href;
        const result = await auth.requestPasswordReset({
            email: String(email).trim().toLowerCase(),
            redirectTo,
            fetchOptions: { throw: true }
        });
        if (result?.error) {
            throw new Error(errorMessage(result.error, 'Could not send the password reset email.'));
        }
    } catch (error) {
        throw new Error(errorMessage(error, 'Could not send the password reset email.'));
    }
}

function linkPageUrl(pageName) {
    const pagesPath = location.pathname.match(/^(.*\/pages\/)/)?.[1];
    return pagesPath
        ? `${pagesPath}${pageName}`
        : new URL(`pages/${pageName}`, document.baseURI).href;
}

export async function completePasswordReset(token, newPassword) {
    try {
        const auth = await getAuthClient();
        const result = await auth.resetPassword({
            newPassword,
            token,
            fetchOptions: { throw: true }
        });
        if (result?.error) {
            throw new Error(errorMessage(result.error, 'This reset link is invalid or expired.'));
        }
    } catch (error) {
        throw new Error(errorMessage(error, 'This reset link is invalid or expired.'));
    }
}

export async function signOutTravelX() {
    try {
        const auth = await getAuthClient();
        const { error } = await auth.signOut();
        if (error) console.warn('Neon sign-out failed; clearing the local session.', error.message);
    } catch (error) {
        console.warn('Neon sign-out could not be reached; clearing the local session.', error);
    } finally {
        clearLocalAuth();
    }

    location.assign(new URL('/', location.origin).href);
}

document.addEventListener('click', (event) => {
    const logout = event.target instanceof Element ? event.target.closest('.logout') : null;
    if (!logout) {
        return;
    }

    event.preventDefault();
    if (logout.dataset.signingOut === 'true') return;
    logout.dataset.signingOut = 'true';
    logout.setAttribute('aria-busy', 'true');
    signOutTravelX().catch((error) => {
        logout.dataset.signingOut = 'false';
        logout.removeAttribute('aria-busy');
        console.error('TravelX sign-out failed:', error);
        window.alert(error.message);
    });
});
