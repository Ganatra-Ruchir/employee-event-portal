import "server-only";

/** Deliver one-time credentials only from the server. Never expose the provider key to the browser. */
export async function sendOnboardingEmail(input:{to:string;name:string;organization:string;employeeId:string;temporaryPassword:string;loginUrl:string}){
 const key=process.env.RESEND_API_KEY,from=process.env.ONBOARDING_FROM_EMAIL;
 if(!key||!from)throw new Error("Onboarding email is not configured (RESEND_API_KEY and ONBOARDING_FROM_EMAIL).");
 const safe=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
 const html='<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#243042"><h2>Welcome to Employee Volunteer System</h2><p>Hello '+safe(input.name)+',</p><p>You have been added as a manager for <strong>'+safe(input.organization)+'</strong>.</p><p><strong>Login ID:</strong> '+safe(input.employeeId)+'</p><p><strong>Email:</strong> '+safe(input.to)+'</p><p><strong>Temporary password:</strong> '+safe(input.temporaryPassword)+'</p><p><a href="'+safe(input.loginUrl)+'">Sign in to the portal</a></p><p>This password expires in 24 hours. Change it immediately after your first sign-in. Do not forward this message.</p></div>';
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from,to:[input.to],subject:"Your Employee Volunteer System manager access",html})});
 if(!response.ok)throw new Error("Email provider rejected the onboarding message ("+response.status+").");
 return true;
}
