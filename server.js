const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN_TG = "8825910376:AAHpnjHuhaLyJhQMI9oOZmqxEcupaId-54E";
const CHAT_ID_TG = "8639536197";
const ACTIVOS = ["BTCUSDT","BULLAUSDT","PUMPUSDT","BNBUSDT","SOLUSDT","ETHUSDT","XRPUSDT","DOGEUSDT"];
let estado = {};
let preAlertas = {};

const PALABRAS = ['FED','TRUMP','ELON','MUSK','BINANCE','SEC','ETF','WAR','TARIFF','ARANCEL','POWELL','RATE','HACK'];

function enviarTG(texto){
  fetch(`https://api.telegram.org/bot${TOKEN_TG}/sendMessage?chat_id=${CHAT_ID_TG}&text=${encodeURIComponent(texto)}`).then(r=>console.log("TG ENVIADO", texto.slice(0,50))).catch(e=>console.log("TG ERROR",e));
}

// --- INDICADORES ---
function ema(a,p){let k=2/(p+1),e=a[0];for(let i=1;i<a.length;i++)e=a[i]*k+e*(1-k);return e;}
function rsi(a){let g=0,l=0;for(let i=1;i<14;i++){let d=a[a.length-i]-a[a.length-i-1];if(d>0)g+=d;else l+=-d;}if(l==0)return 100;let rs=g/l;return 100-(100/(1+rs));}
function boll(a){let s=a.slice(-20).reduce((x,y)=>x+y,0)/20,st=Math.sqrt(a.slice(-20).map(x=>(x-s)**2).reduce((x,y)=>x+y,0)/20);return{up:s+st*2,dn:s-st*2}}
function atr(k){let tr=[];for(let i=1;i<k.length;i++){let h=parseFloat(k[i][2]),l=parseFloat(k[i][3]),pc=parseFloat(k[i-1][4]);tr.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)));}let avg=tr.slice(-14).reduce((x,y)=>x+y,0)/14;return avg==0?parseFloat(k[k.length-1][4])*0.015:avg;}
function vwap(k){let pv=0,v=0;for(let x of k.slice(-20)){let p=(parseFloat(x[2])+parseFloat(x[3])+parseFloat(x[4]))/3,vol=parseFloat(x[5]);pv+=p*vol;v+=vol;}return v===0?parseFloat(k[k.length-1][4]):pv/v;}

async function fetchTF(sym,interval){
  try{
    let r=await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${interval}&limit=60`);
    let k=await r.json();
    if(!k||k.length<30)return null;
    let closes=k.map(x=>parseFloat(x[4]));
    let vols=k.map(x=>parseFloat(x[5]));
    let avg=vols.slice(-20).reduce((x,y)=>x+y,0)/20;
    return {closes, precio:closes[closes.length-1], ema9:ema(closes,9), ema21:ema(closes,21), rsi:rsi(closes), boll:boll(closes), atr:atr(k), vwap:vwap(k), volRatio:vols[vols.length-1]/avg, klines:k};
  }catch{return null;}
}

async function checkGoogle(sym){
  try{
    let coin=sym.replace('USDT','');
    let rss=`https://news.google.com/rss/search?q=${encodeURIComponent(coin+' crypto')}&hl=es-419&gl=MX&ceid=MX:es-419`;
    let api=`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`;
    let r=await fetch(api); let d=await r.json();
    if(!d.items)return;
    for(let n of d.items.slice(0,3)){
      let up=n.title.toUpperCase();
      let p=PALABRAS.find(x=>up.includes(x));
      if(p){
        if(preAlertas[sym] && Date.now()-preAlertas[sym]<600000) return;
        preAlertas[sym]=Date.now();
        enviarTG(`🚨 PRE-ALERTA GOOGLE 24/7 AUTOMATICA 🚨\n\n💲 ${sym}\n🔥 ${p} DETECTADO\n📰 ${n.title}\n🔗 ${n.link}\n⏰ ${new Date().toLocaleString()}\nBot en vigilancia X20`);
      }
    }
  }catch{}
}

async function check(sym){
  try{
    let main=await fetchTF(sym,'1m');
    if(!main) return;
    if(!estado[sym]) estado[sym]={lastSignal:0};
    if(Date.now()-estado[sym].lastSignal < 600000) return;

    let bullish=0, bearish=0;
    for(let tf of ['5m','15m','1h','4h']){
      let d=await fetchTF(sym,tf);
      if(!d)continue;
      if(d.ema9>d.ema21 && d.rsi>55 && d.precio>d.vwap) bullish++;
      if(d.ema9<d.ema21 && d.rsi<45 && d.precio<d.vwap) bearish++;
    }

    let precio=main.precio;
    let dec=precio<1?6:2;
    // SHORT X20
    if(bearish>=3 && main.rsi>66 && precio>main.boll.up*0.995 && main.volRatio>2.0){
      let sl=precio+main.atr*1.0, tp=precio*0.90;
      enviarTG(`🔥 FENIX 24/7 AUTOMATICO - SHORT 100% 🔥\n\n💲 ${sym}\nTIPO: SHORT -10% X20\n💵 ENTRADA: $${precio.toFixed(dec)}\n🛑 SL: $${sl.toFixed(dec)}\n✅ TP: $${tp.toFixed(dec)}\nRSI: ${main.rsi.toFixed(0)} VOL x${main.volRatio.toFixed(1)}\n⏰ ${new Date().toLocaleString()}\nSin dejar pestaña abierta`);
      estado[sym].lastSignal=Date.now();
    }
    // LONG X20
    if(bullish>=3 && main.rsi<34 && precio<main.boll.dn*1.005 && main.volRatio>2.0){
      let sl=precio-main.atr*1.0, tp=precio*1.10;
      enviarTG(`🔥 FENIX 24/7 AUTOMATICO - LONG 100% 🔥\n\n💲 ${sym}\nTIPO: LONG +10% X20\n💵 ENTRADA: $${precio.toFixed(dec)}\n🛑 SL: $${sl.toFixed(dec)}\n✅ TP: $${tp.toFixed(dec)}\nRSI: ${main.rsi.toFixed(0)} VOL x${main.volRatio.toFixed(1)}\n⏰ ${new Date().toLocaleString()}\nSin dejar pestaña abierta`);
      estado[sym].lastSignal=Date.now();
    }
  }catch(e){console.log("ERR",sym,e.message);}
}

async function loop(){
  console.log("FENIX 24/7 AUTOMATICO CORRIENDO -", new Date().toLocaleString(), "- Monedas:", ACTIVOS.length);
  for(let s of ACTIVOS){
    await check(s);
    await checkGoogle(s);
    await new Promise(r=>setTimeout(r,1500));
  }
}

// Servir tu pagina visual
app.use(express.static(path.join(__dirname)));
app.get('/', (req,res)=>{res.sendFile(path.join(__dirname,'index.html'));});

app.listen(PORT, ()=>{
  console.log(`Servidor en puerto ${PORT}`);
  enviarTG(`✅ FENIX 24/7 AUTOMATICO INICIADO\nBot corriendo en Railway sin necesidad de ventana abierta\nMonedas: ${ACTIVOS.join(', ')}\n${new Date().toLocaleString()}`);
  loop();
  setInterval(loop, 10000); // cada 10 segundos revisa todo
});
