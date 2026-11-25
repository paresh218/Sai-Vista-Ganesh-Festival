// This adapter is restricted to disposable test emulators; it cannot address the interactive app or cloud.
export function emulatorAuth(projectId, host = process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  if (projectId !== 'demo-society-cleanup-auth-tests' || host !== '127.0.0.1:9199') throw new Error('Cleanup Auth adapter requires the isolated cleanup test project and loopback port 9199.');
  async function call(operation, body) {
    const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:${operation}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? 'Local Auth cleanup failed');
    return result;
  }
  return {
    async lookupUser(uid) { const result = await call('lookup', { localId: [uid] }); return result.users?.[0] ?? null; },
    async disableUser(uid) { await call('update', { localId: uid, disableUser: true }); },
    async deleteUser(uid) { await call('delete', { localId: uid }); },
  };
}
