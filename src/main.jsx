import React from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
function App(){ React.useEffect(()=>{ const s=document.createElement('script'); s.src='/app-engine.js'; s.onload=()=>{}; document.body.appendChild(s); return()=>{}; },[]); return <div id="root-engine"></div> }
createRoot(document.getElementById('root')).render(<App/>);
