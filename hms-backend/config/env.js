import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_JWT_SECRET = "clinic_secret_key_here";
const DEFAULT_SSO_SECRET = "replace-with-sso-secret";
const DEFAULT_SUPER_ADMIN_PASSWORD = "super123";

const env = {
  nodeEnv:            process.env.NODE_ENV             || "production",
  port:               process.env.PORT                 || 5000,
  // mongoUri:           process.env.MONGO_URI            || "mongodb://admin:password@127.0.0.1:27017/curelex_dbms?authSource=admin",
  // clinicMongoUri: process.env.CLINIC_MONGO_URI,
  jwtSecret:          process.env.JWT_SECRET           || DEFAULT_JWT_SECRET,
  jwtExpiresIn:       process.env.JWT_EXPIRES_IN       || "30d",
  ssoSecret:          process.env.SSO_SECRET           || DEFAULT_SSO_SECRET,
  superAdminEmail:    process.env.SUPER_ADMIN_EMAIL    || "super@clinic.com",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD,
  clientUrl:          process.env.CLIENT_URL           || "https://curelex.in",
};

// Refuse to boot in production on publicly-known placeholder secrets/creds —
// these defaults exist only so local dev works with zero setup.
// NOTE: checks process.env.NODE_ENV directly (not env.nodeEnv, which defaults to
// "production" when unset) so local dev without NODE_ENV set isn't blocked.
if (process.env.NODE_ENV === "production") {
  const insecureDefaults = [
    env.jwtSecret === DEFAULT_JWT_SECRET && "JWT_SECRET",
    env.ssoSecret === DEFAULT_SSO_SECRET && "SSO_SECRET",
    env.superAdminPassword === DEFAULT_SUPER_ADMIN_PASSWORD && "SUPER_ADMIN_PASSWORD",
  ].filter(Boolean);

  if (insecureDefaults.length > 0) {
    throw new Error(
      `Refusing to start in production with placeholder value(s) for: ${insecureDefaults.join(", ")}. ` +
      `Set real values for these environment variables.`
    );
  }
}

export default env;