export class ApiError extends Error {
  constructor(public status:number, message:string, public fields:Record<string,string[]>={}) { super(message); }
}
const base = (import.meta as ImportMeta & {env:Record<string,string>}).env.VITE_API_URL || 'http://localhost:4000/api';
export async function api<T=any>(path:string,method='GET',body?:unknown):Promise<T> {
  let response:Response;
  try { response=await fetch(`${base}${path}`,{method,headers:{'Content-Type':'application/json',...(sessionStorage.getItem('tb-token')?{Authorization:`Bearer ${sessionStorage.getItem('tb-token')}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}); }
  catch {throw new ApiError(0,'No pudimos conectar con el servidor. Comprueba que el backend esté encendido.');}
  const data=await response.json();
  if(!response.ok) throw new ApiError(response.status,data.error?.message||'No se pudo completar la operación',data.error?.fields);
  return data;
}
export const money=(value:number|string)=>`S/ ${Number(value).toFixed(2)}`;
