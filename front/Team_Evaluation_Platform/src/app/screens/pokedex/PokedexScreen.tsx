import { useState, useEffect, useMemo } from "react";
import { Search, X, RefreshCw, ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowUpDown } from "lucide-react";
import { listCards, getCard, ApiError } from "../../api";
import type { Rarity, User } from "../../types";
import { STATS } from "../../constants/stats";
import { RARITY } from "../../constants/rarity";
import { cardToUser, deriveEvaluationLocked, totalPower } from "../../lib/cardMapping";
import { DS } from "../../design-system/tokens";
import { GridCard, FlipCard } from "../../components/Card";

// ─── Pokedex Screen ───────────────────────────────────────────────────────────
export function PokedexScreen({ onEval }: { onEval:()=>void }) {
  const [cards, setCards] = useState<User[]|null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Rarity|"all">("all");
  const [sort, setSort] = useState<"name"|"power"|"stat">("power");
  const [sortStat, setSortStat] = useState<string>(STATS[0].key);
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [statMenuOpen, setStatMenuOpen] = useState(false);
  const [modalSummary, setModalSummary] = useState<User|null>(null);
  const [modalDetail, setModalDetail] = useState<User|null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const rarities: (Rarity|"all")[] = ["all","legendary","epic","rare","common"];

  useEffect(()=>{
    listCards()
      .then(list=>setCards(list.map(cardToUser)))
      .catch(e=>setError(e instanceof ApiError ? e.message : "카드 도감을 불러오지 못했습니다."));
  },[]);

  // 평가를 완료하지 않았으면 카드 상세(등급/파워 등)를 볼 수 없으므로, 그 정보에 기대는
  // 정렬·등급 필터는 의미가 없다 — 틀은 그대로 두되 기능은 이름순 고정으로 무력화한다.
  const locked = deriveEvaluationLocked(cards);

  const filtered = useMemo(()=>{
    if (!cards) return [];
    let u = cards.filter(u=>u.name.includes(search));
    if (locked) return [...u].sort((a,b)=>a.name.localeCompare(b.name));
    if (filter!=="all") u=u.filter(x=>x.rarity===filter);
    const dirMul = sortDir==="asc" ? 1 : -1;
    return [...u].sort((a,b)=>{
      if (sort==="name") return a.name.localeCompare(b.name)*dirMul;
      if (sort==="stat") return (a.stats[sortStat as keyof typeof a.stats]-b.stats[sortStat as keyof typeof b.stats])*dirMul;
      return (totalPower(a.stats)-totalPower(b.stats))*dirMul;
    });
  },[cards,search,filter,sort,sortStat,sortDir,locked]);

  async function openCard(u: User) {
    setModalSummary(u); setModalDetail(null); setModalLoading(true);
    try {
      const detail = await getCard(u.id);
      setModalDetail(cardToUser(detail));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "카드 상세 정보를 불러오지 못했습니다.");
    } finally {
      setModalLoading(false);
    }
  }

  const modal = modalDetail ?? modalSummary;

  if (error) return <div style={{ padding:"28px 32px" }}><p style={{ color:"#ef4444", fontFamily:"'Noto Sans KR'", fontSize:13 }}>{error}</p></div>;
  if (!cards) return <div style={{ padding:"28px 32px", display:"flex", alignItems:"center", gap:8 }}><RefreshCw size={16} style={{color:"#00c8ff", animation:"spin 1s linear infinite"}}/><span style={{ color:"#8899bb", fontFamily:"'Noto Sans KR'", fontSize:13 }}>도감을 불러오는 중...</span></div>;

  return (
    <div style={{ padding:"28px 32px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"'Noto Sans KR'", color:"#dde5f0", marginBottom:4 }}>몰입캠프 도감</h1>
        <p style={{ fontSize:12, color:"#8899bb", fontFamily:"'Noto Sans KR'" }}>전체 {cards.length}명의 참가자 카드</p>
        {locked && <p style={{ fontSize:12, color:"#fbbf24", fontFamily:"'Noto Sans KR'", marginTop:6 }}>평가를 완료하면 카드 상세 정보와 정렬·필터 기능을 사용할 수 있습니다.</p>}
      </div>

      {/* Controls */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:8, alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", borderRadius:9, ...DS.glass, flex:"1 1 200px", minWidth:160 }}>
          <Search size={13} style={{color:"#8899bb",flexShrink:0}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 검색" style={{ background:"none", border:"none", outline:"none", color:"#dde5f0", fontSize:13, fontFamily:"'Noto Sans KR'", width:"100%" }}/>
        </div>
        <div style={{ display:"flex", gap:5, opacity:locked?0.4:1, pointerEvents:locked?"none":"auto" }}>
          {rarities.map(r=>(
            <button key={r} disabled={locked} onClick={()=>setFilter(r)} style={{
              padding:"6px 11px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:filter===r?(r==="all"?"rgba(0,200,255,0.15)":RARITY[r as Rarity].bg):"rgba(255,255,255,0.03)",
              color:filter===r?(r==="all"?"#00c8ff":RARITY[r as Rarity].color):"#8899bb",
              border:`1px solid ${filter===r?(r==="all"?"rgba(0,200,255,0.3)":RARITY[r as Rarity].border):"rgba(255,255,255,0.07)"}`,
            }}>{r==="all"?"전체":RARITY[r as Rarity].label}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:5, opacity:locked?0.4:1, pointerEvents:locked?"none":"auto" }}>
          {[{k:"power",l:"전투력"},{k:"name",l:"이름"}].map(({k,l})=>(
            <button key={k} disabled={locked} onClick={()=>setSort(k as typeof sort)} style={{
              padding:"6px 10px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:sort===k?"rgba(168,85,247,0.12)":"rgba(255,255,255,0.03)",
              color:sort===k?"#a855f7":"#8899bb",
              border:`1px solid ${sort===k?"rgba(168,85,247,0.3)":"rgba(255,255,255,0.07)"}`,
              display:"flex", alignItems:"center", gap:4,
            }}><ArrowUpDown size={10}/>{l}</button>
          ))}
          <div
            onMouseEnter={()=>setStatMenuOpen(true)}
            onMouseLeave={()=>setStatMenuOpen(false)}
            style={{ position:"relative" }}
          >
            <button disabled={locked} onClick={()=>setSort("stat")} style={{
              padding:"6px 10px", borderRadius:7, fontSize:11, fontFamily:"'Noto Sans KR'", cursor:"pointer", transition:"all 0.15s",
              background:sort==="stat"?"rgba(168,85,247,0.12)":"rgba(255,255,255,0.03)",
              color:sort==="stat"?"#a855f7":"#8899bb",
              border:`1px solid ${sort==="stat"?"rgba(168,85,247,0.3)":"rgba(255,255,255,0.07)"}`,
              display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap",
            }}><ArrowUpDown size={10}/>능력치{sort==="stat" && `: ${STATS.find(s=>s.key===sortStat)?.label}`}</button>
            {statMenuOpen && (
              <div style={{
                position:"absolute", top:"100%", left:0, paddingTop:4, zIndex:70,
                display:"flex", flexDirection:"column", minWidth:110,
              }}>
              <div style={{
                background:"#0e1526", border:"1px solid rgba(168,85,247,0.25)", borderRadius:9,
                boxShadow:"0 10px 30px rgba(0,0,0,0.5)", padding:4, display:"flex", flexDirection:"column",
              }}>
                {STATS.map(s=>(
                  <button key={s.key} onClick={()=>{setSort("stat");setSortStat(s.key);setStatMenuOpen(false);}} style={{
                    display:"flex", alignItems:"center", gap:6, padding:"6px 9px", borderRadius:6, fontSize:11, fontFamily:"'Noto Sans KR'",
                    background:sort==="stat"&&sortStat===s.key?"rgba(168,85,247,0.15)":"transparent",
                    color:sort==="stat"&&sortStat===s.key?"#a855f7":"#c7d2e6", border:"none", cursor:"pointer", textAlign:"left",
                  }}><s.Icon size={11} style={{color:s.color}}/>{s.label}</button>
                ))}
              </div>
              </div>
            )}
          </div>
          <button disabled={locked} onClick={()=>setSortDir(d=>d==="desc"?"asc":"desc")} title={sortDir==="desc"?"내림차순":"오름차순"} style={{
            padding:"6px 8px", borderRadius:7, cursor:"pointer", transition:"all 0.15s",
            background:"rgba(255,255,255,0.03)", color:"#8899bb", border:"1px solid rgba(255,255,255,0.07)",
            display:"flex", alignItems:"center",
          }}>
            {sortDir==="desc" ? <ArrowDownWideNarrow size={13}/> : <ArrowUpNarrowWide size={13}/>}
          </button>
        </div>
      </div>
      <p style={{ fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'", marginTop:0, marginBottom:20 }}>검색 결과: {filtered.length}명</p>

      {/* Grid */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
        {filtered.map(u=>(
          <GridCard key={u.id} user={u} onClick={()=>openCard(u)} locked={locked}/>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(4,7,14,0.82)", backdropFilter:"blur(8px)" }} onClick={()=>{setModalSummary(null);setModalDetail(null);}}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"relative" }}>
            <button onClick={()=>{setModalSummary(null);setModalDetail(null);}} style={{ position:"absolute", top:-42, right:0, width:32, height:32, borderRadius:999, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"#8899bb", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15}/></button>
            <FlipCard user={modal} w={300} h={460} locked={!(modal?.isUnlocked ?? false)} onUnlock={onEval} hexSize={255}/>
            <p style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#4a5a7a", fontFamily:"'Noto Sans KR'" }}>카드를 클릭해 앞/뒤를 확인하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}
