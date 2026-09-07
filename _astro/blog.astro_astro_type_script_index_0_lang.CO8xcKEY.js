import{l as d,e as s}from"./blog-admin-client.BQZD_8Dg.js";const t=document.getElementById("local-drafts");if(t){const l=d();l.length===0?t.innerHTML="No device drafts yet. Use <strong>New device draft</strong> to write here, then download Markdown to publish.":(t.className="border border-slate-200 rounded-2xl overflow-hidden bg-white divide-y divide-slate-100",t.innerHTML=l.map(e=>`
          <div class="px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="min-w-0 sm:flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="inline-flex rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5">Device draft</span>
                <span class="text-xs text-slate-500">${s(e.category)}</span>
              </div>
              <div class="font-semibold text-slate-900">${s(e.headline||e.title||"Untitled draft")}</div>
              <div class="text-xs text-slate-500 mt-1">/${s(e.slug||"no-slug")}</div>
            </div>
            <a href="/admin/blog/edit?id=${encodeURIComponent(e.id)}" class="border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium">Edit / preview</a>
          </div>
        `).join(""))}
