const $=id=>document.getElementById(id);
const airports={KABQ:{name:"Albuquerque International Sunport",elev:5355},KSAF:{name:"Santa Fe Regional",elev:6348},K0E0:{name:"Moriarty Municipal",elev:6204},custom:{name:"Custom location",elev:6900}};
const defaults={airport:"KABQ",elevation:"5355",temperature:"69.5",altimeter:"30.308",dewpoint:"",humidity:false,unit:"F",metarTime:"",metarRaw:"",metarStation:""};
let state={...defaults};
try{const saved=JSON.parse(localStorage.getItem("da-settings"));if(saved&&typeof saved==="object")state={...state,...saved};}catch{}
const fmt=n=>Math.round(n).toLocaleString("en-US");
const toC=n=>state.unit==="F"?(n-32)*5/9:n;
function setStatus(s,cls=""){ $("weather-status").textContent=s;$("weather-status").className="status "+cls; }
function save(){try{localStorage.setItem("da-settings",JSON.stringify(state));}catch{}}
function markManual(){state.metarTime="";state.metarRaw="";state.metarStation="";setStatus("Manual weather · no live data loaded");}
function draw(){
$("airport").value=airports[state.airport]?state.airport:"custom";
$("airport-name").textContent=airports[state.airport]?.name||"Custom location";
$("airport-elevation").textContent=state.elevation?Number(state.elevation).toLocaleString()+" ft":"";
for(const k of ["elevation","temperature","altimeter","dewpoint"])if(document.activeElement!==$(k))$(k).value=state[k];
$("humidity").checked=state.humidity;$("dew-wrap").classList.toggle("hidden",!state.humidity);
$("fahrenheit").classList.toggle("active",state.unit==="F");$("celsius").classList.toggle("active",state.unit==="C");
$("temp-label").textContent=`Outside air temperature (°${state.unit})`;$("dew-label").textContent=`Dew point (°${state.unit})`;
const e=Number(state.elevation),a=Number(state.altimeter),t=toC(Number(state.temperature));
const valid=state.elevation.trim()!==""&&state.temperature.trim()!==""&&state.altimeter.trim()!==""&&Number.isFinite(e)&&Number.isFinite(a)&&Number.isFinite(t)&&a>20&&a<35&&e>-1500&&e<30000&&t>-90&&t<65;
if(!valid){$("da").textContent="—";$("pa").textContent="—";$("isa").textContent="—";$("difference").textContent="Enter valid conditions";return;}
const pa=e+145366.45*(1-Math.pow(a/29.92126,0.190284));
const isa=15-0.0019812*pa;
const p=101325*Math.pow(1-0.0065*e/288.15,5.2558797)*(a/29.92126);
let pv=0;
if(state.humidity&&state.dewpoint.trim()!==""){
 const dew=toC(Number(state.dewpoint));
 if(Number.isFinite(dew)&&dew<=t&&dew>-100)pv=Math.min(p*.99,611.2*Math.exp(17.67*dew/(dew+243.5)));
}
const rho=(p-pv)/(287.05*(t+273.15))+pv/(461.495*(t+273.15));
const da=44330.77*(1-Math.pow(rho/1.225,1/4.2558797));
if(!Number.isFinite(da))return;
$("da").textContent=fmt(da);$("pa").textContent=fmt(pa)+" ft";
$("isa").textContent=(t-isa>=0?"+":"")+(t-isa).toFixed(1)+" °C";
$("difference").textContent=(da-e>=0?"+":"")+fmt(da-e)+" ft relative to field elevation";
$("source-tag").textContent=state.metarTime?`METAR ${state.metarStation} · ${state.metarTime}`:"MANUAL WEATHER · ESTIMATED";
}
function update(k,v){state[k]=v;markManual();save();draw();}
for(const k of ["elevation","temperature","altimeter","dewpoint"])$(k).addEventListener("input",ev=>{state[k]=ev.target.value;if(k==="elevation")state.airport="custom";markManual();save();draw();});
$("humidity").addEventListener("change",ev=>update("humidity",ev.target.checked));
$("airport").addEventListener("change",ev=>{state.airport=ev.target.value;state.elevation=String(airports[state.airport].elev);markManual();save();draw();});
function setUnit(unit){if(state.unit===unit)return;for(const k of ["temperature","dewpoint"]){if(state[k].trim()!==""){const n=Number(state[k]);state[k]=String(Math.round((unit==="C"?(n-32)*5/9:n*9/5+32)*10)/10);}}state.unit=unit;save();draw();}
$("fahrenheit").onclick=()=>setUnit("F");$("celsius").onclick=()=>setUnit("C");
$("manual").onclick=()=>{markManual();save();draw();};
$("reset").onclick=()=>{state={...defaults};save();draw();setStatus("Reset to KABQ · manual weather");};
$("copy").onclick=async()=>{const msg=`Density Altitude\nLocation: ${state.airport}\nElevation: ${state.elevation} ft MSL\nTemperature: ${state.temperature} °${state.unit}\nAltimeter: ${state.altimeter} inHg\nDA: ${$("da").textContent} ft\nPA: ${$("pa").textContent}\nISA deviation: ${$("isa").textContent}\nSource: ${$("source-tag").textContent}`;try{await navigator.clipboard.writeText(msg);setStatus("Calculation copied.");}catch{setStatus("Clipboard unavailable; use a secure HTTPS connection.","warn");}};
function normalizeIdent(s){const id=s.trim().toUpperCase();if(!/^[A-Z0-9]{3,5}$/.test(id))throw Error("Enter a valid airport identifier.");return id;}
async function fetchMetar(id){
const url=`https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(id)}&format=json`;
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
try{const res=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"},cache:"no-store"});if(!res.ok)throw Error("Weather service returned "+res.status);const data=await res.json();if(!Array.isArray(data)||!data.length)throw Error("No current METAR available for "+id);return data.find(x=>(x.icaoId||x.station||"").toUpperCase()===id)||data[0];}finally{clearTimeout(timer);}
}
function getNumber(m,...keys){for(const k of keys)if(m[k]!==undefined&&m[k]!==null&&m[k]!==""){const v=Number(m[k]);if(Number.isFinite(v))return v;}return null;}
async function load(id){
$("metar").disabled=true;$("lookup").disabled=true;setStatus("Retrieving latest METAR for "+id+"…");
try{
const m=await fetchMetar(id);
const t=getNumber(m,"temp","tempC"),a=getNumber(m,"altim","altimeter"),d=getNumber(m,"dewp","dewpoint"),e=getNumber(m,"elev","elevation");
if(t===null||a===null)throw Error("METAR missing temperature or altimeter.");
// NOAA JSON altim is reported in hPa; some services return inHg.
const alt=a>100?a/33.8638866667:a;
if(alt<20||alt>35)throw Error("Unexpected altimeter units.");
const ident=(m.icaoId||m.station||id).toUpperCase();
state.airport=airports[ident]?ident:"custom";
if(e!==null&&e>0&&e<30000)state.elevation=String(Math.round(e*3.280839895)); // API elevation is meters
else if(airports[ident])state.elevation=String(airports[ident].elev);
else if(ident!==state.metarStation)throw Error("Airport elevation unavailable; enter it manually.");
state.temperature=String(Math.round((state.unit==="F"?t*9/5+32:t)*10)/10);
state.altimeter=alt.toFixed(3);
if(d!==null)state.dewpoint=String(Math.round((state.unit==="F"?d*9/5+32:d)*10)/10);
state.metarStation=ident;state.metarTime=m.obsTime?new Date(typeof m.obsTime==="number"?m.obsTime*1000:m.obsTime).toLocaleString():"time not provided";
state.metarRaw=m.rawOb||m.rawMETAR||"";
save();draw();setStatus("Loaded "+ident+" · "+state.metarTime+(state.metarRaw?" · "+state.metarRaw:""));
}catch(err){setStatus("Live weather unavailable: "+err.message+" Manual calculator still works.","warn");}
finally{$("metar").disabled=false;$("lookup").disabled=false;}
}
$("metar").onclick=()=>load(state.airport==="custom"?normalizeIdent($("icao").value):state.airport);
$("lookup").onclick=()=>{try{load(normalizeIdent($("icao").value));}catch(e){setStatus(e.message,"warn");}};
if(state.metarTime)setStatus("Last saved METAR: "+state.metarStation+" · "+state.metarTime+" (may be stale)","warn");
draw();
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
