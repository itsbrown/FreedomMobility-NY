const o="fm-blog-drafts",d=["Stairlifts","Ramps","Lifts","Service","Aging in place","Guides"];function g(){return Math.random().toString(36).slice(2,10)}function c(){try{const t=localStorage.getItem(o),i=t?JSON.parse(t):[];return Array.isArray(i)?i.filter(s=>s&&typeof s.id=="string"):[]}catch{return[]}}function f(t){return c().find(i=>i.id===t)??null}function p(t){const i=c(),s=t.id||g(),n=i.find(l=>l.id===s),e={id:s,slug:(t.slug||n?.slug||"untitled").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"")||"untitled",title:(t.title??n?.title??"").trim(),headline:(t.headline??n?.headline??t.title??"").trim(),description:(t.description??n?.description??"").trim(),category:t.category??n?.category??"Stairlifts",body:t.body??n?.body??"",updatedAt:new Date().toISOString()},r=i.filter(l=>l.id!==s);return localStorage.setItem(o,JSON.stringify([e,...r])),e}function u(t){localStorage.setItem(o,JSON.stringify(c().filter(i=>i.id!==t)))}function h(t){const i=t.title||`${t.headline} | Freedom Mobility NY`;return`---
title: ${JSON.stringify(i)}
description: ${JSON.stringify(t.description||t.headline)}
headline: ${JSON.stringify(t.headline||t.title)}
pubDate: ${new Date().toISOString().slice(0,10)}
draft: true
category: ${t.category}
tags: []
---

${t.body.trim()}
`}function m(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").split(/\n{2,}/).map(n=>{const e=n.split(`
`);return e[0].startsWith("### ")?`<h3>${a(e[0].slice(4))}</h3>`:e[0].startsWith("## ")?`<h2>${a(e[0].slice(3))}</h2>`:e[0].startsWith("# ")?`<h2>${a(e[0].slice(2))}</h2>`:e.every(r=>r.startsWith("- "))?`<ul>${e.map(r=>`<li>${a(r.slice(2))}</li>`).join("")}</ul>`:e.every(r=>/^\d+\.\s/.test(r))?`<ol>${e.map(r=>`<li>${a(r.replace(/^\d+\.\s/,""))}</li>`).join("")}</ol>`:`<p>${e.map(a).join("<br />")}</p>`}).join("")}function a(t){return t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g,'<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")}function y(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{d as B,u as a,h as d,y as e,f as g,c as l,m,p as s};
