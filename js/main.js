'use strict';

// ── BASLAMA ────────────────────────────────────────────────────────────────
async function init() {
  // Supabase başlat
  var supabaseClient = initSupabase();

  // Supabase yapılandırılmışsa oturum kontrolü yap
  if (supabaseClient) {
    try {
      var sessionResult = await getSession();
      var session = sessionResult.data && sessionResult.data.session;
      if (!session) {
        // Oturum yok — login sayfasına yönlendir
        window.location.href = 'login.html';
        return;
      }
      // Kullanıcı bilgisini state'e kaydet
      state.user = {
        id:    session.user.id,
        email: session.user.email,
      };
    } catch (err) {
      console.error('[main] Oturum kontrolü hatası:', err);
      // Hata durumunda localStorage ile devam et (graceful degradation)
    }
  }

  loadState();

  // Supabase'den veriyi merge et (oturum açıksa)
  if (state.user && state.user.id) {
    try {
      await loadStateFromSupabase(state.user.id);
    } catch (_) {}
  }

  // Eski kaldırılmış feed'leri temizle
  state.feeds    = state.feeds.filter(function(f) { return f.id !== 'nasa'; });
  state.articles = state.articles.filter(function(a) { return a.feedId !== 'nasa'; });

  // İlk çalıştırmada varsayılan kaynakları yükle
  if (state.feeds.length === 0) {
    state.feeds = DEFAULT_FEEDS.map(function(f) { return Object.assign({}, f); });
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

  // Sidebar footer'a kullanıcı email'ini göster
  if (state.user && state.user.email) {
    var footer = document.querySelector('.sidebar footer');
    if (footer) {
      var emailEl = document.createElement('div');
      emailEl.className = 'px-2 py-1 text-[11px] text-[#444] truncate';
      emailEl.title = state.user.email;
      emailEl.textContent = state.user.email;
      footer.insertBefore(emailEl, footer.firstChild);
    }
    // Çıkış yap butonu ekle
    var settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
      var signOutBtn = document.createElement('button');
      signOutBtn.className = 'w-full flex items-center gap-2 text-left text-[12px] text-[#666] hover:text-[#e84444] py-1.5 px-2 rounded bg-transparent border-0 cursor-pointer hover:bg-[#111] mt-1';
      signOutBtn.textContent = 'Çıkış Yap';
      signOutBtn.addEventListener('click', async function() {
        await signOut();
        window.location.href = 'login.html';
      });
      settingsBtn.parentNode.insertBefore(signOutBtn, settingsBtn.nextSibling);
    }
  }

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

// ── SIDEBAR NAVIGASYON LINKLERİ ────────────────────────────────────────────
function bindSidebarNavEvents() {
  qsa('.sidebar [data-feedid]').forEach(function(el) {
    el.addEventListener('click', function() {
      var fid = el.dataset.feedid;
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
      closeSidebar();
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  var sidebarProfileBtn = qs('.sidebar-profile-btn');
  if (sidebarProfileBtn) {
    sidebarProfileBtn.addEventListener('click', openSettings);
  }
}

document.addEventListener('DOMContentLoaded', init);
