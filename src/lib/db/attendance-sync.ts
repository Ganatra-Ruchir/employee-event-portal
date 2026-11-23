/** Single transactional write path for both V3 and V4 verified attendance. */
export type AttendanceWriter={query:(text:string,values?:unknown[])=>Promise<unknown>};
export type AttendanceInput={eventId:string;userId:string;status:"present"|"absent";minutes:number;contribution:string;verifiedBy:string};
export async function writeVerifiedAttendance(client:AttendanceWriter,input:AttendanceInput){
 const {eventId,userId,status,minutes,contribution,verifiedBy}=input;
 if(!["present","absent"].includes(status)||!Number.isInteger(minutes)||minutes<0||minutes>10080||contribution.length>1000)throw new Error("Invalid verified attendance");
 await client.query("INSERT INTO event_attendance(event_id,user_id,status,verified_by) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,verified_by=excluded.verified_by,verified_at=now()",[eventId,userId,status,verifiedBy]);
 if(status==="present"){
  await client.query("INSERT INTO v3_contributions(event_id,user_id,volunteer_minutes,contribution,verified_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO UPDATE SET volunteer_minutes=excluded.volunteer_minutes,contribution=excluded.contribution,verified_by=excluded.verified_by,verified_at=now()",[eventId,userId,minutes,contribution,verifiedBy]);
 }else{
  await client.query("DELETE FROM v3_contributions WHERE event_id=$1 AND user_id=$2",[eventId,userId]);
 }
}
