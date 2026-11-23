"use client";
export default function PrintCertificate(){return <button type="button" onClick={()=>window.print()} style={{padding:"12px 20px",background:"#235c1b",color:"#fff",border:0,borderRadius:8,cursor:"pointer"}}>Print or save as PDF</button>;}
