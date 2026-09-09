// Payment configuration
// Set PAYMENT_MODE=staging to skip balance checks during testing
// Set PAYMENT_MODE=production for real payment processing

export type PaymentMode = 'staging' | 'production'

export function getPaymentMode(): PaymentMode {
  const mode = process.env.PAYMENT_MODE || 'staging'
  return mode === 'production' ? 'production' : 'staging'
}

export function isStaging(): boolean {
  return getPaymentMode() === 'staging'
}

export function isProduction(): boolean {
  return getPaymentMode() === 'production'
}

// Payment gateway configuration
export const paymentConfig = {
  // Payme credentials (Uzbekistan payment gateway)
  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID || '',
    secretKey: process.env.PAYME_SECRET_KEY || '',
    testSecretKey: process.env.PAYME_TEST_SECRET_KEY || '',
    apiUrl: isProduction()
      ? 'https://checkout.paycom.uz/api'
      : 'https://checkout.test.paycom.uz/api',
  },
  // Click credentials (Uzbekistan payment gateway)
  click: {
    merchantId: process.env.CLICK_MERCHANT_ID || '',
    serviceId: process.env.CLICK_SERVICE_ID || '',
    secretKey: process.env.CLICK_SECRET_KEY || '',
    apiUrl: isProduction()
      ? 'https://api.click.uz'
      : 'https://api.click.uz', // Click doesn't have separate test environment
  },
}

// Log payment mode on startup
console.log(`[Payment] Mode: ${getPaymentMode()}`)
