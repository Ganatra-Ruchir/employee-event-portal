/** Single source of truth for navigation permissions across database and demo modes.
 * Effective levels come from authenticated V3 membership, not users.role.
 */
export type PortalAccessLevel="root"|"country_admin"|"state_admin"|"employee";
export type PortalNavView="home"|"events"|"users"|"attendance"|"people"|"companies"|"invitations"|"hierarchy"|"profile";
export function navigationForLevel(level:PortalAccessLevel):{daily:PortalNavView[];settings:PortalNavView[]}{
 switch(level){
  case "root":return {daily:["home","events","users"],settings:["companies","invitations","hierarchy"]};
  case "country_admin":return {daily:["home","events","attendance","people"],settings:["hierarchy", ]};
  case "state_admin":return {daily:["home","events","attendance","people"],settings:["profile"]};
  default:return {daily:["home","events","registrations"],settings:["profile"]};
 }
}
export function mayProvisionEmployees(level:PortalAccessLevel):boolean{
 return level==="country_admin"||level==="state_admin";
}
