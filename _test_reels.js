'use strict';

// ── extractYouTubeId test ──────────────────────────────────────────────────
function extractYouTubeId(url) {
  if (!url) return null;
  var m;
  m = url.match(/[?&]v=([\w-]{11})/);                      if (m) return m[1];
  m = url.match(/youtu\.be\/([\w-]{11})/);                 if (m) return m[1];
  m = url.match(/youtube\.com\/embed\/([\w-]{11})/);       if (m) return m[1];
  m = url.match(/youtube\.com\/shorts\/([\w-]{11})/);      if (m) return m[1];
  return null;
}

// ── extractVideo test ──────────────────────────────────────────────────────
var state = {
  feeds: [
    { id: 'yt1', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCupvZG-5ko_eiXAupbDfxWw' }
  ]
};

function extractVideo(article) {
  var content = article.content || article.desc || '';

  // 1) iframe embed
  var iframeMatch = content.match(/<iframe[^>]+src=["']([^"']*(?:youtube\.com\/embed|youtu\.be)[^"']*)["']/i);
  if (iframeMatch) {
    var vid0 = extractYouTubeId(iframeMatch[1]);
    if (vid0) return { type: 'youtube', src: vid0 };
  }

  // 2) YouTube URL in article.url or content
  var ytSources = [article.url || ''];
  var linkMatches = content.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^"'\s<>]*|youtu\.be\/[\w-]+)/gi);
  if (linkMatches) ytSources = ytSources.concat(linkMatches);
  for (var i = 0; i < ytSources.length; i++) {
    var vid1 = extractYouTubeId(ytSources[i]);
    if (vid1) return { type: 'youtube', src: vid1 };
  }

  // 3) video enclosure
  if (article.enclosure && article.enclosure.link) {
    var enc = article.enclosure.link;
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(enc)) {
      return { type: 'video', src: enc };
    }
  }

  // 4) HTML5 video tag
  var videoSrcMatch = content.match(/<(?:video|source)[^>]+src=["']([^"']+\.(?:mp4|webm|ogg))["']/i);
  if (videoSrcMatch) return { type: 'video', src: videoSrcMatch[1] };

  // 5) YouTube RSS feed kanalı
  var feedObj = state.feeds.find(function(f) { return f.id === article.feedId; });
  if (feedObj && feedObj.url && feedObj.url.indexOf('youtube.com/feeds/videos.xml') !== -1) {
    var ytLinkMatch = (article.url || '').match(/[?&]v=([\w-]{11})/);
    if (ytLinkMatch) return { type: 'youtube', src: ytLinkMatch[1] };
    var directMatch = (article.url || '').match(/youtu\.be\/([\w-]{11})/);
    if (directMatch) return { type: 'youtube', src: directMatch[1] };
  }

  return { type: null, src: null };
}

// ── TESTLER ───────────────────────────────────────────────────────────────
var tests = [
  // extractYouTubeId
  { label: 'YT watch URL',       fn: function() { return extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ'; } },
  { label: 'YT short URL',       fn: function() { return extractYouTubeId('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ'; } },
  { label: 'YT embed URL',       fn: function() { return extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ') === 'dQw4w9WgXcQ'; } },
  { label: 'YT shorts URL',      fn: function() { return extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ'; } },
  { label: 'Non-YT URL null',    fn: function() { return extractYouTubeId('https://techcrunch.com') === null; } },
  { label: 'Null input',         fn: function() { return extractYouTubeId(null) === null; } },

  // extractVideo
  { label: 'YT RSS feed article', fn: function() {
    var a = { id:'a1', feedId:'yt1', url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content:'', desc:'' };
    var v = extractVideo(a);
    return v.type === 'youtube' && v.src === 'dQw4w9WgXcQ';
  }},
  { label: 'iframe embed',       fn: function() {
    var a = { id:'a2', feedId:'f2', url:'https://techcrunch.com/x', content:'<iframe src="https://www.youtube.com/embed/abc123defgh"></iframe>', desc:'' };
    var v = extractVideo(a);
    return v.type === 'youtube' && v.src === 'abc123defgh';
  }},
  { label: 'YT URL in content',  fn: function() {
    var a = { id:'a3', feedId:'f3', url:'https://news.com/x', content:'Watch: https://youtu.be/xyz789abcde more text', desc:'' };
    var v = extractVideo(a);
    return v.type === 'youtube' && v.src === 'xyz789abcde';
  }},
  { label: 'Video enclosure',    fn: function() {
    var a = { id:'a4', feedId:'f4', url:'#', content:'', desc:'', enclosure:{ link:'https://cdn.example.com/video.mp4' } };
    var v = extractVideo(a);
    return v.type === 'video' && v.src.endsWith('.mp4');
  }},
  { label: 'HTML5 video tag',    fn: function() {
    var a = { id:'a5', feedId:'f5', url:'#', content:'<video src="https://cdn.example.com/clip.mp4"></video>', desc:'' };
    var v = extractVideo(a);
    return v.type === 'video';
  }},
  { label: 'No video = null',    fn: function() {
    var a = { id:'a6', feedId:'f6', url:'https://bbc.com/news/x', content:'Just a news article', desc:'' };
    var v = extractVideo(a);
    return v.type === null;
  }},
  { label: 'Direct YT article URL', fn: function() {
    // Gerçek YT video ID tam 11 karakter olmalı
    var a = { id:'a7', feedId:'f7', url:'https://www.youtube.com/watch?v=TestVideo12', content:'', desc:'' };
    var v = extractVideo(a);
    return v.type === 'youtube' && v.src === 'TestVideo12';
  }},
];

var pass = 0;
var fail = 0;
tests.forEach(function(t) {
  var ok = false;
  try { ok = t.fn(); } catch(e) { ok = false; console.log('  ERROR in "' + t.label + '":', e.message); }
  if (ok) {
    console.log('  \u2713 PASS: ' + t.label);
    pass++;
  } else {
    console.log('  \u2717 FAIL: ' + t.label);
    fail++;
  }
});

console.log('\n' + pass + '/' + (pass + fail) + ' test passed' + (fail > 0 ? ' \u2014 ' + fail + ' FAILED' : ' \u2014 all OK'));
process.exit(fail > 0 ? 1 : 0);
