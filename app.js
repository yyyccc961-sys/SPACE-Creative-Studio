(() => {
  const cfg = window.SPACE_CONFIG || {};
  const client = window.supabase && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
  const $ = (s) => document.querySelector(s);
  $("#year").textContent = new Date().getFullYear();
  $("#menuToggle").addEventListener("click", () => $("header nav").classList.toggle("open"));
  document.querySelectorAll("header nav a").forEach(a => a.addEventListener("click", () => $("header nav").classList.remove("open")));
  const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function loadSite() {
    if (!client) return;
    try {
      const [{data: settings}, {data: services}, {data: portfolio}] = await Promise.all([
        client.from("site_settings").select("*").limit(1).maybeSingle(),
        client.from("services").select("*").order("created_at", {ascending:false}),
        client.from("portfolio").select("*").order("created_at", {ascending:false})
      ]);
      if (settings) {
        if (settings.company_name) document.title = `${settings.company_name} | Creative Studio`;
        const contactLinks = $("#contactLinks");
        contactLinks.innerHTML = "";
        if (settings.whatsapp) {
          const phone = settings.whatsapp.replace(/[^\d]/g, "");
          contactLinks.insertAdjacentHTML("beforeend", `<a target="_blank" rel="noopener" href="https://wa.me/${escapeHTML(phone)}">تواصل عبر واتساب ↗</a>`);
        }
        if (settings.instagram) contactLinks.insertAdjacentHTML("beforeend", `<a target="_blank" rel="noopener" href="${/^https?:\/\//i.test(settings.instagram) ? escapeHTML(settings.instagram) : 'https://instagram.com/'+escapeHTML(settings.instagram.replace(/^@/,''))}">تابعنا على إنستغرام ↗</a>`);
        if (!settings.whatsapp && !settings.instagram) contactLinks.innerHTML = '<span>أضف روابط التواصل من لوحة الإدارة.</span>';
      }
      if (services?.length) {
        $("#servicesGrid").innerHTML = services.map((s,i)=>`<article class="service-card"><span class="service-no">${String(i+1).padStart(2,"0")}</span><div class="service-icon">✳</div><h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.description)}</p></article>`).join("");
      }
      if (portfolio?.length) {
        $("#portfolioGrid").innerHTML = portfolio.map(p=>{
          const url = String(p.media_url || "");
          const safeUrl = /^https?:\/\//i.test(url) ? escapeHTML(url) : "";
          const media = p.media_type === "video" ? `<video src="${safeUrl}" controls preload="metadata"></video>` : `<img src="${safeUrl}" alt="${escapeHTML(p.title)}" loading="lazy">`;
          return `<article class="portfolio-item">${media}<div class="portfolio-caption"><strong>${escapeHTML(p.title)}</strong><p>${escapeHTML(p.description)}</p></div></article>`;
        }).join("");
      }
    } catch (e) { console.error("SPACE content load failed", e); }
  }
  $("#requestForm").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#formMessage");
    if (!client) { msg.textContent = "إعداد الاتصال ناقص. راجع ملف config.js."; return; }
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());
    msg.textContent = "جاري إرسال طلبك...";
    try {
      const {error} = await client.from("customer_requests").insert([data]);
      if (error) throw error;
      e.currentTarget.reset(); msg.textContent = "وصل طلبك بنجاح! شكراً لثقتك بـ SPACE.";
    } catch(err) { console.error(err); msg.textContent = "ما قدرنا نرسل الطلب حالياً. جرّب مرة ثانية أو تواصل ويانا مباشرة."; }
  });
  loadSite();
})();