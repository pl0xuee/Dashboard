/* Repos page — pulls the repo list live from the GitHub API.
   Nothing here is hardcoded per-repo: new repos show up on their own, and each
   card's version comes from the repo's latest release, newest tag, or last commit. */

(function () {
  'use strict';

  const GITHUB_USER = 'pl0xuee';
  const API = 'https://api.github.com';

  // Unauthenticated GitHub allows 60 requests/hour per IP, so results are cached
  // and version lookups are skipped for repos whose pushed_at hasn't moved.
  const CACHE_KEY = 'cc:gh:payload:v1';
  const VERSION_CACHE_KEY = 'cc:gh:versions:v1';
  const CACHE_TTL_MS = 30 * 60 * 1000;
  const VERSION_CONCURRENCY = 4;

  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5', Rust: '#dea584',
    Go: '#00add8', Lua: '#000080', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
    Java: '#b07219', Ruby: '#701516', PHP: '#4f5d95', Shell: '#89e051', HTML: '#e34c26',
    CSS: '#563d7c', Vue: '#41b883', Svelte: '#ff3e00', Kotlin: '#a97bff', Swift: '#f05138',
    Dart: '#00b4ab', Zig: '#ec915c', Nix: '#7e7eff', Haskell: '#5e5086'
  };

  const grid = document.getElementById('repo-grid');
  const metaLine = document.getElementById('repo-meta');
  const errorBox = document.getElementById('repo-error');
  const searchInput = document.getElementById('repo-search');
  const sortSelect = document.getElementById('repo-sort');
  const refreshBtn = document.getElementById('repo-refresh');

  let repos = [];
  let fetchedAt = 0;

  /* ---------------- helpers ---------------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      /* quota or private mode — cache is an optimization, not a requirement */
    }
  }

  // The refresh button is re-enabled in a `finally`, so a request that hangs rather
  // than failing leaves it disabled and the page stuck on "Loading repositories..."
  // with no way to retry. A rejection walks the existing error path instead.
  const GITHUB_REQUEST_TIMEOUT_MS = 9000;

  async function ghFetch(path) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(API + path, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 404) return null;

    if (!res.ok) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (res.status === 403 && remaining === '0') {
        const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
        const err = new Error('rate-limited');
        err.rateLimited = true;
        err.resetAt = reset;
        throw err;
      }
      throw new Error('GitHub API error ' + res.status);
    }

    return res.json();
  }

  function relativeTime(iso) {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '';
    const seconds = Math.round((then - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const units = [
      ['year', 31536000], ['month', 2592000], ['week', 604800],
      ['day', 86400], ['hour', 3600], ['minute', 60]
    ];
    for (const [unit, secs] of units) {
      if (Math.abs(seconds) >= secs) return rtf.format(Math.round(seconds / secs), unit);
    }
    return rtf.format(seconds, 'second');
  }

  function formatSize(kb) {
    if (!kb) return '0 KB';
    if (kb < 1024) return kb + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  }

  /* ---------------- version resolution ---------------- */

  // Latest release -> newest tag -> latest commit SHA. Cached per repo and only
  // re-resolved when the repo's pushed_at changes, which keeps us under the rate limit.
  async function resolveVersion(repo, cache) {
    const cached = cache[repo.full_name];
    if (cached && cached.pushed_at === repo.pushed_at) return cached.version;

    let version = null;

    try {
      const release = await ghFetch('/repos/' + repo.full_name + '/releases/latest');
      if (release && release.tag_name) {
        version = {
          label: release.tag_name,
          type: 'release',
          url: release.html_url,
          date: release.published_at
        };
      }

      if (!version) {
        const tags = await ghFetch('/repos/' + repo.full_name + '/tags?per_page=1');
        if (Array.isArray(tags) && tags.length) {
          version = {
            label: tags[0].name,
            type: 'tag',
            url: repo.html_url + '/releases/tag/' + encodeURIComponent(tags[0].name),
            date: null
          };
        }
      }

      if (!version) {
        const commits = await ghFetch('/repos/' + repo.full_name + '/commits?per_page=1');
        if (Array.isArray(commits) && commits.length) {
          version = {
            label: commits[0].sha.slice(0, 7),
            type: 'commit',
            url: commits[0].html_url,
            date: commits[0].commit && commits[0].commit.author && commits[0].commit.author.date
          };
        }
      }
    } catch (err) {
      if (err.rateLimited) throw err;
      version = null;
    }

    if (!version) version = { label: 'unversioned', type: 'commit', url: repo.html_url, date: null };

    cache[repo.full_name] = { pushed_at: repo.pushed_at, version: version };
    return version;
  }

  async function resolveAllVersions(list) {
    const cache = readCache(VERSION_CACHE_KEY) || {};
    const queue = list.slice();
    let limited = false;

    async function worker() {
      while (queue.length) {
        const repo = queue.shift();
        try {
          repo.version = await resolveVersion(repo, cache);
        } catch (err) {
          if (err.rateLimited) {
            limited = true;
            queue.length = 0;
            return;
          }
        }
        render();
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(VERSION_CONCURRENCY, list.length) }, worker)
    );

    writeCache(VERSION_CACHE_KEY, cache);
    return limited;
  }

  /* ---------------- rendering ---------------- */

  function renderProfile(user, list) {
    const avatar = document.getElementById('gh-avatar');
    if (user.avatar_url) {
      avatar.src = user.avatar_url + '&s=144';
      avatar.alt = user.login + ' avatar';
    }
    document.getElementById('gh-profile-link').href = user.html_url;
    document.getElementById('gh-profile-link').textContent = '@' + user.login;
    document.getElementById('gh-bio').textContent =
      user.bio || (user.name ? user.name : 'Public repositories on GitHub.');

    const stars = list.reduce((sum, r) => sum + r.stargazers_count, 0);
    const langs = new Set(list.map((r) => r.language).filter(Boolean));

    document.getElementById('gh-stat-repos').textContent = list.length;
    document.getElementById('gh-stat-stars').textContent = stars;
    document.getElementById('gh-stat-followers').textContent = user.followers ?? 0;
    document.getElementById('gh-stat-langs').textContent = langs.size;
  }

  function buildCard(repo) {
    const card = el('article', 'card repo-card' + (repo.archived ? ' is-archived' : ''));

    const head = el('div', 'repo-card-head');
    const name = el('h2', 'repo-name');
    const link = el('a', null, repo.name);
    link.href = repo.html_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    name.appendChild(link);
    head.appendChild(name);

    const v = repo.version;
    if (v) {
      const badge = el('a', 'repo-version is-' + v.type, v.label);
      badge.href = v.url;
      badge.target = '_blank';
      badge.rel = 'noopener noreferrer';
      badge.title =
        v.type === 'release' ? 'Latest release' + (v.date ? ' · ' + relativeTime(v.date) : '')
        : v.type === 'tag' ? 'Newest tag'
        : 'Latest commit' + (v.date ? ' · ' + relativeTime(v.date) : '');
      head.appendChild(badge);
    } else {
      head.appendChild(el('span', 'repo-version is-commit is-pending', '…'));
    }
    card.appendChild(head);

    const flags = [];
    if (repo.fork) flags.push('Fork');
    if (repo.archived) flags.push('Archived');
    if (repo.private) flags.push('Private');
    if (flags.length) {
      const flagRow = el('div', 'repo-flags');
      flags.forEach((f) => flagRow.appendChild(el('span', 'repo-flag', f)));
      card.appendChild(flagRow);
    }

    card.appendChild(
      el(
        'p',
        'repo-desc' + (repo.description ? '' : ' is-empty'),
        repo.description || 'No description set on GitHub.'
      )
    );

    if (repo.topics && repo.topics.length) {
      const topics = el('div', 'repo-topics');
      repo.topics.slice(0, 6).forEach((t) => topics.appendChild(el('span', 'repo-topic', t)));
      card.appendChild(topics);
    }

    const meta = el('div', 'repo-meta');

    if (repo.language) {
      const langItem = el('span', 'repo-meta-item');
      const dot = el('span', 'repo-lang-dot');
      dot.style.background = LANG_COLORS[repo.language] || 'var(--accent)';
      langItem.appendChild(dot);
      langItem.appendChild(el('span', null, repo.language));
      meta.appendChild(langItem);
    }

    const stat = (icon, value, title) => {
      const item = el('span', 'repo-meta-item');
      item.title = title;
      item.appendChild(el('span', null, icon));
      item.appendChild(el('span', 'repo-meta-num', String(value)));
      meta.appendChild(item);
    };
    stat('★', repo.stargazers_count, 'Stars');
    stat('⑂', repo.forks_count, 'Forks');
    stat('◎', repo.open_issues_count, 'Open issues');

    if (repo.license && repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION') {
      meta.appendChild(el('span', 'repo-meta-item', repo.license.spdx_id));
    }
    meta.appendChild(el('span', 'repo-meta-item', formatSize(repo.size)));
    meta.appendChild(el('span', 'repo-meta-item', 'Updated ' + relativeTime(repo.pushed_at)));
    card.appendChild(meta);

    const actions = el('div', 'repo-actions');
    const code = el('a', 'repo-btn is-primary', 'Code ↗');
    code.href = repo.html_url;
    code.target = '_blank';
    code.rel = 'noopener noreferrer';
    actions.appendChild(code);

    if (repo.homepage) {
      const live = el('a', 'repo-btn', 'Live ↗');
      live.href = repo.homepage;
      live.target = '_blank';
      live.rel = 'noopener noreferrer';
      actions.appendChild(live);
    }

    // Only where there is something to open. resolveVersion already falls back to
    // a tag and then to a commit SHA when a repo has published no releases, and
    // every card carried this button regardless — so on those repos it offered a
    // trip to an empty GitHub releases page. The version badge beside the name is
    // the honest control there, and it already points at the tag or the commit.
    const hasReleases = repo.version && (repo.version.type === 'release' || repo.version.type === 'tag');
    if (hasReleases) {
      const releases = el('a', 'repo-btn', 'Releases ↗');
      releases.href = repo.html_url + '/releases';
      releases.target = '_blank';
      releases.rel = 'noopener noreferrer';
      actions.appendChild(releases);
    }

    card.appendChild(actions);
    return card;
  }

  function visibleRepos() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const sort = sortSelect.value;

    const filtered = repos.filter((r) => {
      if (!q) return true;
      const haystack = [
        r.name,
        r.description || '',
        r.language || '',
        (r.topics || []).join(' '),
        r.version ? r.version.label : ''
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });

    const sorters = {
      updated: (a, b) => new Date(b.pushed_at) - new Date(a.pushed_at),
      created: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      stars: (a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name)
    };
    return filtered.sort(sorters[sort] || sorters.updated);
  }

  function render() {
    const list = visibleRepos();
    grid.textContent = '';

    if (!list.length) {
      grid.appendChild(el('p', 'repos-empty', repos.length
        ? 'No repos match that filter.'
        : 'No public repositories found.'));
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((repo) => frag.appendChild(buildCard(repo)));
    grid.appendChild(frag);
  }

  function renderSkeletons(count) {
    grid.textContent = '';
    for (let i = 0; i < count; i += 1) grid.appendChild(el('div', 'repo-skeleton'));
  }

  function setMeta(note) {
    const when = fetchedAt ? relativeTime(new Date(fetchedAt).toISOString()) : '';
    const parts = [repos.length + (repos.length === 1 ? ' repository' : ' repositories')];
    if (when) parts.push('synced ' + when);
    if (note) parts.push(note);
    metaLine.textContent = parts.join(' · ');
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  /* ---------------- load ---------------- */

  async function load(force) {
    errorBox.hidden = true;
    refreshBtn.disabled = true;

    const cached = readCache(CACHE_KEY);
    const fresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;

    if (cached && (!force || fresh)) {
      repos = cached.repos;
      fetchedAt = cached.ts;
      renderProfile(cached.user, repos);
      render();
      setMeta(fresh ? null : 'refreshing…');
      if (fresh && !force) {
        refreshBtn.disabled = false;
        return;
      }
    } else {
      renderSkeletons(6);
      metaLine.textContent = 'Loading repositories…';
    }

    try {
      const [user, list] = await Promise.all([
        ghFetch('/users/' + GITHUB_USER),
        ghFetch('/users/' + GITHUB_USER + '/repos?per_page=100&sort=updated')
      ]);

      if (!user || !Array.isArray(list)) throw new Error('Unexpected GitHub response');

      // Carry over versions we already know so cards don't flicker back to "…".
      const known = {};
      repos.forEach((r) => { if (r.version) known[r.full_name] = r; });
      list.forEach((r) => {
        const prev = known[r.full_name];
        if (prev && prev.pushed_at === r.pushed_at) r.version = prev.version;
      });

      repos = list;
      fetchedAt = Date.now();

      renderProfile(user, repos);
      render();
      setMeta('resolving versions…');

      const limited = await resolveAllVersions(repos);

      writeCache(CACHE_KEY, { ts: fetchedAt, user: user, repos: repos });
      render();
      setMeta(null);

      if (limited) {
        showError('GitHub’s hourly rate limit was reached, so some version badges may be stale. They’ll fill in later.');
      }
    } catch (err) {
      if (err.rateLimited) {
        const mins = Math.max(1, Math.ceil((err.resetAt - Date.now()) / 60000));
        showError(
          repos.length
            ? 'GitHub rate limit hit — showing the last cached copy. Live data returns in about ' + mins + ' min.'
            : 'GitHub rate limit hit (60 requests/hour for signed-out users). Try again in about ' + mins + ' min.'
        );
      } else {
        showError(
          repos.length
            ? 'Could not reach GitHub — showing the last cached copy.'
            : 'Could not reach GitHub: ' + err.message
        );
      }
      if (!repos.length) grid.textContent = '';
      setMeta(repos.length ? 'offline copy' : null);
    } finally {
      refreshBtn.disabled = false;
    }
  }

  searchInput.addEventListener('input', render);
  sortSelect.addEventListener('change', render);
  refreshBtn.addEventListener('click', () => load(true));

  load(false);
})();
