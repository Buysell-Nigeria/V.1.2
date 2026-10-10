const PROD_API_URL='/api/v1'; // Proxied by vercel.json to the existing Render backend.
const LOCAL_API_URL='http://localhost:4000/api/v1';
const DEFAULT_API_URL=typeof window!=='undefined'&&['localhost','127.0.0.1'].includes(window.location.hostname)?LOCAL_API_URL:PROD_API_URL;
const API_URL=(import.meta.env.VITE_API_URL||DEFAULT_API_URL).replace(/\/$/,'');
const ACCESS='bs_access_token',REFRESH='bs_refresh_token';
export const tokenStore={
  getAccess:()=>{try{return localStorage.getItem(ACCESS)}catch{return null}},
  getRefresh:()=>{try{return localStorage.getItem(REFRESH)}catch{return null}},
  set:(access,refresh)=>{try{if(access)localStorage.setItem(ACCESS,access);if(refresh)localStorage.setItem(REFRESH,refresh)}catch{}},
  clear:()=>{try{localStorage.removeItem(ACCESS);localStorage.removeItem(REFRESH)}catch{}},
};
let refreshing=null;
const makeHeaders=(options={})=>({
  ...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),
  ...(options.headers||{}),
});
async function request(path,options={}){
  const headers=makeHeaders(options);
  const token=tokenStore.getAccess();
  if(token)headers.Authorization=`Bearer ${token}`;
  const controller=new AbortController();
  const timeout=Number(options.timeoutMs||22000);
  const timer=setTimeout(()=>controller.abort(),timeout);
  const upstream=options.signal;
  const onAbort=()=>controller.abort();
  if(upstream)upstream.addEventListener('abort',onAbort,{once:true});
  try{
    return await fetch(`${API_URL}${path}`,{...options,headers,signal:controller.signal});
  }catch(err){
    if(err?.name==='AbortError'){
      if(upstream?.aborted)throw err;
      throw new Error('BUYSELL is taking too long to respond. Please retry in a moment.');
    }
    throw new Error('Could not reach the BUYSELL service. Your connection may be fine; the server may be unavailable.');
  }finally{
    clearTimeout(timer);
    if(upstream)upstream.removeEventListener('abort',onAbort);
  }
}
async function refreshSession(){
  const token=tokenStore.getRefresh();
  if(!token) return false;
  const response=await fetch(`${API_URL}/auth/refresh`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({refreshToken:token}),
  });
  if(!response.ok){tokenStore.clear();return false;}
  const data=await response.json();
  tokenStore.set(data.accessToken,data.refreshToken);
  return true;
}
export async function api(path,options={}){
  let res=await request(path,options);
  if(res.status===401&&tokenStore.getRefresh()&&!path.includes('/auth/refresh')){
    if(!refreshing) refreshing=refreshSession().finally(()=>{refreshing=null});
    try{if(await refreshing)res=await request(path,options);}catch{tokenStore.clear();}
  }
  if(res.status===204)return null;
  const data=await res.json().catch(()=>({}));
  if(!res.ok){
    const reason=typeof data?.error==='string'?data.error:typeof data?.message==='string'?data.message:null;
    if(res.status===401)throw new Error(reason||'Your session has expired. Please sign in again.');
    if(res.status===403)throw new Error(reason||'You do not have permission to access this.');
    if(res.status===404)throw new Error(reason||'The requested item could not be found.');
    if(res.status===429)throw new Error(reason||'Too many requests. Please try again shortly.');
    if(res.status>=500)throw new Error(reason||'BUYSELL is experiencing a server issue. Please try again.');
    throw new Error(reason||`Request failed (${res.status}). Please try again.`);
  }
  return data;
}
export const apiUrl=API_URL;
export async function uploadFile(file){
  const form=new FormData();
  form.append('file',file);
  return api('/uploads',{method:'POST',body:form});
}
