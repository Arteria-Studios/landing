/* ---------- Contact form + footer ----------
   Sending: with no ENDPOINT the request opens in the visitor's mail app,
   addressed to CONTACT_EMAIL and fully written. Set ENDPOINT to a form service
   URL that accepts JSON (e.g. Formspree, Web3Forms, FormSubmit) to send it in
   the background instead. */
(() => {
  const CONTACT_EMAIL = "name@email.com";   // TODO: the studio's address
  const ENDPOINT = "";                       // optional: form service URL for background sending
  const STUDIO_TZ = "Europe/Moscow";         // TODO: the studio's time zone (IANA name)
  const DRAFT_KEY = "arteria-brief";

  /* ---------- Email, studio time, year, back to top ---------- */
  document.querySelectorAll("[data-year]").forEach((e) => { e.textContent = new Date().getFullYear(); });
  document.querySelectorAll("[data-mail]").forEach((e) => { e.textContent = CONTACT_EMAIL; });
  document.querySelectorAll("[data-copy-mail]").forEach((btn) => {
    const label = btn.querySelector("[data-copied]");
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(CONTACT_EMAIL); }
      catch (e) { location.href = `mailto:${CONTACT_EMAIL}`; return; }
      label.textContent = "Copied";
      btn.classList.add("is-copied");
      setTimeout(() => { label.textContent = "Copy"; btn.classList.remove("is-copied"); }, 1600);
    });
  });
  const timeEl = document.querySelector("[data-studio-time]");
  if (timeEl) {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: STUDIO_TZ, timeZoneName: "short" });
    const tick = () => { timeEl.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 20000);
  }
  document.querySelector("[data-to-top]")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); });

  /* ---------- Form ---------- */
  const form = document.querySelector("[data-brief]");
  if (!form) return;
  const status = form.querySelector("[data-brief-status]");
  const servicesBox = form.querySelector('[data-group="services"]');
  const picked = () => [...servicesBox.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.dataset.value);

  servicesBox.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
    servicesBox.closest(".field").classList.remove("is-missing");
    save();
  });
  form.addEventListener("input", (e) => {
    e.target.closest(".field")?.classList.remove("is-missing");
    save();
  });

  /* Draft: answers survive an accidental reload. */
  function save() {
    const data = Object.fromEntries(new FormData(form));
    delete data.website;
    data.services = picked();
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {}
  }
  (() => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) {}
    if (!d) return;
    ["name", "company", "email", "note"].forEach((k) => { if (d[k]) form.elements[k].value = d[k]; });
    ["budget", "timeline"].forEach((k) => {
      const r = d[k] && form.querySelector(`input[name="${k}"][value="${CSS.escape(d[k])}"]`);
      if (r) r.checked = true;
    });
    servicesBox.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String((d.services || []).includes(c.dataset.value))));
  })();

  const setStatus = (msg, kind = "") => { status.textContent = msg; status.dataset.kind = kind; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.elements.website.value) return;               // honeypot: a bot filled it

    const name = form.elements.name, email = form.elements.email;
    const services = picked();
    const missing = [];
    const flag = (el) => el.closest(".field").classList.add("is-missing");
    if (!services.length) { flag(servicesBox); missing.push("what you need"); }
    if (!name.value.trim()) { flag(name); missing.push("your name"); }
    if (!email.value.trim() || !email.checkValidity()) { flag(email); missing.push("a valid email"); }
    if (missing.length) {
      setStatus(`Please add ${missing.join(", ").replace(/, ([^,]*)$/, " and $1")}.`, "error");
      (form.querySelector(".is-missing input:not([type=radio])") || form.querySelector(".is-missing .chip"))?.focus();
      return;
    }

    const brief = {
      name: name.value.trim(),
      company: form.elements.company.value.trim(),
      email: email.value.trim(),
      services: services.join(", "),
      budget: form.elements.budget.value,
      timeline: form.elements.timeline.value,
      note: form.elements.note.value.trim(),
    };
    const subject = `New project request: ${brief.company || brief.name}`;
    const body = [
      `Name: ${brief.name}`,
      brief.company && `Company: ${brief.company}`,
      `Email: ${brief.email}`,
      `Services: ${brief.services}`,
      `Budget: ${brief.budget}`,
      `Timeline: ${brief.timeline}`,
      brief.note && `\n${brief.note}`,
    ].filter(Boolean).join("\n");

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (ENDPOINT) {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...brief, _subject: subject }),
        });
        if (!res.ok) throw new Error(res.status);
        setStatus(`Thanks, ${brief.name}. We'll reply within 24 hours.`, "ok");
      } else {
        location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setStatus(`Your mail app is open with the request, ${brief.name}. Press send and we'll reply within 24 hours.`, "ok");
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    } catch (err) {
      setStatus(`Something went wrong. Please email us at ${CONTACT_EMAIL}.`, "error");
    } finally {
      btn.disabled = false;
    }
  });
})();
