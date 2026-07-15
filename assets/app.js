(() => {
  'use strict';

  const categories = window.RESOURCE_CATEGORIES || [];
  const resourceGrid = document.getElementById('resourceGrid');
  const filtersRoot = document.getElementById('categoryFilters');
  const searchInput = document.getElementById('resourceSearch');
  const clearSearch = document.getElementById('clearSearch');
  const resultSummary = document.getElementById('resultSummary');
  const totalResourceCount = document.getElementById('totalResourceCount');
  const emptyState = document.getElementById('emptyState');
  const resetFilters = document.getElementById('resetFilters');
  const searchNote = document.getElementById('activeSearchNote');

  let activeCategory = 'all';
  let matchMode = 'all';
  const expandedCategories = new Set();
  const COLLAPSED_LIMIT = 6;

  const normalise = (value = '') => value
    .toLocaleLowerCase('en-GB')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const getTerms = () => normalise(searchInput.value).split(/\s+/).filter(Boolean);
  const totalResources = categories.reduce((sum, category) => sum + category.resources.length, 0);
  totalResourceCount.textContent = totalResources;

  function externalIcon() {
    return `<svg class="external-icon" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M14 5h5v5m0-5-8 8M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function buildSearchText(category, resource) {
    return normalise([
      category.title,
      category.summary,
      category.ksb,
      resource.title,
      resource.type,
      resource.source,
      ...(resource.tags || [])
    ].join(' '));
  }

  function resourceMatches(searchText, terms) {
    if (!terms.length) return true;
    const words = new Set(searchText.split(/\s+/));
    const matchesTerm = term => term.length <= 2 ? words.has(term) : searchText.includes(term);
    return matchMode === 'all'
      ? terms.every(matchesTerm)
      : terms.some(matchesTerm);
  }

  function createFilters() {
    const options = [{ id: 'all', title: 'All areas' }, ...categories.map(c => ({ id: c.id, title: c.title }))];
    filtersRoot.innerHTML = options.map(option => `
      <button type="button" class="filter-button${option.id === 'all' ? ' active' : ''}" data-category="${option.id}" aria-pressed="${option.id === 'all'}">
        ${option.title}
      </button>`).join('');

    filtersRoot.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      activeCategory = button.dataset.category;
      filtersRoot.querySelectorAll('[data-category]').forEach(item => {
        const isActive = item.dataset.category === activeCategory;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
      });
      render();
    });
  }

  function render() {
    const terms = getTerms();
    let visibleResourceCount = 0;
    let visibleCategoryCount = 0;
    const searchActive = terms.length > 0;

    const cards = categories.map(category => {
      if (activeCategory !== 'all' && activeCategory !== category.id) return '';

      const matches = category.resources.map((resource, index) => ({
        ...resource,
        originalIndex: index,
        searchText: buildSearchText(category, resource)
      })).filter(resource => resourceMatches(resource.searchText, terms));

      if (!matches.length) return '';
      visibleCategoryCount += 1;
      visibleResourceCount += matches.length;

      const expanded = searchActive || expandedCategories.has(category.id);
      const visibleItems = expanded ? matches : matches.slice(0, COLLAPSED_LIMIT);
      const hiddenCount = matches.length - visibleItems.length;

      const listItems = visibleItems.map(resource => `
        <li class="resource-item">
          <a class="resource-link" href="${resource.url}" target="_blank" rel="noopener noreferrer">
            <span>
              <span class="resource-title">${resource.title}</span>
              <span class="resource-detail"><span class="resource-type">${resource.type}</span><span class="resource-source">${resource.source}</span></span>
            </span>
            ${externalIcon()}
          </a>
        </li>`).join('');

      const footer = (!searchActive && matches.length > COLLAPSED_LIMIT) ? `
        <div class="card-footer">
          <button class="expand-button" type="button" data-expand="${category.id}" aria-expanded="${expanded}">
            ${expanded ? 'Show fewer resources' : `Show all ${matches.length} resources`}
          </button>
        </div>` : '';

      return `
        <article class="resource-card" data-tone="${category.tone}" data-category-card="${category.id}">
          <header class="resource-card-header">
            <div class="card-meta"><span class="ksb-tag">${category.ksb}</span><span class="resource-total">${matches.length} ${matches.length === 1 ? 'resource' : 'resources'}</span></div>
            <h3>${category.title}</h3>
            <p>${category.summary}</p>
          </header>
          <ul class="resource-list">${listItems}</ul>
          ${footer}
        </article>`;
    }).join('');

    resourceGrid.innerHTML = cards;
    emptyState.hidden = visibleResourceCount > 0;
    clearSearch.hidden = !searchInput.value;
    resultSummary.textContent = `Showing ${visibleResourceCount} of ${totalResources} resources`;

    if (searchActive) {
      const modeText = matchMode === 'all' ? 'every search word' : 'at least one search word';
      searchNote.textContent = `Search is matching ${modeText} across titles, KSBs, learning areas, sources and keywords.`;
      searchNote.hidden = false;
    } else {
      searchNote.hidden = true;
    }

    resourceGrid.querySelectorAll('[data-expand]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.expand;
        expandedCategories.has(id) ? expandedCategories.delete(id) : expandedCategories.add(id);
        render();
        document.querySelector(`[data-category-card="${id}"]`)?.scrollIntoView({ block: 'nearest' });
      });
    });
  }

  function resetAll() {
    searchInput.value = '';
    activeCategory = 'all';
    matchMode = 'all';
    expandedCategories.clear();
    filtersRoot.querySelectorAll('[data-category]').forEach(item => {
      const isActive = item.dataset.category === 'all';
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
    document.querySelectorAll('[data-match]').forEach(button => {
      const isActive = button.dataset.match === 'all';
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    render();
    searchInput.focus();
  }

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(render, 70);
  });

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    render();
    searchInput.focus();
  });

  document.querySelectorAll('[data-match]').forEach(button => {
    button.addEventListener('click', () => {
      matchMode = button.dataset.match;
      document.querySelectorAll('[data-match]').forEach(item => {
        const isActive = item === button;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
      });
      render();
    });
  });

  resetFilters.addEventListener('click', resetAll);

  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === 'Escape' && document.activeElement === searchInput && searchInput.value) {
      searchInput.value = '';
      render();
    }
  });

  createFilters();
  render();
})();
