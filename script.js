// script.js

// ヘッダースクロール処理（最適化済み：requestAnimationFrameで描画タイミングに合わせる）
const header = document.querySelector('header');
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      header.classList.toggle('scrolled', window.scrollY > 50);
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

// ハンバーガーメニュー
(function() {
  const hamburger = document.querySelector('.hamburger');
  const headerNav = document.querySelector('.header-nav');
  const navOverlay = document.querySelector('.nav-overlay');
  if (!hamburger) return;

  function closeMenu() {
    hamburger.classList.remove('active');
    headerNav.classList.remove('active');
    navOverlay.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    const isActive = hamburger.classList.toggle('active');
    headerNav.classList.toggle('active');
    navOverlay.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', String(isActive));
    document.body.style.overflow = isActive ? 'hidden' : '';
  });

  navOverlay.addEventListener('click', closeMenu);
  headerNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
})();

// お知らせ一覧フェードイン
document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".news-item");
  items.forEach((item, i) => {
    setTimeout(() => {
      item.classList.add("visible");
    }, i * 150);
  });
});

// メンバーカードクリック処理
document.querySelectorAll('.member-card').forEach(card => {
  card.addEventListener('click', () => {
    card.classList.toggle('active'); // クリックで経歴表示
  });
});

// タブ切り替え機能
document.addEventListener('DOMContentLoaded', function() {
  const tabs = document.querySelectorAll('.match-tab');
  const grids = document.querySelectorAll('.match-grid');

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const category = this.getAttribute('data-category');

      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      grids.forEach(grid => {
        grid.style.display = 'none';
      });

      const targetGrid = document.querySelector(`.match-grid[data-category="${category}"]`);
      if (targetGrid) {
        targetGrid.style.display = 'grid';
      }
    });
  });
});