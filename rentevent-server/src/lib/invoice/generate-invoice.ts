/**
 * Simple invoice PDF generator.
 *
 * Builds a PDF buffer for a given order using basic text layout.
 * Uses Node.js built-in capabilities for a lightweight approach
 * without external PDF dependencies.
 */

interface InvoiceItem {
  productName: string
  quantity: number
  dailyPrice: number
  totalPrice: number
}

interface InvoiceData {
  orderNumber: string
  createdAt: Date
  rentalStartDate: Date
  rentalEndDate: Date
  customerName: string
  customerPhone: string
  deliveryType: string
  deliveryAddress?: string | null
  items: InvoiceItem[]
  subtotal: number
  deliveryFee: number
  totalAmount: number
  totalSavings: number
  paymentMethod: string
  paymentStatus: string
  businessName: string
  businessPhone: string
  businessAddress: string
}

/**
 * Generate a simple text-based PDF invoice.
 * Returns a Buffer containing the PDF data.
 */
export function generateInvoicePdf(data: InvoiceData): Buffer {
  const lines: string[] = []

  const formatDate = (d: Date) => {
    return new Date(d).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' UZS'
  }

  // Build the invoice content
  lines.push(data.businessName)
  lines.push(data.businessAddress)
  lines.push(data.businessPhone)
  lines.push('')
  lines.push('=' .repeat(60))
  lines.push('                        INVOICE')
  lines.push('=' .repeat(60))
  lines.push('')
  lines.push(`Order #:        ${data.orderNumber}`)
  lines.push(`Date:           ${formatDate(data.createdAt)}`)
  lines.push(`Rental Period:  ${formatDate(data.rentalStartDate)} - ${formatDate(data.rentalEndDate)}`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('CUSTOMER')
  lines.push('-'.repeat(60))
  lines.push(`Name:           ${data.customerName || 'N/A'}`)
  lines.push(`Phone:          ${data.customerPhone}`)
  lines.push(`Delivery:       ${data.deliveryType}`)
  if (data.deliveryAddress) {
    lines.push(`Address:        ${data.deliveryAddress}`)
  }
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('ITEMS')
  lines.push('-'.repeat(60))
  lines.push(
    padRight('Product', 30) +
    padRight('Qty', 6) +
    padRight('Price/day', 14) +
    padLeft('Total', 10)
  )
  lines.push('-'.repeat(60))

  for (const item of data.items) {
    lines.push(
      padRight(item.productName.substring(0, 29), 30) +
      padRight(String(item.quantity), 6) +
      padRight(formatMoney(item.dailyPrice), 14) +
      padLeft(formatMoney(item.totalPrice), 10)
    )
  }

  lines.push('-'.repeat(60))
  lines.push(padRight('Subtotal:', 50) + padLeft(formatMoney(data.subtotal), 10))
  if (data.deliveryFee > 0) {
    lines.push(padRight('Delivery Fee:', 50) + padLeft(formatMoney(data.deliveryFee), 10))
  }
  if (data.totalSavings > 0) {
    lines.push(padRight('Savings:', 50) + padLeft('-' + formatMoney(data.totalSavings), 10))
  }
  lines.push('='.repeat(60))
  lines.push(padRight('TOTAL:', 50) + padLeft(formatMoney(data.totalAmount), 10))
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Payment Method: ${data.paymentMethod}`)
  lines.push(`Payment Status: ${data.paymentStatus}`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push(`Generated: ${new Date().toISOString()}`)

  const textContent = lines.join('\n')

  // Generate a minimal valid PDF with the text content
  return generateMinimalPdf(textContent)
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}

/**
 * Generate a minimal valid PDF file with text content.
 * This creates a proper PDF 1.4 document without external libraries.
 */
function generateMinimalPdf(text: string): Buffer {
  const textLines = text.split('\n')

  // PDF text stream: position each line
  const streamLines: string[] = []
  streamLines.push('BT')
  streamLines.push('/F1 10 Tf')
  streamLines.push('1 0 0 1 40 780 Tm') // Start position
  streamLines.push('12 TL') // Leading (line height)

  for (const line of textLines) {
    // Escape special PDF characters
    const escaped = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
    streamLines.push(`(${escaped}) '`)
  }

  streamLines.push('ET')

  const stream = streamLines.join('\n')

  // Build PDF objects
  const objects: string[] = []

  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj')

  // Object 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj')

  // Object 3: Page
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] ' +
    '/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj'
  )

  // Object 4: Content stream
  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`
  )

  // Object 5: Font (Courier for monospace alignment)
  objects.push(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj'
  )

  // Build PDF file
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'))
    pdf += obj + '\n'
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf-8')
  pdf += 'xref\n'
  pdf += `0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (const offset of offsets) {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n'
  }

  pdf += 'trailer\n'
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += 'startxref\n'
  pdf += `${xrefOffset}\n`
  pdf += '%%EOF'

  return Buffer.from(pdf, 'utf-8')
}
