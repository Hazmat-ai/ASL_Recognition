let csrf = '';
let sessionRequest:Promise<void>|null=null;
export function initializeSession():Promise<void> {
  if(sessionRequest)return sessionRequest;
  sessionRequest=request<{csrfToken:string}>('/api/session').then(result=>{csrf=result.csrfToken;}).finally(()=>{sessionRequest=null;});
  return sessionRequest;
}
export async function request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials:'same-origin', signal:AbortSignal.timeout(10000), headers: { ...(method !== 'GET' ? { 'X-CSRF-Token':csrf } : {}), ...(data !== undefined ? { 'Content-Type':'application/json' } : {}) }, body:data === undefined ? undefined : JSON.stringify(data) });
  if (!response.ok) throw new Error(`Request failed (${response.status}). Your local practice is still saved.`);
  return response.json() as Promise<T>;
}
