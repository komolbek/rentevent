export const en = {
  // Errors
  methodNotAllowed: 'Method not allowed',
  internalServerError: 'Internal server error',
  unauthorized: 'Authorization required',
  forbidden: 'Access forbidden',
  notFound: 'Not found',
  badRequest: 'Bad request',
  validationError: 'Validation error',
  tooManyRequests: 'Too many requests. Please try again later.',
  invalidCardNumber: 'Invalid card number',

  // Auth
  otpSent: 'Code sent',
  otpInvalid: 'Invalid code',
  otpExpired: 'Code expired',
  phoneRequired: 'Phone number required',
  codeRequired: 'Verification code required',
  loginSuccess: 'Login successful',
  logoutSuccess: 'Logout successful',

  // User
  userNotFound: 'User not found',
  profileUpdated: 'Profile updated',
  addressCreated: 'Address created',
  addressUpdated: 'Address updated',
  addressDeleted: 'Address deleted',
  addressNotFound: 'Address not found',
  addressSetDefault: 'Address set as default',
  maxAddressesReached: 'Maximum addresses reached (5)',

  // Catalog
  categoryNotFound: 'Category not found',
  productNotFound: 'Product not found',
  productUnavailable: 'Product unavailable for selected dates',
  insufficientStock: 'Insufficient stock',

  // Orders
  orderCreated: 'Order created',
  orderNotFound: 'Order not found',
  orderUpdated: 'Order updated',
  orderCancelled: 'Order cancelled',
  emptyCart: 'Cart is empty',
  invalidDates: 'Invalid rental dates',
  addressRequired: 'Delivery address required',
  minRentalDays: 'Minimum rental period is 1 day',

  // Favorites
  addedToFavorites: 'Added to favorites',
  removedFromFavorites: 'Removed from favorites',
  alreadyInFavorites: 'Already in favorites',

  // Cards
  cardAdded: 'Card added',
  cardDeleted: 'Card deleted',
  cardSetDefault: 'Card set as default',
  cardNotFound: 'Card not found',
  cardRequired: 'Please select a payment card',
  maxCardsReached: 'Maximum cards reached (5)',

  // Order statuses
  statusConfirmed: 'Confirmed',
  statusPreparing: 'Preparing',
  statusDelivered: 'Delivered',
  statusReturned: 'Returned',
  statusCancelled: 'Cancelled',

  // Delivery
  deliveryFree: 'Free delivery',
  deliveryOnlyTashkent: 'Delivery is available only within Tashkent',
  deliveryNotAvailable: 'Delivery to the specified city is not available',

  // Rental validation
  startDateInPast: 'Rental start date cannot be in the past',
  rentalTooLong: 'Maximum rental duration exceeded',
  invalidStatusTransition: 'Invalid order status transition',

  // Admin
  adminLoginSuccess: 'Login successful',
  adminInvalidKey: 'Invalid key',
}
