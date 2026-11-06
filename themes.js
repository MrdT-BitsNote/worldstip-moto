/* 实时风格切换：head 内同步执行避免 FOUC，DOMContentLoaded 注入切换器。
   主题存 localStorage(motogo-theme)，切换时派发 motogo-theme 事件供页面联动。 */
(function () {
  var KEY = 'motogo-theme';
  var THEMES = [
    { id: 'vintage', label: '复古' },
    { id: 'apple', label: '苹果' }
  ];
  var ALLOWED = { vintage: 1, apple: 1 };
  function apply(id) {
    // 老访客可能存着已下线的风格（win95/punk/guofeng），一律回落复古
    if (!ALLOWED[id]) id = 'vintage';
    if (id !== 'vintage') document.documentElement.setAttribute('data-theme', id);
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, id); } catch (e) {}
    return id;
  }
  // 启动：立即应用已存主题（脚本在 <head>，先于首次绘制）
  var saved = 'vintage';
  try { saved = localStorage.getItem(KEY) || 'vintage'; } catch (e) {}
  apply(saved);

  function mount() {
    if (document.querySelector('.thsw')) return;
    var bar = document.createElement('div');
    bar.className = 'thsw';
    bar.setAttribute('role', 'radiogroup');
    bar.setAttribute('aria-label', '网站风格切换');
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.label;
      b.dataset.themeId = t.id;
      b.setAttribute('role', 'radio');
      b.addEventListener('click', function () {
        apply(t.id);
        sync();
        document.dispatchEvent(new CustomEvent('motogo-theme', { detail: { theme: t.id } }));
      });
      bar.appendChild(b);
    });
    function sync() {
      var cur = 'vintage';
      try { cur = ALLOWED[localStorage.getItem(KEY)] ? localStorage.getItem(KEY) : 'vintage'; } catch (e) {}
      bar.querySelectorAll('button').forEach(function (b) {
        var on = b.dataset.themeId === cur;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    document.body.appendChild(bar);
    sync();
    // 多标签页同步
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) { apply(e.newValue); sync(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
