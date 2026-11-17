import {NextRequest,NextResponse} from "next/server";
import directory from "countrycitystatejson";

export const runtime="nodejs";
export async function GET(req:NextRequest){
 const country=req.nextUrl.searchParams.get("country")?.toUpperCase()||"";
 if(!/^[A-Z]{2}$/.test(country))return NextResponse.json({error:"Choose a country"},{status:400});
 const states=directory.getStatesByShort(country);
 if(!states)return NextResponse.json({error:"Country not in location directory"},{status:404});
 const cities=states.flatMap(state=>(directory.getCities(country,state)||[]).map(city=>({city,state}))).sort((a,b)=>a.city.localeCompare(b.city)||a.state.localeCompare(b.state));
 return NextResponse.json({country,cities},{headers:{"Cache-Control":"public, max-age=86400"}});
}
