/**
 * Минимальный анти-Dеvtools гард.
 *
 * Не защищает от настоящих профессионалов (клиент всё равно загружается
 * на устройство пользователя), но мешает «казуальному» заглядыванию в консоль:
 * если открыт DevTools — приложение показывает заглушку и останавливает игру.
 */

let blocked = false;

const showBlock = () => {
  if (blocked) return;
  blocked = true;
  const veil = document.createElement('div');
  veil.setAttribute(
    'style',
    'position:fixed;inset:0;z-index:999999;background:#0f1115;color:#8b94a3;' +
      'display:flex;align-items:center;justify-content:center;font-family:sans-serif;' +
      'font-size:15px;padding:24px;text-align:center;line-height:1.5',
  );
  veil.textContent =
    '🌚 Так нельзя\n\nЗакрой инструменты разработчика, чтобы продолжить игру.';
  document.body.appendChild(veil);
};

const detector = () => {
  // Классический трюк: ширина окна уменьшается на ширину консоли.
  const widthThreshold = window.outerWidth - window.innerWidth > 160;
  const heightThreshold = window.outerHeight - window.innerHeight > 160;
  if (widthThreshold || heightThreshold) showBlock();

  // Firefox: разница по времени нескольких debugger-вызовов резко падает в DevTools.
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  if (performance.now() - start > 100) showBlock();
};

export const mountDevtoolsGuard = () => {
  if (import.meta.env.PROD) {
    detector();
    window.addEventListener('resize', detector);
    const id = window.setInterval(detector, 1500);
    window.addEventListener('pagehide', () => window.clearInterval(id));
  }
};