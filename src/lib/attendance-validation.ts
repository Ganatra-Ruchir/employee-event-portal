/** Shared, strict input validation for event walk-in attendance. */
export function validWalkInEmployeeId(value:string):boolean {
 return /^[A-Z0-9][A-Z0-9_./-]{0,79}$/.test(value.trim().toUpperCase());
}
export function validWalkInPhone(value:string):boolean {
 const phone=value.trim();
 const digits=phone.replace(/\D/g,"");
 return /^\+?[0-9][0-9 ()-]{5,24}$/.test(phone)&&digits.length>=7&&digits.length<=15;
}
