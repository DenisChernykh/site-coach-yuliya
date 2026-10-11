const board = document.getElementById('board');
const slug = document.body.dataset.page;
const mobile = window.matchMedia('(max-width: 760px)');
const drawer = document.getElementById('menu');

function showMenu() {
  drawer.showModal();
}

async function start() {
  const response = await fetch('navigation.json');
  const pages = await response.json();
  function render() {
    const mode = mobile.matches ? 'mobile' : 'desktop';
    const page = pages.find(item => item.slug === slug && item.mode === mode);
    board.replaceChildren();
    board.style.maxWidth = `${page.width}px`;
    board.setAttribute('aria-label', page.title);
    const img = document.createElement('img');
    img.src = `../exports/${page.image}-${mode}.png`;
    img.alt = `${page.title} — ${mode === 'mobile' ? 'мобильная версия' : 'десктопная версия'} макета`;
    img.width = page.width;
    img.height = page.height;
    img.addEventListener('load', () => {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    });
    board.append(img);
    for (const item of page.anchors) {
      const anchor = document.createElement('span');
      anchor.id = item.id;
      anchor.className = 'anchor';
      anchor.style.top = `${item.y / page.height * 100}%`;
      board.append(anchor);
    }
    for (const item of page.links) {
      const target = document.createElement(item.action ? 'button' : 'a');
      target.className = 'hotspot';
      target.setAttribute('aria-label', item.label);
      target.title = item.label;
      target.style.left = `${item.x / page.width * 100}%`;
      target.style.top = `${item.y / page.height * 100}%`;
      target.style.width = `${item.width / page.width * 100}%`;
      target.style.height = `${item.height / page.height * 100}%`;
      if (item.href) target.href = item.href;
      if (item.action === 'menu') target.addEventListener('click', showMenu);
      board.append(target);
    }
  }
  render();
  mobile.addEventListener('change', render);
}

document.getElementById('close-menu').addEventListener('click', () => drawer.close());
drawer.addEventListener('click', event => {
  if (event.target === drawer) drawer.close();
});
start();
