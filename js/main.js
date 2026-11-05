'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı — tüm avatar alanlarını (sidebar, mobil tab, ayarlar paneli) doldurur
// ─────────────────────────────────────────────────────────────────────────────
function fillAvatar(imgId, letterId, url, letter) {
  const img = document.getElementById(imgId);
  const ltr = document.getElementById(letterId);
  if (url && img) {
    img.src = url;
    img.classList.remove('hidden');
    if (ltr) ltr.style.display = 'none';
  } else if (ltr) {
    ltr.textContent = letter;
  }
}

function fillAllAvatars(user) {
  const meta        = user.user_metadata || {};
  const displayName = meta.full_name || meta.name || user.email || 'Kullanıcı';
  const avatarUrl   = meta.avatar_url || meta.picture || '';
  const letter      = displayName.charAt(0).toUpperCase();

  fillAvatar('mobile-avatar-img',   'mobile-avatar-letter',   avatarUrl, letter);
  fillAvatar('sidebar-avatar-img',  'sidebar-avatar-letter',  avatarUrl, letter);
  fillAvatar('settings-avatar-img', 'settings-avatar-letter', avatarUrl, letter);

  const nameEl  = document.getElementById('settings-display-name');
  const emailEl = document.getElementById('settings-user-email');
  if (nameEl)  nameEl.textContent  = displayName;
  if (emailEl) emailEl.textContent = user.email || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// BAŞLANGIC
// ─────────────────────────────────────────────────────────────────────────────
async function init() {
  const sb = initSupabase();

  if (sb) {
    try {
      const { data } = await getSession();
      const session  = data?.session;

      if (!session) {
        window.location.href = 'login.html';
        return;
      }

      state.user = { id: session.user.id, email: session.user.email };
      fillAllAvatars(session.user);

    } catch (err) {
      console.error('[main] Oturum hatası:', err);
    }
  }

  loadState();

  // Supabase verisi ile localStorage'ı birleştir
  if (state.user?.id) {
    try { await loadStateFromSupabase(state.user.id); } catch (_) {}
  }

  // Eski "nasa" feed kalıntılarını temizle
  state.feeds    = state.feeds.filter(f => f.id !== 'nasa');
  state.articles = state.articles.filter(a => a.feedId !== 'nasa');

  // İlk çalıştırmada varsayılan kaynakları yükle
  if (state.feeds.length === 0) {
    state.feeds = DEFAULT_FEEDS.map(f => ({ ...f }));
  }

  bindEvents();
  bindSettingsEvents();
  bindTabEvents();
  bindSidebarNavEvents();
  applyAllSettings();
  initTabs();
  renderFeedList();
  renderSmartTags();
  updateProfileCard();

  // Başlangıç görünümünü belirle
  if (state.activeFeedId === 'home') {
    showHomepage();
    if (state.articles.length > 0) renderHomepage();
    else qs('.homepage-empty').hidden = false;
  } else if (state.activeFeedId === 'reels') {
    showReels();
    renderReels();
  } else if (state.articles.length > 0) {
    renderArticles();
  } else {
    qs('.empty-state').hidden = false;
  }

  refreshAll();
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAVİGASYON
// ─────────────────────────────────────────────────────────────────────────────
function bindSidebarNavEvents() {
  qsa('.sidebar [data-feedid]').forEach(el => {
    el.addEventListener('click', () => {
      const fid = el.dataset.feedid;
      state.activeFeedId = fid;

      if (fid === 'home') {
        showHomepage();
        renderHomepage();
      } else if (fid === 'reels') {
        hideHomepage();
        hideReels();
        showReels();
        renderReels();
        qs('.page-title').textContent = 'Reels';
      } else {
        hideHomepage();
        updatePageTitle();
        renderArticles();
      }

      renderFeedList();
    });

    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
