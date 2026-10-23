/**
 * Доступ к панели разработчика.
 *
 * Панель не должна существовать для игроков: вход по пяти нажатиям
 * срабатывает только у этого Telegram-аккаунта. Юзернейм приходит в
 * подписанном initData, подменить его из клиента нельзя. Вне Telegram
 * юзернейма нет — панель там недоступна.
 */
export const DEV_USERNAME = 'Fedora_44';

export const isDevUser = (username: string | null | undefined): boolean =>
  !!username && username.toLowerCase() === DEV_USERNAME.toLowerCase();

/**
 * Одноразовый гарантированный крит для проверки эффекта.
 *
 * Включается кнопкой в панели разработчика и срабатывает на следующем
 * же тапе, после чего снимается сам. Живёт в памяти вкладки: крит
 * нужен только для проверки анимации, в сейв не попадает.
 */
let forceCritOnce = false;

export const armForceCrit = (): void => {
  forceCritOnce = true;
};

export const consumeForceCrit = (): boolean => {
  if (!forceCritOnce) return false;
  forceCritOnce = false;
  return true;
};
