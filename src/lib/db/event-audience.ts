/** SQL predicate for V4 employee event audiences. Callers must also check the event organization. */
export function v4AudienceSql(eventAlias:"e"|"events",userParameter:"$2"="$2"){
 const e=eventAlias,u=userParameter.trim();
 return "(" +
 "NOT EXISTS (SELECT 1 FROM event_audiences a WHERE a.event_id="+e+".id) OR " +
 "EXISTS (SELECT 1 FROM event_audiences a WHERE a.event_id="+e+".id AND (" +
 "a.audience='company' OR " +
 "(a.audience='invited' AND EXISTS (SELECT 1 FROM event_invitees i WHERE i.event_id="+e+".id AND i.user_id="+u+")) OR " +
 "EXISTS (SELECT 1 FROM v3_memberships m WHERE m.user_id="+u+" AND m.organization_id="+e+".organization_id AND m.level IN ('employee','state_admin') AND (" +
 "(a.audience='country' AND m.country_code=a.country_code) OR " +
 "(a.audience='state' AND m.country_code=a.country_code AND m.state_id=a.state_id) OR " +
 "(a.audience='branch' AND m.country_code=a.country_code AND m.state_id=a.state_id AND m.branch_id=a.branch_id)" +
 ")))))";
}
