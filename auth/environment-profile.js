// One entry per role. global-setup logs in once per profile and saves its storage state.
// credentialsEnvPrefix 'X_USER' reads X_USER_USERNAME and X_USER_PASSWORD.
export const PROFILES = {
  'default': {
    name: 'default',
    baseUrl: process.env.BASE_URL,
    credentialsEnvPrefix: 'TEST_USER',
    storageStatePath: 'auth/default.storageState.json',
  },
  'guest': {
    name: 'guest',
    baseUrl: process.env.BASE_URL,
    credentialsEnvPrefix: 'GUEST_USER',
    storageStatePath: 'auth/guest.storageState.json',
  },
};

/** Use another role in a spec: test.use(useEnvironment('<name>')) */
export function useEnvironment(profileName) {
  const profile = PROFILES[profileName];
  if (!profile) throw new Error(`Unknown environment profile: "${profileName}". Add it to PROFILES in auth/environment-profile.js`);
  return { baseURL: profile.baseUrl, storageState: profile.storageStatePath };
}
