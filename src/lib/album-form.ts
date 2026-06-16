import { initCoverUpload } from './cover-upload';

export interface TrackData {
  pos: number;
  title: string;
  length: number | null;
  rating: number | null;
  notable?: boolean;
  note: string;
}

export const SUBGENRE_MAP: Record<string, string[]> = {
  'Black Metal':       ['Sketchy', 'Melodic', 'Raw', 'Atmospheric', 'Symphonic', 'Depressive', 'Folk', 'Viking', 'Pagan', 'Ambient', 'Industrial', 'Blackgaze'],
  'Death Metal':       ['Technical', 'Brutal', 'Melodic', 'Death/Doom', 'Progressive', 'Blackened', 'Slam', 'Deathgrind', 'Old School'],
  'Black/Death':       ['Blackened', 'War Metal', 'Bestial', 'Blasphemic'],
  'Doom Metal':        ['Traditional', 'Funeral', 'Atmospheric', 'Sludge', 'Stoner', 'Death/Doom', 'Gothic', 'Epic', 'Drone'],
  'Thrash Metal':      ['Bay Area', 'German', 'Technical', 'Crossover', 'Blackened', 'Speed'],
  'Speed Metal':       ['NWOBHM', 'Thrash-Adjacent', 'Heavy/Speed', 'Power/Speed'],
  'Heavy Metal':       ['NWOBHM', 'Traditional', 'Epic', 'Speed', 'Power'],
  'Power Metal':       ['Symphonic', 'Progressive', 'Folk', 'Epic', 'Speed'],
  'Progressive Metal': ['Djent', 'Technical', 'Atmospheric', 'Jazz-Influenced', 'Math Metal'],
  'Post-Metal':        ['Atmospheric', 'Sludge', 'Post-Rock Influenced'],
  'Folk Metal':        ['Pagan', 'Viking', 'Celtic', 'Medieval'],
  'Gothic Metal':      ['Doom/Gothic', 'Symphonic', 'Romantic'],
  'Grindcore':         ['Goregrind', 'Powerviolence', 'Noisecore', 'Death-Grind'],
  'Industrial Metal':  ['Electronic', 'EBM', 'Noise'],
  'Sludge Metal':      ['Stoner', 'Post-Metal', 'Southern'],
  'Alternative Metal': ['Nu-Metal', 'Groove', 'Post-Grunge'],
  'Metalcore':         ['Melodic', 'Post-Hardcore', 'Mathcore'],
  'Deathcore':         ['Slam', 'Brutal', 'Melodic', 'Technical'],
  'Stoner Rock':       ['Psychedelic', 'Fuzz', 'Desert Rock', 'Southern'],
  'Rock':              ['Classic', 'Hard Rock', 'Garage', 'Psychedelic', 'Art Rock', 'Indie', 'Alternative'],
  'Post-Rock':         ['Instrumental', 'Atmospheric', 'Post-Metal Adjacent', 'Cinematic'],
  'Noise Rock':        ['No Wave', 'Sludge', 'Experimental', 'Post-Punk Adjacent'],
  'Shoegaze':          ['Dream Pop', 'Blackgaze', 'Lo-Fi', 'Neo-Shoegaze'],
  'Post-Punk':         ['Darkwave', 'Cold Wave', 'Goth Rock', 'New Wave', 'Proto-Punk'],
  'Punk':              ['Hardcore', 'Anarcho', 'Crust', 'Oi!', 'Street Punk', 'D-Beat'],
  'Electronic':        ['Ambient', 'Industrial', 'EBM', 'Dark Electro', 'Dungeon Synth', 'Synthwave', 'Noise', 'IDM'],
  'Ambient':           ['Dark Ambient', 'Drone', 'Isolationism', 'Post-Industrial', 'New Age'],
  'Darkwave':          ['Ethereal', 'Coldwave', 'Goth Rock', 'Neoclassical', 'Industrial'],
  'Neofolk':           ['Apocalyptic Folk', 'Dark Folk', 'Folk Noir', 'Military Pop'],
  'Pop':               ['Indie Pop', 'Synth-Pop', 'Art Pop', 'Chamber Pop', 'Dream Pop', 'Electropop', 'Baroque Pop', 'Folk Pop'],
  'Country':           ['Alt-Country', 'Outlaw', 'Bluegrass', 'Americana', 'Classic Country', 'Folk Country', 'Cowpunk'],
  'Hip-Hop / Rap':     ['East Coast', 'West Coast', 'Conscious', 'Trap', 'Boom Bap', 'Southern', 'Alternative', 'Horrorcore'],
  'R&B / Soul':        ['Classic Soul', 'Neo-Soul', 'Funk', 'Gospel', 'Contemporary R&B', 'Motown'],
  'Reggae':            ['Roots', 'Dancehall', 'Ska', 'Dub', 'Rocksteady'],
  'Jazz':              ['Bebop', 'Free Jazz', 'Fusion', 'Hard Bop', 'Modal', 'Post-Bop', 'Cool Jazz', 'Big Band', 'Avant-Garde'],
  'Classical':         ['Baroque', 'Romantic', 'Contemporary', 'Minimalist', 'Chamber', 'Symphony'],
  'Blues':             ['Delta', 'Chicago', 'Electric', 'Country Blues', 'Boogie'],
  'Folk':              ['Singer-Songwriter', 'Freak Folk', 'Indie Folk', 'Celtic', 'Americana'],
  'World Music':       ['African', 'Latin', 'Caribbean', 'Afrobeat', 'Celtic', 'Middle Eastern', 'Asian'],
  'Experimental':      ['Avant-Garde', 'Noise', 'Musique Concrète', 'Free Improvisation', 'Electroacoustic'],
};

export function getKnownSubs(genre: string): string[] {
  const key = Object.keys(SUBGENRE_MAP).find(
    k => k.toLowerCase() === genre.trim().toLowerCase()
  );
  return key ? SUBGENRE_MAP[key] : [];
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const RATING_OPTS = [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100];

function fmtLen(s: number | null): string {
  if (s == null) return '';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function parseLenInput(v: string): number | null {
  const m = v.match(/^(\d+):(\d{1,2})$/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
}
function totalLen(ts: TrackData[]): string {
  const t = ts.reduce((s, t) => s + (t.length ?? 0), 0);
  if (!t) return '';
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

const RATING_SCALE: Record<number, string> = {
  100: 'Masterpiece / Perfect',  90: 'Amazing / Fantastic',
   80: 'Great / Excellent',       70: 'Very Good / Solid',
   60: 'Good / Serviceable',      50: 'Decent / Mixed Opinion',
   40: 'Acceptable / Unremarkable', 30: 'Mediocre / Poor',
   20: 'Bad / Terrible',          10: 'Abysmal / Worthless',
};
function getRatingDesc(v: number) {
  return RATING_SCALE[v === 100 ? 100 : Math.floor(v / 10) * 10] ?? '';
}

// ── Multi-artist widget ──────────────────────────────────────────────────────

function _addArtistRow(list: HTMLElement, value: string): void {
  const row   = document.createElement('div');
  row.className = 'artist-row';
  const input = document.createElement('input');
  input.type  = 'text';
  input.name  = 'artist';
  input.className = 'artist-input';
  input.value = value;
  input.placeholder = 'Artist name';
  const btn   = document.createElement('button');
  btn.type    = 'button';
  btn.className = 'remove-artist-btn';
  btn.setAttribute('aria-label', 'Remove artist');
  btn.textContent = '−';
  btn.addEventListener('click', () => { row.remove(); _syncRemoveBtns(list); });
  row.appendChild(input);
  row.appendChild(btn);
  list.appendChild(row);
}

function _syncRemoveBtns(list: HTMLElement): void {
  const rows = list.querySelectorAll<HTMLElement>('.artist-row');
  rows.forEach(r => {
    const btn = r.querySelector<HTMLElement>('.remove-artist-btn');
    if (btn) btn.style.display = rows.length > 1 ? '' : 'none';
  });
}

function _initArtistList(): void {
  const list   = document.getElementById('artist-list') as HTMLElement | null;
  const addBtn = document.getElementById('add-artist-btn');
  if (!list) return;
  list.querySelectorAll<HTMLButtonElement>('.remove-artist-btn').forEach(btn => {
    btn.addEventListener('click', () => { btn.closest('.artist-row')?.remove(); _syncRemoveBtns(list); });
  });
  addBtn?.addEventListener('click', () => { _addArtistRow(list, ''); _syncRemoveBtns(list); });
  _syncRemoveBtns(list);
}

export function setArtists(names: string[]): void {
  const list = document.getElementById('artist-list') as HTMLElement | null;
  if (!list) return;
  list.innerHTML = '';
  const toAdd = names.filter(Boolean);
  if (!toAdd.length) toAdd.push('');
  toAdd.forEach(name => _addArtistRow(list, name));
  _syncRemoveBtns(list);
}

// ── Descriptor tag widget ────────────────────────────────────────────────────

function _makeDescriptorChip(tag: string): HTMLElement {
  const chip  = document.createElement('span');
  chip.className = 'descriptor-chip';
  chip.dataset.tag = tag.toLowerCase();
  const label = document.createElement('span');
  label.textContent = tag;
  const btn   = document.createElement('button');
  btn.type    = 'button';
  btn.className = 'descriptor-chip-remove';
  btn.textContent = '×';
  btn.addEventListener('click', () => { chip.remove(); _syncDescriptors(); });
  chip.appendChild(label);
  chip.appendChild(btn);
  return chip;
}

function _syncDescriptors(): void {
  const chipsEl    = document.getElementById('descriptor-chips') as HTMLElement | null;
  const hiddenInput = document.getElementById('f-descriptors')   as HTMLInputElement | null;
  if (!chipsEl || !hiddenInput) return;
  const tags = Array.from(chipsEl.querySelectorAll<HTMLElement>('[data-tag]'))
    .map(el => (el.querySelector('span') as HTMLElement)?.textContent || '')
    .filter(Boolean);
  hiddenInput.value = JSON.stringify(tags);
}

export function setDescriptors(tags: string[]): void {
  const chipsEl = document.getElementById('descriptor-chips') as HTMLElement | null;
  if (!chipsEl) return;
  chipsEl.innerHTML = '';
  [...tags].filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach(tag => chipsEl.appendChild(_makeDescriptorChip(tag)));
  _syncDescriptors();
}

// ── Release select ────────────────────────────────────────────────────────────

export function populateReleaseSelect(
  releases: Array<{ id: string; label: string; data?: unknown }>,
  currentMbid = '',
): void {
  const wrap    = document.getElementById('release-select-wrap');
  const sel     = document.getElementById('f-release-select') as HTMLSelectElement | null;
  const relData = document.getElementById('f-release-data')   as HTMLInputElement  | null;
  if (!sel) return;
  sel.innerHTML = '<option value="">No specific release</option>';
  if (!releases.length) { if (wrap) wrap.style.display = 'none'; return; }
  let selectedData = '';
  releases.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.label;
    if (r.data !== undefined) opt.dataset.releaseData = JSON.stringify(r.data);
    if (r.id === currentMbid) {
      opt.selected = true;
      selectedData = r.data !== undefined ? JSON.stringify(r.data) : '';
    }
    sel.appendChild(opt);
  });
  if (relData) relData.value = selectedData;
  if (wrap) wrap.style.display = '';
}

// ─────────────────────────────────────────────────────────────────────────────

export function initAlbumForm() {
  // Guard: return no-ops if the form isn't on this page
  if (!document.getElementById('f-genre')) {
    return {
      renderTracks:         () => {},
      renderSubgenreWidget: () => {},
      setSelectedSubs:      (_: string[]) => {},
      setTracks:            (_: TrackData[]) => {},
    };
  }

  _initArtistList();

  // Wire release-select → hidden inputs
  const relSel   = document.getElementById('f-release-select') as HTMLSelectElement | null;
  const relMbid  = document.getElementById('f-release-mbid')   as HTMLInputElement  | null;
  const relTitle = document.getElementById('f-release-title')  as HTMLInputElement  | null;
  const relData  = document.getElementById('f-release-data')   as HTMLInputElement  | null;
  relSel?.addEventListener('change', () => {
    if (relMbid)  relMbid.value  = relSel.value;
    if (relTitle) relTitle.value = relSel.value
      ? (relSel.options[relSel.selectedIndex]?.textContent ?? '')
      : '';
    if (relData)  relData.value  = relSel.value
      ? (relSel.options[relSel.selectedIndex]?.dataset.releaseData ?? '')
      : '';
  });

  // ── Subgenre widget ──────────────────────────────────────────────────────────
  const genreInput  = document.getElementById('f-genre')       as HTMLInputElement;
  const chipsEl     = document.getElementById('subgenre-chips')!;
  const subHidden   = document.getElementById('f-subgenres')   as HTMLInputElement;

  let selectedSubs: string[] = subHidden.value
    .split(',').map(s => s.trim()).filter(Boolean);

  function renderSubgenreWidget() {
    const known = getKnownSubs(genreInput.value);
    chipsEl.innerHTML = known.map(s => {
      const active = selectedSubs.includes(s);
      return `<button type="button" class="subgenre-chip${active ? ' active' : ''}" data-sub="${esc(s)}">${esc(s)}</button>`;
    }).join('');
    chipsEl.querySelectorAll<HTMLButtonElement>('.subgenre-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.sub!;
        selectedSubs = selectedSubs.includes(s)
          ? selectedSubs.filter(x => x !== s)
          : [...selectedSubs, s];
        renderSubgenreWidget();
      });
    });
    subHidden.value = selectedSubs.join(', ');
  }

  function setSelectedSubs(subs: string[]) {
    selectedSubs = subs;
    renderSubgenreWidget();
  }

  genreInput.addEventListener('change', () => { selectedSubs = []; renderSubgenreWidget(); });
  renderSubgenreWidget();

  // ── Rating slider ────────────────────────────────────────────────────────────
  const ratingSlider   = document.getElementById('rating-slider') as HTMLInputElement;
  const ratingHidden   = document.getElementById('f-rating')      as HTMLInputElement;
  const ratingVal      = document.getElementById('rating-val')    as HTMLSpanElement;
  const ratingDesc     = document.getElementById('rating-desc')   as HTMLSpanElement;
  const clearRatingBtn = document.getElementById('clear-rating')  as HTMLButtonElement;

  if (ratingHidden.value) ratingDesc.textContent = getRatingDesc(parseInt(ratingHidden.value));

  ratingSlider.addEventListener('input', () => {
    const v = parseInt(ratingSlider.value);
    ratingVal.textContent  = String(v);
    ratingDesc.textContent = getRatingDesc(v);
    ratingHidden.value     = String(v);
    clearRatingBtn.classList.add('visible');
  });
  clearRatingBtn.addEventListener('click', () => {
    ratingHidden.value     = '';
    ratingVal.textContent  = '—';
    ratingDesc.textContent = '';
    ratingSlider.value     = '50';
    clearRatingBtn.classList.remove('visible');
  });

  // ── Track table ──────────────────────────────────────────────────────────────
  let tracks: TrackData[] = [];
  const tracksHidden = document.getElementById('f-tracks') as HTMLInputElement;
  try { tracks = JSON.parse(tracksHidden.value || '[]'); } catch {}

  function saveTracks() {
    tracksHidden.value = JSON.stringify(tracks.map((t, i) => ({ ...t, pos: i + 1 })));
  }

  function renderTracks() {
    const tbody = document.getElementById('tracks-tbody') as HTMLTableSectionElement;
    const tfoot = document.getElementById('tracks-tfoot') as HTMLTableSectionElement;
    const table = document.getElementById('tracks-table') as HTMLTableElement;
    if (!tbody) return;
    table.hidden = tracks.length === 0;
    tbody.innerHTML = tracks.map((t, i) => `
      <tr>
        <td class="track-num">${i + 1}</td>
        <td><input class="track-title-input ti" type="text" value="${esc(t.title)}" data-i="${i}" data-f="title"></td>
        <td class="track-len"><input class="track-len-input ti" type="text" value="${fmtLen(t.length)}" placeholder="m:ss" data-i="${i}" data-f="length"></td>
        <td class="track-rating-cell">
          <select class="track-rating-input ti" data-i="${i}" data-f="rating">
            <option value="">—</option>
            ${RATING_OPTS.map(v => `<option value="${v}"${t.rating === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </td>
        <td class="track-notable-cell">
          <input type="checkbox" class="ti" data-i="${i}" data-f="notable"${t.notable ? ' checked' : ''}>
        </td>
        <td><input class="track-note-input ti" type="text" value="${esc(t.note)}" placeholder="Note..." data-i="${i}" data-f="note"></td>
        <td><button type="button" class="track-remove-btn" data-i="${i}">×</button></td>
      </tr>
    `).join('');
    const tot = totalLen(tracks);
    tfoot.innerHTML = tot
      ? `<tr class="tracks-total-row"><td class="track-num"></td><td></td><td class="track-len tracks-total">${tot}</td><td colspan="4"></td></tr>`
      : '';
    tbody.querySelectorAll<HTMLElement>('.ti').forEach(el => {
      el.addEventListener('change', () => {
        const inp = el as HTMLInputElement;
        const i = parseInt(inp.dataset.i!), f = inp.dataset.f!;
        if      (f === 'title')   tracks[i].title   = inp.value;
        else if (f === 'length')  tracks[i].length  = parseLenInput(inp.value);
        else if (f === 'rating')  tracks[i].rating  = inp.value ? parseInt(inp.value) : null;
        else if (f === 'notable') tracks[i].notable = inp.checked;
        else if (f === 'note')    tracks[i].note    = inp.value;
        if (f === 'length') renderTracks();
        else saveTracks();
      });
    });
    tbody.querySelectorAll<HTMLButtonElement>('.track-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => { tracks.splice(parseInt(btn.dataset.i!), 1); renderTracks(); });
    });
    saveTracks();
  }

  document.getElementById('add-track-btn')!.addEventListener('click', () => {
    tracks.push({ pos: tracks.length + 1, title: '', length: null, rating: null, note: '' });
    renderTracks();
  });

  renderTracks();

  // ── Cover upload ─────────────────────────────────────────────────────────────
  initCoverUpload();

  // ── Descriptor input ─────────────────────────────────────────────────────────
  const descInput  = document.getElementById('descriptor-input')   as HTMLInputElement | null;
  const descDrop   = document.getElementById('descriptor-dropdown') as HTMLElement | null;
  const descChips  = document.getElementById('descriptor-chips')   as HTMLElement | null;

  if (descInput && descChips && descDrop) {
    // Wire remove buttons on server-rendered chips (edit mode)
    descChips.querySelectorAll<HTMLElement>('.descriptor-chip').forEach(chip => {
      chip.querySelector('.descriptor-chip-remove')?.addEventListener('click', () => {
        chip.remove(); _syncDescriptors();
      });
    });
    _syncDescriptors();

    let descTimer: ReturnType<typeof setTimeout>;

    const addDescriptorTag = (val: string) => {
      const tag = val.trim();
      if (tag.length < 2) return;
      const existing = Array.from(descChips.querySelectorAll<HTMLElement>('[data-tag]'))
        .map(el => el.dataset.tag ?? '');
      if (existing.includes(tag.toLowerCase())) { descInput.value = ''; return; }
      descChips.appendChild(_makeDescriptorChip(tag));
      // Re-sort chips alphabetically
      const allChips = Array.from(descChips.querySelectorAll<HTMLElement>('.descriptor-chip'));
      allChips.sort((a, b) => (a.dataset.tag ?? '').localeCompare(b.dataset.tag ?? '', undefined, { sensitivity: 'base' }));
      allChips.forEach(c => descChips.appendChild(c));
      _syncDescriptors();
      descInput.value = '';
      descDrop.innerHTML = '';
      descDrop.classList.remove('open');
    };

    descInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addDescriptorTag(descInput.value);
      } else if (e.key === 'Backspace' && !descInput.value) {
        const last = descChips.querySelector<HTMLElement>('.descriptor-chip:last-child');
        if (last) { last.remove(); _syncDescriptors(); }
      }
    });

    descInput.addEventListener('input', () => {
      clearTimeout(descTimer);
      const q = descInput.value.trim();
      if (q.length < 2) { descDrop.innerHTML = ''; descDrop.classList.remove('open'); return; }
      descTimer = setTimeout(async () => {
        try {
          const res     = await fetch(`/api/descriptors?q=${encodeURIComponent(q)}`);
          const results = (await res.json()) as string[];
          if (!results.length) { descDrop.innerHTML = ''; descDrop.classList.remove('open'); return; }
          descDrop.innerHTML = results.map(r => `<div class="descriptor-opt">${esc(r)}</div>`).join('');
          descDrop.classList.add('open');
          descDrop.querySelectorAll<HTMLElement>('.descriptor-opt').forEach(el => {
            el.addEventListener('mousedown', ev => { ev.preventDefault(); addDescriptorTag(el.textContent ?? ''); });
          });
        } catch {}
      }, 250);
    });

    descInput.addEventListener('blur', () => {
      setTimeout(() => { descDrop.innerHTML = ''; descDrop.classList.remove('open'); }, 150);
    });
  }

  return {
    renderTracks,
    renderSubgenreWidget,
    setSelectedSubs,
    setTracks(newTracks: TrackData[]) { tracks = newTracks; renderTracks(); },
  };
}
