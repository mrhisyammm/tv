// ============================================================
// NAVIGATION — nav links, scroll effects, "see all"
// ============================================================
import { tmdb } from './api.js';
import { createCard, createSkeletons } from './cards.js';
import { getWatchlist } from './watchlist.js';

let navbar;

export function initNavigation() {
  navbar = document.getElementById('navbar');
  const searchSection = document.getElementById('search-results-section');
  const searchGrid = document.getElementById('search-results-grid');

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const hero = document.getElementById('hero');
    const isHome = hero && hero.style.display !== 'none';
    if (!isHome || window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Nav link filtering
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      const section = link.dataset.section;
      searchSection.style.display = 'none';

      const allSections = [
        'section-trending', 'section-movies', 'section-series',
        'section-toprated', 'section-action', 'section-horror',
        'section-comedy', 'section-scifi', 'section-anime',
        'section-drama', 'section-romance', 'section-thriller',
      ];

      if (section === 'home') {
        document.getElementById('hero').style.display = '';
        allSections.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.style.display = '';
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Hide hero + all genre rows for sub-pages
      document.getElementById('hero').style.display = 'none';
      allSections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      // Handle My List page
      if (section === 'mylist') {
        showMyList(searchSection, searchGrid);
        updateNavbarState();
        return;
      }

      // Show filtered content as grid
      searchSection.style.display = 'block';
      searchGrid.innerHTML = '';
      const skRow = document.createElement('div');
      skRow.style.display = 'contents';
      createSkeletons(12).forEach((s) => {
        s.style.flex = 'none';
        s.style.width = '100%';
        skRow.appendChild(s);
      });
      searchGrid.appendChild(skRow);

      let data, type;
      if (section === 'movies') {
        data = await tmdb('/movie/popular', { page: 1 });
        type = 'movie';
      }
      if (section === 'series') {
        data = await tmdb('/tv/popular', { page: 1 });
        type = 'tv';
      }
      if (section === 'trending') {
        data = await tmdb('/trending/all/week');
        type = null;
      }

      searchGrid.innerHTML = '';
      (data?.results || []).forEach((item) =>
        searchGrid.appendChild(createCard(item, type || item.media_type))
      );

      const titleMap = {
        movies: 'Popular Movies',
        series: 'Popular Series',
        trending: 'Trending',
      };
      searchSection.querySelector('.section-title').textContent = titleMap[section] || '';
      document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
      updateNavbarState();
    });
  });

  // "See All" links
  document.querySelectorAll('.see-all').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const type = link.dataset.type;
      const filter = link.dataset.filter;

      searchSection.style.display = 'block';
      searchGrid.innerHTML = '';
      const skRow = document.createElement('div');
      skRow.style.display = 'contents';
      createSkeletons(12).forEach((s) => {
        s.style.flex = 'none';
        s.style.width = '100%';
        skRow.appendChild(s);
      });
      searchGrid.appendChild(skRow);
      searchSection.querySelector('.section-title').textContent = 'Loading...';
      searchSection.scrollIntoView({ behavior: 'smooth' });
      updateNavbarState();

      const data = await tmdb(`/${type}/${filter}`);
      searchGrid.innerHTML = '';
      searchSection.querySelector('.section-title').textContent =
        filter === 'popular'
          ? type === 'movie'
            ? 'Popular Movies'
            : 'Popular Series'
          : 'Top Rated';
      (data?.results || []).forEach((item) =>
        searchGrid.appendChild(createCard(item, type))
      );
    });
  });

  // Logo click — go home
  document.getElementById('logo-home').addEventListener('click', (e) => {
    e.preventDefault();
    goHome();
  });

  // Watchlist badge update
  updateWatchlistBadge();
  window.addEventListener('watchlist-changed', updateWatchlistBadge);

  // ── Mobile menu ──
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
    // Mobile nav links
    mobileNav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        mobileNav.classList.remove('open');
        // Sync active state with desktop nav
        const section = link.dataset.section;
        document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
        document.querySelectorAll(`.nav-link[data-section="${section}"]`).forEach((l) => l.classList.add('active'));
        // Trigger the desktop nav handler
        const desktopLink = document.querySelector(`.nav-links .nav-link[data-section="${section}"]`);
        if (desktopLink) desktopLink.click();
        else {
          // Handle mylist on mobile where desktop nav might be hidden
          if (section === 'home') goHome();
          else if (section === 'mylist') {
            document.getElementById('hero').style.display = 'none';
            const allSections = [
              'section-trending', 'section-movies', 'section-series',
              'section-toprated', 'section-action', 'section-horror',
              'section-comedy', 'section-scifi', 'section-anime',
              'section-drama', 'section-romance', 'section-thriller',
            ];
            allSections.forEach((id) => {
              const el = document.getElementById(id);
              if (el) el.style.display = 'none';
            });
            showMyList(searchSection, searchGrid);
            updateNavbarState();
          }
        }
      });
    });
    // Close mobile nav on outside click
    document.addEventListener('click', (e) => {
      if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target)) {
        mobileNav.classList.remove('open');
      }
    });
  }

  // ── Back to top button ──
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Footer links ──
  const footerHome = document.getElementById('footer-home');
  const footerMovies = document.getElementById('footer-movies');
  const footerSeries = document.getElementById('footer-series');
  if (footerHome) footerHome.addEventListener('click', (e) => { e.preventDefault(); goHome(); });
  if (footerMovies) footerMovies.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.nav-links .nav-link[data-section="movies"]')?.click();
  });
  if (footerSeries) footerSeries.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.nav-links .nav-link[data-section="series"]')?.click();
  });
}

function showMyList(searchSection, searchGrid) {
  const list = getWatchlist();
  searchSection.style.display = 'block';
  searchGrid.innerHTML = '';
  searchSection.querySelector('.section-title').textContent = 'My List';

  if (!list.length) {
    searchGrid.innerHTML =
      '<p style="color:var(--text-muted);padding:40px 0;grid-column:1/-1;text-align:center;font-size:16px;">Your list is empty. Add movies and series to watch later.</p>';
    return;
  }
  list.forEach((item) => searchGrid.appendChild(createCard(item, item.media_type)));
  document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
}

function updateWatchlistBadge() {
  const badge = document.getElementById('wl-badge');
  if (!badge) return;
  const count = getWatchlist().length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

export function goHome() {
  document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
  document.querySelector('[data-section="home"]')?.classList.add('active');
  document.getElementById('hero').style.display = '';
  document.getElementById('search-results-section').style.display = 'none';
  const searchWrap = document.getElementById('search-wrap');
  const searchInput = document.getElementById('search-input');
  if (searchWrap) searchWrap.classList.remove('open');
  if (searchInput) searchInput.value = '';

  const allSections = [
    'section-trending', 'section-movies', 'section-series',
    'section-toprated', 'section-action', 'section-horror',
    'section-comedy', 'section-scifi', 'section-anime',
    'section-drama', 'section-romance', 'section-thriller',
  ];
  allSections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function updateNavbarState() {
  window.dispatchEvent(new Event('scroll'));
}
