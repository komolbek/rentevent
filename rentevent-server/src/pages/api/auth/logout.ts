import { invalidateSession } from '@/lib/auth/session-service'
import { withErrorHandler } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'

export default withErrorHandler({ methods: ['POST'] }, async (req, res) => {
  const t = createTranslator(req)

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    await invalidateSession(token)
  }

  return res.status(200).json({
    success: true,
    message: t('logoutSuccess'),
  })
})
