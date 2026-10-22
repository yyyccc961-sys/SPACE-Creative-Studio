(() => {
  const cfg = window.SPACE_CONFIG || {};
  const client = window.supabase && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say = (selector, text) => { $(selector).textContent = text; };
  function configured() { if(!client) { say("#loginStatus","أضف Publishable Key داخل config.js أولاً."); return false; } return true; }
  async function sessionCheck() {
    if(!configured()) return;
    const {data:{session}} = await client.auth.getSession();
    if(session) await showDashboard(); else { $("#loginPanel").classList.remove("hidden"); $("#dashboard").classList.add("hidden"); }
  }
  async function showDashboard() {
    $("#loginPanel").classList.add("hidden"); $("#dashboard").classList.remove("hidden");
    await Promise.all([loadSettings(), loadServices(), loadPortfolio(), loadRequests()]);
  }
  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault(); if(!configured()) return;
    const f = new FormData(e.currentTarget); say("#loginStatus","جاري تسجيل الدخول...");
    const {error} = await client.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
    if(error) { say("#loginStatus","تعذّر تسجيل الدخول. تحقق من البريد وكلمة المرور."); console.error(error); return; }
    say("#loginStatus","تم تسجيل الدخول."); await showDashboard();
  });
  $("#logoutBtn").addEventListener("click", async()=>{await client.auth.signOut(); location.reload();});
  async function loadSettings() {
    const {data,error}=await client.from("site_settings").select("*").limit(1).maybeSingle();
    if(error){say("#settingsStatus","تعذر تحميل الإعدادات.");return;}
    const f=$("#settingsForm");
    if(data) for(const k of ["company_name","description","whatsapp","instagram"]) f.elements[k].value=data[k]||"";
  }
  $("#settingsForm").addEventListener("submit",async e=>{
    e.preventDefault(); const f=new FormData(e.currentTarget);
    const payload={company_name:f.get("company_name"),description:f.get("description"),whatsapp:f.get("whatsapp"),instagram:f.get("instagram"),updated_at:new Date().toISOString()};
    const {data:existing,error:readError}=await client.from("site_settings").select("id").limit(1).maybeSingle();
    if(readError){say("#settingsStatus","تعذر قراءة الإعدادات.");return;}
    const result=existing ? await client.from("site_settings").update(payload).eq("id",existing.id) : await client.from("site_settings").insert(payload);
    say("#settingsStatus",result.error?"ما انحفظت المعلومات. تأكد من صلاحيات RLS.":"تم حفظ معلومات الشركة.");
  });
  async function loadServices(){
    const {data,error}=await client.from("services").select("*").order("created_at",{ascending:false});
    if(error){$("#servicesList").innerHTML="<small>تعذر تحميل الخدمات.</small>";return;}
    $("#servicesList").innerHTML=(data||[]).map(s=>`<div class="admin-item"><span>${esc(s.title)}<small>${esc(s.description)}</small></span><button class="btn-small btn-danger" data-delete-service="${s.id}">حذف</button></div>`).join("")||"<small>ماكو خدمات مضافة بعد.</small>";
    $("#servicesList").querySelectorAll("[data-delete-service]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await client.from("services").delete().eq("id",b.dataset.deleteService);if(error)alert("تعذر الحذف؛ تحقق من الصلاحيات.");else loadServices();}));
  }
  $("#serviceForm").addEventListener("submit",async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);
    const {error}=await client.from("services").insert({title:f.get("title"),description:f.get("description")});
    say("#serviceStatus",error?"تعذرت الإضافة. تأكد من تسجيل الدخول وسياسات الصلاحيات.":"تمت إضافة الخدمة.");if(!error){e.currentTarget.reset();loadServices();}
  });
  async function loadPortfolio(){
    const {data,error}=await client.from("portfolio").select("*").order("created_at",{ascending:false});
    if(error){$("#portfolioList").innerHTML="<small>تعذر تحميل الأعمال.</small>";return;}
    $("#portfolioList").innerHTML=(data||[]).map(p=>`<div class="admin-item"><span>${esc(p.title)}<small>${esc(p.media_type)} · ${esc(p.media_url)}</small></span><button class="btn-small btn-danger" data-delete-portfolio="${p.id}">حذف</button></div>`).join("")||"<small>ماكو أعمال مضافة بعد.</small>";
    $("#portfolioList").querySelectorAll("[data-delete-portfolio]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await client.from("portfolio").delete().eq("id",b.dataset.deletePortfolio);if(error)alert("تعذر الحذف؛ تحقق من الصلاحيات.");else loadPortfolio();}));
  }
  $("#portfolioForm").addEventListener("submit",async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const url=String(f.get("media_url")||"");
    if(!/^https?:\/\//i.test(url)){say("#portfolioStatus","استخدم رابطاً يبدأ بـ https:// أو http://");return;}
    const {error}=await client.from("portfolio").insert({title:f.get("title"),description:f.get("description"),media_url:url,media_type:f.get("media_type")});
    say("#portfolioStatus",error?"تعذرت الإضافة. تأكد من تسجيل الدخول وسياسات الصلاحيات.":"تمت إضافة العمل.");if(!error){e.currentTarget.reset();loadPortfolio();}
  });
  async function loadRequests(){
    const {data,error}=await client.from("customer_requests").select("*").order("created_at",{ascending:false}).limit(100);
    if(error){$("#requestsList").innerHTML="<small>تعذر تحميل الطلبات؛ تأكد أن حساب المدير لديه صلاحية القراءة.</small>";return;}
    $("#requestsList").innerHTML=(data||[]).map(r=>`<div class="admin-item"><span><b>${esc(r.customer_name)}</b> — ${esc(r.phone)}<small>${esc(r.service)} · ${esc(r.details)}<br>${new Date(r.created_at).toLocaleString("ar-IQ")}</small></span><select data-status="${r.id}" aria-label="حالة الطلب"><option value="new" ${r.status==="new"?"selected":""}>جديد</option><option value="in_progress" ${r.status==="in_progress"?"selected":""}>قيد التنفيذ</option><option value="completed" ${r.status==="completed"?"selected":""}>مكتمل</option></select></div>`).join("")||"<small>ماكو طلبات جديدة حالياً.</small>";
    $("#requestsList").querySelectorAll("[data-status]").forEach(sel=>sel.addEventListener("change",async()=>{const {error}=await client.from("customer_requests").update({status:sel.value}).eq("id",sel.dataset.status);say("#requestsStatus",error?"تعذر تحديث الحالة.":"تم تحديث حالة الطلب.");}));
  }
  document.addEventListener("DOMContentLoaded",sessionCheck);
})();