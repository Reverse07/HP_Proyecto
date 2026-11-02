import { createContext,useContext,useState,useEffect,type ReactNode } from 'react';
import { api } from '../api/client';
export type User={id_cliente:number;nombres:string;correo:string;rol:'cliente'|'administrador'|'personal'};
export type Item={id_platillo:number;cantidad:number;termino_coccion?:string;nombre:string;precio:number};
export type Preference={nombre:string;descripcion?:string};
export type Draft={fecha:string;hora:string;asistentes:number;id_mesa:number;numero_mesa:number;capacidad:number;items:Item[];alergias:Preference[];restricciones:Preference[];sin_restricciones:boolean};
export function today() {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function tomorrow() {const d=new Date(`${today()}T12:00:00-05:00`); d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
export const emptyDraft=():Draft=>({fecha:tomorrow(),hora:'',asistentes:2,id_mesa:0,numero_mesa:0,capacidad:0,items:[],alergias:[],restricciones:[],sin_restricciones:true});
function storedDraft():Draft { try { return {...emptyDraft(),...JSON.parse(sessionStorage.getItem('tb-draft')||'{}')}; } catch {return emptyDraft();} }
const Context=createContext<any>(null);
export function Store({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[draft,setDraft]=useState<Draft>(storedDraft);
  useEffect(()=>{sessionStorage.setItem('tb-draft',JSON.stringify(draft));},[draft]);
  useEffect(()=>{ if(!sessionStorage.getItem('tb-token')) {setReady(true);return;} api('/auth/me').then(d=>setUser(d.user)).catch(()=>sessionStorage.removeItem('tb-token')).finally(()=>setReady(true)); },[]);
  function login(data:{user:User;token:string}) {sessionStorage.setItem('tb-token',data.token);setUser(data.user);}
  function logout(){sessionStorage.removeItem('tb-token');setUser(null);}
  function update(patch:Partial<Draft>) {setDraft(d=>({...d,...patch}));}
  return <Context.Provider value={{user,ready,draft,update,login,logout,reset:()=>setDraft(emptyDraft())}}>{children}</Context.Provider>;
}
export const useStore=()=>useContext(Context) as {user:User|null;ready:boolean;draft:Draft;update:(p:Partial<Draft>)=>void;login:(d:{user:User;token:string})=>void;logout:()=>void;reset:()=>void};
