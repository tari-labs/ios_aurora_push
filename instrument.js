// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://416e938853c1a8df8140e7c255f4797c@o4504839079002112.ingest.us.sentry.io/4508813734117376",
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampler: ({ name }) => {
    if (name.includes('health')) {
        return 0;
    }
    return parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1');
  },
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: parseFloat(
      process.env.SENTRY_PROFILES_SAMPLE_RATE || '1'
  ),
  environment: process.env.NODE_ENV || 'dev',
});
