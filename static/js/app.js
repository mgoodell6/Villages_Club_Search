/**
 * The Villages Club Finder - Frontend Application
 * High-performance instant search, location filtering, schedule decoding, and persistence.
 */

// Application State
const state = {
  allClubs: [],
  locations: [],
  stats: {},
  filteredClubs: [],
  favorites: new Set(),
  
  // Current Filter Selections
  searchQuery: '',
  selectedLocations: new Set(),
  selectedDay: 'all',
  selectedWeek: 'all',
  selectedPeriod: 'all',
  
  // View Settings
  viewMode: 'cards', // 'cards' or 'table'
  currentPage: 1,
  pageSize: 24,
  theme: localStorage.getItem('villages_theme') || 'light',
  fontSize: localStorage.getItem('villages_font_size') || 'normal'
};

// DOM Element References
const elements = {
  // Tabs
  navTabs: document.querySelectorAll('.nav-tab'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  locationsBadge: document.getElementById('locations-badge'),
  favoritesBadge: document.getElementById('favorites-badge'),

  // Search & Filter Inputs
  globalSearchInput: document.getElementById('global-search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  resetAllFiltersBtn: document.getElementById('reset-all-filters-btn'),
  
  // Multi-Select Location Elements
  locationMultiselectWrapper: document.getElementById('location-multiselect-wrapper'),
  locationDropdownToggle: document.getElementById('location-dropdown-toggle'),
  locationToggleLabel: document.getElementById('location-toggle-label'),
  locationDropdownMenu: document.getElementById('location-dropdown-menu'),
  locationFilterSearch: document.getElementById('location-filter-search'),
  clearLocationSearchBtn: document.getElementById('clear-location-search-btn'),
  selectAllLocationsBtn: document.getElementById('select-all-locations-btn'),
  deselectAllLocationsBtn: document.getElementById('deselect-all-locations-btn'),
  dropdownSelectionCounter: document.getElementById('dropdown-selection-counter'),
  locationCheckboxList: document.getElementById('location-checkbox-list'),
  selectedLocationsChips: document.getElementById('selected-locations-chips'),
  clearSelectedLocationsBtn: document.getElementById('clear-selected-locations-btn'),
  locationActiveHint: document.getElementById('location-active-hint'),
  switchToLocationsTabBtn: document.getElementById('switch-to-locations-tab-btn'),
  
  dayPillGroup: document.getElementById('day-pill-group'),
  weekPillGroup: document.getElementById('week-pill-group'),
  periodPillGroup: document.getElementById('period-pill-group'),

  // Results & Display
  resultsCountText: document.getElementById('results-count-text'),
  activeFilterTags: document.getElementById('active-filter-tags'),
  clubsGrid: document.getElementById('clubs-grid'),
  clubsTableContainer: document.getElementById('clubs-table-container'),
  clubsTableBody: document.getElementById('clubs-table-body'),
  noResultsState: document.getElementById('no-results-state'),
  emptyResetBtn: document.getElementById('empty-reset-btn'),
  viewCardsBtn: document.getElementById('view-cards-btn'),
  viewTableBtn: document.getElementById('view-table-btn'),
  printResultsBtn: document.getElementById('print-results-btn'),

  // Pagination
  paginationControls: document.getElementById('pagination-controls'),
  prevPageBtn: document.getElementById('prev-page-btn'),
  nextPageBtn: document.getElementById('next-page-btn'),
  pageInfo: document.getElementById('page-info'),

  // Locations Tab
  locationDirSearch: document.getElementById('location-directory-search'),
  locationsDirectoryGrid: document.getElementById('locations-directory-grid'),
  dirSelectedCount: document.getElementById('dir-selected-count'),
  dirViewSelectedBtn: document.getElementById('dir-view-selected-btn'),
  dirClearSelectedBtn: document.getElementById('dir-clear-selected-btn'),

  // Favorites Tab
  favoritesGrid: document.getElementById('favorites-grid'),
  noFavoritesState: document.getElementById('no-favorites-state'),
  browseClubsBtn: document.getElementById('browse-clubs-btn'),
  exportFavoritesCsvBtn: document.getElementById('export-favorites-csv-btn'),
  printFavoritesBtn: document.getElementById('print-favorites-btn'),
  clearFavoritesBtn: document.getElementById('clear-favorites-btn'),

  // Guide Tab
  customCodeInput: document.getElementById('custom-code-input'),
  decodeCodeBtn: document.getElementById('decode-code-btn'),
  decoderResultBox: document.getElementById('decoder-result-box'),

  // Theme & Font
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeIcon: document.getElementById('theme-icon'),
  fontSmBtn: document.getElementById('font-sm-btn'),
  fontMdBtn: document.getElementById('font-md-btn'),
  fontLgBtn: document.getElementById('font-lg-btn'),

  // Upload Modal
  openUploadBtn: document.getElementById('open-upload-btn'),
  uploadModal: document.getElementById('upload-modal'),
  closeUploadModalBtn: document.getElementById('close-upload-modal-btn'),
  cancelUploadBtn: document.getElementById('cancel-upload-btn'),
  dropZone: document.getElementById('drop-zone'),
  pdfFileInput: document.getElementById('pdf-file-input'),
  startUploadBtn: document.getElementById('start-upload-btn'),
  uploadProgressContainer: document.getElementById('upload-progress-container'),
  uploadProgressBar: document.getElementById('upload-progress-bar'),
  uploadStatusText: document.getElementById('upload-status-text'),
  uploadResultAlert: document.getElementById('upload-result-alert'),

  // Detail Modal
  detailModal: document.getElementById('detail-modal'),
  closeDetailModalBtn: document.getElementById('close-detail-modal-btn'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalClubName: document.getElementById('modal-club-name'),
  modalClubBody: document.getElementById('modal-club-body'),
  modalSaveFavBtn: document.getElementById('modal-save-fav-btn'),

  // Footer Stats
  footerSourceName: document.getElementById('footer-source-name'),
  footerTotalClubs: document.getElementById('footer-total-clubs'),
  footerLastUpdated: document.getElementById('footer-last-updated')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initThemeAndFont();
  loadFavorites();
  setupEventListeners();
  fetchInitialData();
});

// Theme and Font Setup
function initThemeAndFont() {
  document.documentElement.setAttribute('data-theme', state.theme);
  elements.themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';

  document.documentElement.setAttribute('data-font-size', state.fontSize);
  document.querySelectorAll('.font-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === state.fontSize);
  });
}

// Fetch clubs and stats from backend
async function fetchInitialData() {
  try {
    // Try Flask API first
    const res = await fetch('/api/clubs');
    if (!res.ok) throw new Error('API fetch failed');
    const data = await res.json();
    state.allClubs = data.clubs || [];

    // Fetch locations & stats
    const locRes = await fetch('/api/locations');
    state.locations = locRes.ok ? await locRes.json() : [];

    const statsRes = await fetch('/api/stats');
    if (statsRes.ok) {
      state.stats = await statsRes.json();
      updateStatsDisplay();
    }
  } catch (err) {
    console.warn('Falling back to local clubs_data.json...', err);
    try {
      const fallback = await fetch('/clubs_data.json');
      state.allClubs = await fallback.json();
      generateClientLocations();
    } catch (e) {
      console.error('Could not load club data:', e);
    }
  }

  // Populate Dropdowns & Views
  renderLocationCheckboxes();
  updateLocationUI();
  renderLocationsDirectory();
  applyFilters();
}

function generateClientLocations() {
  const locMap = {};
  state.allClubs.forEach(c => {
    const loc = c.location || 'Other / Not Listed';
    locMap[loc] = (locMap[loc] || 0) + 1;
  });
  state.locations = Object.keys(locMap).sort().map(name => ({
    name,
    count: locMap[name],
    map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}+The+Villages+FL`
  }));
}

function updateStatsDisplay() {
  if (state.stats.total_clubs) {
    elements.footerTotalClubs.textContent = state.stats.total_clubs.toLocaleString();
  }
  if (state.stats.last_updated) {
    elements.footerLastUpdated.textContent = state.stats.last_updated;
  }
  if (state.locations.length) {
    elements.locationsBadge.textContent = state.locations.length;
  }
}

// Render Location Checkbox Dropdown List
function renderLocationCheckboxes(searchFilter = '') {
  const sorted = [...state.locations].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = searchFilter
    ? sorted.filter(loc => loc.name.toLowerCase().includes(searchFilter.toLowerCase()))
    : sorted;

  if (filtered.length === 0) {
    elements.locationCheckboxList.innerHTML = `
      <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No recreation centers match "${escapeHtml(searchFilter)}"
      </div>
    `;
    return;
  }

  elements.locationCheckboxList.innerHTML = filtered.map(loc => {
    const isChecked = state.selectedLocations.has(loc.name);
    return `
      <label class="location-checkbox-item ${isChecked ? 'checked' : ''}" data-location="${escapeHtml(loc.name)}">
        <div class="checkbox-label-group">
          <input type="checkbox" value="${escapeHtml(loc.name)}" ${isChecked ? 'checked' : ''}>
          <span class="location-item-name" title="${escapeHtml(loc.name)}">${escapeHtml(loc.name)}</span>
        </div>
        <span class="location-item-badge">${loc.count}</span>
      </label>
    `;
  }).join('');

  // Attach change listener to each checkbox
  elements.locationCheckboxList.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', (e) => {
      toggleLocationSelection(e.target.value);
    });
  });
}

function openLocationDropdown() {
  elements.locationDropdownMenu.style.display = 'block';
  elements.locationDropdownToggle.classList.add('open');
  elements.locationDropdownToggle.setAttribute('aria-expanded', 'true');
  elements.locationFilterSearch.focus();
}

function closeLocationDropdown() {
  elements.locationDropdownMenu.style.display = 'none';
  elements.locationDropdownToggle.classList.remove('open');
  elements.locationDropdownToggle.setAttribute('aria-expanded', 'false');
}

function toggleLocationSelection(locName) {
  if (state.selectedLocations.has(locName)) {
    state.selectedLocations.delete(locName);
  } else {
    state.selectedLocations.add(locName);
  }
  state.currentPage = 1;
  updateLocationUI();
  applyFilters();
}

function selectAllFilteredLocations() {
  const query = elements.locationFilterSearch.value.trim().toLowerCase();
  const sorted = [...state.locations];
  const matching = query
    ? sorted.filter(loc => loc.name.toLowerCase().includes(query))
    : sorted;

  matching.forEach(loc => state.selectedLocations.add(loc.name));
  state.currentPage = 1;
  updateLocationUI();
  applyFilters();
}

function deselectAllLocations() {
  state.selectedLocations.clear();
  state.currentPage = 1;
  updateLocationUI();
  applyFilters();
}

function updateLocationUI() {
  const count = state.selectedLocations.size;
  const totalLocations = state.locations.length;

  // 1. Update Toggle Button Text
  if (count === 0) {
    elements.locationToggleLabel.textContent = `All Recreation Centers (${state.allClubs.length.toLocaleString()} Clubs)`;
    elements.locationActiveHint.textContent = `All ${totalLocations} Centers`;
    elements.clearSelectedLocationsBtn.style.display = 'none';
  } else if (count === 1) {
    const singleLoc = [...state.selectedLocations][0];
    elements.locationToggleLabel.textContent = `📍 ${singleLoc}`;
    elements.locationActiveHint.textContent = singleLoc;
    elements.clearSelectedLocationsBtn.style.display = 'inline-block';
  } else if (count === 2) {
    elements.locationToggleLabel.textContent = `📍 ${[...state.selectedLocations].join(', ')}`;
    elements.locationActiveHint.textContent = `2 Centers Selected`;
    elements.clearSelectedLocationsBtn.style.display = 'inline-block';
  } else {
    elements.locationToggleLabel.textContent = `📍 ${count} Recreation Centers Selected`;
    elements.locationActiveHint.textContent = `${count} Centers Selected`;
    elements.clearSelectedLocationsBtn.style.display = 'inline-block';
  }

  // 2. Update Dropdown Counter
  elements.dropdownSelectionCounter.textContent = `${count} of ${totalLocations} selected`;

  // 3. Update Dropdown Checkbox Classes
  elements.locationCheckboxList.querySelectorAll('.location-checkbox-item').forEach(item => {
    const loc = item.dataset.location;
    const isChecked = state.selectedLocations.has(loc);
    item.classList.toggle('checked', isChecked);
    const cb = item.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = isChecked;
  });

  // 4. Update Selected Chips below dropdown
  if (count === 0) {
    elements.selectedLocationsChips.style.display = 'none';
    elements.selectedLocationsChips.innerHTML = '';
  } else {
    elements.selectedLocationsChips.style.display = 'flex';
    elements.selectedLocationsChips.innerHTML = [...state.selectedLocations].map(locName => `
      <span class="location-chip" data-location="${escapeHtml(locName)}">
        📍 ${escapeHtml(locName)}
        <button type="button" class="location-chip-remove" data-location="${escapeHtml(locName)}" title="Remove ${escapeHtml(locName)}" aria-label="Remove">✕</button>
      </span>
    `).join('') + (count > 1 ? `<button type="button" class="location-chip-clear-all" id="clear-all-chips-btn">Clear All (${count})</button>` : '');

    // Chip remove event listeners
    elements.selectedLocationsChips.querySelectorAll('.location-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleLocationSelection(btn.dataset.location);
      });
    });

    const clearAllChipsBtn = document.getElementById('clear-all-chips-btn');
    if (clearAllChipsBtn) {
      clearAllChipsBtn.addEventListener('click', deselectAllLocations);
    }
  }

  // 5. Update Tab 2 (Directory Grid) UI
  if (elements.dirSelectedCount) {
    elements.dirSelectedCount.textContent = `${count} Centers Selected`;
  }
  if (elements.dirViewSelectedBtn) {
    elements.dirViewSelectedBtn.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  if (elements.dirClearSelectedBtn) {
    elements.dirClearSelectedBtn.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  elements.locationsDirectoryGrid.querySelectorAll('.location-dir-card').forEach(card => {
    const loc = card.dataset.location;
    const isSelected = state.selectedLocations.has(loc);
    card.classList.toggle('selected', isSelected);
    const cb = card.querySelector('.dir-card-checkbox');
    if (cb) cb.checked = isSelected;
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // Navigation Tabs
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Global Search Input with Debounce
  let searchTimeout = null;
  elements.globalSearchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.clearSearchBtn.style.display = val ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = val.trim().toLowerCase();
      state.currentPage = 1;
      applyFilters();
    }, 180);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.globalSearchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    state.searchQuery = '';
    state.currentPage = 1;
    applyFilters();
    elements.globalSearchInput.focus();
  });

  // Multi-Select Location Dropdown Listeners
  elements.locationDropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = elements.locationDropdownMenu.style.display === 'block';
    if (isOpen) {
      closeLocationDropdown();
    } else {
      openLocationDropdown();
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (elements.locationMultiselectWrapper && !elements.locationMultiselectWrapper.contains(e.target)) {
      closeLocationDropdown();
    }
  });

  // Filter search inside dropdown
  elements.locationFilterSearch.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.clearLocationSearchBtn.style.display = val ? 'block' : 'none';
    renderLocationCheckboxes(val.trim());
  });

  elements.clearLocationSearchBtn.addEventListener('click', () => {
    elements.locationFilterSearch.value = '';
    elements.clearLocationSearchBtn.style.display = 'none';
    renderLocationCheckboxes();
    elements.locationFilterSearch.focus();
  });

  elements.selectAllLocationsBtn.addEventListener('click', selectAllFilteredLocations);
  elements.deselectAllLocationsBtn.addEventListener('click', deselectAllLocations);
  elements.clearSelectedLocationsBtn.addEventListener('click', deselectAllLocations);

  // Tab 2 Directory Actions
  if (elements.dirClearSelectedBtn) {
    elements.dirClearSelectedBtn.addEventListener('click', deselectAllLocations);
  }
  if (elements.dirViewSelectedBtn) {
    elements.dirViewSelectedBtn.addEventListener('click', () => {
      switchTab('search-view');
      window.scrollTo({ top: 120, behavior: 'smooth' });
    });
  }

  elements.switchToLocationsTabBtn.addEventListener('click', () => {
    switchTab('locations-view');
  });

  // Day Filter Pills
  elements.dayPillGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill-btn')) {
      elements.dayPillGroup.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedDay = e.target.dataset.day;
      state.currentPage = 1;
      applyFilters();
    }
  });

  // Week Filter Pills
  elements.weekPillGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill-btn')) {
      elements.weekPillGroup.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedWeek = e.target.dataset.week;
      state.currentPage = 1;
      applyFilters();
    }
  });

  // Time Period Filter Pills
  elements.periodPillGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill-btn')) {
      elements.periodPillGroup.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedPeriod = e.target.dataset.period;
      state.currentPage = 1;
      applyFilters();
    }
  });

  // Reset Filters
  elements.resetAllFiltersBtn.addEventListener('click', resetAllFilters);
  elements.emptyResetBtn.addEventListener('click', resetAllFilters);

  // View Mode Toggles
  elements.viewCardsBtn.addEventListener('click', () => setViewMode('cards'));
  elements.viewTableBtn.addEventListener('click', () => setViewMode('table'));

  // Pagination
  elements.prevPageBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderClubs();
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  });

  elements.nextPageBtn.addEventListener('click', () => {
    const maxPage = Math.ceil(state.filteredClubs.length / state.pageSize);
    if (state.currentPage < maxPage) {
      state.currentPage++;
      renderClubs();
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  });

  // Location Directory Search Filter
  elements.locationDirSearch.addEventListener('input', (e) => {
    renderLocationsDirectory(e.target.value.trim().toLowerCase());
  });

  // Favorites Actions
  elements.browseClubsBtn.addEventListener('click', () => switchTab('search-view'));
  elements.printFavoritesBtn.addEventListener('click', () => window.print());
  elements.printResultsBtn.addEventListener('click', () => window.print());
  elements.exportFavoritesCsvBtn.addEventListener('click', exportFavoritesToCsv);
  elements.clearFavoritesBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all your saved clubs?')) {
      state.favorites.clear();
      saveFavorites();
      renderFavorites();
      renderClubs();
    }
  });

  // Guide Interactive Decoder
  elements.decodeCodeBtn.addEventListener('click', handleCustomCodeDecode);
  elements.customCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCustomCodeDecode();
  });

  // Theme & Font Adjusters
  elements.themeToggleBtn.addEventListener('click', toggleTheme);
  elements.fontSmBtn.addEventListener('click', () => setFontSize('small'));
  elements.fontMdBtn.addEventListener('click', () => setFontSize('normal'));
  elements.fontLgBtn.addEventListener('click', () => setFontSize('large'));

  // Upload Modal Controls
  setupUploadModal();

  // Detail Modal Controls
  elements.closeDetailModalBtn.addEventListener('click', () => elements.detailModal.style.display = 'none');
  elements.modalCloseBtn.addEventListener('click', () => elements.detailModal.style.display = 'none');
  elements.detailModal.addEventListener('click', (e) => {
    if (e.target === elements.detailModal) elements.detailModal.style.display = 'none';
  });
}

// Navigation Tab Switcher
function switchTab(tabId) {
  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  elements.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'favorites-view') {
    renderFavorites();
  }
}

// Set View Mode (Cards vs. Table)
function setViewMode(mode) {
  state.viewMode = mode;
  elements.viewCardsBtn.classList.toggle('active', mode === 'cards');
  elements.viewTableBtn.classList.toggle('active', mode === 'table');
  elements.clubsGrid.style.display = mode === 'cards' ? 'grid' : 'none';
  elements.clubsTableContainer.style.display = mode === 'table' ? 'block' : 'none';
  renderClubs();
}

// Reset All Filters
function resetAllFilters() {
  state.searchQuery = '';
  state.selectedLocations.clear();
  state.selectedDay = 'all';
  state.selectedWeek = 'all';
  state.selectedPeriod = 'all';
  state.currentPage = 1;

  elements.globalSearchInput.value = '';
  elements.clearSearchBtn.style.display = 'none';
  elements.locationFilterSearch.value = '';
  elements.clearLocationSearchBtn.style.display = 'none';

  elements.dayPillGroup.querySelectorAll('.pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.day === 'all');
  });
  elements.weekPillGroup.querySelectorAll('.pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.week === 'all');
  });
  elements.periodPillGroup.querySelectorAll('.pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === 'all');
  });

  renderLocationCheckboxes();
  updateLocationUI();
  applyFilters();
}

function updateLocationHint() {
  const count = state.selectedLocations.size;
  if (count === 0) {
    elements.locationActiveHint.textContent = `All ${state.locations.length} Centers`;
  } else if (count === 1) {
    elements.locationActiveHint.textContent = [...state.selectedLocations][0];
  } else {
    elements.locationActiveHint.textContent = `${count} Centers Selected`;
  }
}

// Filtering Engine
function applyFilters() {
  let list = state.allClubs;

  // Location Filter (Multiple Selected or All)
  if (state.selectedLocations.size > 0) {
    list = list.filter(c => state.selectedLocations.has(c.location));
  }

  // Day Filter
  if (state.selectedDay !== 'all') {
    list = list.filter(c => c.days && c.days.includes(state.selectedDay));
  }

  // Week Filter
  if (state.selectedWeek !== 'all') {
    if (state.selectedWeek === 'Every week') {
      list = list.filter(c => c.weeks && c.weeks.includes('Every week'));
    } else {
      // If a specific week (1st, 2nd, 3rd, 4th, 5th) is selected,
      // include clubs that meet on that specific week OR every week!
      list = list.filter(c => c.weeks && (c.weeks.includes(state.selectedWeek) || c.weeks.includes('Every week')));
    }
  }

  // Time Period Filter
  if (state.selectedPeriod !== 'all') {
    list = list.filter(c => c.time_period === state.selectedPeriod);
  }

  // Search Query Filter
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(c => {
      return (c.name && c.name.toLowerCase().includes(q)) ||
             (c.location && c.location.toLowerCase().includes(q)) ||
             (c.leader && c.leader.toLowerCase().includes(q)) ||
             (c.schedule_code && c.schedule_code.toLowerCase().includes(q)) ||
             (c.schedule_details && c.schedule_details.toLowerCase().includes(q)) ||
             (c.room_code && c.room_code.toLowerCase().includes(q));
    });
  }

  state.filteredClubs = list;
  renderActiveFilterTags();
  renderClubs();
}

// Active Filter Tags
function renderActiveFilterTags() {
  const tags = [];
  if (state.selectedLocations.size > 0) {
    if (state.selectedLocations.size === 1) {
      tags.push(`📍 ${[...state.selectedLocations][0]}`);
    } else if (state.selectedLocations.size === 2) {
      tags.push(`📍 ${[...state.selectedLocations].join(', ')}`);
    } else {
      tags.push(`📍 ${state.selectedLocations.size} Centers Selected`);
    }
  }
  if (state.selectedDay !== 'all') {
    tags.push(`📅 ${state.selectedDay}`);
  }
  if (state.selectedWeek !== 'all') {
    tags.push(`🔢 ${state.selectedWeek}`);
  }
  if (state.selectedPeriod !== 'all') {
    tags.push(`⏰ ${state.selectedPeriod}`);
  }
  if (state.searchQuery) {
    tags.push(`🔍 "${state.searchQuery}"`);
  }

  elements.activeFilterTags.innerHTML = tags.map(t => `<span class="filter-tag">${t}</span>`).join('');
}

// Render Clubs (Cards or Table)
function renderClubs() {
  const total = state.filteredClubs.length;
  elements.resultsCountText.innerHTML = `Showing <strong>${total.toLocaleString()}</strong> clubs`;

  if (total === 0) {
    elements.clubsGrid.innerHTML = '';
    elements.clubsTableBody.innerHTML = '';
    elements.noResultsState.style.display = 'block';
    elements.paginationControls.style.display = 'none';
    return;
  }

  elements.noResultsState.style.display = 'none';
  elements.paginationControls.style.display = 'flex';

  // Calculate slice
  const maxPage = Math.ceil(total / state.pageSize) || 1;
  if (state.currentPage > maxPage) state.currentPage = maxPage;

  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = Math.min(startIdx + state.pageSize, total);
  const pageItems = state.filteredClubs.slice(startIdx, endIdx);

  elements.pageInfo.textContent = `Page ${state.currentPage} of ${maxPage} (${startIdx + 1}–${endIdx} of ${total.toLocaleString()})`;
  elements.prevPageBtn.disabled = state.currentPage === 1;
  elements.nextPageBtn.disabled = state.currentPage === maxPage;

  if (state.viewMode === 'cards') {
    renderCards(pageItems, elements.clubsGrid);
  } else {
    renderTableRows(pageItems, elements.clubsTableBody);
  }
}

// Render Card Layout
function renderCards(clubs, container) {
  container.innerHTML = clubs.map(c => {
    const isFav = state.favorites.has(c.id);
    const starIcon = isFav ? '★' : '☆';
    const favClass = isFav ? 'active' : '';

    return `
      <article class="club-card" data-id="${c.id}">
        <div>
          <div class="card-header">
            <h3 class="club-title">${escapeHtml(c.name)}</h3>
            <button class="fav-btn ${favClass}" data-id="${c.id}" title="${isFav ? 'Remove from Saved' : 'Save to My Clubs'}" aria-label="Favorite">
              ${starIcon}
            </button>
          </div>

          <div class="schedule-badge-row">
            <div class="schedule-card-badge">
              <span>🗓️</span>
              <span>${escapeHtml(c.schedule_details)}</span>
            </div>
            ${c.schedule_code ? `<button class="code-pill explain-code-btn" data-id="${c.id}" title="Click to see shorthand code explanation">Code: ${escapeHtml(c.schedule_code)} ℹ️</button>` : ''}
          </div>

          <div class="club-details-list">
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <div>
                <a href="${c.map_url}" target="_blank" rel="noopener" class="location-link" title="Open location in Google Maps">
                  ${escapeHtml(c.location)}
                </a>
                <span class="map-chip">Directions ↗</span>
                ${c.room_code ? `<span class="map-chip">Room: ${escapeHtml(c.room_code)}</span>` : ''}
              </div>
            </div>

            ${c.leader ? `
              <div class="detail-item">
                <span class="detail-icon">👤</span>
                <div><strong>Leader:</strong> ${escapeHtml(c.leader)}</div>
              </div>
            ` : ''}

            ${c.phone ? `
              <div class="detail-item">
                <span class="detail-icon">📞</span>
                <div><a href="tel:${c.phone.replace(/[^0-9]/g, '')}">${escapeHtml(c.phone)}</a></div>
              </div>
            ` : ''}

            ${c.email ? `
              <div class="detail-item">
                <span class="detail-icon">✉️</span>
                <div><a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></div>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="card-actions">
          ${c.phone ? `<a href="tel:${c.phone.replace(/[^0-9]/g, '')}" class="action-btn">📞 Call</a>` : ''}
          ${c.email ? `<a href="mailto:${escapeHtml(c.email)}" class="action-btn">✉️ Email</a>` : ''}
          ${c.website ? `<a href="${formatUrl(c.website)}" target="_blank" rel="noopener" class="action-btn">🌐 Website</a>` : ''}
          <button class="action-btn view-detail-btn" data-id="${c.id}">🔍 Details</button>
        </div>
      </article>
    `;
  }).join('');

  // Attach card event handlers
  container.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(parseInt(btn.dataset.id));
    });
  });

  container.querySelectorAll('.explain-code-btn, .view-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openClubDetailModal(parseInt(btn.dataset.id));
    });
  });
}

// Render Table Layout
function renderTableRows(clubs, tbody) {
  tbody.innerHTML = clubs.map(c => {
    const isFav = state.favorites.has(c.id);
    return `
      <tr>
        <td>
          <strong>${escapeHtml(c.name)}</strong>
          ${c.schedule_code ? `<br><small class="code-pill explain-code-btn" data-id="${c.id}">Code: ${escapeHtml(c.schedule_code)}</small>` : ''}
        </td>
        <td>
          <a href="${c.map_url}" target="_blank" rel="noopener" class="location-link">${escapeHtml(c.location)}</a>
          ${c.room_code ? `<br><span class="map-chip">Room: ${escapeHtml(c.room_code)}</span>` : ''}
        </td>
        <td>${escapeHtml(c.schedule_details)}</td>
        <td><strong>${escapeHtml(c.time || 'N/A')}</strong></td>
        <td>
          ${escapeHtml(c.leader || 'Not listed')}<br>
          ${c.phone ? `<a href="tel:${c.phone.replace(/[^0-9]/g, '')}">${escapeHtml(c.phone)}</a>` : ''}
          ${c.email ? ` | <a href="mailto:${escapeHtml(c.email)}">Email</a>` : ''}
        </td>
        <td>
          <button class="btn btn-sm btn-ghost fav-btn ${isFav ? 'active' : ''}" data-id="${c.id}" title="Save">
            ${isFav ? '★ Saved' : '☆ Save'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(parseInt(btn.dataset.id)));
  });

  tbody.querySelectorAll('.explain-code-btn').forEach(btn => {
    btn.addEventListener('click', () => openClubDetailModal(parseInt(btn.dataset.id)));
  });
}

// TAB 2: Locations Directory Grid
function renderLocationsDirectory(filterText = '') {
  let list = state.locations;
  if (filterText) {
    list = list.filter(loc => loc.name.toLowerCase().includes(filterText));
  }

  elements.locationsDirectoryGrid.innerHTML = list.map(loc => {
    const isSelected = state.selectedLocations.has(loc.name);
    return `
      <div class="location-dir-card ${isSelected ? 'selected' : ''}" data-location="${escapeHtml(loc.name)}">
        <div class="location-dir-card-left">
          <input type="checkbox" class="dir-card-checkbox" data-location="${escapeHtml(loc.name)}" ${isSelected ? 'checked' : ''} aria-label="Select ${escapeHtml(loc.name)}">
          <div class="location-card-info">
            <h4>${escapeHtml(loc.name)}</h4>
            <span>📍 Open in Google Maps ↗</span>
          </div>
        </div>
        <span class="location-card-badge">${loc.count} clubs</span>
      </div>
    `;
  }).join('');

  elements.locationsDirectoryGrid.querySelectorAll('.location-dir-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // If user clicked the Google Maps link, let it open
      if (e.target.tagName && e.target.tagName.toLowerCase() === 'span' && e.target.textContent.includes('Google Maps')) {
        return;
      }
      const locName = card.dataset.location;
      toggleLocationSelection(locName);
    });
  });

  updateLocationUI();
}

// TAB 3: Favorites System
function loadFavorites() {
  try {
    const raw = localStorage.getItem('villages_saved_clubs');
    if (raw) {
      state.favorites = new Set(JSON.parse(raw));
    }
  } catch (e) {
    state.favorites = new Set();
  }
  updateFavoritesBadge();
}

function saveFavorites() {
  localStorage.setItem('villages_saved_clubs', JSON.stringify([...state.favorites]));
  updateFavoritesBadge();
}

function updateFavoritesBadge() {
  elements.favoritesBadge.textContent = state.favorites.size;
}

function toggleFavorite(clubId) {
  if (state.favorites.has(clubId)) {
    state.favorites.delete(clubId);
  } else {
    state.favorites.add(clubId);
  }
  saveFavorites();
  renderClubs();
  if (document.getElementById('favorites-view').classList.contains('active')) {
    renderFavorites();
  }
}

function renderFavorites() {
  const favClubs = state.allClubs.filter(c => state.favorites.has(c.id));
  
  if (favClubs.length === 0) {
    elements.favoritesGrid.innerHTML = '';
    elements.noFavoritesState.style.display = 'block';
    return;
  }

  elements.noFavoritesState.style.display = 'none';
  renderCards(favClubs, elements.favoritesGrid);
}

function exportFavoritesToCsv() {
  const favClubs = state.allClubs.filter(c => state.favorites.has(c.id));
  if (favClubs.length === 0) {
    alert('You have no saved clubs to export.');
    return;
  }

  const headers = ['Club Name', 'Location', 'Schedule Details', 'Original Code', 'Time', 'Leader', 'Email', 'Phone', 'Website'];
  const rows = favClubs.map(c => [
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.location || '').replace(/"/g, '""')}"`,
    `"${(c.schedule_details || '').replace(/"/g, '""')}"`,
    `"${(c.schedule_code || '').replace(/"/g, '""')}"`,
    `"${(c.time || '').replace(/"/g, '""')}"`,
    `"${(c.leader || '').replace(/"/g, '""')}"`,
    `"${(c.email || '').replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.website || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'My_Villages_Clubs_Schedule.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Club Details & Code Breakdown Modal
function openClubDetailModal(clubId) {
  const club = state.allClubs.find(c => c.id === clubId);
  if (!club) return;

  elements.modalClubName.textContent = club.name;

  const isFav = state.favorites.has(club.id);
  elements.modalSaveFavBtn.textContent = isFav ? '★ Saved to My Clubs' : '☆ Save to My Clubs';
  elements.modalSaveFavBtn.onclick = () => {
    toggleFavorite(club.id);
    elements.modalSaveFavBtn.textContent = state.favorites.has(club.id) ? '★ Saved to My Clubs' : '☆ Save to My Clubs';
  };

  elements.modalClubBody.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <h4 style="color: var(--primary); margin-bottom: 0.35rem;">🗓️ Meeting Schedule</h4>
      <p style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">${escapeHtml(club.schedule_details)}</p>
    </div>

    ${club.schedule_code ? `
      <div style="background-color: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.5rem;">Shorthand Code Breakdown</h4>
        <div style="font-family: monospace; font-size: 1.2rem; font-weight: 700; color: var(--accent-gold); margin-bottom: 0.5rem;">
          ${escapeHtml(club.schedule_code)}
        </div>
        <ul style="font-size: 0.9rem; color: var(--text-muted); padding-left: 1.25rem; line-height: 1.6;">
          ${generateCodeExplanations(club.schedule_code)}
        </ul>
      </div>
    ` : ''}

    <div style="margin-bottom: 1.25rem;">
      <h4 style="color: var(--text-main); margin-bottom: 0.35rem;">📍 Location</h4>
      <p style="font-size: 1rem; font-weight: 600;">${escapeHtml(club.location)}</p>
      ${club.room_code ? `<p style="font-size: 0.9rem; color: var(--text-muted);">Facility / Room: <strong>${escapeHtml(club.room_code)}</strong></p>` : ''}
      <a href="${club.map_url}" target="_blank" rel="noopener" style="display: inline-block; margin-top: 0.35rem; font-size: 0.9rem; font-weight: 600;">Get Directions in Google Maps ↗</a>
    </div>

    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
      <h4 style="color: var(--text-main); margin-bottom: 0.5rem;">👤 Contact Information</h4>
      <p><strong>Leader:</strong> ${escapeHtml(club.leader || 'Not listed')}</p>
      ${club.phone ? `<p><strong>Phone:</strong> <a href="tel:${club.phone.replace(/[^0-9]/g, '')}">${escapeHtml(club.phone)}</a></p>` : ''}
      ${club.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(club.email)}">${escapeHtml(club.email)}</a></p>` : ''}
      ${club.website ? `<p><strong>Website:</strong> <a href="${formatUrl(club.website)}" target="_blank" rel="noopener">${escapeHtml(club.website)}</a></p>` : ''}
      <p style="font-size: 0.8rem; color: var(--text-light); margin-top: 0.75rem;">Source Document Reference: Page ${club.pdf_page} of Club-Contact-9.11.26.pdf</p>
    </div>
  `;

  elements.detailModal.style.display = 'flex';
}

function generateCodeExplanations(code) {
  const items = [];
  const upper = code.toUpperCase();

  if (upper.includes('Q')) {
    items.push('<li><code>Q</code> = <strong>Every week</strong></li>');
  }
  const weekNums = upper.match(/[1-5]/g);
  if (weekNums && !upper.startsWith('Q')) {
    const ordMap = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '5': '5th' };
    const ords = weekNums.map(n => ordMap[n]).filter(Boolean);
    items.push(`<li><code>${weekNums.join(',')}</code> = <strong>${ords.join(' & ')} week of the month</strong></li>`);
  }

  const days = [
    { code: 'SU', name: 'Sunday' },
    { code: 'SA', name: 'Saturday' },
    { code: 'TH', name: 'Thursday' },
    { code: 'TU', name: 'Tuesday' },
    { code: 'M', name: 'Monday' },
    { code: 'W', name: 'Wednesday' },
    { code: 'F', name: 'Friday' }
  ];
  for (const d of days) {
    if (upper.includes(d.code)) {
      items.push(`<li><code>${d.code}</code> = <strong>${d.name}</strong></li>`);
      break;
    }
  }

  const timeMatch = code.match(/@(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (timeMatch) {
    items.push(`<li><code>${timeMatch[0]}</code> = <strong>Meets at ${timeMatch[1]}</strong></li>`);
  }

  const roomMatch = code.match(/-([A-Za-z0-9]+)$/);
  if (roomMatch) {
    items.push(`<li><code>-${roomMatch[1]}</code> = <strong>Room / Facility Code</strong></li>`);
  }

  if (upper.includes('EVEN')) items.push('<li><code>even</code> = <strong>Even-numbered months only</strong></li>');
  if (upper.includes('ODD')) items.push('<li><code>odd</code> = <strong>Odd-numbered months only</strong></li>');
  if (upper.includes('X')) items.push('<li><code>x</code> = <strong>Exception (months when club does NOT meet)</strong></li>');

  return items.join('');
}

// Guide Interactive Decoder
function handleCustomCodeDecode() {
  const code = elements.customCodeInput.value.trim();
  if (!code) {
    elements.decoderResultBox.style.display = 'none';
    return;
  }

  elements.decoderResultBox.style.display = 'block';
  elements.decoderResultBox.innerHTML = `
    <h4 style="color: var(--primary); margin-bottom: 0.5rem;">Decoded Meaning for: <code>${escapeHtml(code)}</code></h4>
    <ul style="padding-left: 1.25rem; line-height: 1.8;">
      ${generateCodeExplanations(code)}
    </ul>
  `;
}

// PDF Upload & Extraction Handler
function setupUploadModal() {
  elements.openUploadBtn.addEventListener('click', () => {
    elements.uploadModal.style.display = 'flex';
    resetUploadModal();
  });

  elements.closeUploadModalBtn.addEventListener('click', () => elements.uploadModal.style.display = 'none');
  elements.cancelUploadBtn.addEventListener('click', () => elements.uploadModal.style.display = 'none');

  let selectedFile = null;

  elements.dropZone.addEventListener('click', () => elements.pdfFileInput.click());

  elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
  });

  elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('dragover');
  });

  elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  elements.pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }
    selectedFile = file;
    elements.dropZone.querySelector('.drop-zone-text').innerHTML = `Selected: <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    elements.startUploadBtn.disabled = false;
  }

  elements.startUploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    elements.startUploadBtn.disabled = true;
    elements.cancelUploadBtn.disabled = true;
    elements.uploadProgressContainer.style.display = 'block';
    elements.uploadProgressBar.style.width = '30%';
    elements.uploadStatusText.textContent = 'Uploading PDF to server...';

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      elements.uploadProgressBar.style.width = '60%';
      elements.uploadStatusText.textContent = 'Extracting 200+ pages of clubs... (takes ~8-10 seconds)';

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (res.ok && result.success) {
        elements.uploadProgressBar.style.width = '100%';
        elements.uploadStatusText.textContent = 'Extraction complete!';
        elements.uploadResultAlert.className = 'alert alert-success';
        elements.uploadResultAlert.textContent = `Success! Parsed ${result.total_clubs} clubs across ${result.total_locations} recreation centers.`;
        elements.uploadResultAlert.style.display = 'block';

        // Reload data
        setTimeout(async () => {
          await fetchInitialData();
          elements.uploadModal.style.display = 'none';
          resetUploadModal();
        }, 1800);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      elements.uploadProgressBar.style.width = '100%';
      elements.uploadProgressBar.style.backgroundColor = 'var(--danger)';
      elements.uploadStatusText.textContent = 'Extraction failed.';
      elements.uploadResultAlert.className = 'alert alert-error';
      elements.uploadResultAlert.textContent = err.message || 'An error occurred during extraction.';
      elements.uploadResultAlert.style.display = 'block';
      elements.startUploadBtn.disabled = false;
      elements.cancelUploadBtn.disabled = false;
    }
  });

  function resetUploadModal() {
    selectedFile = null;
    elements.pdfFileInput.value = '';
    elements.dropZone.querySelector('.drop-zone-text').innerHTML = '<strong>Click to choose a PDF</strong> or drag and drop it here';
    elements.startUploadBtn.disabled = true;
    elements.cancelUploadBtn.disabled = false;
    elements.uploadProgressContainer.style.display = 'none';
    elements.uploadProgressBar.style.width = '0%';
    elements.uploadProgressBar.style.backgroundColor = '';
    elements.uploadResultAlert.style.display = 'none';
  }
}

// Theme & Font Adjusters
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('villages_theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  elements.themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

function setFontSize(size) {
  state.fontSize = size;
  localStorage.setItem('villages_font_size', size);
  document.documentElement.setAttribute('data-font-size', size);
  document.querySelectorAll('.font-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
}

// Utility Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatUrl(url) {
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    return 'http://' + url;
  }
  return url;
}
