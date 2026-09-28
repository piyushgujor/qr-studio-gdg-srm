import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import QRCode from 'qrcode';
import './styles.css';

const TYPES=['URL','Plain Text','Email','Phone Number','Wi-Fi'];
const PRESETS={
  Classic:{fg:'#111827',bg:'#ffffff',ecc:'M',margin:4,size:320},
  Dark:{fg:'#ffffff',bg:'#111827',ecc:'H',margin:4,size:320},
  Ocean:{fg:'#075985',bg:'#e0f2fe',ecc:'M',margin:4,size:320}
};
const initial={type:'URL',url:'https://example.com',text:'',email:'',subject:'',message:'',phone:'',ssid:'',password:'',security:'WPA',hidden:false,fg:'#111827',bg:'#ffffff',ecc:'M',margin:4,size:320};

function App(){
  const [data,setData]=useState(()=>{try{return {...initial,...JSON.parse(localStorage.getItem('qr-current')||'{}')}}catch{return initial}});
  const [theme,setTheme]=useState(()=>localStorage.getItem('qr-theme')||'light');
  const [recent,setRecent]=useState(()=>{try{return JSON.parse(localStorage.getItem('qr-recent')||'[]')}catch{return []}});
  const [notice,setNotice]=useState('');
  const [canvasUrl,setCanvasUrl]=useState('');
  const canvasRef=useRef(null);

  useEffect(()=>{localStorage.setItem('qr-theme',theme);document.documentElement.dataset.theme=theme},[theme]);
  useEffect(()=>{localStorage.setItem('qr-current',JSON.stringify(data))},[data]);
  const value=useMemo(()=>buildValue(data),[data]);
  const validation=useMemo(()=>validate(data),[data]);
  const reliability=useMemo(()=>getReliability(data),[data]);

  useEffect(()=>{let cancelled=false; if(!validation.valid){setCanvasUrl('');return;} QRCode.toDataURL(value,{width:data.size,margin:data.margin,errorCorrectionLevel:data.ecc,color:{dark:data.fg,light:data.bg}}).then(url=>{if(!cancelled)setCanvasUrl(url)}).catch(()=>setCanvasUrl('')); return ()=>{cancelled=true}},[value,data.size,data.margin,data.ecc,data.fg,data.bg,validation.valid]);

  const update=(patch)=>setData(d=>({...d,...patch}));
  const generateLabel=labelFor(data);
  const saveRecent=()=>{
    if(!validation.valid){setNotice(validation.message);return}
    const item={id:Date.now(),type:data.type,label:generateLabel,value,config:{...data},created:new Date().toLocaleString()};
    const next=[item,...recent.filter(x=>x.value!==value)].slice(0,10); setRecent(next); localStorage.setItem('qr-recent',JSON.stringify(next)); setNotice('Saved to recent QR codes');
  };
  const download=async()=>{if(!validation.valid){setNotice(validation.message);return;} const url=await QRCode.toDataURL(value,{width:data.size,margin:data.margin,errorCorrectionLevel:data.ecc,color:{dark:data.fg,light:data.bg}}); const a=document.createElement('a');a.href=url;a.download=`qr-studio-${slug(generateLabel)}.png`;a.click();setNotice('PNG downloaded');};
  const copy=async()=>{if(!validation.valid)return setNotice(validation.message); try{await navigator.clipboard.writeText(value);setNotice('QR data copied')}catch{setNotice('Clipboard unavailable')}};

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">⌁</div><div><strong>QR Studio</strong><span>Create. Customize. Scan.</span></div></div><div className="header-actions"><span className="status-dot">Browser-only</span><button className="icon-btn" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Toggle theme">{theme==='light'?'☾':'☀'}</button></div></header>
    <main className="container">
      <section className="hero"><div><p className="eyebrow">QR CODE GENERATOR & DESIGNER</p><h1>Create. Customize. <em>Scan.</em></h1><p>Generate beautiful QR codes in seconds. Everything runs locally in your browser — no backend required.</p></div><div className="hero-badge"><span>●</span> Private by design</div></section>
      <div className="workspace">
        <section className="panel controls">
          <div className="panel-head"><div><h2>Configure QR</h2><p>Choose a type and customize it.</p></div><span className="step">01</span></div>
          <label>QR Type</label><div className="type-grid">{TYPES.map(t=><button key={t} className={data.type===t?'type active':'type'} onClick={()=>update({type:t})}>{typeIcon(t)}<span>{t}</span></button>)}</div>
          <Form data={data} update={update}/>
          <div className="divider"/><div className="panel-head compact"><div><h3>Customization</h3><p>Changes update the preview instantly.</p></div></div>
          <div className="two"><Field label="QR size"><input type="range" min="180" max="600" step="10" value={data.size} onChange={e=>update({size:+e.target.value})}/><span className="range-value">{data.size}px</span></Field><Field label="Margin"><input type="range" min="0" max="12" value={data.margin} onChange={e=>update({margin:+e.target.value})}/><span className="range-value">{data.margin}</span></Field></div>
          <div className="two"><ColorField label="Foreground" value={data.fg} onChange={fg=>update({fg})}/><ColorField label="Background" value={data.bg} onChange={bg=>update({bg})}/></div>
          <Field label="Error correction"><select value={data.ecc} onChange={e=>update({ecc:e.target.value})}><option value="L">L — Low</option><option value="M">M — Medium</option><option value="Q">Q — Quartile</option><option value="H">H — High</option></select></Field>
          <div className="presets"><span>Presets</span><div>{Object.keys(PRESETS).map(p=><button key={p} onClick={()=>update(PRESETS[p])}>{p}</button>)}</div></div>
          <div className="reliability"><span className={`reliability-dot ${reliability.level.toLowerCase()}`}></span><div><strong>Scan reliability: {reliability.level}</strong><small>{reliability.message}</small></div></div>
          {notice&&<div className="notice" role="status">{notice}</div>}
        </section>

        <section className="panel preview-panel"><div className="panel-head"><div><h2>Live Preview</h2><p>Your QR updates as you edit.</p></div><span className="step">02</span></div>
          <div className="preview-stage"><div className="qr-card">{canvasUrl?<img src={canvasUrl} alt="Generated QR code"/>:<div className="empty-qr">{validation.message||'Enter valid information'}</div>}</div><div className="preview-meta"><span className="pill">{data.type}</span><span>{data.size} × {data.size}px</span></div></div>
          <div className="actions"><button className="primary" onClick={download}>↓ Download PNG</button><button className="secondary" onClick={copy}>Copy data</button><button className="secondary" onClick={saveRecent}>Save</button></div>
          <div className="divider"/><div className="recent-head"><div><h3>Recent QR Codes</h3><p>Saved locally on this device.</p></div>{recent.length>0&&<button className="text-btn" onClick={()=>{setRecent([]);localStorage.removeItem('qr-recent')}}>Clear all</button>}</div>
          <div className="recent-list">{recent.length===0?<div className="empty-recent"><span>◌</span><p>No saved QR codes yet.</p><small>Click Save after creating one.</small></div>:recent.map(item=><div className="recent-item" key={item.id}><div className="mini-qr"><img src={itemThumbnail(item)} alt=""/></div><div className="recent-info"><strong>{item.label}</strong><span>{item.type} · {item.created}</span></div><button className="load-btn" onClick={()=>update(item.config)}>Load</button><button className="delete-btn" onClick={()=>{const n=recent.filter(x=>x.id!==item.id);setRecent(n);localStorage.setItem('qr-recent',JSON.stringify(n))}}>×</button></div>)}</div>
        </section>
      </div>
      <footer><span>QR Studio</span><span>Runs entirely in your browser • Your data stays on your device</span></footer>
    </main>
  </div>
}

function Form({data,update}){if(data.type==='URL')return <Field label="Website URL" error={!validate(data).valid?validate(data).message:''}><input value={data.url} onChange={e=>update({url:e.target.value})} placeholder="https://example.com"/></Field>;
if(data.type==='Plain Text')return <Field label="Text"><textarea value={data.text} onChange={e=>update({text:e.target.value})} placeholder="Enter any text..." rows="4"/></Field>;
if(data.type==='Email')return <><Field label="Email address"><input type="email" value={data.email} onChange={e=>update({email:e.target.value})} placeholder="hello@example.com"/></Field><div className="two"><Field label="Subject"><input value={data.subject} onChange={e=>update({subject:e.target.value})} placeholder="Hello"/></Field><Field label="Message"><input value={data.message} onChange={e=>update({message:e.target.value})} placeholder="Your message"/></Field></div></>;
if(data.type==='Phone Number')return <Field label="Phone number"><input value={data.phone} onChange={e=>update({phone:e.target.value})} placeholder="+91 98765 43210"/></Field>;
return <><Field label="Network name (SSID)"><input value={data.ssid} onChange={e=>update({ssid:e.target.value})} placeholder="My Wi-Fi"/></Field><div className="two"><Field label="Password"><input type="password" value={data.password} onChange={e=>update({password:e.target.value})} placeholder="Password"/></Field><Field label="Security"><select value={data.security} onChange={e=>update({security:e.target.value})}><option>WPA</option><option>WEP</option><option value="nopass">None</option></select></Field></div><label className="check"><input type="checkbox" checked={data.hidden} onChange={e=>update({hidden:e.target.checked})}/> Hidden network</label></>}
function Field({label,children,error}){return <div className="field"><div className="field-label"><label>{label}</label>{error&&<span className="error">{error}</span>}</div>{children}</div>}
function ColorField({label,value,onChange}){return <div className="field"><label>{label}</label><div className="color-input"><input type="color" value={value} onChange={e=>onChange(e.target.value)}/><input value={value} onChange={e=>onChange(e.target.value)} maxLength="7"/></div></div>}
function buildValue(d){switch(d.type){case'URL':return d.url;case'Plain Text':return d.text;case'Email':return `mailto:${d.email}${d.subject||d.message?`?${new URLSearchParams({...(d.subject?{subject:d.subject}:{}),...(d.message?{body:d.message}:{})})}`:''}`;case'Phone Number':return `tel:${d.phone}`;case'Wi-Fi':return `WIFI:T:${d.security};S:${escapeWifi(d.ssid)};P:${escapeWifi(d.password)};H:${d.hidden?'true':'false'};;`;default:return''}}
function validate(d){if(d.type==='URL'&&(!d.url||!/^https?:\/\//i.test(d.url)))return{valid:false,message:'Enter a valid URL starting with http:// or https://'};if(d.type==='Plain Text'&&!d.text.trim())return{valid:false,message:'Enter some text'};if(d.type==='Email'&&(!/^\S+@\S+\.\S+$/.test(d.email)))return{valid:false,message:'Enter a valid email address'};if(d.type==='Phone Number'&&d.phone.replace(/\D/g,'').length<7)return{valid:false,message:'Enter a valid phone number'};if(d.type==='Wi-Fi'&&!d.ssid.trim())return{valid:false,message:'Enter a Wi-Fi network name'};return{valid:true,message:''}}
function getReliability(d){const contrast=contrastRatio(d.fg,d.bg);if(contrast<3)return{level:'Caution',message:'Increase foreground/background contrast for better scanning.'};if(d.size<220)return{level:'Caution',message:'A larger QR size is recommended for reliable scanning.'};return{level:'Good',message:'Current settings should provide good scan readability.'}}
function contrastRatio(a,b){const lum=x=>{const c=[parseInt(x.slice(1,3),16),parseInt(x.slice(3,5),16),parseInt(x.slice(5,7),16)].map(v=>v/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]};const l1=lum(a),l2=lum(b);return(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
function escapeWifi(s){return String(s).replace(/([\\;,:])/g,'\\$1')}
function labelFor(d){switch(d.type){case'URL':return d.url||'Website QR';case'Plain Text':return d.text.slice(0,28)||'Text QR';case'Email':return d.email||'Email QR';case'Phone Number':return d.phone||'Phone QR';case'Wi-Fi':return d.ssid||'Wi-Fi QR';default:return'QR Code'}}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,35)||'code'}
function itemThumbnail(item){let canvas=document.createElement('canvas');try{QRCode.toDataURL(item.value,{width:64,margin:1,errorCorrectionLevel:item.config.ecc,color:{dark:item.config.fg,light:item.config.bg}}).then(()=>{});return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${item.config.bg}"/><text x="32" y="37" text-anchor="middle" font-size="9" fill="${item.config.fg}">QR</text></svg>`)}` }catch{return ''}}
function typeIcon(t){return {URL:'↗','Plain Text':'Aa','Email':'@','Phone Number':'⌕','Wi-Fi':'⌁'}[t]}
createRoot(document.getElementById('root')).render(<App/>);
