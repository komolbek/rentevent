import { database, defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const rentevent = github("komolbek/rentevent", { checkSuites: false, rootDirectory: "/" });

  // Pinned: runs Postgres 17 on Railway's postgres-ssl image. postgres()
  // defaults to postgres:18 - a major version upgrade Postgres will not do
  // in place; it would fail to start on the existing data directory.
  const Postgres = database("Postgres", "postgres", { image: "ghcr.io/railwayapp-templates/postgres-ssl:17", region: "us-west2" });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 5000 });
  const RentEventAdmin = service("RentEvent Admin", {
    source: rentevent,
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile", watchPatterns: ["apps/admin/**", "packages/**", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json", "Dockerfile"] },
    healthcheck: "/admin",
    healthcheckTimeout: 300,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
    replicas: { "us-west2": 1 },
    domains: ["admin.rentevent.uz"],
    networking: { privateNetworkEndpoint: "rentevent-admin" },
    env: { NEXT_PUBLIC_API_URL: preserve(), NODE_ENV: preserve(), SERVICE: preserve() },
  });
  const RentEventAPI = service("RentEvent API", {
    source: rentevent,
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile", watchPatterns: ["apps/api/**", "packages/**", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json", "Dockerfile"] },
    healthcheck: "/api",
    healthcheckTimeout: 300,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
    replicas: { "us-west2": 1 },
    domains: ["api.rentevent.uz"],
    networking: { privateNetworkEndpoint: "rentevent-api" },
    env: { ADMIN_API_KEY: preserve(), ALLOWED_ORIGINS: preserve(), DATABASE_URL: preserve(), ENABLE_TEST_AUTH: preserve(), ESKIZ_API_TOKEN: preserve(), NODE_ENV: preserve(), SERVICE: preserve(), SMS_GATEWAY_URL: preserve(), SMS_PROVIDER: preserve(), UPLOADTHING_TOKEN: preserve() },
  });
  const RentEventWeb = service("RentEvent Web", {
    source: rentevent,
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile", watchPatterns: ["apps/web/**", "packages/**", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json", "Dockerfile"] },
    healthcheck: "/",
    healthcheckTimeout: 300,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
    replicas: { "us-west2": 1 },
    domains: ["rentevent.uz"],
    networking: { privateNetworkEndpoint: "rentevent-web" },
    env: { NEXT_PUBLIC_API_URL: preserve(), NODE_ENV: preserve(), SERVICE: preserve(), SITE_ACCESS_CODE: preserve(), SITE_ACCESS_SECRET: preserve(), SITE_GATE_ENABLED: preserve() },
  });

  return project("RentEvent", {
    resources: [RentEventAdmin, RentEventAPI, Postgres, RentEventWeb, postgresVolume],
  });
});
