// 首页作品卡片分页
(function() {
  var cards = document.querySelectorAll('.novel-collection-card, .world-card');
  if (cards.length <= 6) return;

  var perPage = 6;
  var totalPages = Math.ceil(cards.length / perPage);
  var currentPage = 1;

  function showPage(page) {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;

    cards.forEach(function(c, i) {
      c.style.display = (i >= (page - 1) * perPage && i < page * perPage) ? '' : 'none';
    });

    document.querySelectorAll('.pg-btn').forEach(function(b) {
      var p = parseInt(b.getAttribute('data-p'));
      b.classList.toggle('pg-active', p === page);
    });

    var pr = document.querySelector('.pg-prev');
    var nx = document.querySelector('.pg-next');
    if (pr) {
      pr.style.opacity = page === 1 ? '0.3' : '1';
      pr.style.pointerEvents = page === 1 ? 'none' : '';
    }
    if (nx) {
      nx.style.opacity = page === totalPages ? '0.3' : '1';
      nx.style.pointerEvents = page === totalPages ? 'none' : '';
    }
  }

  var container = document.querySelector('.novel-collection') || document.querySelector('.world-collection');
  if (!container) return;

  var div = document.createElement('div');
  div.className = 'pagination-nav';

  // 上一页
  var prev = document.createElement('button');
  prev.className = 'pg-prev pg-arrow';
  prev.innerHTML = '&lt;';
  prev.onclick = function() { showPage(currentPage - 1); };
  div.appendChild(prev);

  // 页码
  for (var i = 1; i <= totalPages; i++) {
    (function(p) {
      var b = document.createElement('button');
      b.className = 'pg-btn';
      b.setAttribute('data-p', p);
      b.textContent = p;
      b.onclick = function() { showPage(p); };
      div.appendChild(b);
    })(i);
  }

  // 下一页
  var next = document.createElement('button');
  next.className = 'pg-next pg-arrow';
  next.innerHTML = '&gt;';
  next.onclick = function() { showPage(currentPage + 1); };
  div.appendChild(next);

  container.appendChild(div);
  showPage(1);
})();
