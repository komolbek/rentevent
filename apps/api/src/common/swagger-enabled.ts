/** Swagger UI is on everywhere except production, where ENABLE_SWAGGER=true switches it back on. */
export function swaggerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' || env.ENABLE_SWAGGER === 'true';
}
