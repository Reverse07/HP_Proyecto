import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { MemoryRouter,Routes,Route } from 'react-router-dom';
import { TableMap } from '../components/molecules/TableMap';
import { Store,today,tomorrow } from '../state/store';
import { Reserve,Menu,Checkout } from '../pages/Reservation';
import { App } from '../App';
const draft={fecha:tomorrow(),hora:'12:30',asistentes:2,id_mesa:1,numero_mesa:1,capacidad:2,items:[{id_platillo:1,cantidad:1,nombre:'Lomo',precio:48}],alergias:[],restricciones:[],sin_restricciones:true};
function mount(page:any,path='/'){return render(<MemoryRouter initialEntries={[path]}><Store>{page}</Store></MemoryRouter>);}
beforeEach(()=>{sessionStorage.clear();vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,status:200,json:async()=>url.includes('/auth/me')?{user:{id_cliente:1,nombres:'Ana',rol:'cliente'}}:url.includes('/horarios')?{slots:[]}:url.includes('/mesas')?{mesas:[]}:{platillos:[]}})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('Flujo de reserva',()=>{
  it('FE-CP02 fecha de hoy muestra anticipación mínima',async()=>{mount(<Reserve/>);fireEvent.change(screen.getByLabelText('Fecha de tu visita'),{target:{value:today()}});expect(await screen.findAllByText('La reserva requiere al menos 1 día de anticipación')).not.toHaveLength(0);expect(screen.getByText('Continuar al menú →')).toBeDisabled();});
  it('FE-CP03 mapa distingue ocupada, insuficiente y elegida',()=>{const select=vi.fn();render(<TableMap selected={1} onSelect={select} tables={[{id:1,numero:1,capacidad:2,ubicacion:'Salón',estado:'libre',apta:true},{id:2,numero:2,capacidad:2,ubicacion:'Salón',estado:'ocupada',apta:false},{id:3,numero:3,capacidad:2,ubicacion:'Terraza',estado:'libre',apta:false}]}/>);expect(screen.getByRole('button',{name:/M01/})).toHaveAttribute('aria-pressed','true');expect(screen.getByRole('button',{name:/M02/})).toBeDisabled();expect(screen.getByRole('button',{name:/M03/})).toHaveTextContent('Capacidad insuficiente');});
  it('FE-CP08 pedido vacío bloquea el siguiente paso',async()=>{mount(<Menu/>,'/menu?pedido=1');fireEvent.click(screen.getByText('Continuar al pago →'));expect(await screen.findByRole('alert')).toHaveTextContent('Para reservar debes pedir al menos un plato');});
  it('FE-CP07 conserva pedido tras 409 y vuelve al mapa',async()=>{sessionStorage.setItem('tb-draft',JSON.stringify(draft));vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!url.endsWith('/reservas'),status:url.endsWith('/reservas')?409:200,json:async()=>url.endsWith('/reservas')?{error:{message:'La mesa ya no está disponible'}}:{}})));mount(<Routes><Route path="/resumen" element={<Checkout/>}/><Route path="/reservar" element={<p>Mapa recuperado</p>}/></Routes>,'/resumen');fireEvent.click(screen.getByText('Confirmar reserva →'));await screen.findByText('Mapa recuperado');expect(JSON.parse(sessionStorage.getItem('tb-draft')!).items).toEqual(draft.items);});
  it('FE-CP06 redirige al login y conserva ruta de retorno',async()=>{mount(<App/>,'/resumen');expect(await screen.findByRole('heading',{name:'Qué bueno verte.'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Registrarte'})).toHaveAttribute('href','/registro?volver=%2Fresumen');});
});
