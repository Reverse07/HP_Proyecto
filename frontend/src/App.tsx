import { NavLink,Link,Routes,Route,Navigate,useLocation,useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useStore } from './state/store';
import { Home,Auth } from './pages/Public';
import { Reserve,Menu,Checkout,Confirmation,MyReservations } from './pages/Reservation';
import { Panel } from './pages/Panel';
function Protected({children,staff=false}:{children:ReactNode;staff?:boolean}) {
  const {user,ready}=useStore();const location=useLocation();
  if(!ready) return <p>Cargando tu sesión…</p>;
  if(!user) return <Navigate to={`/login?volver=${encodeURIComponent(location.pathname+location.search)}`} replace/>;
  if(staff&&user.rol==='cliente') return <Navigate to="/" replace/>;
  return <>{children}</>;
}
export function App() {
  const {user,logout}=useStore();const navigate=useNavigate();
  return <><a className="skip" href="#contenido">Ir al contenido</a><header><Link className="brand" to="/">Terra <em>&</em> Brasa<span>COCINA AL FUEGO · LIMA</span></Link><nav aria-label="Navegación principal"><NavLink to="/">Inicio</NavLink><NavLink to="/reservar">Reservar</NavLink><NavLink to="/menu">Menú</NavLink>{user&&<NavLink to="/mis-reservas">Mis reservas</NavLink>}{user&&user.rol!=='cliente'&&<NavLink to="/panel">Panel</NavLink>}</nav><div className="session">{user?<><span>{user.nombres}</span><button className="link-button" onClick={()=>{logout();navigate('/');}}>Salir</button></>:<><Link to="/login">Iniciar sesión</Link><Link className="button small" to="/registro">Registrarse</Link></>}</div></header><main id="contenido"><Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<Auth/>}/><Route path="/registro" element={<Auth register/>}/><Route path="/reservar" element={<Reserve/>}/><Route path="/menu" element={<Menu/>}/><Route path="/resumen" element={<Protected><Checkout/></Protected>}/><Route path="/reserva/:codigo" element={<Protected><Confirmation/></Protected>}/><Route path="/mis-reservas" element={<Protected><MyReservations/></Protected>}/><Route path="/panel" element={<Protected staff><Panel/></Protected>}/><Route path="*" element={<section><h1>Esta página no existe</h1><Link to="/">Volver al inicio</Link></section>}/></Routes></main><footer><span className="brand">Terra <em>&</em> Brasa</span><span>Av. Principal 123, Lima · 999 888 777</span><span>Hecho para compartir alrededor del fuego.</span></footer></>;
}
