export const ru = {
  // Errors
  methodNotAllowed: 'Метод не разрешён',
  internalServerError: 'Внутренняя ошибка сервера',
  unauthorized: 'Необходима авторизация',
  forbidden: 'Доступ запрещён',
  notFound: 'Не найдено',
  badRequest: 'Неверный запрос',
  validationError: 'Ошибка валидации',
  tooManyRequests: 'Слишком много запросов. Попробуйте позже.',
  invalidCardNumber: 'Неверный номер карты',

  // Auth
  otpSent: 'Код отправлен',
  otpInvalid: 'Неверный код',
  otpExpired: 'Код истёк',
  phoneRequired: 'Укажите номер телефона',
  codeRequired: 'Укажите код подтверждения',
  loginSuccess: 'Вход выполнен успешно',
  logoutSuccess: 'Выход выполнен успешно',

  // User
  userNotFound: 'Пользователь не найден',
  profileUpdated: 'Профиль обновлён',
  addressCreated: 'Адрес добавлен',
  addressUpdated: 'Адрес обновлён',
  addressDeleted: 'Адрес удалён',
  addressNotFound: 'Адрес не найден',
  addressSetDefault: 'Адрес установлен как основной',
  maxAddressesReached: 'Достигнуто максимальное количество адресов (5)',

  // Catalog
  categoryNotFound: 'Категория не найдена',
  productNotFound: 'Товар не найден',
  productUnavailable: 'Товар недоступен на выбранные даты',
  insufficientStock: 'Недостаточно товара на складе',

  // Orders
  orderCreated: 'Заказ создан',
  orderNotFound: 'Заказ не найден',
  orderUpdated: 'Заказ обновлён',
  orderCancelled: 'Заказ отменён',
  emptyCart: 'Корзина пуста',
  invalidDates: 'Неверные даты аренды',
  addressRequired: 'Укажите адрес доставки',
  minRentalDays: 'Минимальный срок аренды - 1 день',

  // Favorites
  addedToFavorites: 'Добавлено в избранное',
  removedFromFavorites: 'Удалено из избранного',
  alreadyInFavorites: 'Уже в избранном',

  // Cards
  cardAdded: 'Карта добавлена',
  cardDeleted: 'Карта удалена',
  cardSetDefault: 'Карта установлена по умолчанию',
  cardNotFound: 'Карта не найдена',
  cardRequired: 'Выберите карту для оплаты',
  maxCardsReached: 'Достигнуто максимальное количество карт (5)',

  // Order statuses
  statusConfirmed: 'Подтверждён',
  statusPreparing: 'Подготовка',
  statusDelivered: 'Доставлен',
  statusReturned: 'Возвращён',
  statusCancelled: 'Отменён',

  // Delivery
  deliveryFree: 'Бесплатная доставка',
  deliveryOnlyTashkent: 'Доставка доступна только в пределах Ташкента',
  deliveryNotAvailable: 'Доставка в указанный город недоступна',

  // Rental validation
  startDateInPast: 'Дата начала аренды не может быть в прошлом',
  rentalTooLong: 'Превышен максимальный срок аренды',
  invalidStatusTransition: 'Недопустимый переход статуса заказа',

  // Admin
  adminLoginSuccess: 'Вход выполнен',
  adminInvalidKey: 'Неверный ключ',
}
