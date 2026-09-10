/** Explicit server-only mode for a real, leased acceptance deployment. */
export function deploymentMode(storeId: string, environment: NodeJS.ProcessEnv): 'merchant' | 'acceptance' {
  const leaseId = environment.HEADLESS_ACCEPTANCE_LEASE_ID;
  if (leaseId !== undefined) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leaseId) || !environment.HEADLESS_PUBLISHABLE_KEY?.startsWith('pk_')) {
      throw new Error('Acceptance deployment requires an allocated lease and its explicit publishable key');
    }
    // The API remains the authority for key/lease scope, expiry and test stamping.
    return 'acceptance';
  }
  if (environment.NODE_ENV === 'production' && storeId === '01f5b02f-d7c0-42cd-b880-59f78ea70aa3') {
    throw new Error('Configure your own store before production deployment');
  }
  return 'merchant';
}
