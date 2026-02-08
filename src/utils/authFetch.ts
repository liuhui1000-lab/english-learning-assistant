/**
 * 带认证的 fetch 包装器
 * 自动从 localStorage 获取 token 并添加到 Authorization 头
 */

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  
  // 如果有 token，添加 Authorization 头
  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
