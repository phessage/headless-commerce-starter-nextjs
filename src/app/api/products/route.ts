import { NextRequest, NextResponse } from 'next/server';
const products=[
 {id:'prod_trail_pack',name:'Trail Pack 24L',description:'Weather-ready day pack made from recycled nylon.',price:{amount:'89.00',currency:'USD'},available:true},
 {id:'prod_camp_mug',name:'Camp Mug',description:'Double-wall steel for early starts and cold summits.',price:{amount:'24.00',currency:'USD'},available:true},
 {id:'prod_shell',name:'Alpine Shell',description:'A breathable layer for fast-changing weather.',price:{amount:'219.00',currency:'USD'},available:false}
];
export async function GET(request:NextRequest){
 const apiUrl=process.env.HEADLESS_API_URL; const key=process.env.HEADLESS_PUBLISHABLE_KEY;
 if(apiUrl&&key){
  const upstream=new URL('/v1/headless/products',apiUrl); request.nextUrl.searchParams.forEach((value,name)=>upstream.searchParams.set(name,value));
  const response=await fetch(upstream,{headers:{accept:'application/json','x-publishable-key':key},next:{revalidate:60}});
  const body=await response.text(); return new NextResponse(body,{status:response.status,headers:{'content-type':response.headers.get('content-type')??'application/json'}});
 }
 const q=request.nextUrl.searchParams.get('query')?.toLowerCase()??'';
 return NextResponse.json({data:products.filter(p=>p.name.toLowerCase().includes(q)),nextCursor:null,requestId:`demo_${crypto.randomUUID()}`},{headers:{'cache-control':'public, max-age=60','x-sandbox-mode':'synthetic'}})
}
