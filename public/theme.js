(() => {
  const root = document.documentElement;
  const hour = new Date().getHours();
  const auto = hour >= 18 || hour < 6 ? 'dark' : 'light';
  const apply = (t) => {
    root.dataset.theme = t;
    const btn = document.getElementById('theme');
    if (btn) btn.textContent = t === 'dark' ? '☀' : '☾';
  };

  apply(localStorage.getItem('theme') || auto);

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.getElementById('theme').addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      apply(next);
    });
  });
})();
