/**
 * env.example.js — Ortam değişkenleri şablonu  (GIT'TE KALIR)
 *
 * Kurulum:
 *   Windows : copy env.example.js env.js
 *   Mac/Linux: cp env.example.js env.js
 *
 * Sonra env.js içindeki boş stringleri kendi değerlerinizle doldurun.
 * env.js asla commit edilmez (.gitignore'da tanımlı).
 *
 * ─── Supabase ─────────────────────────────────────────────────────────
 *   https://supabase.com/dashboard → [Projeniz] → Project Settings → API
 *   "Project URL"  →  ENV_SUPABASE_URL
 *   "anon public"  →  ENV_SUPABASE_ANON_KEY
 *
 * ─── Cloudflare Worker ────────────────────────────────────────────────
 *   cloudflare-worker/rss-proxy.js dosyasını Cloudflare'e deploy edin.
 *   Aldığınız worker URL'sini  →  ENV_CF_WORKER_URL
 *   Örnek: https://rss-proxy.yourname.workers.dev
 */

window.ENV_SUPABASE_URL      = '';
window.ENV_SUPABASE_ANON_KEY = '';
window.ENV_CF_WORKER_URL     = '';
