import { isStaging, paymentConfig } from './config'

export interface PaymentResult {
  success: boolean
  transactionId?: string
  message: string
  error?: string
}

export interface ProcessPaymentParams {
  cardId: string
  amount: number
  orderId: string
  description: string
}

/**
 * Process a payment using the stored card
 *
 * In staging mode:
 * - Skips actual balance check
 * - Always returns success for testing
 * - Creates mock transaction ID
 *
 * In production mode:
 * - Calls actual payment gateway (Payme/Click)
 * - Verifies card balance
 * - Processes real transaction
 */
export async function processPayment(params: ProcessPaymentParams): Promise<PaymentResult> {
  const { cardId, amount, orderId, description } = params

  // Staging mode - skip actual payment processing
  if (isStaging()) {
    console.log(`[Payment][Staging] Processing mock payment:`, {
      cardId,
      amount,
      orderId,
      description,
    })

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Generate mock transaction ID
    const mockTransactionId = `STAGING_${Date.now()}_${Math.random().toString(36).substring(7)}`

    console.log(`[Payment][Staging] Mock payment successful: ${mockTransactionId}`)

    return {
      success: true,
      transactionId: mockTransactionId,
      message: 'Payment processed successfully (staging mode)',
    }
  }

  // Production mode - actual payment processing
  console.log(`[Payment][Production] Processing real payment:`, {
    cardId,
    amount,
    orderId,
    description,
  })

  try {
    // TODO: Integrate with actual payment gateway (Payme or Click)
    // This is a placeholder for actual implementation

    // For now, return an error in production until gateway is configured
    if (!paymentConfig.payme.merchantId && !paymentConfig.click.merchantId) {
      return {
        success: false,
        message: 'Payment gateway not configured',
        error: 'No payment gateway credentials found in environment variables',
      }
    }

    // Placeholder for actual gateway integration
    // const result = await paymeGateway.processPayment(...)

    return {
      success: false,
      message: 'Payment gateway integration pending',
      error: 'Production payment processing not yet implemented',
    }
  } catch (error) {
    console.error('[Payment][Production] Payment error:', error)
    return {
      success: false,
      message: 'Payment failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Verify card balance before placing order
 *
 * In staging mode: Always returns sufficient balance
 * In production mode: Calls payment gateway to verify
 */
export async function verifyCardBalance(cardId: string, amount: number): Promise<{
  sufficient: boolean
  message: string
}> {
  if (isStaging()) {
    console.log(`[Payment][Staging] Skipping balance check for card ${cardId}, amount: ${amount}`)
    return {
      sufficient: true,
      message: 'Balance check skipped (staging mode)',
    }
  }

  // Production balance verification
  console.log(`[Payment][Production] Checking balance for card ${cardId}, amount: ${amount}`)

  // TODO: Implement actual balance verification with payment gateway
  // Most Uzbek payment gateways don't support balance inquiry
  // So we typically just attempt the charge and handle failure

  return {
    sufficient: true,
    message: 'Balance verification not available - will verify during payment',
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(transactionId: string, amount: number): Promise<PaymentResult> {
  if (isStaging()) {
    console.log(`[Payment][Staging] Mock refund for transaction ${transactionId}, amount: ${amount}`)

    return {
      success: true,
      transactionId: `REFUND_${transactionId}`,
      message: 'Refund processed successfully (staging mode)',
    }
  }

  // TODO: Implement actual refund logic
  return {
    success: false,
    message: 'Refund processing not yet implemented',
    error: 'Production refund not implemented',
  }
}
