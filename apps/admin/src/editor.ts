import type{Section}from'./types';
export function reorderSections(sections:Section[],from:number,to:number){if(from<0||to<0||from>=sections.length||to>=sections.length)return sections;const next=[...sections];const[item]=next.splice(from,1);next.splice(to,0,item);return next.map((section,order)=>({...section,order}))}
export function uniqueSectionId(title:string,sections:Section[]){const base=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'section';let id=base,n=2;while(sections.some(s=>s.id===id))id=`${base}-${n++}`;return id}
