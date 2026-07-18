// 首页小说卡片分页
document.addEventListener('DOMContentLoaded', function() {
  // ===== 配置区：改每页显示几本就改这个数字 =====
  var PER_PAGE = 4;
  // ===========================================

  var cards = document.querySelectorAll('.novel-collection-card');
  var grid = document.querySelector('.novel-collection-grid');
  var container = document.querySelector('.novel-collection');

  if (!container || !grid || cards.length <= PER_PAGE) return;

  var totalPages = Math.ceil(cards.length / PER_PAGE);
  var currentPage = 1;

  function showPage(page) {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;

    cards.forEach(function(c, i) {
      c.style.display = (i >= (page - 1) * PER_PAGE && i < page * PER_PAGE) ? '' : 'none';
    });

    var btns = document.querySelectorAll('.pg-btn');
    btns.forEach(function(b) {
      var p = parseInt(b.getAttribute('data-p'));
      if (p === page) {
        b.style.background = '#c44536';
        b.style.color = '#fff';
        b.style.borderColor = '#c44536';
        b.style.transform = 'scale(1.05)';
      } else {
        b.style.background = 'var(--card-bg, #fff)';
        b.style.color = 'var(--font-color, #333)';
        b.style.borderColor = 'var(--card-border, #e5e1db)';
        b.style.transform = 'scale(1)';
      }
    });

    var prevBtn = document.querySelector('.pg-prev');
    var nextBtn = document.querySelector('.pg-next');
    if (prevBtn) {
      prevBtn.style.opacity = page === 1 ? '0.4' : '1';
      prevBtn.style.pointerEvents = page === 1 ? 'none' : 'auto';
    }
    if (nextBtn) {
      nextBtn.style.opacity = page === totalPages ? '0.4' : '1';
      nextBtn.style.pointerEvents = page === totalPages ? 'none' : 'auto';
    }

    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var pagination = document.createElement('div');
  pagination.className = 'pagination-nav';
  pagination.style.cssText = [
    'display: flex',
    'justify-content: center',
    'align-items: center',
    'gap: 8px',
    'margin-top: 30px',
    'padding: 20px 0',
    'flex-wrap: wrap'
  ].join(';');

  var prev = document.createElement('button');
  prev.className = 'pg-prev';
  prev.innerHTML = '‹ 上一页';
  prev.style.cssText = [
    'height: 38px',
    'padding: 0 16px',
    'border: 1px solid var(--card-border, #e5e1db)',
    'background: var(--card-bg, #fff)',
    'color: var(--font-color, #333)',
    'border-radius: 8px',
    'cursor: pointer',
    'font-size: 14px',
    'font-weight: 500',
    'transition: all 0.2s ease',
    'font-family: inherit'
  ].join(';');
  prev.onmouseover = function() {
    if (currentPage !== 1) this.style.background = 'rgba(196, 69, 54, 0.08)';
  };
  prev.onmouseout = function() {
    if (currentPage !== 1) this.style.background = 'var(--card-bg, #fff)';
  };
  prev.onclick = function() { showPage(currentPage - 1); };
  pagination.appendChild(prev);

  for (var i = 1; i <= totalPages; i++) {
    (function(p) {
      var btn = document.createElement('button');
      btn.className = 'pg-btn';
      btn.setAttribute('data-p', p);
      btn.textContent = p;
      btn.style.cssText = [
        'min-width: 38px',
        'height: 38px',
        'padding: 0 12px',
        'border: 1px solid var(--card-border, #e5e1db)',
        'background: var(--card-bg, #fff)',
        'color: var(--font-color, #333)',
        'border-radius: 8px',
        'cursor: pointer',
        'font-size: 14px',
        'font-weight: 500',
        'transition: all 0.2s ease',
        'font-family: inherit'
      ].join(';');
      btn.onmouseover = function() {
        if (p !== currentPage) this.style.background = 'rgba(196, 69, 54, 0.08)';
      };
      btn.onmouseout = function() {
        if (p !== currentPage) this.style.background = 'var(--card-bg, #fff)';
      };
      btn.onclick = function() { showPage(p); };
      pagination.appendChild(btn);
    })(i);
  }

  var next = document.createElement('button');
  next.className = 'pg-next';
  next.innerHTML = '下一页 ›';
  next.style.cssText = [
    'height: 38px',
    'padding: 0 16px',
    'border: 1px solid var(--card-border, #e5e1db)',
    'background: var(--card-bg, #fff)',
    'color: var(--font-color, #333)',
    'border-radius: 8px',
    'cursor: pointer',
    'font-size: 14px',
    'font-weight: 500',
    'transition: all 0.2s ease',
    'font-family: inherit'
  ].join(';');
  next.onmouseover = function() {
    if (currentPage !== totalPages) this.style.background = 'rgba(196, 69, 54, 0.08)';
  };
  next.onmouseout = function() {
    if (currentPage !== totalPages) this.style.background = 'var(--card-bg, #fff)';
  };
  next.onclick = function() { showPage(currentPage + 1); };
  pagination.appendChild(next);

  container.appendChild(pagination);
  showPage(1);
});