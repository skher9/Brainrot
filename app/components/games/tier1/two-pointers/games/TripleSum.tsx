"use client";
import type { GameProps } from "../types";
export default function TripleSum({ onSolve, onAttempt }: GameProps) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16,fontFamily:"var(--font-mono,'JetBrains Mono',monospace)",color:"#475569",fontSize:12 }}>
      <div>P5 — Triple Sum</div>
      <div style={{fontSize:10,color:"#374151"}}>3Sum fix + two pointers coming soon</div>
      <button onClick={()=>{onAttempt();onSolve();}} style={{padding:"8px 20px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:4,cursor:"pointer",fontSize:11,color:"#22c55e",fontFamily:"inherit"}}>Mark Solved</button>
    </div>
  );
}
