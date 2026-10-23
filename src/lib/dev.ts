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
