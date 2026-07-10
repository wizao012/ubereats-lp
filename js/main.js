/* ---------- 設定 ---------- */
var CONFIG = {
  ZAPIER_WEBHOOK_URL: 'https://hooks.zapier.com/hooks/catch/12525485/4usm57o/',
  THANKS_PAGE: 'thanks.html',
  PARAM_KEYS: [
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
    'placement','keyword','matchtype','gclid','fbclid','lpv'
  ]
};

/* ---------- GTM dataLayer 初期化 ---------- */
window.dataLayer = window.dataLayer || [];

/* ---------- URLパラメータをhidden inputへ ---------- */
(function captureUrlParams(){
  try {
    var params = new URLSearchParams(location.search);
    CONFIG.PARAM_KEYS.forEach(function(key){
      var el = document.getElementById('trk-' + key);
      if (el) el.value = params.get(key) || '';
    });
    var lpPathEl = document.getElementById('trk-lp_path');
    if (lpPathEl) lpPathEl.value = location.pathname || '';
    var referrerEl = document.getElementById('trk-referrer');
    if (referrerEl) referrerEl.value = document.referrer || '';
  } catch (e) {}
})();

(function(){
  function fit(){
    var vp=document.querySelector('.lp-viewport'),root=document.querySelector('.lp-root');
    if(!vp||!root)return;
    var avail=vp.clientWidth||window.innerWidth||430;
    var scale=Math.min(1,avail/430);
    root.style.transform='scale('+scale+')';
    vp.style.height=(root.offsetHeight*scale)+'px';
  }
  window.addEventListener('resize',fit);
  window.addEventListener('load',fit);
  document.addEventListener('DOMContentLoaded',fit);
  var n=0,t=setInterval(function(){fit();if(++n>24)clearInterval(t);},250);
})();

/* フォーム送信：Zapier送信 + GTMイベント発火 */
document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('.sec06-form');
  if (!form) return;
  var submitBtn = form.querySelector('.sec06-submit');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var original = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中...'; }
    var formData = new FormData(form);
    formData.append('submitted_at', new Date().toISOString());
    formData.append('source_url', window.location.href);
    try {
      await fetch(CONFIG.ZAPIER_WEBHOOK_URL, { method: 'POST', mode: 'no-cors', body: formData });
      window.dataLayer.push({ event: 'form_submit_cv' });
      window.location.href = CONFIG.THANKS_PAGE;
    } catch (err) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = original || '送信する'; }
      alert('送信に失敗しました。時間をおいて再度お試しください。');
    }
  });
});
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.lp-menu-toggle');
  var nav = document.querySelector('.lp-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.setAttribute('aria-hidden', open ? 'false' : 'true');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');
      });
    });
  }
});

/* 追従CTA：既存CTAが画面内にある時は非表示 */
document.addEventListener('DOMContentLoaded', function () {
  var floating = document.querySelector('.floating-cta');
  if (!floating) return;
  var ctas = Array.from(document.querySelectorAll(
    '.fv-cta-button, .ab-cta-button, .sec03-cta-button, .sec04-cta-button, .sec05-cta-button, .sec06-submit'
  ));
  if (!('IntersectionObserver' in window) || ctas.length === 0) {
    floating.classList.add('is-visible');
    return;
  }
  var visibleMap = new Map();
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      visibleMap.set(entry.target, entry.isIntersecting);
    });
    var anyVisible = Array.from(visibleMap.values()).some(Boolean);
    floating.classList.toggle('is-visible', !anyVisible);
  }, { root: null, threshold: 0.25 });
  ctas.forEach(function (cta) {
    visibleMap.set(cta, false);
    observer.observe(cta);
  });
});

/* scale補正付きアンカースクロール（transform: scale と #anchor の座標ズレ対策） */
document.addEventListener('DOMContentLoaded', function () {
  function currentScale() {
    var root = document.querySelector('.lp-root');
    if (!root) return 1;
    var m = (root.style.transform || '').match(/scale\(([-0-9.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }
  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var scale = currentScale();
    var root = document.querySelector('.lp-root');
    // ルート内要素は縮小前座標なので、ルート基準のoffsetを縮小率で補正
    var y;
    if (root && root.contains(target)) {
      var rootTop = root.getBoundingClientRect().top + window.pageYOffset;
      var innerTop = target.getBoundingClientRect().top + window.pageYOffset - rootTop;
      // getBoundingClientRectは既に縮小後の値なのでそのまま加算
      y = rootTop + innerTop;
    } else {
      y = target.getBoundingClientRect().top + window.pageYOffset;
    }
    var hdr = document.querySelector('.lp-header');
    var off = (hdr ? hdr.offsetHeight : 0) + 8;
    window.scrollTo({ top: Math.max(0, y - off), behavior: 'smooth' });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href.length < 2) return;
    a.addEventListener('click', function (e) {
      var id = href.slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        scrollToId(id);
      }
    });
  });
});

/* 右下FAB：FVを過ぎたら出現、フォーム到達時は隠す */
document.addEventListener('DOMContentLoaded', function () {
  var fab = document.querySelector('.fab');
  if (!fab) return;
  var fv = document.querySelector('.fv');
  var form = document.getElementById('form');
  function update() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var trigger = fv ? fv.getBoundingClientRect().bottom + y - 80 : 400;
    var past = y > trigger;
    var atForm = false;
    if (form) {
      var r = form.getBoundingClientRect();
      atForm = r.top < window.innerHeight * 0.8 && r.bottom > 0;
    }
    fab.classList.toggle('is-visible', past && !atForm);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});

/* 電話CTA：JST平日9:00〜19:00 以外は受付時間外モーダルを表示 */
document.addEventListener('DOMContentLoaded', function () {
  var modal = document.getElementById('hoursModal');
  if (!modal) return;

  function isWithinHours() {
    // 現在時刻をJST(UTC+9)に変換
    var now = new Date();
    var jst = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (9 * 3600000));
    var day = jst.getDay();      // 0=日, 6=土
    var hour = jst.getHours();
    var isWeekday = day >= 1 && day <= 5;
    return isWeekday && hour >= 9 && hour < 19;
  }

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // tel: リンクを時間外だけインターセプト
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    if (a.closest('#hoursModal')) return; // モーダル内の発信リンクは対象外
    a.addEventListener('click', function (e) {
      if (!isWithinHours()) {
        e.preventDefault();
        openModal();
      }
    });
  });

  // 閉じる操作
  modal.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', function () { closeModal(); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
});
