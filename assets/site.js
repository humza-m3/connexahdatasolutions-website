/* Connexah Data Solutions prototype: navigation, tabs, enquiry-source capture and the fit-check form.
   No dependencies. Every storage call is wrapped, so the page works with storage blocked. */
(function () {
  "use strict";

  var REDUCED = false;
  try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { REDUCED = false; }
  var SCROLL = REDUCED ? "auto" : "smooth";

  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  /* ---------- Header ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("nav-open", open);
    // Only the header (logo, menu button, open menu) stays reachable while the menu covers the page.
    var sheet = open && getComputedStyle(nav).position === "fixed";
    document.querySelectorAll("main, .site-footer, .sticky-cta, .protobar").forEach(function (el) {
      if (sheet) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    });
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setNav(toggle.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setNav(false); toggle.focus({ preventScroll: true }); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 960) setNav(false); });
  }

  addEventListener("load", function () {
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () { document.documentElement.classList.add("cx-smooth"); });
  });

  /* ---------- Industry tabs ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var vertical = getComputedStyle(tab.parentElement).flexDirection === "column";
        var next = vertical ? "ArrowDown" : "ArrowRight";
        var prev = vertical ? "ArrowUp" : "ArrowLeft";
        var j = null;
        if (e.key === next) j = (i + 1) % tabs.length;
        else if (e.key === prev) j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  });

  /* ---------- Mobile sticky CTA ---------- */
  var sticky = document.querySelector(".sticky-cta");
  if (sticky && "IntersectionObserver" in window) {
    var heroCta = document.querySelector('[data-cta="hero"]') || document.querySelector(".page-hero") || document.querySelector(".fit__intro");
    var endZone = document.querySelectorAll(".final-cta, .site-footer");
    var pastHero = false, atEnd = false;
    function update() {
      var show = pastHero && !atEnd;
      sticky.classList.toggle("is-visible", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      sticky.tabIndex = show ? 0 : -1;
    }
    if (heroCta) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { pastHero = !en.isIntersecting && en.boundingClientRect.top < 0; });
        update();
      }).observe(heroCta);
    }
    var visibleEnds = new Set();
    var endObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) visibleEnds.add(en.target); else visibleEnds.delete(en.target); });
      atEnd = visibleEnds.size > 0;
      update();
    });
    endZone.forEach(function (el) { endObs.observe(el); });
  }

  /* ---------- Enquiry-source capture ----------
     Keeps the campaign parameters from the landing URL for this browser session, so an
     enquiry submitted a few pages later still records where the visitor came from. */
  var SOURCE_KEY = "cds_source";
  var UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var CLICK_IDS = ["gclid", "msclkid", "fbclid", "li_fat_id", "ttclid"];
  (function captureSource() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    var found = {};
    UTM.forEach(function (k) { var v = params.get(k); if (v) found[k] = v.slice(0, 200); });
    CLICK_IDS.forEach(function (k) { var v = params.get(k); if (v && !found.click_id) found.click_id = k + ":" + v.slice(0, 200); });
    var hasCampaign = Object.keys(found).length > 0;
    if (hasCampaign || !store.get(SOURCE_KEY)) {
      found.landing_page = (window.location.pathname + window.location.search).slice(0, 500);
      found.referrer = (document.referrer || "").slice(0, 500);
      store.set(SOURCE_KEY, JSON.stringify(found));
    }
  })();
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href*="fit-check"]');
    if (a) store.set("cds_cta", a.getAttribute("data-cta") || "untagged");
  });

  /* ---------- Fit-check form ---------- */
  var form = document.getElementById("fit-form");
  if (!form) return;

  var PERSONAL_DOMAINS = ["gmail.com", "googlemail.com", "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com", "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com", "aol.com", "gmx.de", "gmx.net", "web.de", "orange.fr", "free.fr", "libero.it", "proton.me", "protonmail.com"];
  var steps = form.querySelectorAll("[data-step]");
  var dots = form.querySelectorAll("[data-step-dot]");
  var summary = document.getElementById("error-summary");
  var statusEl = document.getElementById("form-status");
  var submitBtn = form.querySelector("[data-submit]");
  var qual = document.getElementById("qual");
  var skipBox = document.getElementById("skip-box");
  var skipOn = document.getElementById("skip-on");
  var resultProto = document.getElementById("result-proto");
  var resultSent = document.getElementById("result-sent");
  var resultFailed = document.getElementById("result-failed");
  var tplConfirm = document.getElementById("tpl-live-confirm");
  var skipped = false;
  var current = 1;

  // Fill hidden source fields
  (function fillSource() {
    var src = {};
    try { src = JSON.parse(store.get(SOURCE_KEY) || "{}") || {}; } catch (e) { src = {}; }
    UTM.concat(["click_id", "landing_page", "referrer"]).forEach(function (k) {
      var el = document.getElementById("f-" + k);
      if (el && src[k]) el.value = src[k];
    });
    var cta = document.getElementById("f-cta");
    if (cta) cta.value = store.get("cds_cta") || "";
  })();

  // Give each choice group a focus target for the error summary
  form.querySelectorAll("fieldset[data-field]").forEach(function (fs) {
    var first = fs.querySelector("input");
    if (first && !first.id) first.id = "f-" + fs.getAttribute("data-field") + "-first";
    var described = first && first.getAttribute("aria-describedby");
    if (described) fs.querySelectorAll(".choices input").forEach(function (i) { i.setAttribute("aria-describedby", described); });
  });

  function val(name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el instanceof RadioNodeList || (el.length && !el.tagName)) {
      var out = [];
      Array.prototype.forEach.call(el, function (i) { if (i.checked) out.push(i.value); });
      return el[0] && el[0].type === "checkbox" ? out : (out[0] || "");
    }
    if (el.type === "checkbox") return el.checked;
    return (el.value || "").trim();
  }

  function normaliseWebsite(v) {
    return v.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/[\/?#].*$/, "").toLowerCase();
  }

  var RULES = {
    1: [
      { field: "name", check: function () { return val("name").length >= 2 ? "" : "Enter your full name."; } },
      { field: "email", check: function () {
          var v = val("email");
          if (!v) return "Enter your work email address.";
          return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter an email address like name@company.com.";
        } },
      { field: "website", check: function () {
          var v = normaliseWebsite(val("website"));
          if (!v) return "Enter your company website.";
          return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v) ? "" : "Enter a website address like example.com.";
        } },
      { field: "country", check: function () { return val("country") ? "" : "Select your country."; } }
    ],
    2: [
      { field: "industry", qual: true, check: function () { return val("industry") ? "" : "Select your industry, or choose Something else."; } },
      { field: "headcount", qual: true, check: function () { return val("headcount") ? "" : "Select an approximate headcount, or Not sure."; } },
      { field: "years", qual: true, check: function () { return val("years") ? "" : "Select how many years of records you keep, or Not sure."; } },
      { field: "systems", qual: true, check: function () { return val("systems").length ? "" : "Select at least one system, or Not sure."; } },
      { field: "systems-other", qual: true, check: function () {
          if (val("systems").indexOf("Other") === -1) return "";
          return val("systems_other") ? "" : "Tell us which other systems you use.";
        } },
      { field: "authority", qual: true, check: function () { return val("authority") ? "" : "Select whether you can authorise a licensing discussion."; } },
      { field: "contact", check: function () { return val("contact_ok") ? "" : "Tick the box so we can contact you about this enquiry."; } }
    ]
  };

  function fieldBox(field) {
    var box = form.querySelector('[data-field="' + field + '"]');
    if (box) return box;
    var input = document.getElementById("f-" + field);
    return input ? input.closest(".field") : null;
  }
  function errEl(field) { return document.getElementById("f-" + field + "-err"); }
  function focusTarget(field) {
    return document.getElementById("f-" + field) || document.getElementById("f-" + field + "-first");
  }
  function setError(field, msg) {
    var box = field === "contact" ? form.querySelector('[data-field="contact_ok"]') : fieldBox(field);
    var e = errEl(field);
    if (box) box.classList.toggle("has-error", !!msg);
    if (e) { e.textContent = msg; e.hidden = !msg; }
    var input = focusTarget(field);
    if (input) {
      if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    }
    if (box && box.tagName === "FIELDSET") {
      box.querySelectorAll("input").forEach(function (i) { if (msg) i.setAttribute("aria-invalid", "true"); else i.removeAttribute("aria-invalid"); });
    }
  }

  function validate(step, showSummary) {
    var errors = [];
    RULES[step].forEach(function (r) {
      if (r.qual && skipped) { setError(r.field, ""); return; }
      var msg = r.check();
      setError(r.field, msg);
      if (msg) errors.push({ field: r.field, msg: msg });
    });
    if (showSummary) renderSummary(errors);
    return errors;
  }

  function renderSummary(errors) {
    var ul = summary.querySelector("ul");
    ul.innerHTML = "";
    if (!errors.length) { summary.hidden = true; return; }
    errors.forEach(function (er) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      var target = focusTarget(er.field);
      a.href = "#" + (target ? target.id : "");
      a.textContent = er.msg;
      a.addEventListener("click", function (ev) { ev.preventDefault(); if (target) { target.focus(); target.scrollIntoView({ block: "center", behavior: SCROLL }); } });
      li.appendChild(a);
      ul.appendChild(li);
    });
    summary.hidden = false;
    summary.focus();
  }

  // Inline validation after the first blur, cleared as soon as the answer is fixed
  RULES[1].forEach(function (r) {
    var input = document.getElementById("f-" + r.field);
    if (!input) return;
    input.addEventListener("blur", function () { if (input.value.trim()) setError(r.field, r.check()); });
    input.addEventListener("input", function () { if (input.getAttribute("aria-invalid")) setError(r.field, r.check()); });
    input.addEventListener("change", function () { if (input.getAttribute("aria-invalid")) setError(r.field, r.check()); });
  });
  var emailInput = document.getElementById("f-email");
  var emailNote = document.getElementById("f-email-note");
  if (emailInput && emailNote) {
    emailInput.addEventListener("blur", function () {
      var d = (emailInput.value.split("@")[1] || "").toLowerCase().trim();
      var show = PERSONAL_DOMAINS.indexOf(d) !== -1;
      emailNote.hidden = !show;
      var ids = (emailInput.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (x) { return x && x !== "f-email-note"; });
      if (show) ids.push("f-email-note");
      emailInput.setAttribute("aria-describedby", ids.join(" "));
    });
  }
  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "systems") {
      var boxes = form.querySelectorAll('input[name="systems"]');
      if (t.hasAttribute("data-unsure") && t.checked) boxes.forEach(function (b) { if (b !== t) b.checked = false; });
      else if (t.checked) boxes.forEach(function (b) { if (b.hasAttribute("data-unsure")) b.checked = false; });
      var other = val("systems").indexOf("Other") !== -1;
      document.getElementById("systems-other-wrap").hidden = !other;
      if (!other) setError("systems-other", "");
    }
    RULES[2].forEach(function (r) {
      var box = r.field === "contact" ? form.querySelector('[data-field="contact_ok"]') : fieldBox(r.field);
      if (box && box.classList.contains("has-error")) setError(r.field, r.check());
    });
  });

  function goTo(step, focusTitle) {
    current = step;
    steps.forEach(function (s) { s.hidden = Number(s.getAttribute("data-step")) !== step; });
    dots.forEach(function (d) {
      var n = Number(d.getAttribute("data-step-dot"));
      d.classList.toggle("is-current", n === step);
      d.classList.toggle("is-done", n < step);
      if (n === step) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
    });
    summary.hidden = true;
    if (focusTitle) {
      var title = form.querySelector('[data-step="' + step + '"] .form__step-title');
      if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); }
      form.scrollIntoView({ block: "start", behavior: SCROLL });
    }
  }

  form.querySelector("[data-next]").addEventListener("click", function () {
    if (validate(1, true).length) return;
    goTo(2, true);
  });
  form.querySelector("[data-back]").addEventListener("click", function () { goTo(1, true); });

  function setSkipped(on) {
    skipped = on;
    if (on) summary.hidden = true;
    qual.hidden = on;
    skipBox.hidden = on;
    skipOn.hidden = !on;
    if (on) RULES[2].forEach(function (r) { if (r.qual) setError(r.field, ""); });
  }
  form.querySelector("[data-skip]").addEventListener("click", function () { setSkipped(true); document.getElementById("f-contact").focus(); });
  form.querySelector("[data-unskip]").addEventListener("click", function () { setSkipped(false); var f = focusTarget("industry"); if (f) f.focus(); });

  function collect() {
    var data = {
      name: val("name"), email: val("email"), website: normaliseWebsite(val("website")), country: val("country"),
      questions_skipped: skipped,
      industry: skipped ? "" : val("industry"),
      headcount: skipped ? "" : val("headcount"),
      years_retained: skipped ? "" : val("years"),
      systems: skipped ? [] : val("systems"),
      systems_other: skipped ? "" : val("systems_other"),
      can_authorise: skipped ? "" : val("authority"),
      notes: skipped ? "" : val("notes"),
      contact_consent: val("contact_ok"),
      marketing_opt_in: val("marketing_ok"),
      submitted_at: new Date().toISOString()
    };
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "click_id", "landing_page", "referrer", "cta"].forEach(function (k) {
      data[k] = (document.getElementById("f-" + k) || {}).value || "";
    });
    return data;
  }

  function setSending(on) {
    form.classList.toggle("is-sending", on);
    submitBtn.disabled = on;
    submitBtn.setAttribute("aria-disabled", on ? "true" : "false");
    submitBtn.querySelector(".btn__label").textContent = on ? "Sending…" : "Send enquiry";
    form.querySelectorAll("input, select, textarea, button").forEach(function (el) { if (el !== submitBtn) el.disabled = on; });
    statusEl.textContent = on ? "Sending your enquiry." : "";
  }

  function fillConfirm(container, data) {
    container.innerHTML = "";
    container.appendChild(tplConfirm.content.cloneNode(true));
    var first = (data.name || "").split(/\s+/)[0];
    var fn = container.querySelector("[data-first-name]");
    if (fn) fn.textContent = first ? ", " + first : "";
    var em = container.querySelector("[data-email]");
    if (em && data.email) em.textContent = data.email;
  }

  var LABELS = [
    ["About you", null],
    ["Name", "name"], ["Work email", "email"], ["Company website", "website"], ["Country", "country"],
    ["About your records", null],
    ["Industry", "industry"], ["Desk headcount", "headcount"], ["Years retained", "years_retained"], ["Systems", "systems"], ["Other systems", "systems_other"], ["Can authorise", "can_authorise"], ["Notes", "notes"],
    ["Permissions", null],
    ["Contact about this enquiry", "contact_consent"], ["Marketing updates", "marketing_opt_in"],
    ["Enquiry source (captured automatically)", null],
    ["utm_source", "utm_source"], ["utm_medium", "utm_medium"], ["utm_campaign", "utm_campaign"], ["utm_content", "utm_content"], ["utm_term", "utm_term"], ["Click ID", "click_id"], ["Landing page", "landing_page"], ["Referrer", "referrer"], ["Button used", "cta"]
  ];
  function renderAnswers(data) {
    var dl = document.getElementById("answers-list");
    dl.innerHTML = "";
    LABELS.forEach(function (pair) {
      var row = document.createElement("div");
      if (!pair[1]) { row.className = "answers__group"; row.textContent = pair[0]; dl.appendChild(row); return; }
      var v = data[pair[1]];
      if (Array.isArray(v)) v = v.join(", ");
      if (v === true) v = "Yes"; if (v === false) v = "No";
      if (pair[1] === "industry" && data.questions_skipped) v = "Skipped, to discuss on a call";
      var dt = document.createElement("dt"); dt.textContent = pair[0];
      var dd = document.createElement("dd"); dd.textContent = v || "Not provided";
      row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
    });
  }

  // Shows one result panel (or none). Callers decide whether the form stays visible.
  function stamp(panel, hidden) { var st = panel && panel.querySelector(".result__stamp"); if (st) st.hidden = hidden; }
  function showResult(el) {
    [resultProto, resultSent, resultFailed].filter(Boolean).forEach(function (r) { r.hidden = r !== el; });
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "start", behavior: SCROLL }); }
  }

  // Live delivery through FormSubmit (as on connexah.com). It answers 200 even when it has not
  // delivered (for example before the domain is activated), so success means success === "true".
  var EMAIL_LABELS = [
    ["Name", "name"], ["Work email", "email"], ["Company website", "website"], ["Country", "country"],
    ["Questions skipped", "questions_skipped"], ["Industry", "industry"], ["Desk headcount", "headcount"],
    ["Years of records retained", "years_retained"], ["Systems", "systems"], ["Other systems", "systems_other"],
    ["Can authorise", "can_authorise"], ["Notes", "notes"], ["Contact about this enquiry", "contact_consent"],
    ["Marketing updates", "marketing_opt_in"], ["utm_source", "utm_source"], ["utm_medium", "utm_medium"],
    ["utm_campaign", "utm_campaign"], ["utm_content", "utm_content"], ["utm_term", "utm_term"], ["Click ID", "click_id"],
    ["Landing page", "landing_page"], ["Referrer", "referrer"], ["Button used", "cta"], ["Submitted at", "submitted_at"]
  ];
  function sendLive(data) {
    var endpoint = form.getAttribute("data-endpoint");
    var payload = { _subject: "New fit-check enquiry: " + (data.website || data.name), _template: "table", _replyto: data.email };
    EMAIL_LABELS.forEach(function (pair) {
      var v = data[pair[1]];
      if (Array.isArray(v)) v = v.join(", ");
      if (v === true) v = "Yes"; if (v === false) v = "No";
      payload[pair[0]] = v || "";
    });
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (d) {
      if (String(d && d.success) !== "true") throw new Error((d && d.message) || "not delivered");
      return d;
    });
  }

  form.querySelectorAll("[data-next], [data-submit], [data-back]").forEach(function (btn) {
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
  });
  var otherInput = document.getElementById("f-systems-other");
  if (otherInput) otherInput.addEventListener("input", function () {
    if (otherInput.getAttribute("aria-invalid")) setError("systems-other", otherInput.value.trim() ? "" : "Tell us which other systems you use.");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (current === 1) { if (!validate(1, true).length) goTo(2, true); return; }
    if (form.classList.contains("is-sending")) return;
    var errs = validate(2, true);
    if (errs.length) return;
    var data = collect();
    setSending(true);
    var mode = form.getAttribute("data-submit-mode");
    if (mode === "live" && form.getAttribute("data-endpoint")) {
      sendLive(data).then(function () {
        setSending(false);
        fillConfirm(resultSent.querySelector("[data-live-confirm]"), data);
        stamp(resultSent, true);
        form.hidden = true;
        showResult(resultSent);
      }).catch(function () {
        // The answers stay in the form underneath the message.
        setSending(false);
        stamp(resultFailed, true);
        showResult(resultFailed);
      });
      return;
    }
    // Prototype: nothing leaves the browser. Say so plainly.
    window.setTimeout(function () {
      setSending(false);
      fillConfirm(resultProto.querySelector("[data-live-confirm]"), data);
      renderAnswers(data);
      form.hidden = true;
      showResult(resultProto);
    }, 1100);
  });

  function restart() {
    form.reset();
    setSkipped(false);
    document.getElementById("systems-other-wrap").hidden = true;
    if (emailNote) emailNote.hidden = true;
    form.querySelectorAll(".has-error").forEach(function (b) { b.classList.remove("has-error"); });
    form.querySelectorAll(".field__err").forEach(function (er) { er.hidden = true; er.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach(function (i) { i.removeAttribute("aria-invalid"); });
    setSending(false);
    showResult(null);
    form.hidden = false;
    goTo(1, false);
    // keep captured source fields
    (function () {
      var src = {};
      try { src = JSON.parse(store.get(SOURCE_KEY) || "{}") || {}; } catch (er) { src = {}; }
      UTM.concat(["click_id", "landing_page", "referrer"]).forEach(function (k) { var el = document.getElementById("f-" + k); if (el) el.value = src[k] || ""; });
    })();
  }
  document.querySelectorAll("[data-restart]").forEach(function (b) { b.addEventListener("click", function () { restart(); setPreview("live"); window.scrollTo({ top: 0, behavior: SCROLL }); }); });
  var retry = document.querySelector("[data-retry]");
  if (retry) retry.addEventListener("click", function () {
    showResult(null);
    form.hidden = false;
    goTo(2, false);
    if (form.getAttribute("data-submit-mode") === "live") form.requestSubmit(); else submitBtn.focus();
  });

  /* ---------- Prototype: preview each form state ---------- */
  var SAMPLE = { name: "Alex Example", email: "alex@example.com", website: "example.com", country: "Netherlands", industry: "Architecture", headcount: "25-49", years: "11-20", systems: ["Microsoft 365 or SharePoint", "CAD or BIM files"], authority: "Yes" };
  function fillSample() {
    form.elements.name.value = SAMPLE.name;
    form.elements.email.value = SAMPLE.email;
    form.elements.website.value = SAMPLE.website;
    form.elements.country.value = SAMPLE.country;
    ["industry", "headcount", "years", "authority"].forEach(function (n) {
      Array.prototype.forEach.call(form.elements[n], function (i) { i.checked = i.value === SAMPLE[n]; });
    });
    Array.prototype.forEach.call(form.elements.systems, function (i) { i.checked = SAMPLE.systems.indexOf(i.value) !== -1; });
    form.elements.contact_ok.checked = true;
  }
  var previewBtns = document.querySelectorAll("[data-preview]");
  function setPreview(kind) {
    previewBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-preview") === kind ? "true" : "false"); });
  }
  previewBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var kind = btn.getAttribute("data-preview");
      restart();
      setPreview(kind);
      if (kind === "errors") {
        form.elements.name.value = "Alex Example";
        form.elements.email.value = "alex@example";
        validate(1, true);
      } else if (kind === "sending") {
        fillSample(); goTo(2, false); setSending(true);
      } else if (kind === "sent") {
        fillSample();
        form.hidden = true;
        fillConfirm(resultSent.querySelector("[data-live-confirm]"), { name: SAMPLE.name, email: SAMPLE.email });
        stamp(resultSent, false);
        showResult(resultSent);
      } else if (kind === "failed") {
        fillSample(); goTo(2, false);
        stamp(resultFailed, false);
        showResult(resultFailed);
      }
    });
  });
})();
