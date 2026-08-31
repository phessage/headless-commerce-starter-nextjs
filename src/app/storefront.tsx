'use client';
import { useEffect, useMemo, useState } from 'react';
type Product={id:string;name:string;description:string;price:{amount:string;currency:string};available:boolean};
export function Storefront(){
  const [products,setProducts]=useState<Product[]>([]); const [query,setQuery]=useState(''); const [cart,setCart]=useState<string[]>([]); const [error,setError]=useState('');
  useEffect(()=>{fetch('/api/products').then(r=>{if(!r.ok)throw new Error('Catalog unavailable');return r.json()}).then(v=>setProducts(v.data)).catch(e=>setError(e.message))},[]);
  const shown=useMemo(()=>products.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())),[products,query]);
  return <><header><a className="brand" href="#">Trailhead</a><label>Search products<input aria-label="Search products" value={query} onChange={e=>setQuery(e.target.value)}/></label><span aria-live="polite">Cart ({cart.length})</span></header><main><section className="hero"><p>FIELD TESTED</p><h1>Go farther.<br/>Carry less.</h1><span>Sanitized sandbox storefront—no production customer data.</span></section>{error&&<p role="alert">{error}</p>}<section aria-label="Products" className="grid">{shown.map(p=><article key={p.id}><div className="art" aria-hidden="true">▲</div><h2>{p.name}</h2><p>{p.description}</p><strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:p.price.currency}).format(Number(p.price.amount))}</strong><button disabled={!p.available} onClick={()=>setCart(c=>[...c,p.id])}>Add {p.name} to cart</button></article>)}</section>{products.length>0&&shown.length===0&&<p>No products match “{query}”.</p>}</main></>;
}
