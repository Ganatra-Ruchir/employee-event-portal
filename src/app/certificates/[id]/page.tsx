import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {getSession,databaseEnabled,sqlPool} from "@/lib/db/server";
import PrintCertificate from "@/components/print-certificate";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export default async function CertificatePage({params}:{params:Promise<{id:string}>}){
 if(process.env.PORTAL_V4_ENABLED!=="true"||!databaseEnabled())notFound();
 const {id}=await params;
 if(!/^[a-z0-9-]{20,100}$/i.test(id))notFound();
 const token=(await cookies()).get("elixir_session")?.value;
 const current=await getSession(token);
 if(!current)redirect("/login");
 if(!current.verified||current.mustChangePassword)notFound();
 const result=await sqlPool().query(
  "SELECT c.certificate_number,c.issued_at,u.full_name,e.title,e.starts_at,e.ends_at,v.volunteer_minutes,o.name AS organization_name "+
  "FROM volunteer_certificates c JOIN users u ON u.id=c.user_id JOIN events e ON e.id=c.event_id "+
  "JOIN organizations o ON o.id=e.organization_id LEFT JOIN v3_contributions v ON v.event_id=c.event_id AND v.user_id=c.user_id "+
  "JOIN event_attendance a ON a.event_id=c.event_id AND a.user_id=c.user_id "+
  "WHERE c.id=$1 AND c.user_id=$2 AND c.revoked_at IS NULL AND a.status='present' AND e.ends_at<=now() AND e.organization_id=$3",
  [id,current.id,current.companyId]);
 if(!result.rowCount)notFound();
 const cert=result.rows[0];
 const stamp=(v:Date|string)=>new Date(v).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kolkata"});
 return <main style={{background:"#f2f3f0",minHeight:"100vh",padding:"32px 12px",fontFamily:"Arial, sans-serif",color:"#383536"}}>
   <style>{`@media print {body{background:#fff!important;} .certificate-print-controls{display:none!important;} .certificate-page{box-shadow:none!important;border:4px solid #51c220!important;max-width:100%!important;min-height:200mm!important;} @page{size:A4 landscape;margin:12mm;}}`}</style>
   <div className="certificate-print-controls" style={{maxWidth:990,margin:"0 auto 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
    <a href="/impact">← Back to impact workspace</a><PrintCertificate/>
   </div>
   <article className="certificate-page" style={{maxWidth:990,margin:"0 auto",padding:"55px 45px",background:"#fff",border:"5px solid #51c220",boxShadow:"0 12px 40px rgba(0,0,0,.07)",textAlign:"center",minHeight:610,boxSizing:"border-box"}}>
    <p style={{fontWeight:800,textTransform:"uppercase",letterSpacing:4,fontSize:16,color:"#51a622"}}>{cert.organization_name}</p>
    <h1 style={{fontFamily:"Georgia,serif",fontSize:46,margin:"35px 0 12px"}}>Certificate of Volunteering</h1>
    <p style={{fontSize:18,margin:"18px 0"}}>This certificate acknowledges the verified participation of</p>
    <p style={{fontSize:36,fontFamily:"Georgia,serif",fontWeight:700,color:"#383536",borderBottom:"2px solid #ec1e82",display:"inline-block",padding:"5px 20px"}}>{cert.full_name}</p>
    <p style={{fontSize:18,maxWidth:700,margin:"26px auto",lineHeight:1.7}}>in <strong>{cert.title}</strong>, conducted on {stamp(cert.starts_at)}. Participation and volunteer time have been recorded and verified by the event administrator.</p>
    <p style={{fontSize:20,fontWeight:700}}>Verified volunteer hours: {Number((Number(cert.volunteer_minutes||0)/60).toFixed(2))}</p>
    <div style={{display:"flex",justifyContent:"space-between",gap:15,marginTop:55,borderTop:"1px solid #dadada",paddingTop:22,fontSize:13}}>
     <span>Issued: {stamp(cert.issued_at)}</span><span>Certificate ID: {cert.certificate_number}</span>
    </div>
    <p style={{fontSize:12,color:"#666",marginTop:20}}>Issued from verified system attendance. No handwritten signature is implied.</p>
   </article>
  </main>;
}
