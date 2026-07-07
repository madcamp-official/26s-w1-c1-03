export function GlobalStyle() {
  return (
    <style>{`
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
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
