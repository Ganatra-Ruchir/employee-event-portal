import type { NextConfig } from "next";
const nextConfig:NextConfig={
  reactStrictMode:true,
  async rewrites(){
    // Vercel serves the UI while Railway owns the staging PostgreSQL and API.
    // Route handlers remain local when no explicitly approved backend is configured.
    const origin=process.env.PORTAL_V4_FRONTEND_PROXY_ORIGIN;
    if(!origin)return [];
    const url=new URL(origin);
    if(url.protocol!=="https:"||url.hostname!=="volunteer-v4-preview-production.up.railway.app"||url.pathname!=="/"||url.search||url.hash)
      throw new Error("Unapproved V4 proxy backend");
    return {beforeFiles:[
      {source:"/api/:path*",destination:origin.replace(/\/$/,"")+"/api/:path*"},
      {source:"/certificates/:path*",destination:origin.replace(/\/$/,"")+"/certificates/:path*"}
    ],afterFiles:[],fallback:[]};
  },
  async redirects(){
    return [
      {source:"/auth",destination:"/",permanent:false},
      {source:"/demo",destination:"/",permanent:false},
      {source:"/welcome",destination:"/",permanent:false},
      {source:"/dashboard",destination:"/",permanent:false},
      {source:"/my-registrations",destination:"/",permanent:false},
      {source:"/join",destination:"/",permanent:false},
      {source:"/settings",destination:"/",permanent:false},
      {source:"/organizations/:path*",destination:"/",permanent:false}
    ];
  }
};
export default nextConfig;