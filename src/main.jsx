
import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {db} from "./firebase";
import {collection,onSnapshot,setDoc,doc,deleteDoc,getDocs,writeBatch} from "firebase/firestore";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {jsPDF} from "jspdf";
import {Home,WalletCards,AlertTriangle,CheckCircle,ArrowLeft,Plus,LogOut,Users,Package,ShoppingCart,FileText,BarChart3,Download,Settings,Info,Search,Edit3,Trash2,LockKeyhole,MapPin,Eye,Upload,RefreshCw,UserPlus,ReceiptText,CalendarDays} from "lucide-react";
import "./styles.css";

const CATS=["TV","Refrigerator","Freezer","Washing Machine","Air Conditioner","Mobile","Furniture","Electronics","Kitchen Appliances","Other"];
const TERMS=[
"I agree that installment payment is mandatory and I will pay every installment on or before the due date.",
"I agree that if I fail to pay any installment on time, the shop owner may initiate legal action and police complaint against me.",
"I agree that late installment payment will attract a fine / penalty as decided by the shop owner.",
"I agree that the guarantor (surety) is jointly responsible for all outstanding dues if I default.",
"I confirm that I am taking the product named in this agreement on installment basis and I fully accept all terms and conditions stated herein."
];
const defaults={
 users:[
  {id:"admin-1",username:"admin",password:"admin123",fullName:"Shop Admin",role:"ADMIN",phone:"0300-0000000",isActive:true},
  {id:"rm-1",username:"ali",password:"ali123",fullName:"Ali Khan",role:"RECOVERY_MAN",phone:"0301-1111111",isActive:true},
  {id:"rm-2",username:"ahmed",password:"ahmed123",fullName:"Ahmed Raza",role:"RECOVERY_MAN",phone:"0302-2222222",isActive:true}
 ],
 products:[
  {id:"p1",code:"TV-32",name:"LED TV 32 inch",price:45000,color:"Black",category:"TV",stockPurchased:10,stockSold:0},
  {id:"p2",code:"AC-1.5",name:"Air Conditioner 1.5 Ton",price:95000,color:"White",category:"Air Conditioner",stockPurchased:8,stockSold:0},
  {id:"p3",code:"FR-12",name:"Refrigerator 12 cu ft",price:72000,color:"Silver",category:"Refrigerator",stockPurchased:6,stockSold:0},
  {id:"p4",code:"WM-8",name:"Washing Machine 8kg",price:38000,color:"Grey",category:"Washing Machine",stockPurchased:12,stockSold:0}
 ],
 purchases:[],invoices:[],agreements:[]
};
const today=()=>new Date().toISOString().slice(0,10);
const nowTime=()=>new Date().toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"});
const uid=()=>crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const money=n=>"Rs "+Number(n||0).toLocaleString("en-PK",{maximumFractionDigits:0});
const normCnic=s=>(s||"").replace(/\D/g,"");
const fmtCnic=s=>{let d=normCnic(s);return d.length===13?`${d.slice(0,5)}-${d.slice(5,12)}-${d.slice(12)}`:(s||"").trim()};
const addMonths=(dateStr,n)=>{let d=new Date(dateStr+"T00:00:00");d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,10)};
const daysBetween=(a,b)=>Math.floor((new Date(a+"T00:00:00")-new Date(b+"T00:00:00"))/86400000);
const statusOf=inv=>{
 if(inv.status==="COMPLETED"||pending(inv)<=.01||((inv.payments||[]).length>=Number(inv.totalInstallments||0))) return "COMPLETED";
 return (inv.nextDueDate && inv.nextDueDate<today())?"OVERDUE":"ACTIVE";
};
const received=inv=>Number(inv.advancePayment||0)+(inv.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
const pending=inv=>Math.max(0,Number(inv.totalValue||0)-received(inv));
const stockAvail=p=>Math.max(0,Number(p.stockPurchased||0)-Number(p.stockSold||0));
const guessCategory=n=>{n=(n||"").toLowerCase();if(/tv|led|lcd/.test(n))return"TV";if(/fridge|refrigerator|frig/.test(n))return"Refrigerator";if(/freezer|deep freeze/.test(n))return"Freezer";if(/wash|washing machine/.test(n))return"Washing Machine";if(/(^| )ac( |$)|air condition|inverter/.test(n))return"Air Conditioner";if(/mobile|phone|samsung.*galaxy/.test(n))return"Mobile";if(/sofa|bed|table|furniture/.test(n))return"Furniture";if(/microwave|oven|blender|kitchen/.test(n))return"Kitchen Appliances";return"Electronics"};

function useData(){
 const [data,setData]=useState({users:[],products:[],purchases:[],invoices:[],agreements:[]});
 const [ready,setReady]=useState(false); const [cloud,setCloud]=useState("CONNECTING");
 useEffect(()=>{
  let count=0; const next={...data};
  const unsubs=Object.keys(next).map(k=>onSnapshot(collection(db,k),snap=>{next[k]=snap.docs.map(d=>({...d.data(),id:d.id}));setData({...next});setCloud("LIVE");count++;if(count>=5)setReady(true)},e=>{console.error(e);setCloud("ERROR");setReady(true)}));
  const cache=localStorage.getItem("amc-react-cache");if(cache)try{setData(JSON.parse(cache))}catch{}
  return()=>unsubs.forEach(u=>u());
 },[]);
 useEffect(()=>{if(ready)localStorage.setItem("amc-react-cache",JSON.stringify(data))},[data,ready]);
 useEffect(()=>{(async()=>{try{const s=await getDocs(collection(db,"users"));if(s.empty){for(const [k,arr] of Object.entries(defaults)){for(const x of arr)await setDoc(doc(db,k,x.id),x)}}}catch(e){console.warn("Firestore seed",e)}})()},[]);
 const save=async(k,obj)=>{setData(x=>({...x,[k]:x[k].some(a=>a.id===obj.id)?x[k].map(a=>a.id===obj.id?obj:a):[...x[k],obj]}));try{await setDoc(doc(db,k,obj.id),obj,{merge:true})}catch(e){console.error(e)}};
 const remove=async(k,id)=>{setData(x=>({...x,[k]:x[k].filter(a=>a.id!==id)}));try{await deleteDoc(doc(db,k,id))}catch(e){console.error(e)}};
 return {...data,ready,cloud,save,remove};
}

function App(){
 const d=useData(); const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem("amc-user"))}catch{return null}});
 const [route,setRoute]=useState("dashboard"); const [detail,setDetail]=useState(null); const [toast,setToast]=useState("");
 useEffect(()=>{if(toast){let t=setTimeout(()=>setToast(""),3000);return()=>clearTimeout(t)}},[toast]);
 const login=(u,p)=>{let x=d.users.find(a=>a.username.toLowerCase()===u.toLowerCase()&&a.password===p&&a.isActive!==false);if(!x)return"Invalid username or password";setUser(x);localStorage.setItem("amc-user",JSON.stringify(x));setRoute("dashboard");return null};
 const logout=()=>{setUser(null);localStorage.removeItem("amc-user");setRoute("dashboard")};
 if(!d.ready)return <div className="loading"><RefreshCw size={28}/>&nbsp;Loading AmC…</div>;
 if(!user)return <Login onLogin={login}/>;
 const go=(r,arg=null)=>{setRoute(r);setDetail(arg)};
 return <div className="app">
  {toast&&<div style={{position:"fixed",top:12,right:12,zIndex:100,background:"#173",color:"#fff",padding:"11px 15px",borderRadius:12,boxShadow:"0 4px 15px #0003"}}>{toast}</div>}
  {route==="dashboard"&&<Dashboard d={d} user={user} go={go} logout={logout}/>}
  {route==="collection"&&<Collection d={d} user={user} go={go}/>}
  {route==="redzone"&&<InvoiceList title="Red Zone" icon={<AlertTriangle/>} d={d} user={user} filter="OVERDUE" go={go}/>}
  {route==="completed"&&<InvoiceList title="Completed" icon={<CheckCircle/>} d={d} user={user} filter="COMPLETED" go={go}/>}
  {route==="invoice"&&<InvoicePage d={d} user={user} go={go} toast={setToast}/>}
  {route==="invoiceDetail"&&<InvoiceDetail d={d} user={user} id={detail} go={go} toast={setToast}/>}
  {route==="installment"&&<Installment d={d} user={user} pre={detail} go={go} toast={setToast}/>}
  {route==="products"&&<Products d={d} user={user} go={go} toast={setToast}/>}
  {route==="purchases"&&<Purchases d={d} user={user} go={go} toast={setToast}/>}
  {route==="users"&&<UsersPage d={d} user={user} go={go} toast={setToast}/>}
  {route==="customers"&&<Customers d={d} user={user} onlyMine={false} go={go}/>}
  {route==="my_customers"&&<Customers d={d} user={user} onlyMine={true} go={go}/>}
  {route==="reports"&&<Reports d={d} user={user} go={go}/>}
  {route==="agreements"&&<Agreements d={d} user={user} go={go} toast={setToast}/>}
  {route==="export"&&<ExportPage d={d} user={user} go={go} toast={setToast}/>}
  {route==="admin"&&<AdminPanel d={d} user={user} go={go} toast={setToast}/>}
  {route==="about"&&<About go={go}/>}
  {["dashboard","collection","redzone","completed"].includes(route)&&<BottomNav route={route} go={go}/>}
 </div>
}

function Login({onLogin}){
 const [u,setU]=useState(""),[p,setP]=useState(""),[err,setErr]=useState("");
 return <div className="login"><div className="loginbox">
  <div className="card" style={{padding:24}}>
   <div className="logo">AmC</div><h2 style={{textAlign:"center",margin:"0 0 5px"}}>Installment Manager</h2>
   <p className="muted small" style={{textAlign:"center"}}>Admin full control · Recovery man sirf apni installments (realtime)</p>
   {err&&<div className="alert" style={{margin:"14px 0"}}>{err}</div>}
   <div className="field" style={{marginTop:16}}><label>Username</label><input className="input" value={u} onChange={e=>setU(e.target.value)} autoComplete="username"/></div>
   <div className="field" style={{marginTop:12}}><label>Password</label><input className="input" type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(setErr(onLogin(u,p)||""))}/></div>
   <button className="btn primary" style={{width:"100%",marginTop:18}} onClick={()=>setErr(onLogin(u,p)||"")}>Login</button>
  </div>
  <div className="footer">AmC Installment Management</div>
 </div></div>
}
function Top({title,back,actions}){return <div className="topbar">{back&&<button className="iconbtn" onClick={back}><ArrowLeft/></button>}<h1>{title}</h1>{actions}</div>}
function BottomNav({route,go}){return <div className="bottom">
 <Nav icon={<Home/>} text="Home" active={route==="dashboard"} onClick={()=>go("dashboard")}/>
 <Nav icon={<WalletCards/>} text="Collection" active={route==="collection"} onClick={()=>go("collection")}/>
 <Nav icon={<AlertTriangle/>} text="Red Zone" active={route==="redzone"} onClick={()=>go("redzone")}/>
 <Nav icon={<CheckCircle/>} text="Done" active={route==="completed"} onClick={()=>go("completed")}/>
 </div>}
function Nav({icon,text,active,onClick}){return <button className={"navitem "+(active?"active":"")} onClick={onClick}>{icon}<span>{text}</span></button>}
function Page({children,title,back,actions}){return <><Top title={title} back={back} actions={actions}/><main className="page">{children}</main></>}
function Stat({title,value,icon,kind=""}){return <div className={"stat "+kind}>{icon}<div className="value">{value}</div><div className="label">{title}</div></div>}
function Pill({status}){return <span className={"pill "+status.toLowerCase()}>{status}</span>}
function SearchBox({value,onChange,placeholder="Search..."}){return <div style={{position:"relative",marginBottom:12}}><Search size={18} style={{position:"absolute",left:11,top:11,color:"#718"}}/><input className="input" style={{paddingLeft:38}} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>}
function fmtDate(s){return s?new Date(s+"T00:00:00").toLocaleDateString("en-PK"): "—"}

function Dashboard({d,user,go,logout}){
 const inv=user.role==="ADMIN"?d.invoices:d.invoices.filter(i=>i.recoveryManId===user.id);
 const st=inv.reduce((a,i)=>{let s=statusOf(i);a[s]++;a.pending+=pending(i);a.received+=received(i);return a},{ACTIVE:0,OVERDUE:0,COMPLETED:0,pending:0,received:0});
 const pays=inv.flatMap(i=>(i.payments||[]).map(p=>({...p,invoice:i})));
 const todayPays=pays.filter(p=>p.date===today()); const todayCash=todayPays.reduce((s,p)=>s+Number(p.amount||0),0)+inv.filter(i=>i.invoiceDate===today()).reduce((s,i)=>s+Number(i.advancePayment||0),0);
 const activeUsers=d.users.filter(u=>u.role==="RECOVERY_MAN").length;
 return <><Top title={user.role==="ADMIN"?"Admin Dashboard":"Recovery Dashboard"} actions={<button className="iconbtn" onClick={logout} title="Logout"><LogOut/></button>}/>
 <main className="page">
  <div className="hero"><div className="row between"><div><div style={{fontSize:21,fontWeight:800}}>Welcome, {user.fullName}</div><div className="sub">{user.role==="ADMIN"?"Full administration access":"Your assigned recovery accounts"} · <b>{d.cloud==="LIVE"?"Realtime LIVE":"Cloud "+d.cloud}</b></div></div><div><Pill status={d.cloud==="LIVE"?"ACTIVE":"OVERDUE"}/></div></div></div>
  <div className="grid grid-4">
   <Stat title="Products" value={d.products.length} icon={<Package size={22}/>} />
   <Stat title="Stock Available" value={d.products.reduce((s,p)=>s+stockAvail(p),0)} icon={<ShoppingCart size={22}/>} kind="gold"/>
   <Stat title="Active Collections" value={st.ACTIVE} icon={<ReceiptText size={22}/>} />
   <Stat title="Red Zone" value={st.OVERDUE} icon={<AlertTriangle size={22}/>} kind="red"/>
   <Stat title="Completed" value={st.COMPLETED} icon={<CheckCircle size={22}/>} kind="green"/>
   <Stat title="Total Customers" value={new Set(inv.map(i=>normCnic(i.customerCnic)||i.customerName)).size} icon={<Users size={22}/>} />
   <Stat title="Pending" value={money(st.pending)} icon={<WalletCards size={22}/>} kind="red"/>
   <Stat title="Received" value={money(st.received)} icon={<BarChart3 size={22}/>} kind="green"/>
  </div>
  <div className="card" style={{marginTop:12}}><div className="section-title">Today</div><div className="grid grid-3">
   <Stat title="Today's Cash" value={money(todayCash)} icon={<WalletCards size={20}/>} kind="green"/>
   <Stat title="Installments Collected" value={todayPays.length} icon={<CalendarDays size={20}/>} />
   <Stat title="Commission (0.5%)" value={money(todayPays.reduce((s,p)=>s+Number(p.amount||0)*.005,0))} icon={<BarChart3 size={20}/>} kind="gold"/>
  </div></div>
  <div className="card"><div className="section-title">Quick Actions</div><div className="grid grid-3">
   <Quick text="New Invoice" icon={<FileText/>} onClick={()=>go("invoice")}/>
   <Quick text="Add Installment" icon={<Plus/>} onClick={()=>go("installment")}/>
   <Quick text="Customers" icon={<Users/>} onClick={()=>go("customers")}/>
   {user.role==="ADMIN"&&<><Quick text="Products" icon={<Package/>} onClick={()=>go("products")}/><Quick text="Purchases" icon={<ShoppingCart/>} onClick={()=>go("purchases")}/><Quick text="Users" icon={<UserPlus/>} onClick={()=>go("users")}/><Quick text="Agreements" icon={<FileText/>} onClick={()=>go("agreements")}/><Quick text="Reports" icon={<BarChart3/>} onClick={()=>go("reports")}/><Quick text="Export Excel" icon={<Download/>} onClick={()=>go("export")}/><Quick text="Admin Panel" icon={<Settings/>} onClick={()=>go("admin")}/></>}
   {user.role!=="ADMIN"&&<Quick text="My Customers" icon={<Users/>} onClick={()=>go("my_customers")}/>}
   <Quick text="About" icon={<Info/>} onClick={()=>go("about")}/>
  </div></div>
  <div className="card"><div className="section-title">Recent Collections</div>{todayPays.length?todayPays.slice(-8).reverse().map((p,i)=><div className="list-card row between" key={i}><div><b>{p.invoice.customerName}</b><div className="muted small">{p.invoice.invoiceNumber} · {p.time||p.date}</div></div><b style={{color:"var(--green)"}}>{money(p.amount)}</b></div>):<div className="empty">No collection today.</div>}</div>
  <div className="footer">AmC · Installment Management</div>
 </main></>
}
function Quick({text,icon,onClick}){return <button className="btn secondary row" style={{justifyContent:"flex-start"}} onClick={onClick}>{icon}<span>{text}</span></button>}

function InvoiceList({title,icon,d,user,filter,go}){
 const list=d.invoices.filter(i=>(user.role==="ADMIN"||i.recoveryManId===user.id)&&statusOf(i)===filter).sort((a,b)=>b.invoiceDate.localeCompare(a.invoiceDate));
 const [q,setQ]=useState("");
 const shown=list.filter(i=>(i.customerName+" "+i.customerCnic+" "+i.invoiceNumber+" "+i.productName).toLowerCase().includes(q.toLowerCase()));
 return <Page title={title} back={()=>go("dashboard")} actions={<span style={{color:"#fff"}}>{icon}</span>}><SearchBox value={q} onChange={setQ} placeholder="Customer, CNIC, invoice, product"/>
 <div className="card"><div className="row between"><div><b>{shown.length}</b> records</div><Pill status={filter}/></div></div>
 {shown.length?<div className="grid">{shown.map(i=><InvoiceCard key={i.id} inv={i} go={go}/>)}</div>:<div className="card empty">No records found.</div>}</Page>
}
function InvoiceCard({inv,go}){let s=statusOf(inv);return <div className="card" onClick={()=>go("invoiceDetail",inv.id)} style={{cursor:"pointer"}}><div className="row between"><div><b>{inv.customerName}</b><div className="muted small">{inv.invoiceNumber} · {inv.productName}</div></div><Pill status={s}/></div><div className="grid grid-3" style={{marginTop:10}}><div><div className="muted small">Total</div><b>{money(inv.totalValue)}</b></div><div><div className="muted small">Received</div><b>{money(received(inv))}</b></div><div><div className="muted small">Pending</div><b style={{color:pending(inv)>0?"var(--red)":"var(--green)"}}>{money(pending(inv))}</b></div></div><div className="muted small" style={{marginTop:8}}>Next due: {fmtDate(inv.nextDueDate)} · {inv.recoveryManName}</div></div>}

function Collection({d,user,go}){
 const list=d.invoices.filter(i=>(user.role==="ADMIN"||i.recoveryManId===user.id)&&statusOf(i)!=="COMPLETED").sort((a,b)=>(a.nextDueDate||"").localeCompare(b.nextDueDate||""));
 const [q,setQ]=useState("");const shown=list.filter(i=>(i.customerName+" "+i.customerCnic+" "+i.invoiceNumber).toLowerCase().includes(q.toLowerCase()));
 return <Page title="Collection" back={()=>go("dashboard")}><SearchBox value={q} onChange={setQ} placeholder="Search customer / CNIC / invoice"/><button className="fab" onClick={()=>go("installment")}>+</button>
 {shown.length?shown.map(i=><InvoiceCard key={i.id} inv={i} go={go}/>):<div className="card empty">No pending collections.</div>}</Page>
}

function InvoicePage({d,user,go,toast}){
 const [form,setForm]=useState({customerName:"",fatherName:"",customerCnic:"",customerAddress:"",customerPhone:"",productId:d.products[0]?.id||"",basePrice:"",totalValue:"",advancePayment:"0",percentage:"0",totalInstallments:"12",installmentAmount:"",recoveryManId:user.role==="RECOVERY_MAN"?user.id:(d.users.find(x=>x.role==="RECOVERY_MAN"&&x.isActive!==false)?.id||""),invoiceDate:today(),nextDueDate:addMonths(today(),1),finalDueDate:addMonths(today(),12),guarantorName:"",guarantorMobile:"",agreementId:""});
 const [err,setErr]=useState("");
 const prod=d.products.find(p=>p.id===form.productId); const r=Number(form.totalValue||0)-Number(form.advancePayment||0);const suggested=r/Math.max(1,Number(form.totalInstallments||1));
 useEffect(()=>{if(prod&&!form.basePrice)setForm(f=>({...f,basePrice:String(prod.price),totalValue:f.totalValue||String(prod.price)}))},[prod?.id]);
 const submit=async e=>{e.preventDefault();setErr("");if(!form.customerName||!form.customerCnic||!form.productId||Number(form.totalValue)<=0){setErr("Customer, CNIC, product and total value are required.");return}
  let rm=d.users.find(x=>x.id===form.recoveryManId);if(!rm){setErr("Select a recovery man.");return}
  if(Number(form.advancePayment)>Number(form.totalValue)){setErr("Advance cannot exceed total value.");return}
  const id=uid(), inv={id,invoiceNumber:"INV-"+Date.now().toString().slice(-8),customerName:form.customerName.trim(),customerCnic:fmtCnic(form.customerCnic),customerAddress:form.customerAddress,customerPhone:form.customerPhone,productId:prod.id,productName:prod.name,productCode:prod.code,productColor:prod.color,basePrice:Number(form.basePrice||prod.price),totalValue:Number(form.totalValue),advancePayment:Number(form.advancePayment||0),percentage:Number(form.percentage||0),totalInstallments:Number(form.totalInstallments||1),installmentAmount:Number(form.installmentAmount||suggested),recoveryManId:rm.id,recoveryManName:rm.fullName,invoiceDate:form.invoiceDate,nextDueDate:form.nextDueDate,finalDueDate:form.finalDueDate,payments:[],status:"ACTIVE",agreementId:form.agreementId,fatherName:form.fatherName,guarantorName:form.guarantorName,guarantorMobile:form.guarantorMobile};
  await d.save("invoices",inv);let np={...prod,stockSold:Number(prod.stockSold||0)+1};await d.save("products",np);toast("Invoice created");go("collection")
 };
 return <Page title="New Invoice" back={()=>go("dashboard")}><form onSubmit={submit}><div className="card"><h3 className="section-title">Customer Details</h3><div className="grid grid-2">
  <Field label="Customer Name" value={form.customerName} set={v=>setForm({...form,customerName:v})}/><Field label="Father Name" value={form.fatherName} set={v=>setForm({...form,fatherName:v})}/><Field label="CNIC" value={form.customerCnic} set={v=>setForm({...form,customerCnic:v})} placeholder="35202-1234567-1"/><Field label="Phone" value={form.customerPhone} set={v=>setForm({...form,customerPhone:v})}/><Field label="Address" value={form.customerAddress} set={v=>setForm({...form,customerAddress:v})}/><Field label="Guarantor Name" value={form.guarantorName} set={v=>setForm({...form,guarantorName:v})}/><Field label="Guarantor Mobile" value={form.guarantorMobile} set={v=>setForm({...form,guarantorMobile:v})}/></div></div>
  <div className="card"><h3 className="section-title">Product & Plan</h3><div className="grid grid-2">
   <div className="field"><label>Product</label><select className="input" value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}>{d.products.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name} ({money(p.price)})</option>)}</select></div>
   <Field label="Base Price" type="number" value={form.basePrice} set={v=>setForm({...form,basePrice:v})}/><Field label="Total Value" type="number" value={form.totalValue} set={v=>setForm({...form,totalValue:v})}/><Field label="Advance Payment" type="number" value={form.advancePayment} set={v=>setForm({...form,advancePayment:v})}/><Field label="Percentage / Profit %" type="number" value={form.percentage} set={v=>setForm({...form,percentage:v})}/><Field label="Total Installments" type="number" value={form.totalInstallments} set={v=>setForm({...form,totalInstallments:v})}/><Field label={`Installment Amount (suggested ${money(suggested)})`} type="number" value={form.installmentAmount} set={v=>setForm({...form,installmentAmount:v})}/><Field label="Invoice Date" type="date" value={form.invoiceDate} set={v=>setForm({...form,invoiceDate:v})}/><Field label="Next Due Date" type="date" value={form.nextDueDate} set={v=>setForm({...form,nextDueDate:v})}/><Field label="Final Due Date" type="date" value={form.finalDueDate} set={v=>setForm({...form,finalDueDate:v})}/>
   {user.role==="ADMIN"&&<div className="field"><label>Recovery Man</label><select className="input" value={form.recoveryManId} onChange={e=>setForm({...form,recoveryManId:e.target.value})}>{d.users.filter(u=>u.role==="RECOVERY_MAN"&&u.isActive!==false).map(u=><option key={u.id} value={u.id}>{u.fullName}</option>)}</select></div>}
  </div>{err&&<div className="alert" style={{marginTop:12}}>{err}</div>}<div className="actions"><button type="button" className="btn ghost" onClick={()=>go("dashboard")}>Cancel</button><button className="btn primary">Create Invoice</button></div></div></form></Page>
}
function Field({label,value,set,type="text",placeholder=""}){return <div className="field"><label>{label}</label><input className="input" type={type} value={value??""} onChange={e=>set(e.target.value)} placeholder={placeholder}/></div>}

function InvoiceDetail({d,user,id,go,toast}){
 const inv=d.invoices.find(i=>i.id===id);if(!inv)return <Page title="Invoice" back={()=>go("collection")}><div className="card empty">Invoice not found.</div></Page>;
 const s=statusOf(inv),canPay=user.role==="ADMIN"||inv.recoveryManId===user.id;
 return <Page title={inv.invoiceNumber} back={()=>go("collection")} actions={<Pill status={s}/>}>
  <div className="card"><div className="row between"><div><h2 style={{margin:"0 0 4px"}}>{inv.customerName}</h2><div className="muted">{fmtCnic(inv.customerCnic)}</div></div><b style={{fontSize:20}}>{money(pending(inv))}</b></div>
   <div className="grid grid-2" style={{marginTop:15}}><Info label="Father" v={inv.fatherName}/><Info label="Phone" v={inv.customerPhone}/><Info label="Address" v={inv.customerAddress}/><Info label="Product" v={`${inv.productCode} — ${inv.productName}`}/><Info label="Total Value" v={money(inv.totalValue)}/><Info label="Advance" v={money(inv.advancePayment)}/><Info label="Received" v={money(received(inv))}/><Info label="Pending" v={money(pending(inv))}/><Info label="Installment" v={money(inv.installmentAmount)}/><Info label="Next Due" v={fmtDate(inv.nextDueDate)}/><Info label="Final Due" v={fmtDate(inv.finalDueDate)}/><Info label="Recovery Man" v={inv.recoveryManName}/></div>
  </div>
  <div className="card"><div className="row between"><h3 className="section-title" style={{margin:0}}>Payment History</h3>{canPay&&s!=="COMPLETED"&&<button className="btn primary" onClick={()=>go("installment",inv.id)}><Plus size={17}/> Add Payment</button>}</div>
   {(inv.payments||[]).length?inv.payments.slice().reverse().map(p=><div className="list-card row between" key={p.id}><div><b>{money(p.amount)}</b><div className="muted small">{p.date} {p.time} · {p.receivedBy}</div>{p.note&&<div className="small">{p.note}</div>}{p.latitude&&<a className="maplink small" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}><MapPin size={13}/> {p.locationName||"View location"}</a>}</div><span className="pill completed">0.5% {money(Number(p.amount)*.005)}</span></div>):<div className="empty">No installment payments yet.</div>}
  </div>
  {inv.guarantorName&&<div className="card"><h3 className="section-title">Guarantor</h3><Info label="Name" v={inv.guarantorName}/><Info label="Mobile" v={inv.guarantorMobile}/></div>}
 </Page>
}
function Info({label,v}){
  return <div>
    <div className="muted small">{label}</div>
    <div style={{fontWeight:600,marginTop:2}}>{v||"—"}</div>
  </div>
}

function Installment({d,user,pre,go,toast}){
 const mine=d.invoices.filter(i=>(user.role==="ADMIN"||i.recoveryManId===user.id)&&statusOf(i)!=="COMPLETED");
 const [id,setId]=useState(pre||mine[0]?.id||""),[amount,setAmount]=useState(""),[note,setNote]=useState(""),[loc,setLoc]=useState(null),[err,setErr]=useState("");
 const inv=d.invoices.find(i=>i.id===id);
 useEffect(()=>{if(inv&&!amount)setAmount(String(Math.min(Number(inv.installmentAmount||0),pending(inv))))},[inv?.id]);
 const gps=()=>{if(!navigator.geolocation){setErr("Browser GPS is not available.");return}navigator.geolocation.getCurrentPosition(async pos=>{let locationName="GPS location";try{let r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,{headers:{Accept:"application/json"}});let j=await r.json();locationName=j.display_name||locationName}catch{}setLoc({latitude:pos.coords.latitude,longitude:pos.coords.longitude,locationName});setErr("")},()=>setErr("Location permission denied."))};
 const submit=async()=>{setErr("");if(!inv)return;if(Number(amount)<=0||Number(amount)>pending(inv)+.01){setErr("Enter a valid amount.");return}
  const p={id:uid(),amount:Number(amount),date:today(),time:nowTime(),receivedBy:user.fullName,note,latitude:loc?.latitude||0,longitude:loc?.longitude||0,locationName:loc?.locationName||""};
  let ps=[...(inv.payments||[]),p];let nv={...inv,payments:ps,status:pending({...inv,payments:ps})<=.01||ps.length>=Number(inv.totalInstallments)?"COMPLETED":inv.status};await d.save("invoices",nv);toast("Installment collected");go("collection")
 };
 return <Page title="Add Installment" back={()=>go("collection")}><div className="card"><div className="field"><label>Invoice / Customer</label><select className="input" value={id} onChange={e=>{setId(e.target.value);setAmount("")}}>{mine.map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} — {i.customerName} — {money(pending(i))} pending</option>)}</select></div>{inv&&<div className="hero" style={{marginTop:12}}><b>{inv.customerName}</b><div className="sub">{inv.productName} · Pending {money(pending(inv))}</div></div>}
 <div className="grid grid-2"><Field label="Amount" type="number" value={amount} set={setAmount}/><Field label="Note" value={note} set={setNote}/></div>
 <div className="row wrap" style={{marginTop:12}}><button className="btn secondary" onClick={gps}><MapPin size={17}/> {loc?"GPS Captured":"Capture GPS"}</button>{loc&&<span className="small muted">{loc.locationName}</span>}</div>{err&&<div className="alert" style={{marginTop:12}}>{err}</div>}<div className="actions"><button className="btn ghost" onClick={()=>go("collection")}>Cancel</button><button className="btn primary" onClick={submit} disabled={!inv}>Save Payment</button></div></div></Page>
}

function Products({d,user,go,toast}){
 const [edit,setEdit]=useState(null),[q,setQ]=useState(""),[cat,setCat]=useState("All");
 const shown=d.products.filter(p=>(p.code+" "+p.name+" "+p.category).toLowerCase().includes(q.toLowerCase())&&(cat==="All"||p.category===cat));
 return <Page title="Products" back={()=>go("dashboard")} actions={<button className="iconbtn" onClick={()=>setEdit({})}><Plus/></button>}><div className="card"><div className="grid grid-2"><SearchBox value={q} onChange={setQ} placeholder="Search products"/><select className="input" value={cat} onChange={e=>setCat(e.target.value)}><option>All</option>{CATS.map(c=><option key={c}>{c}</option>)}</select></div></div>
 <div className="table-wrap card"><table className="table"><thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>{shown.map(p=><tr key={p.id}><td>{p.code}</td><td><b>{p.name}</b><div className="small muted">{p.color}</div></td><td>{p.category}</td><td>{money(p.price)}</td><td>{stockAvail(p)}</td><td><button className="iconbtn" style={{color:"var(--teal)"}} onClick={()=>setEdit(p)}><Edit3 size={17}/></button><button className="iconbtn" style={{color:"var(--red)"}} onClick={async()=>{if(confirm("Delete product?")){await d.remove("products",p.id);toast("Deleted")}}}><Trash2 size={17}/></button></td></tr>)}</tbody></table></div>{edit&&<ProductModal d={d} item={edit} close={()=>setEdit(null)} toast={toast}/>}</Page>
}
function ProductModal({d,item,close,toast}){const [f,setF]=useState({id:item.id||uid(),code:item.code||"",name:item.name||"",price:item.price||"",color:item.color||"",category:item.category||"Other",stockPurchased:item.stockPurchased||0,stockSold:item.stockSold||0});return <Modal title={item.id?"Edit Product":"Add Product"} close={close}><div className="grid grid-2"><Field label="Product Code" value={f.code} set={v=>setF({...f,code:v})}/><Field label="Name" value={f.name} set={v=>setF({...f,name:v})}/><Field label="Price" type="number" value={f.price} set={v=>setF({...f,price:v})}/><Field label="Color" value={f.color} set={v=>setF({...f,color:v})}/><div className="field"><label>Category</label><select className="input" value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div><Field label="Purchased Stock" type="number" value={f.stockPurchased} set={v=>setF({...f,stockPurchased:v})}/></div><div className="actions"><button className="btn ghost" onClick={close}>Cancel</button><button className="btn primary" onClick={async()=>{await d.save("products",{...f,price:Number(f.price),stockPurchased:Number(f.stockPurchased),stockSold:Number(f.stockSold)});toast("Product saved");close()}}>Save</button></div></Modal>}

function Purchases({d,user,go,toast}){
 const [show,setShow]=useState(false),[q,setQ]=useState(""),[file,setFile]=useState(null);
 const list=d.purchases.filter(p=>(p.productName+" "+p.productCode+" "+p.supplier).toLowerCase().includes(q.toLowerCase())).slice().reverse();
 const addPurchase=async f=>{let p=d.products.find(x=>x.id===f.productId);if(!p)return;let pur={id:uid(),productId:p.id,productName:p.name,productCode:p.code,quantity:Number(f.quantity),unitCost:Number(f.unitCost),totalCost:Number(f.quantity)*Number(f.unitCost),supplier:f.supplier,date:f.date||today(),notes:f.notes};await d.save("purchases",pur);await d.save("products",{...p,stockPurchased:Number(p.stockPurchased||0)+Number(f.quantity)});toast("Purchase added");setShow(false)};
 const importCsv=async e=>{let file=e.target.files?.[0];if(!file)return;Papa.parse(file,{header:true,skipEmptyLines:true,complete:async r=>{for(const row of r.data){let code=(row.ProductCode||row.productCode||row.Code||"").trim();let name=(row.ProductName||row.productName||row.Name||code).trim();let p=d.products.find(x=>x.code.toLowerCase()===code.toLowerCase());if(!p){p={id:uid(),code:code||uid().slice(0,6).toUpperCase(),name,price:Number(row.UnitCost||row.unitCost||0),color:"N/A",category:guessCategory(name),stockPurchased:0,stockSold:0};await d.save("products",p)}let qty=Number(row.Quantity||row.quantity||0),cost=Number(row.UnitCost||row.unitCost||p.price||0);await d.save("purchases",{id:uid(),productId:p.id,productName:p.name,productCode:p.code,quantity:qty,unitCost:cost,totalCost:qty*cost,supplier:row.Supplier||row.supplier||"CSV Import",date:row.Date||row.date||today(),notes:row.Notes||row.notes||"Imported"})}toast("CSV import completed")}})};
 return <Page title="Purchases" back={()=>go("dashboard")} actions={<button className="iconbtn" onClick={()=>setShow(true)}><Plus/></button>}><div className="card"><div className="row wrap"><div className="grow"><SearchBox value={q} onChange={setQ} placeholder="Search purchases"/></div><label className="btn secondary"><Upload size={17}/> Import CSV<input type="file" accept=".csv" hidden onChange={importCsv}/></label></div></div>
 <div className="table-wrap card"><table className="table"><thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Supplier</th></tr></thead><tbody>{list.map(p=><tr key={p.id}><td>{fmtDate(p.date)}</td><td>{p.productCode} — {p.productName}</td><td>{p.quantity}</td><td>{money(p.unitCost)}</td><td>{money(p.totalCost)}</td><td>{p.supplier}</td></tr>)}</tbody></table></div>{show&&<PurchaseModal d={d} close={()=>setShow(false)} save={addPurchase}/>}</Page>
}
function PurchaseModal({d,close,save}){const [f,setF]=useState({productId:d.products[0]?.id||"",quantity:1,unitCost:"",supplier:"",date:today(),notes:""});let p=d.products.find(x=>x.id===f.productId);useEffect(()=>{if(p&&!f.unitCost)setF(x=>({...x,unitCost:p.price}))},[p?.id]);return <Modal title="Add Purchase" close={close}><div className="grid grid-2"><div className="field"><label>Product</label><select className="input" value={f.productId} onChange={e=>setF({...f,productId:e.target.value,unitCost:""})}>{d.products.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></div><Field label="Quantity" type="number" value={f.quantity} set={v=>setF({...f,quantity:v})}/><Field label="Unit Cost" type="number" value={f.unitCost} set={v=>setF({...f,unitCost:v})}/><Field label="Supplier" value={f.supplier} set={v=>setF({...f,supplier:v})}/><Field label="Date" type="date" value={f.date} set={v=>setF({...f,date:v})}/><Field label="Notes" value={f.notes} set={v=>setF({...f,notes:v})}/></div><div className="actions"><button className="btn ghost" onClick={close}>Cancel</button><button className="btn primary" onClick={()=>save(f)}>Save Purchase</button></div></Modal>}

function Customers({d,user,onlyMine,go}){
 const invs=d.invoices.filter(i=>!onlyMine||i.recoveryManId===user.id);const map=new Map();
 invs.forEach(i=>{let k=normCnic(i.customerCnic)||i.customerName.toLowerCase();let x=map.get(k)||{cnic:i.customerCnic,name:i.customerName,address:i.customerAddress,phone:i.customerPhone,invoices:[]};x.invoices.push(i);x.address=x.address||i.customerAddress;x.phone=x.phone||i.customerPhone;map.set(k,x)});
 const [q,setQ]=useState("");const rows=[...map.values()].filter(x=>(x.name+" "+x.cnic+" "+x.phone).toLowerCase().includes(q.toLowerCase()));
 return <Page title={onlyMine?"My Customers":"Customers"} back={()=>go("dashboard")}><SearchBox value={q} onChange={setQ} placeholder="Customer name / CNIC / phone"/>{rows.map(x=>{let ps=x.invoices.reduce((s,i)=>s+pending(i),0),paid=x.invoices.reduce((s,i)=>s+received(i),0);return <div className="card" key={x.cnic||x.name}><div className="row between"><div><h3 style={{margin:"0 0 4px"}}>{x.name}</h3><div className="muted small">{fmtCnic(x.cnic)} · {x.phone||"No phone"}</div><div className="small">{x.address||"No address"}</div></div><div style={{textAlign:"right"}}><b style={{color:ps?"var(--red)":"var(--green)"}}>{money(ps)}</b><div className="muted small">Pending</div></div></div><div className="grid grid-3" style={{marginTop:12}}><div><div className="muted small">Invoices</div><b>{x.invoices.length}</b></div><div><div className="muted small">Paid/Received</div><b>{money(paid)}</b></div><div><div className="muted small">Active</div><b>{x.invoices.filter(i=>statusOf(i)!=="COMPLETED").length}</b></div></div><div className="row wrap" style={{marginTop:10}}>{x.invoices.map(i=><button className="btn ghost small" key={i.id} onClick={()=>go("invoiceDetail",i.id)}>{i.invoiceNumber} · {statusOf(i)}</button>)}</div></div>})}{!rows.length&&<div className="card empty">No customers found.</div>}</Page>
}

function UsersPage({d,user,go,toast}){
 const [edit,setEdit]=useState(null);return <Page title="Users" back={()=>go("dashboard")} actions={<button className="iconbtn" onClick={()=>setEdit({})}><Plus/></button>}><div className="grid">{d.users.map(u=><div className="card" key={u.id}><div className="row between"><div><b>{u.fullName}</b><div className="muted small">@{u.username} · {u.role}</div><div className="small">{u.phone}</div></div><span className={"pill "+(u.isActive===false?"overdue":"active")}>{u.isActive===false?"INACTIVE":"ACTIVE"}</span></div><div className="actions"><button className="btn secondary" onClick={()=>setEdit(u)}><Edit3 size={16}/> Edit</button>{u.id!==user.id&&<button className="btn danger" onClick={async()=>{if(confirm("Delete user?")){await d.remove("users",u.id);toast("User deleted")}}}><Trash2 size={16}/> Delete</button>}</div></div>)}</div>{edit&&<UserModal d={d} item={edit} close={()=>setEdit(null)} toast={toast}/>}</Page>
}
function UserModal({d,item,close,toast}){const [f,setF]=useState({id:item.id||uid(),username:item.username||"",password:item.password||"",fullName:item.fullName||"",phone:item.phone||"",role:item.role||"RECOVERY_MAN",isActive:item.isActive!==false});return <Modal title={item.id?"Edit User":"Add User"} close={close}><div className="grid grid-2"><Field label="Full Name" value={f.fullName} set={v=>setF({...f,fullName:v})}/><Field label="Phone" value={f.phone} set={v=>setF({...f,phone:v})}/><Field label="Username" value={f.username} set={v=>setF({...f,username:v})}/><Field label="Password" value={f.password} set={v=>setF({...f,password:v})}/><div className="field"><label>Role</label><select className="input" value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option value="RECOVERY_MAN">Recovery Man</option><option value="ADMIN">Admin</option></select></div><label className="checkbox"><input type="checkbox" checked={f.isActive} onChange={e=>setF({...f,isActive:e.target.checked})}/> Active user</label></div><div className="actions"><button className="btn ghost" onClick={close}>Cancel</button><button className="btn primary" onClick={async()=>{if(!f.username||!f.password||!f.fullName)return alert("Name, username and password required");await d.save("users",f);toast("User saved");close()}}>Save</button></div></Modal>}

function Agreements({d,user,go,toast}){
 const [edit,setEdit]=useState(null),[q,setQ]=useState("");
 const rows=d.agreements.filter(a=>(a.customerName+" "+a.cnic+" "+a.mobile+" "+a.agreementNumber).toLowerCase().includes(q.toLowerCase())).slice().reverse();
 const pdf=a=>{let doc=new jsPDF();doc.setFontSize(18);doc.text("INSTALLMENT PURCHASE AGREEMENT",105,18,{align:"center"});doc.setFontSize(11);let y=30;const lines=[`Agreement No: ${a.agreementNumber}`,`Customer: ${a.customerName}`,`Father: ${a.fatherName}`,`CNIC: ${a.cnic}`,`Mobile: ${a.mobile}`,`Guarantor: ${a.guarantorName} (${a.guarantorMobile})`,`Address: ${[a.street,a.area,a.city].filter(Boolean).join(", ")}`,`Product: ${a.productCode} — ${a.productName}`,"", "Terms & Conditions:",...a.acceptedTerms,...a.customTerms];for(const t of lines){let ls=doc.splitTextToSize(t,180);if(y+ls.length*6>280){doc.addPage();y=18}doc.text(ls,15,y);y+=ls.length*6}doc.save(`${a.agreementNumber||"agreement"}.pdf`)}; 
 return <Page title="Agreements" back={()=>go("dashboard")} actions={<button className="iconbtn" onClick={()=>setEdit({})}><Plus/></button>}><SearchBox value={q} onChange={setQ} placeholder="Search customer / CNIC / agreement"/>{rows.map(a=><div className="card" key={a.id}><div className="row between"><div><b>{a.customerName}</b><div className="muted small">{a.agreementNumber} · {a.cnic}</div><div className="small">{a.productCode} — {a.productName}</div></div><button className="btn secondary" onClick={()=>pdf(a)}><Download size={16}/> PDF</button></div><div className="small muted" style={{marginTop:8}}>{a.fullAddress||[a.street,a.area,a.city].filter(Boolean).join(", ")}</div><div className="actions"><button className="btn ghost" onClick={()=>setEdit(a)}><Edit3 size={16}/> Edit</button>{a.productId&&<button className="btn primary" onClick={()=>go("invoice",a.id)}>Create invoice</button>}</div></div>)}{!rows.length&&<div className="card empty">No agreements.</div>}{edit&&<AgreementModal d={d} item={edit} close={()=>setEdit(null)} toast={toast}/>}</Page>
}
function AgreementModal({d,item,close,toast}){const [f,setF]=useState({id:item.id||uid(),agreementNumber:item.agreementNumber||"AGR-"+Date.now().toString().slice(-7),customerName:item.customerName||"",fatherName:item.fatherName||"",gender:item.gender||"Male",cnic:item.cnic||"",mobile:item.mobile||"",guarantorName:item.guarantorName||"",guarantorMobile:item.guarantorMobile||"",city:item.city||"",area:item.area||"",street:item.street||"",productId:item.productId||"",productName:item.productName||"",productCode:item.productCode||"",acceptedTerms:item.acceptedTerms||TERMS,customTerms:item.customTerms||[],notes:item.notes||"",createdDate:item.createdDate||today(),updatedDate:today()});const [custom,setCustom]=useState("");
 const prod=d.products.find(p=>p.id===f.productId);useEffect(()=>{if(prod)setF(x=>({...x,productName:prod.name,productCode:prod.code}))},[prod?.id]);
 return <Modal title={item.id?"Edit Agreement":"New Agreement"} close={close}><div className="grid grid-2"><Field label="Agreement Number" value={f.agreementNumber} set={v=>setF({...f,agreementNumber:v})}/><Field label="Customer Name" value={f.customerName} set={v=>setF({...f,customerName:v})}/><Field label="Father Name" value={f.fatherName} set={v=>setF({...f,fatherName:v})}/><Field label="CNIC" value={f.cnic} set={v=>setF({...f,cnic:v})}/><Field label="Mobile" value={f.mobile} set={v=>setF({...f,mobile:v})}/><Field label="Guarantor Name" value={f.guarantorName} set={v=>setF({...f,guarantorName:v})}/><Field label="Guarantor Mobile" value={f.guarantorMobile} set={v=>setF({...f,guarantorMobile:v})}/><Field label="City" value={f.city} set={v=>setF({...f,city:v})}/><Field label="Area" value={f.area} set={v=>setF({...f,area:v})}/><Field label="Street" value={f.street} set={v=>setF({...f,street:v})}/><div className="field"><label>Product</label><select className="input" value={f.productId} onChange={e=>setF({...f,productId:e.target.value})}><option value="">Select product</option>{d.products.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></div></div>
 <div className="card" style={{background:"#f7fbfb",marginTop:12}}><b>Terms</b>{TERMS.map(t=><label className="checkbox" key={t}><input type="checkbox" checked={f.acceptedTerms.includes(t)} onChange={e=>setF({...f,acceptedTerms:e.target.checked?[...f.acceptedTerms,t]:f.acceptedTerms.filter(x=>x!==t)})}/>{t}</label>)}<div className="row" style={{marginTop:10}}><input className="input" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Add custom term"/><button className="btn secondary" onClick={()=>{if(custom.trim())setF({...f,customTerms:[...f.customTerms,custom.trim()]});setCustom("")}}><Plus/></button></div>{f.customTerms.map((t,i)=><div className="small" key={i}>• {t}</div>)}</div>
 <div className="actions"><button className="btn ghost" onClick={close}>Cancel</button><button className="btn primary" onClick={async()=>{await d.save("agreements",f);toast("Agreement saved");close()}}>Save Agreement</button></div></Modal>
}

function Reports({d,user,go}){
 const inv=user.role==="ADMIN"?d.invoices:d.invoices.filter(i=>i.recoveryManId===user.id);const pays=inv.flatMap(i=>(i.payments||[]).map(p=>({...p,invoice:i})));const month=today().slice(0,7);const mp=pays.filter(p=>p.date.startsWith(month));const adv=inv.filter(i=>i.invoiceDate.startsWith(month)).reduce((s,i)=>s+Number(i.advancePayment||0),0);const cash=mp.reduce((s,p)=>s+Number(p.amount||0),0);
 const byUser=d.users.filter(u=>u.role==="RECOVERY_MAN").map(u=>{let x=d.invoices.filter(i=>i.recoveryManId===u.id);let ps=x.flatMap(i=>(i.payments||[]));return {...u,count:ps.length,cash:ps.reduce((s,p)=>s+Number(p.amount||0),0),pending:x.reduce((s,i)=>s+pending(i),0)}})
 return <Page title="Reports" back={()=>go("dashboard")}><div className="grid grid-3"><Stat title="This Month Installments" value={mp.length} icon={<CalendarDays/>}/><Stat title="This Month Cash" value={money(cash)} icon={<WalletCards/>} kind="green"/><Stat title="This Month Advances" value={money(adv)} icon={<ReceiptText/>} kind="gold"/></div><div className="card"><h3 className="section-title">Recovery Performance</h3><div className="table-wrap"><table className="table"><thead><tr><th>Recovery Man</th><th>Invoices</th><th>Installments</th><th>Cash</th><th>Pending</th></tr></thead><tbody>{byUser.map(u=><tr key={u.id}><td><b>{u.fullName}</b><div className="small muted">{u.phone}</div></td><td>{d.invoices.filter(i=>i.recoveryManId===u.id).length}</td><td>{u.count}</td><td>{money(u.cash)}</td><td>{money(u.pending)}</td></tr>)}</tbody></table></div></div><div className="card"><h3 className="section-title">All-Time Summary</h3><Info label="Total Received" v={money(inv.reduce((s,i)=>s+received(i),0))}/><Info label="Total Pending" v={money(inv.reduce((s,i)=>s+pending(i),0))}/><Info label="Total Installments" v={pays.length}/></div></Page>
}

function ExportPage({d,user,go,toast}){
 const inv=user.role==="ADMIN"?d.invoices:d.invoices.filter(i=>i.recoveryManId===user.id);
 const exportCsv=()=>{let rows=inv.map(i=>({Invoice:i.invoiceNumber,Customer:i.customerName,CNIC:i.customerCnic,Phone:i.customerPhone,Address:i.customerAddress,Product:i.productName,Code:i.productCode,Total:i.totalValue,Advance:i.advancePayment,Received:received(i),Pending:pending(i),Installments:i.totalInstallments,PaidInstallments:(i.payments||[]).length,InstallmentAmount:i.installmentAmount,RecoveryMan:i.recoveryManName,InvoiceDate:i.invoiceDate,NextDue:i.nextDueDate,FinalDue:i.finalDueDate,Status:statusOf(i)}));downloadBlob(Papa.unparse(rows),"AmC_Customers.csv","text/csv")};
 const exportXlsx=()=>{let rows=inv.map(i=>({Invoice:i.invoiceNumber,Customer:i.customerName,CNIC:i.customerCnic,Phone:i.customerPhone,Address:i.customerAddress,Product:i.productName,Code:i.productCode,Total:i.totalValue,Advance:i.advancePayment,Received:received(i),Pending:pending(i),Installments:i.totalInstallments,PaidInstallments:(i.payments||[]).length,InstallmentAmount:i.installmentAmount,RecoveryMan:i.recoveryManName,InvoiceDate:i.invoiceDate,NextDue:i.nextDueDate,FinalDue:i.finalDueDate,Status:statusOf(i)}));let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Customers");XLSX.writeFile(wb,"AmC_Customers.xlsx");toast("Excel exported")};
 return <Page title="Export to Excel" back={()=>go("dashboard")}><div className="card"><p className="muted">Customer data Excel/CSV mein export hoga — Excel / Google Sheets mein open karein.</p><div className="grid grid-2"><button className="btn primary" onClick={exportXlsx}><Download/> All Customers Excel ({inv.length})</button><button className="btn secondary" onClick={exportCsv}><Download/> CSV Export</button></div></div><div className="card"><h3 className="section-title">Purchases Export</h3><button className="btn secondary" onClick={()=>{let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(d.purchases),"Purchases");XLSX.writeFile(wb,"AmC_Purchases.xlsx");toast("Purchases exported")}}><Download/> Export Purchases</button></div></Page>
}

function AdminPanel({d,user,go,toast}){
 const [confirmText,setConfirmText]=useState("");const purge=async()=>{if(confirmText!=="DELETE"){toast("Type DELETE first");return}for(const k of ["invoices","purchases","agreements"]){let s=await getDocs(collection(db,k));let batch=writeBatch(db);let n=0;for(const x of s.docs){batch.delete(x.ref);n++;if(n===450){await batch.commit();batch=writeBatch(db);n=0}}if(n)await batch.commit()}toast("Transactions cleared");setConfirmText("")};
 return <Page title="Admin Panel" back={()=>go("dashboard")}><div className="card"><h3 className="section-title">Cloud</h3><p className="muted">Firestore project connected: <b>a-m-c-a59b4</b>. Realtime listeners are active.</p><div className="success">Users, products, purchases, invoices and agreements sync through Firestore.</div></div><div className="card"><h3 className="section-title">Danger Zone</h3><p className="muted">This clears invoices, purchases and agreements from the cloud. Products and users remain.</p><Field label='Type DELETE to confirm' value={confirmText} set={setConfirmText}/><div className="actions"><button className="btn danger" onClick={purge}><Trash2/> Clear Transactions</button></div></div></Page>
}
function About({go}){return <Page title="About" back={()=>go("dashboard")}><div className="card"><div className="logo" style={{margin:"0 0 12px"}}>AmC</div><h2>Installment Management</h2><p className="muted">React web version of the supplied Android/Jetpack Compose application. Teal/gold theme, roles, realtime Firestore, collections, red zone, completed accounts, customers, inventory, purchases, agreements, reports and export are included.</p><div className="success">Firebase project: a-m-c-a59b4</div></div></Page>}
function Modal({title,close,children}){return <div className="modal-back" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="row between"><h2>{title}</h2><button className="iconbtn" style={{color:"var(--teal)"}} onClick={close}>×</button></div>{children}</div></div>}
function downloadBlob(text,name,type){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

createRoot(document.getElementById("root")).render(<App/>);
