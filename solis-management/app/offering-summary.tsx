type Row=Record<string,any>;
export const priceLabel=(o:Row)=>o.pricing==='Quote'?'Request a quote':(o.pricing==='From'?'From ':'')+new Intl.NumberFormat('en-PH',{style:'currency',currency:o.currency||'PHP',maximumFractionDigits:2}).format(Number(o.price_minor||0)/100)+' / '+o.unit;
export const leadLabel=(o:Row)=>`${o.lead_min===o.lead_max?o.lead_min:o.lead_min+'–'+o.lead_max} ${String(o.lead_unit||'Days').toLowerCase()} lead time`;
export function OfferingSummary({snapshot}:{snapshot:unknown}){
 let o:Row;try{o=typeof snapshot==='string'?JSON.parse(snapshot):snapshot as Row;}catch{return null;}if(!o?.name)return null;
 return <section className="offering-snapshot"><p className="orders-eyebrow">OFFERING AT THE TIME OF REQUEST</p><strong>{o.name}</strong><p>{priceLabel(o)} · {leadLabel(o)}</p>{o.estimated_total_minor!==null&&<p>Estimated {o.pricing==='From'?'starting ':''}amount: <b>{new Intl.NumberFormat('en-PH',{style:'currency',currency:o.currency}).format(o.estimated_total_minor/100)}</b></p>}<p>Merchant location: {o.location}</p><p>{o.delivery_scope}{o.delivery_areas?' · '+o.delivery_areas:''}</p>{o.delivery_notes&&<p>{o.delivery_notes}</p>}<small>Subject to merchant confirmation. Delivery charges and additional requirements are agreed separately.</small></section>;
}
