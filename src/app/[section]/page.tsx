import {notFound} from "next/navigation";
import ElixirPortal from "@/components/elixir-portal";
const known=new Set(["overview","events","registrations","people","companies","invitations","accounts","profile","attendance","hierarchy"]);
export default async function PortalSection({params}:{params:Promise<{section:string}>}){
 const {section}=await params;
 if(!known.has(section))notFound();
 return <ElixirPortal/>;
}
