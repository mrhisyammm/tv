// ============================================================
// HISYAM TV — app.js
// All-in-one: config, API, router, views, features
// No build tools, no imports — just plain JS
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  var TMDB_API_KEY = '3e232180151a04086bb5b9998d8435bf';
  var TMDB_BASE = 'https://api.themoviedb.org/3';
  var IMG_BASE = 'https://image.tmdb.org/t/p';
  var IMG_W500 = IMG_BASE + '/w500';
  var IMG_W1280 = IMG_BASE + '/w1280';

  var STREAMING_SERVERS = [
    {
      name: 'VidAPI',
      movieUrl: function (id) { return 'https://vaplayer.ru/embed/movie/' + id + '?primaryColor=%23E50914'; },
      tvUrl: function (id, s, e) { return 'https://vaplayer.ru/embed/tv/' + id + '/' + s + '/' + e + '?primaryColor=%23E50914'; },
    },
    {
      name: '2embed',
      movieUrl: function (id) { return 'https://www.2embed.cc/embed/' + id; },
      tvUrl: function (id, s, e) { return 'https://www.2embed.cc/embedtv/' + id + '&s=' + s + '&e=' + e; },
    },
    {
      name: 'VidSrc',
      movieUrl: function (id) { return 'https://vidsrc.to/embed/movie/' + id; },
      tvUrl: function (id, s, e) { return 'https://vidsrc.to/embed/tv/' + id + '/' + s + '/' + e; },
    },
    {
      name: 'VidSrc Pro',
      movieUrl: function (id) { return 'https://vidsrc.pro/embed/movie/' + id; },
      tvUrl: function (id, s, e) { return 'https://vidsrc.pro/embed/tv/' + id + '/' + s + '/' + e; },
    },
    {
      name: 'Smashy',
      movieUrl: function (id) { return 'https://embed.smashystream.com/playere.php?tmdb=' + id; },
      tvUrl: function (id, s, e) { return 'https://embed.smashystream.com/playere.php?tmdb=' + id + '&season=' + s + '&episode=' + e; },
    },
    {
      name: 'Embed.su',
      movieUrl: function (id) { return 'https://embed.su/embed/movie/' + id; },
      tvUrl: function (id, s, e) { return 'https://embed.su/embed/tv/' + id + '/' + s + '/' + e; },
    },
  ];

  var GENRES = {
    action: { movie: 28, tv: 10759 },
    comedy: { movie: 35, tv: 35 },
    horror: { movie: 27, tv: 9648 }, // TV doesn't have Horror, Mystery is closest
    scifi: { movie: 878, tv: 10765 }, // Sci-Fi & Fantasy
    animation: { movie: 16, tv: 16 },
    drama: { movie: 18, tv: 18 },
    romance: { movie: 10749, tv: 10766 }, // Soap for TV
    thriller: { movie: 53, tv: 80 } // Crime for TV
  };

  var WATCHLIST_KEY = 'hisyamtv_watchlist';
  var HISTORY_KEY = 'hisyamtv_history';

  // ============================================================
  // API helpers
  // ============================================================
  function tmdb(path, params, lang) {
    params = params || {};
    lang = lang || 'en-US';
    var url = new URL(TMDB_BASE + path);
    url.searchParams.set('api_key', TMDB_API_KEY);
    url.searchParams.set('language', lang);
    Object.keys(params).forEach(function (k) {
      url.searchParams.set(k, params[k]);
    });
    return fetch(url.toString())
      .then(function (res) {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch(function (e) {
        console.warn('[TMDB] fetch error', path, e.message);
        return { results: [] };
      });
  }

  // ── Inline SVG placeholders (no external dependency) ──
  var PLACEHOLDER_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%23181820'/%3E%3Cg transform='translate(150,200)' opacity='0.18'%3E%3Crect x='-30' y='-40' width='60' height='80' rx='6' fill='none' stroke='%23888' stroke-width='3'/%3E%3Ccircle cx='0' cy='-16' r='8' fill='%23888'/%3E%3Cpath d='M-20 20 L-10 6 L0 16 L10 0 L20 20Z' fill='%23888'/%3E%3C/g%3E%3Ctext x='150' y='260' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='13' font-weight='600'%3ENo Poster%3C/text%3E%3C/svg%3E";
  var PLACEHOLDER_PERSON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%23181820'/%3E%3Cg transform='translate(150,195)' opacity='0.18'%3E%3Ccircle cx='0' cy='-24' r='28' fill='%23888'/%3E%3Cellipse cx='0' cy='32' rx='40' ry='28' fill='%23888'/%3E%3C/g%3E%3Ctext x='150' y='265' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='13' font-weight='600'%3ENo Photo%3C/text%3E%3C/svg%3E";
  var PLACEHOLDER_EPISODE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='170' viewBox='0 0 300 170'%3E%3Crect width='300' height='170' fill='%23181820'/%3E%3Cg transform='translate(150,75)' opacity='0.18'%3E%3Cpolygon points='-12,-16 -12,16 16,0' fill='%23888'/%3E%3Crect x='-28' y='-22' width='56' height='44' rx='4' fill='none' stroke='%23888' stroke-width='2.5'/%3E%3C/g%3E%3Ctext x='150' y='120' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='11' font-weight='600'%3ENo Preview%3C/text%3E%3C/svg%3E";

  function posterUrl(path) {
    return path ? IMG_W500 + path : PLACEHOLDER_POSTER;
  }

  function backdropUrl(path) {
    return path ? IMG_W1280 + path : '';
  }

  function getYear(date) {
    return date ? new Date(date).getFullYear() : '';
  }

  function getRating(vote) {
    return vote ? vote.toFixed(1) : 'N/A';
  }

  // ============================================================
  // TOAST
  // ============================================================
  var toastEl = null;
  var toastTimer = null;

  function showToast(msg, duration) {
    duration = duration || 2500;
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, duration);
  }

  // ============================================================
  // WATCHLIST & HISTORY (localStorage)
  // ============================================================
  function getList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function getWatchlist() {
    return getList(WATCHLIST_KEY);
  }

  function isInWatchlist(id) {
    return getWatchlist().some(function (item) { return item.id == id; });
  }

  function toggleWatchlist(item) {
    var list = getWatchlist();
    var idx = list.findIndex(function (i) { return i.id == item.id; });
    if (idx > -1) {
      list.splice(idx, 1);
      saveList(WATCHLIST_KEY, list);
      showToast('Removed from My List');
      updateWatchlistBadge();
      return false;
    }
    list.unshift({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: item.media_type || 'movie',
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      genre_ids: item.genres ? item.genres.map(function(g) { return g.id; }) : (item.genre_ids || []),
      addedAt: Date.now(),
    });
    saveList(WATCHLIST_KEY, list);
    showToast('Added to My List');
    updateWatchlistBadge();
    return true;
  }

  function addToHistory(item) {
    var list = getList(HISTORY_KEY).filter(function (i) { return i.id != item.id; });
    list.unshift({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      media_type: item.media_type || 'movie',
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      watchedAt: Date.now(),
    });
    if (list.length > 30) list = list.slice(0, 30);
    saveList(HISTORY_KEY, list);
  }

  function updateWatchlistBadge() {
    var badge = document.getElementById('wl-badge');
    if (!badge) return;
    var count = getWatchlist().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // ============================================================
  // CARD creation & skeletons
  // ============================================================
  function createCard(item, mediaType) {
    var type = mediaType || item.media_type || 'movie';
    var title = item.title || item.name || 'Untitled';
    var year = getYear(item.release_date || item.first_air_date);
    var rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    var card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', item.id);
    card.setAttribute('data-type', type);
    var typeBadgeLabel = type === 'tv' ? 'TV' : 'Movie';
    card.innerHTML =
      '<img class="card-poster" src="' + posterUrl(item.poster_path) + '" alt="' + title.replace(/"/g, '&quot;') + '" loading="lazy">' +
      '<span class="card-type-badge card-type-badge--' + type + '">' + typeBadgeLabel + '</span>' +
      '<div class="card-body">' +
        '<div class="card-title">' + title + '</div>' +
        '<div class="card-meta">' +
          '<span class="card-year">' + year + '</span>' +
          '<span class="card-rating">' + '\u2605 ' + rating + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card-overlay">' +
        '<div class="card-play-icon">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
        '</div>' +
      '</div>';

    card.addEventListener('click', function () {
      navigate('#' + type + '/' + item.id);
    });
    return card;
  }

  function createSkeletons(count) {
    count = count || 10;
    var arr = [];
    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      el.className = 'skeleton-card';
      el.innerHTML =
        '<div class="skeleton-poster"></div>' +
        '<div class="skeleton-body">' +
          '<div class="skeleton-line"></div>' +
          '<div class="skeleton-line short"></div>' +
        '</div>';
      arr.push(el);
    }
    return arr;
  }

  function renderSkeletonsInRow(rowId) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';
    var skRow = document.createElement('div');
    skRow.className = 'card-skeleton-row';
    createSkeletons(10).forEach(function (s) { skRow.appendChild(s); });
    row.appendChild(skRow);
  }

  function renderRow(rowId, items, mediaType) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';
    if (!items || items.length === 0) {
      row.innerHTML = '<p style="color:var(--text-muted);padding:20px 0">No content available</p>';
      return;
    }
    items.forEach(function (item) {
      row.appendChild(createCard(item, mediaType));
    });
  }

  function renderSkeletonsInGrid(gridEl, count) {
    count = count || 12;
    gridEl.innerHTML = '';
    createSkeletons(count).forEach(function (s) {
      s.style.width = '100%';
      gridEl.appendChild(s);
    });
  }

  // ============================================================
  // ROUTER — hash-based
  // ============================================================
  // Routes:
  //   #home          — homepage with hero + rows
  //   #movies        — popular movies grid
  //   #series        — popular series grid
  //   #trending      — trending grid
  //   #mylist        — watchlist grid
  //   #movie/{id}    — movie detail page
  //   #tv/{id}       — TV detail page
  //   #search/{q}    — search results
  //   (empty hash)   — same as #home

  var currentRoute = '';

  function navigate(hash) {
    window.location.hash = hash;
  }

  function goBack() {
    // Use real browser history — so movie1→movie2→back=movie1→back=home
    history.back();
  }

  function parseRoute() {
    var hash = window.location.hash || '#home';
    if (hash === '#' || hash === '') hash = '#home';

    var parts = hash.substring(1).split('/');
    var page = parts[0];
    var param = parts.slice(1).join('/');

    return { page: page, param: param, full: hash };
  }

  function handleRoute() {
    var route = parseRoute();

    currentRoute = route.full;

    // Close mobile nav if open
    var mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) mobileNav.classList.remove('open');

    // Close search suggestions
    var suggBox = document.getElementById('search-suggestions');
    if (suggBox) suggBox.classList.remove('active');

    // Update active nav link
    updateActiveNav(route.page);

    // Route to the right view
    switch (route.page) {
      case 'home':
        showHomeView();
        break;
      case 'movies':
        showGridView('Popular Movies', '/movie/popular', {}, 'movie');
        break;
      case 'series':
        showGridView('Popular Series', '/tv/popular', {}, 'tv');
        break;
      case 'trending':
        showGridView('Trending', '/trending/all/week', {}, '');
        break;
      case 'mylist':
        showMyListView();
        break;
      case 'movie':
        showDetailView(route.param, 'movie');
        break;
      case 'tv':
        showDetailView(route.param, 'tv');
        break;
      case 'person':
        showPersonView(route.param);
        break;
      case 'search':
        showSearchView(decodeURIComponent(route.param));
        break;
      case 'newest':
        showGridView('Newest', '/movie/now_playing', {}, 'movie');
        break;
      case 'toprated':
        showGridView('Top Rated', '/movie/top_rated', {}, 'movie');
        break;
      case 'action':
        showGridView('Action', '/discover/', { genreKey: 'action' }, '');
        break;
      case 'horror':
        showGridView('Horror', '/discover/', { genreKey: 'horror' }, '');
        break;
      case 'comedy':
        showGridView('Comedy', '/discover/', { genreKey: 'comedy' }, '');
        break;
      case 'scifi':
        showGridView('Sci-Fi', '/discover/', { genreKey: 'scifi' }, '');
        break;
      case 'animation':
      case 'anime': // fallback old route
        showGridView('Animation', '/discover/', { genreKey: 'animation' }, '');
        break;
      case 'drama':
        showGridView('Drama', '/discover/', { genreKey: 'drama' }, '');
        break;
      case 'romance':
        showGridView('Romance', '/discover/', { genreKey: 'romance' }, '');
        break;
      case 'thriller':
        showGridView('Thriller', '/discover/', { genreKey: 'thriller' }, '');
        break;
      case 'categories':
        showGridView('All Categories', '/discover/', {}, '');
        break;
      case 'surpriseme':
        surpriseMe();
        break;
      default:
        showHomeView();
        break;
    }
  }

  function surpriseMe() {
    var types = ['movie', 'tv'];
    var type = types[Math.floor(Math.random() * types.length)];
    var page = Math.floor(Math.random() * 10) + 1; // Random page up to 10
    var endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
    
    tmdb(endpoint, { page: page, vote_average_gte: 7.0, sort_by: 'popularity.desc' }).then(function(data) {
      if (data.results && data.results.length > 0) {
        var randomItem = data.results[Math.floor(Math.random() * data.results.length)];
        navigate('#' + type + '/' + randomItem.id);
      } else {
        navigate('#home');
      }
    });
  }

  function updateActiveNav(page) {
    var navPage = page;
    // Detail pages don't highlight any nav
    if (page === 'movie' || page === 'tv' || page === 'search' || page === 'person') navPage = '';

    document.querySelectorAll('.nav-link').forEach(function (l) {
      l.classList.remove('active');
      if (l.getAttribute('data-section') === navPage) {
        l.classList.add('active');
      }
    });
  }

  // ============================================================
  // VIEW SWITCHING
  // ============================================================
  var views = ['home-view', 'grid-view', 'detail-view'];

  function showView(viewId) {
    // Bersihkan infinite scroll listener tiap ganti view
    window.removeEventListener('scroll', handleGridScroll);
    
    views.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = id === viewId ? '' : 'none';
    });
    // Show/hide hero
    var hero = document.getElementById('hero');
    if (hero) hero.style.display = viewId === 'home-view' ? '' : 'none';
    // Show/hide main (home rows)
    var main = document.getElementById('main-content');
    if (main) main.style.display = viewId === 'home-view' ? '' : 'none';

    // Kill any playing iframes when leaving detail view
    if (viewId !== 'detail-view') {
      var ytIframe = document.getElementById('youtube-iframe');
      var streamIframe = document.getElementById('stream-iframe');
      if (ytIframe) ytIframe.src = '';
      if (streamIframe) streamIframe.src = '';
      currentStream = null;
    }

    // Reset document title when not on detail page
    if (viewId !== 'detail-view') {
      document.title = 'Hisyam TV \u2014 Stream Anything';
    }

    // Always force navbar scrolled state on non-home views
    var navbar = document.getElementById('navbar');
    if (navbar) {
      if (viewId !== 'home-view') {
        navbar.classList.add('scrolled');
      } else {
        // Re-evaluate scroll position
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
    }

    window.scrollTo({ top: 0 });
  }

  // ============================================================
  // HOME VIEW
  // ============================================================
  var heroLoaded = false;
  var loadedRows = {};

  function fetchMultiGenre(genreKey) {
    var pMovie = tmdb('/discover/movie', { with_genres: GENRES[genreKey].movie });
    var pTv = tmdb('/discover/tv', { with_genres: GENRES[genreKey].tv });
    return Promise.all([pMovie, pTv]).then(function(responses) {
      var movies = responses[0].results || [];
      var tvs = responses[1].results || [];
      movies.forEach(function(m) { m.media_type = 'movie'; });
      tvs.forEach(function(t) { t.media_type = 'tv'; });
      var combined = movies.concat(tvs);
      combined.sort(function(a, b) { return (b.popularity || 0) - (a.popularity || 0); });
      return { results: combined };
    });
  }

  var ROW_CONFIG = [
    { id: 'row-trending',  fetch: function () { return tmdb('/trending/all/week'); },                                   type: null    },
    { id: 'row-newest',    fetch: function () { return tmdb('/movie/now_playing'); },                                    type: 'movie' },
    { id: 'row-movies',    fetch: function () { return tmdb('/movie/popular'); },                                        type: 'movie' },
    { id: 'row-series',    fetch: function () { return tmdb('/tv/popular'); },                                           type: 'tv'    },
    { id: 'row-toprated',  fetch: function () { return tmdb('/movie/top_rated'); },                                      type: 'movie' },
    { id: 'row-action',    fetch: function () { return fetchMultiGenre('action'); },       type: null },
    { id: 'row-horror',    fetch: function () { return fetchMultiGenre('horror'); },       type: null },
    { id: 'row-comedy',    fetch: function () { return fetchMultiGenre('comedy'); },       type: null },
    { id: 'row-scifi',     fetch: function () { return fetchMultiGenre('scifi'); },        type: null },
    { id: 'row-animation', fetch: function () { return fetchMultiGenre('animation'); },        type: null },
    { id: 'row-drama',     fetch: function () { return fetchMultiGenre('drama'); },        type: null },
    { id: 'row-romance',   fetch: function () { return fetchMultiGenre('romance'); },      type: null },
    { id: 'row-thriller',  fetch: function () { return fetchMultiGenre('thriller'); },     type: null },
  ];

  var lazyObserver = null;

  function showHomeView() {
    showView('home-view');

    if (!heroLoaded) {
      heroLoaded = true;
      loadHero();
      // Show skeletons for all rows
      ROW_CONFIG.forEach(function (cfg) { renderSkeletonsInRow(cfg.id); });
      setupLazyRows();
    }
  }

  function loadRow(cfg) {
    if (loadedRows[cfg.id]) return;
    loadedRows[cfg.id] = true;
    cfg.fetch().then(function (data) {
      renderRow(cfg.id, data.results, cfg.type);
    });
  }

  function setupLazyRows() {
    // Load first 3 immediately
    ROW_CONFIG.slice(0, 3).forEach(function (cfg) { loadRow(cfg); });

    // Lazy load the rest
    var lazyRows = ROW_CONFIG.slice(3);

    if (!('IntersectionObserver' in window)) {
      // Fallback: load all
      lazyRows.forEach(function (cfg) { loadRow(cfg); });
      return;
    }

    lazyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var rowEl = entry.target.querySelector('.card-row');
        if (!rowEl) return;
        var cfg = lazyRows.find(function (r) { return r.id === rowEl.id; });
        if (cfg && !loadedRows[cfg.id]) {
          loadRow(cfg);
          lazyObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '300px 0px' });

    lazyRows.forEach(function (cfg) {
      var row = document.getElementById(cfg.id);
      if (row && row.parentElement) {
        lazyObserver.observe(row.parentElement);
      }
    });
  }

  // ── Hero ──
  var heroItem = null;

  function loadHero() {
    var heroBd = document.getElementById('hero-backdrop');
    var heroTitle = document.getElementById('hero-title');
    var heroOverview = document.getElementById('hero-overview');
    var heroRating = document.getElementById('hero-rating');
    var heroYear = document.getElementById('hero-year');
    var heroType = document.getElementById('hero-type');

    tmdb('/trending/all/week').then(function (data) {
      if (!data.results || !data.results.length) return;

      var item = data.results[Math.floor(Math.random() * Math.min(10, data.results.length))];
      heroItem = item;

      var type = item.media_type || 'movie';
      var title = item.title || item.name || '';
      var year = getYear(item.release_date || item.first_air_date);

      heroBd.style.backgroundImage = "url('" + backdropUrl(item.backdrop_path) + "')";
      heroTitle.textContent = title;
      heroOverview.textContent = item.overview || 'Curated content for you.';
      heroRating.textContent = '\u2605 ' + getRating(item.vote_average);
      heroYear.textContent = year;
      heroType.textContent = type === 'tv' ? 'SERIES' : 'MOVIE';

      document.getElementById('hero-play-btn').onclick = function () {
        navigate('#' + type + '/' + item.id);
      };
      document.getElementById('hero-info-btn').onclick = function () {
        navigate('#' + type + '/' + item.id);
      };
    });
  }

  // ============================================================
  // GRID VIEW (Movies, Series, Category Show All)
  // ============================================================
  var currentGridState = {
    endpoint: '',
    params: {},
    page: 1,
    mediaType: null,
    loading: false,
    hasMore: true
  };

  function showGridView(title, endpoint, params, mediaType) {
    showView('grid-view');
    var container = document.getElementById('grid-view');
    
    // Setup state
    currentGridState.endpoint = endpoint;
    currentGridState.params = Object.assign({}, params);
    currentGridState.page = 1;
    currentGridState.mediaType = mediaType;
    currentGridState.hasMore = true;
    currentGridState.loading = false;

    var isDiscover = endpoint.includes('/discover/') || endpoint.includes('/popular') || endpoint.includes('/top_rated') || endpoint.includes('/now_playing') || title === 'Trending';
    var filterHtml = '';
    
    // If it's trending or any discover, default to movie if no mediaType passed
    var effectiveMediaType = mediaType || ''; // '' means Any Type
    var selG = params.genreKey || '';

    // Fix TMDB param if we just passed genreKey
    if (params.genreKey && GENRES[params.genreKey]) {
      params.with_genres = GENRES[params.genreKey][effectiveMediaType || 'movie'];
      delete params.genreKey;
    }

    if (isDiscover) {
      var typeText = effectiveMediaType === 'tv' ? 'Series' : (effectiveMediaType === 'movie' ? 'Movies' : 'Any Type');
      filterHtml += '<div class="multi-select custom-single-select" id="type-filter-wrap" data-value="' + effectiveMediaType + '">' +
        '<div class="multi-select-toggle" id="type-toggle">' + typeText + '</div>' +
        '<div class="multi-select-menu">' +
          '<div class="single-select-option ' + (effectiveMediaType === '' ? 'selected' : '') + '" data-value="">Any Type</div>' +
          '<div class="single-select-option ' + (effectiveMediaType === 'movie' ? 'selected' : '') + '" data-value="movie">Movies</div>' +
          '<div class="single-select-option ' + (effectiveMediaType === 'tv' ? 'selected' : '') + '" data-value="tv">Series</div>' +
        '</div>' +
      '</div>';

      filterHtml += '<div class="multi-select" id="genre-multi-select">' +
        '<div class="multi-select-toggle" id="genre-toggle">All Genres</div>' +
        '<div class="multi-select-menu" id="genre-menu">' +
          '<label><input type="checkbox" value="action" ' + (selG === 'action' ? 'checked' : '') + '> Action</label>' +
          '<label><input type="checkbox" value="animation" ' + (selG === 'animation' ? 'checked' : '') + '> Animation</label>' +
          '<label><input type="checkbox" value="comedy" ' + (selG === 'comedy' ? 'checked' : '') + '> Comedy</label>' +
          '<label><input type="checkbox" value="drama" ' + (selG === 'drama' ? 'checked' : '') + '> Drama</label>' +
          '<label><input type="checkbox" value="horror" ' + (selG === 'horror' ? 'checked' : '') + '> Horror</label>' +
          '<label><input type="checkbox" value="romance" ' + (selG === 'romance' ? 'checked' : '') + '> Romance</label>' +
          '<label><input type="checkbox" value="scifi" ' + (selG === 'scifi' ? 'checked' : '') + '> Sci-Fi</label>' +
          '<label><input type="checkbox" value="thriller" ' + (selG === 'thriller' ? 'checked' : '') + '> Thriller</label>' +
        '</div>' +
      '</div>';
      
      var isNewest = endpoint.includes('/now_playing');
      var isTopRated = endpoint.includes('/top_rated');
      var sortVal = '';
      var sortText = 'Popularity';
      if (isTopRated) { sortVal = 'vote_average.desc'; sortText = 'Top Rated'; }
      else if (isNewest) { sortVal = 'primary_release_date.desc'; sortText = 'Newest'; }
      else if (currentGridState.params.sort_by === 'popularity.desc' && currentGridState.page > 1) { sortVal = 'random-active'; sortText = 'Randomize'; }
      
      filterHtml += '<div class="multi-select custom-single-select" id="sort-filter-wrap" data-value="' + sortVal + '">' +
        '<div class="multi-select-toggle" id="sort-toggle">' + sortText + '</div>' +
        '<div class="multi-select-menu">' +
          '<div class="single-select-option ' + (sortVal === '' || sortVal === 'popularity.desc' ? 'selected' : '') + '" data-value="popularity.desc">Popularity</div>' +
          '<div class="single-select-option ' + (sortVal === 'vote_average.desc' ? 'selected' : '') + '" data-value="vote_average.desc">Top Rated</div>' +
          '<div class="single-select-option ' + (sortVal === 'primary_release_date.desc' ? 'selected' : '') + '" data-value="primary_release_date.desc">Newest</div>' +
          '<div class="single-select-option ' + (sortVal === 'random-active' ? 'selected' : '') + '" data-value="random">Randomize</div>' +
        '</div>' +
      '</div>';

      // Year filter — always visible
      var currentYear = new Date().getFullYear();
      var yearOptionsHtml = '<div class="single-select-option selected" data-value="">All Years</div>';
      for (var yr = currentYear; yr >= 1950; yr--) {
        yearOptionsHtml += '<div class="single-select-option" data-value="' + yr + '">' + yr + '</div>';
      }
      filterHtml += '<div class="multi-select custom-single-select" id="year-filter-wrap" data-value="">' +
        '<div class="multi-select-toggle" id="year-toggle">All Years</div>' +
        '<div class="multi-select-menu year-menu">' +
          yearOptionsHtml +
        '</div>' +
      '</div>';
    }

    container.innerHTML =
      '<div class="grid-view-container">' +
        '<div class="grid-view-header">' +
          '<h2 class="grid-view-title" id="grid-view-title">' + title + '</h2>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + filterHtml + '</div>' +
        '</div>' +
        '<div class="card-grid" id="grid-cards"></div>' +
        '<div id="grid-loading" style="text-align:center;padding:20px;display:none;">' +
          '<div class="splash-loader-bar" style="width:100%;height:3px;background:var(--border);"></div>' +
        '</div>' +
      '</div>';

    var grid = document.getElementById('grid-cards');
    var titleEl = document.getElementById('grid-view-title');
    
    // Custom Dropdowns Logic
    var allDropdowns = document.querySelectorAll('.multi-select');
    allDropdowns.forEach(function(dd) {
      var toggle = dd.querySelector('.multi-select-toggle');
      if (toggle) {
        toggle.addEventListener('click', function(e) {
          e.stopPropagation();
          allDropdowns.forEach(function(other) { if (other !== dd) other.classList.remove('open'); });
          dd.classList.toggle('open');
        });
      }
    });

    document.addEventListener('click', function(e) {
      allDropdowns.forEach(function(dd) {
        if (!dd.contains(e.target)) dd.classList.remove('open');
      });
    });

    // Single Select Option Click (Type & Sort)
    var singleOptions = document.querySelectorAll('.custom-single-select .single-select-option');
    singleOptions.forEach(function(opt) {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        var wrap = this.closest('.custom-single-select');
        var toggle = wrap.querySelector('.multi-select-toggle');
        var val = this.getAttribute('data-value');
        wrap.querySelectorAll('.single-select-option').forEach(function(o) { o.classList.remove('selected'); });
        this.classList.add('selected');
        wrap.setAttribute('data-value', val);
        wrap.classList.remove('open');
        
        // Show shuffle icon if Randomize selected on sort
        if (val === 'random' && wrap.id === 'sort-filter-wrap') {
          toggle.innerHTML = 'Randomize <span class="shuffle-btn" id="shuffle-reroll" title="Shuffle again"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.6-8.6c.8-1.1 2-1.7 3.3-1.7H20"/><path d="M18 2l4 4-4 4"/><path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l6.6 8.6c.8 1.1 2 1.7 3.3 1.7H20"/><path d="M18 14l4 4-4 4"/></svg></span>';
          bindShuffleBtn();
        } else {
          toggle.textContent = this.textContent;
        }
        
        applyFilters();
      });
    });

    function bindShuffleBtn() {
      var btn = document.getElementById('shuffle-reroll');
      if (btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var sortWrap = document.getElementById('sort-filter-wrap');
          if (sortWrap) sortWrap.setAttribute('data-value', 'random');
          applyFilters();
        });
      }
    }
    // Bind on init if already randomize
    bindShuffleBtn();

    // Multi Select Checkbox (Genres)
    var genreSelect = document.getElementById('genre-multi-select');
    var genreToggle = document.getElementById('genre-toggle');
    var genreCheckboxes = document.querySelectorAll('#genre-menu input[type="checkbox"]');

    if (genreCheckboxes.length > 0) {
      genreCheckboxes.forEach(function(cb) {
        cb.addEventListener('change', function() {
          updateGenreToggleText();
          applyFilters();
        });
      });
      updateGenreToggleText();
    }

    function updateGenreToggleText() {
      if (!genreToggle) return;
      var checked = Array.from(genreCheckboxes).filter(function(c) { return c.checked; });
      if (checked.length === 0) {
        genreToggle.innerHTML = 'All Genres';
      } else {
        var text = checked.length === 1 ? checked[0].parentElement.textContent.trim() : checked.length + ' Selected';
        genreToggle.innerHTML = text + '<span class="clear-genres" title="Clear Genres">&times;</span>';
        
        var clearBtn = genreToggle.querySelector('.clear-genres');
        if (clearBtn) {
          clearBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Jangan buka dropdownnya saat mencet X
            genreCheckboxes.forEach(function(c) { c.checked = false; });
            updateGenreToggleText();
            applyFilters();
          });
        }
      }
    }
    
    function applyFilters() {
      var typeWrap = document.getElementById('type-filter-wrap');
      var sortWrap = document.getElementById('sort-filter-wrap');
      
      var t = typeWrap ? typeWrap.getAttribute('data-value') : effectiveMediaType; // '' for any
      var s = sortWrap ? sortWrap.getAttribute('data-value') : '';
      
      var checkedKeys = [];
      if (genreCheckboxes) {
        checkedKeys = Array.from(genreCheckboxes).filter(function(c) { return c.checked; }).map(function(c) { return c.value; });
      }
      
      currentGridState.mediaType = t; // can be '' (multi), 'movie', 'tv'
      currentGridState.activeGenres = checkedKeys;
      currentGridState.params = {};
      
      if (s === 'random' || s === 'random-active') {
        currentGridState.params.sort_by = 'popularity.desc';
        currentGridState.page = Math.floor(Math.random() * 50) + 1;
        if (sortWrap) {
          sortWrap.setAttribute('data-value', 'random-active');
          var sortToggle = sortWrap.querySelector('.multi-select-toggle');
          if (sortToggle) {
            sortToggle.innerHTML = 'Randomize <span class="shuffle-btn" id="shuffle-reroll" title="Shuffle again"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.6-8.6c.8-1.1 2-1.7 3.3-1.7H20"/><path d="M18 2l4 4-4 4"/><path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l6.6 8.6c.8 1.1 2 1.7 3.3 1.7H20"/><path d="M18 14l4 4-4 4"/></svg></span>';
            bindShuffleBtn();
          }
        }
      } else if (s) {
        currentGridState.params.sort_by = s;
        currentGridState.page = 1;
      } else {
        currentGridState.page = 1;
      }
      
      if (s === 'vote_average.desc') {
        currentGridState.params['vote_count.gte'] = 300;
      }

      if (s === 'primary_release_date.desc' || s === 'first_air_date.desc') {
        var today = new Date().toISOString().split('T')[0];
        currentGridState.params['primary_release_date.lte'] = today;
        currentGridState.params['first_air_date.lte'] = today;
        currentGridState.params['vote_count.gte'] = 5;
      }

      // Year filter — applies to all sort modes
      var yearWrap = document.getElementById('year-filter-wrap');
      var selectedYear = yearWrap ? yearWrap.getAttribute('data-value') : '';
      if (selectedYear) {
        var y = parseInt(selectedYear);
        currentGridState.params['primary_release_date.gte'] = y + '-01-01';
        currentGridState.params['primary_release_date.lte'] = y + '-12-31';
        currentGridState.params['first_air_date.gte'] = y + '-01-01';
        currentGridState.params['first_air_date.lte'] = y + '-12-31';
      }
      
      // Update Title
      if (titleEl) {
        var newTitle = 'Explore';
        if (checkedKeys.length === 1) {
          var singleCb = document.querySelector('#genre-menu input[value="' + checkedKeys[0] + '"]');
          if (singleCb) newTitle = singleCb.parentElement.textContent.trim();
        } else if (checkedKeys.length > 1) {
          newTitle = 'Mixed Genres';
        } else if (s === 'vote_average.desc') {
          newTitle = 'Top Rated';
        } else if (s === 'primary_release_date.desc' || s === 'first_air_date.desc') {
          newTitle = 'Newest';
        } else {
          newTitle = 'Popular';
        }
        // Append selected year to title
        var yrWrap = document.getElementById('year-filter-wrap');
        var yrVal = yrWrap ? yrWrap.getAttribute('data-value') : '';
        if (yrVal) newTitle += ' (' + yrVal + ')';
        newTitle += (t === 'tv') ? ' Series' : (t === 'movie' ? ' Movies' : ' Media');
        titleEl.textContent = newTitle;
      }

      currentGridState.hasMore = true;
      currentGridState.loading = false;
      var grid = document.getElementById('grid-cards');
      if (grid) grid.innerHTML = '';
      
      loadMoreGridItems();
    }

    // (Custom single-select handles applyFilters via click now)

    // Initial load syncs with UI
    applyFilters();
    setupInfiniteScroll();
  }

  function loadMoreGridItems() {
    if (currentGridState.loading || !currentGridState.hasMore) return;
    currentGridState.loading = true;
    
    var grid = document.getElementById('grid-cards');
    var loader = document.getElementById('grid-loading');
    if (loader) loader.style.display = 'block';
    if (currentGridState.page === 1) renderSkeletonsInGrid(grid, 12);
    
    var typesToFetch = currentGridState.mediaType ? [currentGridState.mediaType] : ['movie', 'tv'];
    
    var promises = typesToFetch.map(function(type) {
      var fetchParams = Object.assign({ page: currentGridState.page }, currentGridState.params);
      var endp = '/discover/' + type;

      // Fallback to trending if absolutely no filters applied on Any Type
      if (!currentGridState.mediaType && (!currentGridState.activeGenres || !currentGridState.activeGenres.length) && !currentGridState.params.sort_by) {
        endp = '/trending/' + type + '/week';
      }

      // Translate active genres
      if (currentGridState.activeGenres && currentGridState.activeGenres.length > 0) {
        var translatedIds = currentGridState.activeGenres.map(function(k) { return GENRES[k][type]; }).filter(Boolean);
        if (translatedIds.length > 0) {
          fetchParams.with_genres = translatedIds.join(',');
        } else {
          // If a genre doesn't exist for this type at all (e.g. no mapping), we can simulate empty results
          return Promise.resolve({ results: [], total_pages: 0, type: type });
        }
      }

      if (type === 'tv' && fetchParams.sort_by === 'primary_release_date.desc') {
        fetchParams.sort_by = 'first_air_date.desc';
      }

      return tmdb(endp, fetchParams).then(function(data) {
        return { results: data.results || [], total_pages: data.total_pages || 1, type: type };
      });
    });

    Promise.all(promises).then(function(responses) {
      if (loader) loader.style.display = 'none';
      if (currentGridState.page === 1) grid.innerHTML = '';
      
      var allItems = [];
      var maxPages = 1;
      responses.forEach(function(res) {
        if (res.total_pages > maxPages) maxPages = res.total_pages;
        res.results.forEach(function(i) {
          i.media_type = i.media_type || res.type;
          allItems.push(i);
        });
      });

      // Sort merged items client-side to maintain chosen sorting across both APIs
      var s = currentGridState.params.sort_by || 'popularity.desc';
      allItems.sort(function(a, b) {
        if (s.includes('vote_average')) {
          return (b.vote_average || 0) - (a.vote_average || 0);
        } else if (s.includes('date')) {
          var da = new Date(a.release_date || a.first_air_date || 0).getTime();
          var db = new Date(b.release_date || b.first_air_date || 0).getTime();
          return db - da;
        }
        return (b.popularity || 0) - (a.popularity || 0);
      });

      if (!allItems.length) {
        currentGridState.hasMore = false;
        if (currentGridState.page === 1) {
          grid.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;grid-column:1/-1;text-align:center;">No content available</p>';
        }
        return;
      }
      
      allItems.forEach(function (item) {
        grid.appendChild(createCard(item, item.media_type));
      });
      
      if (currentGridState.page >= maxPages) {
        currentGridState.hasMore = false;
      } else {
        currentGridState.page++;
      }
      currentGridState.loading = false;
    });
  }

  function setupInfiniteScroll() {
    // Remove existing listener if any
    window.removeEventListener('scroll', handleGridScroll);
    window.addEventListener('scroll', handleGridScroll);
  }
  
  function handleGridScroll() {
    var view = document.getElementById('grid-view');
    if (view.style.display === 'none') return;
    
    var scrollPos = window.innerHeight + window.scrollY;
    var bottom = document.documentElement.offsetHeight;
    if (scrollPos >= bottom - 400) {
      loadMoreGridItems();
    }
  }



  // ============================================================
  // MY LIST VIEW
  // ============================================================
  function showMyListView() {
    showView('grid-view');
    var container = document.getElementById('grid-view');
    
    var filterHtml = 
      '<div class="multi-select custom-single-select" id="mylist-type-wrap" data-value="">' +
        '<div class="multi-select-toggle" id="mylist-type-toggle">All Types</div>' +
        '<div class="multi-select-menu">' +
          '<div class="single-select-option selected" data-value="">All Types</div>' +
          '<div class="single-select-option" data-value="movie">Movies</div>' +
          '<div class="single-select-option" data-value="tv">Series</div>' +
        '</div>' +
      '</div>' +
      '<div class="multi-select" id="mylist-genre-select">' +
        '<div class="multi-select-toggle" id="mylist-genre-toggle">All Genres</div>' +
        '<div class="multi-select-menu" id="mylist-genre-menu">' +
          '<label><input type="checkbox" value="action"> Action</label>' +
          '<label><input type="checkbox" value="animation"> Animation</label>' +
          '<label><input type="checkbox" value="comedy"> Comedy</label>' +
          '<label><input type="checkbox" value="drama"> Drama</label>' +
          '<label><input type="checkbox" value="horror"> Horror</label>' +
          '<label><input type="checkbox" value="romance"> Romance</label>' +
          '<label><input type="checkbox" value="scifi"> Sci-Fi</label>' +
          '<label><input type="checkbox" value="thriller"> Thriller</label>' +
        '</div>' +
      '</div>' +
      '<div class="multi-select custom-single-select" id="mylist-sort-wrap" data-value="added.desc">' +
        '<div class="multi-select-toggle" id="mylist-sort-toggle">Recently Added</div>' +
        '<div class="multi-select-menu">' +
          '<div class="single-select-option selected" data-value="added.desc">Recently Added</div>' +
          '<div class="single-select-option" data-value="rating.desc">Top Rated</div>' +
          '<div class="single-select-option" data-value="year.desc">Newest Release</div>' +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="grid-view-container">' +
        '<div class="grid-view-header">' +
          '<h2 class="grid-view-title">My List</h2>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + filterHtml + '</div>' +
        '</div>' +
        '<div class="card-grid" id="grid-cards"></div>' +
      '</div>';

    var grid = document.getElementById('grid-cards');
    var typeFilterWrap = document.getElementById('mylist-type-wrap');
    var sortFilterWrap = document.getElementById('mylist-sort-wrap');

    // Bind custom single-selects
    var singleOptions = document.querySelectorAll('#grid-view .custom-single-select .single-select-option');
    singleOptions.forEach(function(opt) {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        var wrap = this.closest('.custom-single-select');
        var toggle = wrap.querySelector('.multi-select-toggle');
        wrap.querySelectorAll('.single-select-option').forEach(function(o) { o.classList.remove('selected'); });
        this.classList.add('selected');
        toggle.textContent = this.textContent;
        wrap.setAttribute('data-value', this.getAttribute('data-value'));
        wrap.classList.remove('open');
        renderList();
      });
    });

    var allDropdowns = document.querySelectorAll('#grid-view .multi-select');
    allDropdowns.forEach(function(dd) {
      var toggle = dd.querySelector('.multi-select-toggle');
      if (toggle) {
        toggle.addEventListener('click', function(e) {
          e.stopPropagation();
          allDropdowns.forEach(function(other) { if (other !== dd) other.classList.remove('open'); });
          dd.classList.toggle('open');
        });
      }
    });

    var mlGenreSelect = document.getElementById('mylist-genre-select');
    var mlGenreToggle = document.getElementById('mylist-genre-toggle');
    var mlGenreCheckboxes = document.querySelectorAll('#mylist-genre-menu input[type="checkbox"]');

    function updateMlGenreToggleText() {
      if (!mlGenreToggle) return;
      var checked = Array.from(mlGenreCheckboxes).filter(function(c) { return c.checked; });
      if (checked.length === 0) {
        mlGenreToggle.innerHTML = 'All Genres';
      } else {
        var text = checked.length === 1 ? checked[0].parentElement.textContent.trim() : checked.length + ' Selected';
        mlGenreToggle.innerHTML = text + '<span class="clear-genres" title="Clear Genres">&times;</span>';
        
        var clearBtn = mlGenreToggle.querySelector('.clear-genres');
        if (clearBtn) {
          clearBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            mlGenreCheckboxes.forEach(function(c) { c.checked = false; });
            updateMlGenreToggleText();
            renderList();
          });
        }
      }
    }

    if (mlGenreCheckboxes.length > 0) {
      mlGenreCheckboxes.forEach(function(cb) {
        cb.addEventListener('change', function() {
          updateMlGenreToggleText();
          renderList();
        });
      });
      updateMlGenreToggleText();
    }

    function renderList() {
      grid.innerHTML = '';
      var list = getWatchlist();
      
      var tVal = document.getElementById('mylist-type-wrap').getAttribute('data-value');
      var sVal = document.getElementById('mylist-sort-wrap').getAttribute('data-value');
      var checkedGenres = Array.from(mlGenreCheckboxes).filter(function(c) { return c.checked; }).map(function(c) { return c.value; });

      // Filter Type
      if (tVal) {
        list = list.filter(function(i) { return i.media_type === tVal; });
      }
      
      // Filter Genre (Local AND logic)
      if (checkedGenres.length > 0) {
        list = list.filter(function(i) {
          if (!i.genre_ids || !i.genre_ids.length) return false;
          
          return checkedGenres.every(function(gKey) {
            var targetId = GENRES[gKey][i.media_type || 'movie'];
            return i.genre_ids.includes(targetId) || i.genre_ids.includes(Number(targetId));
          });
        });
      }
      
      // Sort
      list.sort(function(a, b) {
        if (sVal === 'rating.desc') {
          return (b.vote_average || 0) - (a.vote_average || 0);
        } else if (sVal === 'year.desc') {
          var ya = a.release_date ? new Date(a.release_date).getTime() : 0;
          var yb = b.release_date ? new Date(b.release_date).getTime() : 0;
          return yb - ya;
        }
        // default added.desc
        return (b.addedAt || 0) - (a.addedAt || 0);
      });

      if (!list.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);padding:40px 0;grid-column:1/-1;text-align:center;font-size:16px;">Your list is empty or matches no filters.</p>';
        return;
      }

      list.forEach(function (item) {
        var card = createCard(item, item.media_type);
        // Add remove button
        var removeBtn = document.createElement('button');
        removeBtn.className = 'card-remove-btn';
        removeBtn.setAttribute('aria-label', 'Remove from My List');
        removeBtn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
            '<line x1="18" y1="6" x2="6" y2="18"/>' +
            '<line x1="6" y1="6" x2="18" y2="18"/>' +
          '</svg>';
        removeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleWatchlist(item);
          card.classList.add('card-removing');
          setTimeout(renderList, 300);
        });
        card.style.position = 'relative';
        card.appendChild(removeBtn);
        grid.appendChild(card);
      });
    }

    renderList();
  }

  // ============================================================
  // SEARCH VIEW
  // ============================================================
  function showSearchView(query) {
    if (!query || query.length < 2) {
      navigate('#home');
      return;
    }

    showView('grid-view');
    var container = document.getElementById('grid-view');
    container.innerHTML =
      '<div class="grid-view-container">' +
        '<h2 class="grid-view-title">Search: "' + query.replace(/</g, '&lt;') + '"</h2>' +
        '<div class="card-grid" id="grid-cards"></div>' +
      '</div>';

    var grid = document.getElementById('grid-cards');
    renderSkeletonsInGrid(grid, 8);

    tmdb('/search/multi', { query: query, include_adult: false }).then(function (data) {
      grid.innerHTML = '';
      var filtered = (data.results || []).filter(function (r) {
        return (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path;
      });

      if (!filtered.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;grid-column:1/-1">No results for "' + query.replace(/</g, '&lt;') + '"</p>';
        return;
      }
      filtered.forEach(function (item) {
        grid.appendChild(createCard(item, item.media_type));
      });
    });
  }

  // ============================================================
  // DETAIL VIEW — full page (replaces modal)
  // ============================================================
  var activeServer = 0;
  var currentStream = null;
  var currentDetailItem = null;
  var currentEps = [];

  function showDetailView(id, type) {
    showView('detail-view');
    var container = document.getElementById('detail-view');

    // Build the detail page HTML
    container.innerHTML =
      '<div class="detail-page">' +
        // Back button
        '<button class="detail-back-btn" id="detail-back">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>' +
          ' Back' +
        '</button>' +
        // Player
        '<div class="player-wrapper" id="player-wrapper">' +
          '<div class="player-placeholder" id="player-placeholder">' +
            '<div class="player-poster" id="player-poster"></div>' +
            '<button class="player-play-big" id="player-play-big">' +
              '<svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="youtube-container" id="youtube-container" style="display:none">' +
            '<iframe id="youtube-iframe" src="" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>' +
            '<a id="yt-ext-link" href="#" target="_blank" rel="noopener" class="yt-ext-link">Open in YouTube \u2197</a>' +
          '</div>' +
          '<div class="stream-container" id="stream-container" style="display:none">' +
            '<iframe id="stream-iframe" src="" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>' +
          '</div>' +
        '</div>' +
        // Info
        '<div class="detail-info" id="detail-info">' +
          '<div class="detail-meta">' +
            '<span class="detail-year" id="detail-year"></span>' +
            '<span class="detail-runtime" id="detail-runtime"></span>' +
            '<span class="detail-rating" id="detail-rating"></span>' +
            '<span class="detail-type-badge" id="detail-type"></span>' +
          '</div>' +
          '<h1 class="detail-title" id="detail-title">Loading...</h1>' +
          '<p class="detail-overview" id="detail-overview"></p>' +
          '<div class="detail-genres" id="detail-genres"></div>' +
          '<div class="detail-actions" id="detail-actions"></div>' +
          '<div id="stream-actions-wrap"></div>' +
          '<div id="episode-selector-wrap"></div>' +
          '<div class="detail-cast" id="detail-cast" style="display:none">' +
            '<h3 class="cast-title">Cast</h3>' +
            '<div class="cast-scroll" id="cast-grid"></div>' +
          '</div>' +
          '<div class="detail-similar" id="detail-similar" style="display:none">' +
            '<h3 class="similar-title">Similar</h3>' +
            '<div class="similar-grid" id="similar-grid"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Back button
    document.getElementById('detail-back').addEventListener('click', function () {
      goBack();
    });

    // Reset state
    activeServer = 0;
    currentStream = null;
    currentEps = [];

    // Fetch detail
    loadDetail(id, type);
  }

  function loadDetail(id, type) {
    Promise.all([
      tmdb('/' + type + '/' + id, { append_to_response: 'credits' }),
      tmdb('/' + type + '/' + id + '/videos', {}, 'en-US'),
      tmdb('/' + type + '/' + id + '/similar'),
    ]).then(function (results) {
      var detail = results[0];
      var videoData = results[1];
      var similar = results[2];

      currentDetailItem = Object.assign({}, detail, { media_type: type });

      // Add to history
      addToHistory(currentDetailItem);

      var title = detail.title || detail.name || '';
      var year = getYear(detail.release_date || detail.first_air_date);
      var runtime = detail.runtime
        ? Math.floor(detail.runtime / 60) + 'h ' + (detail.runtime % 60) + 'm'
        : detail.number_of_seasons
          ? detail.number_of_seasons + ' Season' + (detail.number_of_seasons > 1 ? 's' : '')
          : '';
      var rating = detail.vote_average ? detail.vote_average.toFixed(1) : 'N/A';

      // Update document title
      document.title = title + ' \u2014 Hisyam TV';

      // Fill in info
      document.getElementById('detail-title').textContent = title;
      document.getElementById('detail-overview').textContent = detail.overview || 'No description available.';
      document.getElementById('detail-year').textContent = year;
      document.getElementById('detail-runtime').textContent = runtime;
      document.getElementById('detail-rating').textContent = '\u2605 ' + rating;
      document.getElementById('detail-type').textContent = type === 'tv' ? 'SERIES' : 'MOVIE';

      // Genres — clickable pills that navigate to category
      var genreNameToRoute = {
        'Action': 'action', 'Action & Adventure': 'action',
        'Comedy': 'comedy',
        'Horror': 'horror', 'Mystery': 'horror',
        'Science Fiction': 'scifi', 'Sci-Fi & Fantasy': 'scifi',
        'Animation': 'animation',
        'Drama': 'drama',
        'Romance': 'romance',
        'Thriller': 'thriller', 'Crime': 'thriller'
      };
      var genresEl = document.getElementById('detail-genres');
      genresEl.innerHTML = '';
      if (detail.genres && detail.genres.length) {
        detail.genres.forEach(function (g) {
          var pill = document.createElement('span');
          pill.className = 'genre-pill';
          pill.textContent = g.name;
          var routeKey = genreNameToRoute[g.name];
          if (routeKey) {
            pill.classList.add('genre-pill--clickable');
            pill.addEventListener('click', function () {
              navigate('#' + routeKey);
            });
          }
          genresEl.appendChild(pill);
        });
      }

      // Poster backdrop
      var bd = detail.backdrop_path;
      var posterEl = document.getElementById('player-poster');
      posterEl.style.backgroundImage = bd ? "url('" + backdropUrl(bd) + "')" : '';

      // YouTube trailer
      var videos = (videoData.results || []).sort(function (a, b) {
        var score = function (v) {
          if (v.type === 'Trailer' && v.site === 'YouTube') return 0;
          if (v.type === 'Teaser' && v.site === 'YouTube') return 1;
          if (v.site === 'YouTube') return 2;
          return 3;
        };
        return score(a) - score(b);
      });
      var ytKey = videos.length ? videos[0].key : null;

      function playTrailer() {
        if (!ytKey) {
          showToast('Trailer not available.');
          return;
        }
        document.getElementById('player-placeholder').style.display = 'none';
        document.getElementById('stream-container').style.display = 'none';
        document.getElementById('youtube-container').style.display = 'block';
        document.getElementById('stream-iframe').src = '';
        currentStream = null;
        var origin = window.location.origin;
        if (origin === 'null' || origin === 'file://') origin = 'https://hisyam.tv';
        document.getElementById('youtube-iframe').src =
          'https://www.youtube.com/embed/' + ytKey + '?autoplay=1&rel=0&modestbranding=1&origin=' + origin;
        var extLink = document.getElementById('yt-ext-link');
        if (extLink) extLink.href = 'https://www.youtube.com/watch?v=' + ytKey;
      }

      // Play big button = start stream
      document.getElementById('player-play-big').onclick = function () {
        loadStream(id, type);
      };

      // Action buttons
      var actionsEl = document.getElementById('detail-actions');
      actionsEl.innerHTML = '';

      // Play Trailer button
      var trailerBtn = document.createElement('button');
      trailerBtn.className = 'btn-trailer';
      trailerBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play Trailer';
      trailerBtn.onclick = playTrailer;
      actionsEl.appendChild(trailerBtn);

      // Watch Now button
      var watchBtn = document.createElement('button');
      watchBtn.className = 'btn-watch';
      watchBtn.id = 'watch-now-btn';
      watchBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Watch Now';
      watchBtn.onclick = function () {
        if (type === 'tv') {
          var selSeason = document.getElementById('sel-season');
          var s = selSeason ? parseInt(selSeason.value) : 1;
          var e = currentEps.length ? currentEps[0].episode_number : 1;
          loadStream(id, type, s, e);
        } else {
          loadStream(id, type);
        }
      };
      actionsEl.appendChild(watchBtn);

      // Watchlist button
      var wlBtn = document.createElement('button');
      wlBtn.className = 'btn-watchlist';
      var inList = isInWatchlist(id);
      function updateWlBtn(active) {
        wlBtn.classList.toggle('active', active);
        wlBtn.innerHTML = active
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1px;"><polyline points="20 6 9 17 4 12"></polyline></svg> List'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> List';
      }
      updateWlBtn(inList);
      wlBtn.onclick = function () {
        var added = toggleWatchlist(currentDetailItem);
        updateWlBtn(added);
      };
      actionsEl.appendChild(wlBtn);

      // Server picker
      var serverWrap = document.getElementById('stream-actions-wrap');
      serverWrap.innerHTML = '';
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'stream-actions';
      var sWrap = document.createElement('div');
      sWrap.className = 'server-wrap';
      sWrap.innerHTML = '<span class="server-label">Server:</span>';
      STREAMING_SERVERS.forEach(function (srv, i) {
        var btn = document.createElement('button');
        btn.className = 'server-btn' + (i === activeServer ? ' active' : '');
        btn.textContent = srv.name;
        btn.onclick = function () { switchServer(i, id, type); };
        sWrap.appendChild(btn);
      });
      actionsDiv.appendChild(sWrap);
      serverWrap.appendChild(actionsDiv);

      // Episode selector for TV
      var epWrap = document.getElementById('episode-selector-wrap');
      epWrap.innerHTML = '';

      if (type === 'tv' && detail.number_of_seasons) {
        var epBlock = document.createElement('div');
        epBlock.className = 'episode-block';

        var headerDiv = document.createElement('div');
        headerDiv.className = 'episode-block__header';

        var epTitle = document.createElement('h3');
        epTitle.className = 'episode-block__title';
        epTitle.textContent = 'Episodes';

        var selSeason = document.createElement('select');
        selSeason.id = 'sel-season';
        selSeason.className = 'ep-select';

        var validSeasons = (detail.seasons || []).filter(function (s) { return s.season_number > 0; });
        var seasonsArr = validSeasons.length > 0
          ? validSeasons
          : Array.from({ length: detail.number_of_seasons }, function (_, i) { return { season_number: i + 1 }; });

        seasonsArr.forEach(function (s) {
          var opt = document.createElement('option');
          opt.value = s.season_number;
          opt.textContent = 'Season ' + s.season_number;
          selSeason.appendChild(opt);
        });

        headerDiv.appendChild(epTitle);
        headerDiv.appendChild(selSeason);
        epBlock.appendChild(headerDiv);

        var epsContainer = document.createElement('div');
        epsContainer.id = 'eps-container';
        epsContainer.className = 'eps-container';
        epBlock.appendChild(epsContainer);

        epWrap.appendChild(epBlock);

        if (seasonsArr.length > 0) {
          fetchEpisodes(id, seasonsArr[0].season_number);
        }

        selSeason.addEventListener('change', function () {
          fetchEpisodes(id, parseInt(selSeason.value));
        });

        // Update Watch Now for TV
        watchBtn.onclick = function () {
          var s = parseInt(selSeason.value);
          var e = currentEps.length ? currentEps[0].episode_number : 1;
          loadStream(id, type, s, e);
          renderEpisodesList(id, s);
        };
      }

      // Cast
      var castSection = document.getElementById('detail-cast');
      var castGrid = document.getElementById('cast-grid');
      castGrid.innerHTML = '';

      var credits = detail.credits;
      if (credits && credits.cast && credits.cast.length) {
        castSection.style.display = '';
        credits.cast.slice(0, 20).forEach(function (actor) {
          var ac = document.createElement('div');
          ac.className = 'cast-card';
          var profileImg = actor.profile_path
            ? IMG_W500 + actor.profile_path
            : PLACEHOLDER_PERSON;
          ac.innerHTML =
            '<img class="cast-photo" src="' + profileImg + '" alt="' + (actor.name || '').replace(/"/g, '&quot;') + '" loading="lazy">' +
            '<div class="cast-info">' +
              '<div class="cast-name">' + (actor.name || '') + '</div>' +
              '<div class="cast-character">' + (actor.character || '') + '</div>' +
            '</div>';
          ac.addEventListener('click', function () {
            navigate('#person/' + actor.id);
          });
          castGrid.appendChild(ac);
        });
      }

      // Similar
      var similarSection = document.getElementById('detail-similar');
      var similarGridEl = document.getElementById('similar-grid');
      similarGridEl.innerHTML = '';

      if (similar.results && similar.results.length) {
        similarSection.style.display = '';
        similar.results.slice(0, 12).forEach(function (s) {
          var sc = document.createElement('div');
          sc.className = 'similar-card';
          sc.innerHTML =
            '<img class="similar-poster" src="' + posterUrl(s.poster_path) + '" alt="' + (s.title || s.name || '').replace(/"/g, '&quot;') + '" loading="lazy">' +
            '<div class="similar-name">' + (s.title || s.name || '') + '</div>';
          sc.addEventListener('click', function () {
            navigate('#' + type + '/' + s.id);
          });
          similarGridEl.appendChild(sc);
        });
      }
    }).catch(function (e) {
      console.error('Failed to load detail:', e);
      var titleEl = document.getElementById('detail-title');
      if (titleEl) titleEl.textContent = 'Failed to load data.';
    });
  }

  // ── Streaming ──
  function buildStreamUrl(id, type, season, episode) {
    var srv = STREAMING_SERVERS[activeServer];
    return type === 'tv' ? srv.tvUrl(id, season || 1, episode || 1) : srv.movieUrl(id);
  }

  // ============================================================
  // PERSON VIEW — actor page with filmography
  // ============================================================
  function showPersonView(personId) {
    showView('detail-view');
    var container = document.getElementById('detail-view');

    container.innerHTML =
      '<div class="person-page">' +
        '<button class="detail-back-btn" id="person-back">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>' +
          ' Back' +
        '</button>' +
        '<div class="person-header" id="person-header">' +
          '<div class="person-photo-wrap" id="person-photo-wrap"></div>' +
          '<div class="person-bio" id="person-bio">' +
            '<h1 class="person-name" id="person-name">Loading...</h1>' +
            '<div class="person-meta" id="person-meta"></div>' +
            '<p class="person-biography" id="person-biography"></p>' +
          '</div>' +
        '</div>' +
        '<div class="person-filmography" id="person-filmography">' +
          '<h3 class="filmography-title">Known For</h3>' +
          '<div class="card-grid" id="filmography-grid"></div>' +
        '</div>' +
      '</div>';

    document.getElementById('person-back').addEventListener('click', function () {
      goBack();
    });

    // Fetch person details + combined credits
    Promise.all([
      tmdb('/person/' + personId),
      tmdb('/person/' + personId + '/combined_credits'),
    ]).then(function (results) {
      var person = results[0];
      var credits = results[1];

      document.title = (person.name || 'Person') + ' \u2014 Hisyam TV';

      // Photo
      var photoWrap = document.getElementById('person-photo-wrap');
      var photoSrc = person.profile_path
        ? IMG_W500 + person.profile_path
        : PLACEHOLDER_PERSON;
      photoWrap.innerHTML = '<img class="person-photo" src="' + photoSrc + '" alt="' + (person.name || '').replace(/"/g, '&quot;') + '">';

      // Name
      document.getElementById('person-name').textContent = person.name || 'Unknown';

      // Meta
      var metaEl = document.getElementById('person-meta');
      var metaParts = [];
      if (person.known_for_department) metaParts.push(person.known_for_department);
      if (person.birthday) {
        var bday = person.birthday;
        var age = '';
        if (!person.deathday) {
          var today = new Date();
          var birth = new Date(bday);
          age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
          age = ' (age ' + age + ')';
        }
        metaParts.push('Born: ' + bday + age);
      }
      if (person.deathday) metaParts.push('Died: ' + person.deathday);
      if (person.place_of_birth) metaParts.push(person.place_of_birth);
      metaEl.innerHTML = metaParts.map(function (p) {
        return '<span class="person-meta-item">' + p + '</span>';
      }).join('');

      // Biography
      var bioEl = document.getElementById('person-biography');
      if (person.biography) {
        // Truncate long bios with expand
        var bio = person.biography;
        if (bio.length > 500) {
          bioEl.innerHTML = '<span class="bio-short">' + bio.substring(0, 500) + '... </span>' +
            '<span class="bio-full" style="display:none">' + bio + ' </span>' +
            '<a class="bio-toggle" href="#">Read more</a>';
          bioEl.querySelector('.bio-toggle').addEventListener('click', function (e) {
            e.preventDefault();
            var shortEl = bioEl.querySelector('.bio-short');
            var fullEl = bioEl.querySelector('.bio-full');
            var togEl = bioEl.querySelector('.bio-toggle');
            if (fullEl.style.display === 'none') {
              shortEl.style.display = 'none';
              fullEl.style.display = '';
              togEl.textContent = 'Show less';
            } else {
              shortEl.style.display = '';
              fullEl.style.display = 'none';
              togEl.textContent = 'Read more';
            }
          });
        } else {
          bioEl.textContent = bio;
        }
      } else {
        bioEl.textContent = 'No biography available.';
      }

      // Filmography — sort by popularity, deduplicate
      var castCredits = (credits.cast || []).filter(function (c) {
        return (c.media_type === 'movie' || c.media_type === 'tv') && c.poster_path;
      });
      var seen = {};
      var unique = [];
      castCredits.forEach(function (c) {
        var key = c.media_type + '_' + c.id;
        if (!seen[key]) {
          seen[key] = true;
          unique.push(c);
        }
      });
      unique.sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); });

      // Update filmography title with count
      var filmTitle = document.querySelector('.filmography-title');
      if (filmTitle) {
        var totalWorks = unique.length;
        filmTitle.innerHTML = 'Known For <span class="filmography-count">(' + totalWorks + ' work' + (totalWorks !== 1 ? 's' : '') + ')</span>';
      }

      var filmGrid = document.getElementById('filmography-grid');
      filmGrid.innerHTML = '';
      if (unique.length) {
        unique.forEach(function (item) {
          filmGrid.appendChild(createCard(item, item.media_type));
        });
      } else {
        filmGrid.innerHTML = '<p style="color:var(--text-muted);padding:20px 0">No filmography available.</p>';
      }
    }).catch(function (e) {
      console.error('Failed to load person:', e);
      document.getElementById('person-name').textContent = 'Failed to load data.';
    });
  }

  function loadStream(id, type, season, episode) {
    season = season || 1;
    episode = episode || 1;
    currentStream = { id: id, type: type, season: season, episode: episode };

    var ytContainer = document.getElementById('youtube-container');
    var placeholder = document.getElementById('player-placeholder');
    var streamContainer = document.getElementById('stream-container');
    var streamIframe = document.getElementById('stream-iframe');

    if (ytContainer) ytContainer.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    if (streamContainer) streamContainer.style.display = 'block';
    if (streamIframe) streamIframe.src = buildStreamUrl(id, type, season, episode);
  }

  function switchServer(idx, id, type) {
    activeServer = idx;
    document.querySelectorAll('.server-btn').forEach(function (b, i) {
      b.classList.toggle('active', i === idx);
    });
    if (currentStream) {
      var streamIframe = document.getElementById('stream-iframe');
      if (streamIframe) {
        streamIframe.src = buildStreamUrl(currentStream.id, currentStream.type, currentStream.season, currentStream.episode);
      }
      showToast('Switched to ' + STREAMING_SERVERS[idx].name);
    }
  }

  // ── Episodes ──
  function fetchEpisodes(tvId, seasonNum) {
    tmdb('/tv/' + tvId + '/season/' + seasonNum).then(function (sData) {
      currentEps = sData.episodes || [];
      renderEpisodesList(tvId, seasonNum);
    });
  }

  function renderEpisodesList(tvId, seasonNum) {
    var epsContainer = document.getElementById('eps-container');
    if (!epsContainer) return;
    epsContainer.innerHTML = '';

    if (!currentEps.length) {
      epsContainer.innerHTML = '<p style="color:#aaa;font-size:14px;">No episodes found.</p>';
      return;
    }

    currentEps.forEach(function (ep) {
      var isActive = currentStream &&
        currentStream.season == seasonNum &&
        currentStream.episode == ep.episode_number;
      var epCard = document.createElement('div');
      epCard.className = 'ep-card' + (isActive ? ' ep-card--active' : '');
      epCard.onclick = function () {
        loadStream(tvId, 'tv', seasonNum, ep.episode_number);
        renderEpisodesList(tvId, seasonNum);
      };
      var imgUrl = ep.still_path
        ? IMG_W500 + ep.still_path
        : PLACEHOLDER_EPISODE;
      var synopsis = ep.overview || 'No synopsis available.';
      epCard.innerHTML =
        '<img class="ep-card__img" src="' + imgUrl + '" alt="Episode ' + ep.episode_number + '">' +
        '<div class="ep-card__info">' +
          '<h4 class="ep-card__title">' + ep.episode_number + '. ' + ep.name + '</h4>' +
          '<p class="ep-card__synopsis">' + synopsis + '</p>' +
        '</div>';
      epsContainer.appendChild(epCard);
    });
  }

  // ============================================================
  // SEARCH — bar, suggestions
  // ============================================================
  var searchTimer = null;

  function initSearch() {
    var searchWrap = document.getElementById('search-wrap');
    var searchToggle = document.getElementById('search-toggle');
    var searchInput = document.getElementById('search-input');
    var suggBox = document.getElementById('search-suggestions');

    searchToggle.addEventListener('click', function () {
      var isOpen = searchWrap.classList.toggle('open');
      if (isOpen) {
        searchInput.focus();
        // Close hamburger menu if open
        var mobileNav = document.getElementById('mobile-nav');
        if (mobileNav) mobileNav.classList.remove('open');
      } else {
        searchInput.value = '';
        suggBox.classList.remove('active');
      }
    });

    searchInput.addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      var q = e.target.value.trim();
      if (q.length < 2) {
        suggBox.classList.remove('active');
        return;
      }
      searchTimer = setTimeout(function () { showSuggestions(q); }, 400);
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(searchTimer);
        suggBox.classList.remove('active');
        var q = e.target.value.trim();
        if (q.length >= 2) {
          navigate('#search/' + encodeURIComponent(q));
          searchWrap.classList.remove('open');
          searchInput.value = '';
        }
      }
      if (e.key === 'Escape') {
        searchWrap.classList.remove('open');
        searchInput.value = '';
        suggBox.classList.remove('active');
      }
    });

    document.addEventListener('click', function (e) {
      if (!searchWrap.contains(e.target)) {
        suggBox.classList.remove('active');
      }
    });

    initSuggScroll();
  }

  var GENRE_NAMES = {
    28: 'Action', 10759: 'Action', 12: 'Adventure', 16: 'Animation',
    35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama',
    10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror',
    9648: 'Mystery', 10749: 'Romance', 10766: 'Romance', 878: 'Sci-Fi',
    10765: 'Sci-Fi', 53: 'Thriller', 10752: 'War', 10768: 'War',
    37: 'Western', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
    10767: 'Talk'
  };

  function getGenreNames(ids) {
    if (!ids || !ids.length) return '';
    var names = [];
    var seen = {};
    ids.forEach(function(id) {
      var name = GENRE_NAMES[id];
      if (name && !seen[name]) {
        seen[name] = true;
        names.push(name);
      }
    });
    return names.slice(0, 3).join(', ');
  }

  var suggState = { query: '', page: 1, loading: false, hasMore: true };

  function showSuggestions(query, append) {
    var suggBox = document.getElementById('search-suggestions');
    var searchWrap = document.getElementById('search-wrap');
    var searchInput = document.getElementById('search-input');

    if (!append) {
      suggState.query = query;
      suggState.page = 1;
      suggState.hasMore = true;
      suggBox.innerHTML = '';
    }

    if (suggState.loading || !suggState.hasMore) return;
    suggState.loading = true;

    tmdb('/search/multi', { query: suggState.query, include_adult: false, page: suggState.page }, 'en-US').then(function (data) {
      var filtered = (data.results || [])
        .filter(function (r) { return (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path; });

      if (!append && !filtered.length) {
        suggBox.innerHTML = '<div style="padding:12px;color:#aaa;font-size:13px;text-align:center;">No matches found</div>';
      }

      filtered.forEach(function (item) {
        var type = item.media_type || 'movie';
        var year = (item.release_date || item.first_air_date || '').substring(0, 4);
        var title = item.title || item.name;
        var d = document.createElement('div');
        d.className = 'sugg-item';
        var genres = getGenreNames(item.genre_ids);
          d.innerHTML =
          '<img src="' + posterUrl(item.poster_path) + '" class="sugg-img" alt="' + title.replace(/"/g, '&quot;') + '">' +
            '<div class="sugg-info">' +
              '<span class="sugg-title">' + title + '</span>' +
              '<span class="sugg-meta">' + year + ' \u00B7 ' + type.toUpperCase() + ' \u00B7 \u2605 ' + (item.vote_average ? item.vote_average.toFixed(1) : 'N/A') + '</span>' +
              (genres ? '<span class="sugg-genres">' + genres + '</span>' : '') +
            '</div>';
        d.onclick = function () {
          navigate('#' + type + '/' + item.id);
          suggBox.classList.remove('active');
          searchInput.value = '';
          searchWrap.classList.remove('open');
        };
        suggBox.appendChild(d);
      });

      if (suggState.page >= (data.total_pages || 1)) {
        suggState.hasMore = false;
      } else {
        suggState.page++;
      }
      suggState.loading = false;
      suggBox.classList.add('active');
    });
  }

  // Infinite scroll for search suggestions
  function initSuggScroll() {
    var suggBox = document.getElementById('search-suggestions');
    if (!suggBox) return;
    suggBox.addEventListener('scroll', function () {
      if (suggBox.scrollTop + suggBox.clientHeight >= suggBox.scrollHeight - 50) {
        showSuggestions(suggState.query, true);
      }
    });
  }

  // ============================================================
  // NAVIGATION — navbar, mobile menu, back-to-top, footer
  // ============================================================
  function initNavigation() {
    // Nav link clicks
    document.querySelectorAll('#navbar .nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var section = link.getAttribute('data-section');
        if (section) {
          e.preventDefault();
          navigate('#' + section);
        }
      });
    });

    // Logo click
    document.getElementById('logo-home').addEventListener('click', function (e) {
      e.preventDefault();
      navigate('#home');
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function () {
      var navbar = document.getElementById('navbar');
      var route = parseRoute();
      if (route.page !== 'home' || window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });

    // Mobile menu
    var mobileToggle = document.getElementById('mobile-menu-toggle');
    var mobileNav = document.getElementById('mobile-nav');
    if (mobileToggle && mobileNav) {
      mobileToggle.addEventListener('click', function () {
        mobileNav.classList.toggle('open');
        // Close search if open
        var sw = document.getElementById('search-wrap');
        var si = document.getElementById('search-input');
        var sb = document.getElementById('search-suggestions');
        if (sw && sw.classList.contains('open')) {
          sw.classList.remove('open');
          if (si) si.value = '';
          if (sb) sb.classList.remove('active');
        }
      });
      mobileNav.querySelectorAll('.nav-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
          if (this.id === 'mobile-cat-toggle') return;
          mobileNav.classList.remove('open');
          var section = link.getAttribute('data-section');
          if (section) {
            e.preventDefault();
            navigate('#' + section);
          }
        });
      });
      document.addEventListener('click', function (e) {
        if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target)) {
          mobileNav.classList.remove('open');
        }
      });
      
      // Mobile Categories Toggle
      var catToggle = document.getElementById('mobile-cat-toggle');
      var catMenu = document.getElementById('mobile-cat-menu');
      if (catToggle && catMenu) {
        catToggle.addEventListener('click', function() {
          var isHidden = catMenu.style.display === 'none';
          catMenu.style.display = isHidden ? 'flex' : 'none';
          catToggle.textContent = isHidden ? 'Categories ▴' : 'Categories ▾';
          
          if (isHidden) {
            catToggle.classList.add('open');
          } else {
            catToggle.classList.remove('open');
          }
        });
      }
    }

    // Back to top
    var backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      window.addEventListener('scroll', function () {
        backToTop.classList.toggle('visible', window.scrollY > 400);
      });
      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Footer links
    var footerHome = document.getElementById('footer-home');
    var footerMovies = document.getElementById('footer-movies');
    var footerSeries = document.getElementById('footer-series');
    if (footerHome) footerHome.addEventListener('click', function (e) { e.preventDefault(); navigate('#home'); });
    if (footerMovies) footerMovies.addEventListener('click', function (e) { e.preventDefault(); navigate('#movies'); });
    if (footerSeries) footerSeries.addEventListener('click', function (e) { e.preventDefault(); navigate('#series'); });

    // Watchlist badge
    updateWatchlistBadge();
  }

  // ============================================================
  // KEYBOARD shortcut — Escape goes back from detail
  // ============================================================
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var route = parseRoute();
      if (route.page === 'movie' || route.page === 'tv' || route.page === 'person') {
        goBack();
      }
    }
  });

  // ============================================================
  // POPUP BLOCKER — aggressive popup/redirect defense
  // ============================================================

  // 1) Override window.open — blocks popups but looks native to embed scripts
  //    (2embed checks if window.open is overridden to detect sandbox)
  var _origOpen = window.open;
  var _fakeOpen = function () {
    console.warn('[Popup Blocked] window.open blocked');
    return null;
  };
  // Spoof toString so embeds see "function open() { [native code] }"
  _fakeOpen.toString = function () { return 'function open() { [native code] }'; };
  Object.defineProperty(window, 'open', {
    get: function () { return _fakeOpen; },
    set: function () { /* ignore attempts to restore */ },
    configurable: false
  });

  // 2) Block clicks that try to open new windows via <a target="_blank">
  //    injected by embed scripts into our page (not inside iframe)
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var target = link.getAttribute('target') || '';
    // Allow our own links and YouTube
    if (href.indexOf('#') === 0 || href.indexOf('youtube.com') !== -1 ||
        href.indexOf('themoviedb.org') !== -1) return;
    // Block external popups from embed-injected elements
    if (target === '_blank' && link.closest('#stream-container, #youtube-container')) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('[Popup Blocked] link click blocked:', href);
    }
  }, true);

  // 3) Prevent focus-steal: embeds sometimes blur our window to redirect
  //    BUT skip re-focus if the user is interacting with an iframe
  //    (e.g. VidAPI subtitle dropdown, player controls)
  var _lastFocusTime = 0;
  window.addEventListener('blur', function () {
    _lastFocusTime = Date.now();
    setTimeout(function () {
      // If an iframe has focus, the user clicked inside it intentionally — don't steal focus
      var active = document.activeElement;
      if (active && active.tagName === 'IFRAME') return;
      if (Date.now() - _lastFocusTime < 200) {
        window.focus();
      }
    }, 100);
  });

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    initSearch();
    initNavigation();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);

    // Handle initial route
    handleRoute();

    // Dismiss splash screen after content starts loading
    setTimeout(function () {
      var splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('hide');
        setTimeout(function () { splash.remove(); }, 600);
      }
    }, 1200);
  });

})();
