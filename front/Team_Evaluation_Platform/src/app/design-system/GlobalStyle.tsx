export function GlobalStyle() {
  return (
    <style>{`
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      @keyframes twk { 0%,100%{opacity:.25} 50%{opacity:1} }
      @keyframes neb { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(2%,-3%) scale(1.06)} }
      @keyframes nebB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-3%,2%) scale(1.08)} }
      @keyframes chartDraw { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
      @keyframes popIn { from{opacity:0;transform:scale(0)} to{opacity:1;transform:scale(1)} }
      @keyframes orbitSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      @keyframes starBreathe { 0%,100%{filter:brightness(1) saturate(1)} 50%{filter:brightness(1.4) saturate(1.15)} }
      @keyframes targetPulse { 0%{transform:scale(0.5);opacity:.9} 100%{transform:scale(2.1);opacity:0} }
      @keyframes slideInPanel { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
      @keyframes blinkDim { 0%,100%{opacity:1} 50%{opacity:.35} }
      input[type=range]{height:4px;cursor:pointer}
      input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:rgba(255,255,255,0.1)}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;margin-top:-5px}
      ::-webkit-scrollbar{width:3px;height:3px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:rgba(0,200,255,0.2);border-radius:2px}
      textarea{font-family:'Noto Sans KR',sans-serif!important}
    `}</style>
  );
}
