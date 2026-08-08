const PROD_API_URL='https://buysell-api-v1-2.onrender.com/api/v1';
const LOCAL_API_URL='http://localhost:4000/api/v1';
const DEFAULT_API_URL=typeof window!=='undefined'&&['localhost','127.0.0.1'].includes(window.location.hostname)?LOCAL_API_URL:PROD_API_URL;
const API_URL=(import.meta.env.VITE_API_URL||DEFAULT_API_URL).replace(/\/$/,'');
const ACCESS='bs_access_token',REFRESH='bs_refresh_token';
export const tokenStore={getAccess:()=>localStorage.getItem(ACCESS),getRefresh:()=>localStorage.getItem(REFRESH),set:(a,r)=>{if(a)localStorage.setItem(ACCESS,a);if(r)localStorage.setItem(REFRESH,r)},clear:()=>{localStorage.removeItem(ACCESS);localStorage.removeItem(REFRESH)}};
async function doFetch(path,options={}){const headers={...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(options.headers||{})};const token=tokenStore.getAccess();if(token)headers.Authorization=`Bearer ${token}`;return fetch(`${API_URL}${path}`,{...options,headers});}
export async function api(path,options={}){let res=await doFetch(path,options);if(res.status===401&&tokenStore.getRefresh()&&!path.includes('/auth/refresh')){const rr=await fetch(`${API_URL}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:tokenStore.getRefresh()})});if(rr.ok){const data=await rr.json();tokenStore.set(data.accessToken,data.refreshToken);res=await doFetch(path,options);}else tokenStore.clear();}if(res.status===204)return null;const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`Request failed (${res.status})`);return data;}
export const apiUrl=API_URL;export async function uploadFile(file){const form=new FormData();form.append('file',file);return api('/uploads',{method:'POST',body:form});}
