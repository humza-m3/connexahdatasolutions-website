/* Connexah Data Solutions: motion layer for Direction B (Systems lab).
   A port of connexah.com's motion.js and alive.js with explicit selectors and the same timings
   and class names (cx-rv, cx-in, cx-ch, cx-onscreen, cx-rec, cx-caret, #cx-progress).
   Kept calm for business owners: progress bar, headline prints once, blocks rise once, icons draw
   once, one light on the hero route, small pulsing ports, one title-bar light, one typed line.
   No scan lines, flicker, tickers, count-ups or logo strips.
   Does nothing when the visitor prefers reduced motion. Every browser API call is guarded. */
(function () {
  "use strict";
  var REDUCED = false;
  try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { REDUCED = false; }
  if (REDUCED || !("IntersectionObserver" in window)) return;

  var ease = "cubic-bezier(.2,.7,.2,1)";
  var page = document.documentElement.getAttribute("data-page") || "";

  /* Yellow bar along the top that tracks how far down the page you are. */
  function progress() {
    var bar = document.getElementById("cx-progress");
    if (!bar) { bar = document.createElement("div"); bar.id = "cx-progress"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar); }
    function upd() {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")";
    }
    addEventListener("scroll", upd, { passive: true });
    addEventListener("resize", upd);
    upd();
  }

  /* The page headline prints in letter by letter, like a dot-matrix display. */
  function printHeadline() {
    if (["index", "about", "fit-check", "404"].indexOf(page) === -1) return;
    // The head script's 3 s safety timer already showed the headline: never hide it again.
    if (document.documentElement.hasAttribute("data-cx-late")) return;
    var h = document.querySelector(".hero__title, .page-title");
    if (!h || h.getAttribute("data-cx-print")) return;
    h.setAttribute("data-cx-print", "1");
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    var chars = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (word) {
            if (!word) return;
            if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(word)); return; }
            var w = document.createElement("span"); w.style.whiteSpace = "nowrap"; w.setAttribute("aria-hidden", "true");
            word.split("").forEach(function (ch) {
              var sp = document.createElement("span"); sp.className = "cx-ch"; sp.textContent = ch; w.appendChild(sp); chars.push(sp);
            });
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(h);
    chars.forEach(function (sp, i) { setTimeout(function () { sp.classList.add("cx-in"); }, 120 + i * 22); });
    setTimeout(function () { h.classList.add("cx-printed"); }, 120 + chars.length * 22);
  }

  /* Blocks rise into place once as they scroll into view, staggered inside groups. */
  var SINGLE = [
    ".hero__kicker", ".hero__lede", ".reassure", ".hero .cta-row",
    ".section__intro > *", ".suitability__intro", ".suitability__note", ".commit-note", ".roles__title",
    ".tabs", ".control__side", ".faq__side", ".faq__list", ".final-cta__in", ".page-hero__in > :not(.page-title)",
    ".two-col > *", ".company-details", ".fit__intro > :not(.page-title)", ".fit__aside > *"
  ];
  var GROUPS = [".facts > li", ".record-types > .record-type", ".factors > .factor", ".steps > .step", ".roles__grid > .role", ".qa > *", ".contact__grid > *"];

  function revealTargets() {
    var out = [], seen = [];
    function add(el, i) {
      if (seen.indexOf(el) !== -1) return;
      if (el.closest(".tabs__panel, #fit-form, .doc, .result, .site-header, .site-footer")) return;
      if (el.matches(".hero__title, .page-title")) return; // the headline prints instead
      seen.push(el); out.push([el, i]);
    }
    SINGLE.forEach(function (sel) { document.querySelectorAll(sel).forEach(function (el) { add(el, 0); }); });
    GROUPS.forEach(function (sel) { document.querySelectorAll(sel).forEach(function (el) { add(el, Array.prototype.indexOf.call(el.parentNode.children, el)); }); });
    return out;
  }

  /* Record-type icons draw their lines once. Dashed lines and text fade in instead. */
  var STROKES = "path,line,polyline,polygon,circle,rect,ellipse";
  function prepSvg(svg) {
    var parts = [];
    svg.querySelectorAll(STROKES).forEach(function (el) {
      var cs = getComputedStyle(el);
      var stroke = cs.stroke;
      if (!stroke || stroke === "none" || cs.strokeDasharray !== "none") { el.style.opacity = "0"; parts.push({ el: el, fade: true }); return; }
      var len = 0; try { len = el.getTotalLength(); } catch (e) { len = 0; }
      if (!len || len < 4) { el.style.opacity = "0"; parts.push({ el: el, fade: true }); return; }
      var fill = cs.fill && cs.fill !== "none";
      el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
      if (fill) el.style.fillOpacity = "0";
      parts.push({ el: el, len: len, fill: fill });
    });
    svg.querySelectorAll("text").forEach(function (t) { t.style.opacity = "0"; parts.push({ el: t, fade: true, text: true }); });
    return { svg: svg, parts: parts };
  }
  function playSvg(job) {
    var n = job.parts.length, span = Math.min(900, n * 18);
    job.parts.forEach(function (p, i) {
      var delay = n > 1 ? Math.round(span * i / (n - 1)) : 0;
      var el = p.el;
      setTimeout(function () {
        if (p.fade) { el.style.transition = "opacity .5s ease"; el.style.opacity = ""; return; }
        el.style.transition = "stroke-dashoffset 1.1s " + ease + ", fill-opacity .6s ease .5s";
        el.style.strokeDashoffset = "0";
        if (p.fill) el.style.fillOpacity = "";
        setTimeout(function () { el.style.strokeDasharray = ""; el.style.strokeDashoffset = ""; el.style.transition = ""; }, 1400);
      }, delay + (p.text ? 400 : 0));
    });
  }

  /* One fictional record line types itself out the first time it is shown. */
  function type(el) {
    if (el.__cxTyped) return; el.__cxTyped = 1;
    var full = el.textContent;
    el.style.minHeight = el.offsetHeight + "px";
    el.textContent = "";
    el.classList.remove("cx-pretype");
    var sr = document.createElement("span"); sr.className = "visually-hidden"; sr.textContent = full;
    var shown = document.createElement("span"); shown.setAttribute("aria-hidden", "true");
    var txt = document.createTextNode(""); shown.appendChild(txt);
    var caret = document.createElement("span"); caret.className = "cx-caret"; caret.setAttribute("aria-hidden", "true");
    el.appendChild(sr); el.appendChild(shown); el.appendChild(caret);
    var i = 0;
    (function tick() {
      i = Math.min(full.length, i + 2); txt.textContent = full.slice(0, i);
      if (i < full.length) setTimeout(tick, 22);
      else setTimeout(function () { caret.remove(); el.style.minHeight = ""; }, 2400);
    })();
  }

  function start() {
    progress();
    printHeadline();
    document.documentElement.classList.remove("cx-motion"); // set early in <head> so the headline never flashes

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        if (el.__cxSvg) playSvg(el.__cxSvg);
        else el.classList.add("cx-in");
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    var fold = innerHeight;
    revealTargets().forEach(function (pair) {
      var el = pair[0];
      if (el.getBoundingClientRect().top < fold) return; // visible on arrival: never hide it
      el.classList.add("cx-rv");
      el.style.transitionDelay = Math.min(pair[1], 6) * 90 + "ms";
      io.observe(el);
    });
    document.querySelectorAll("svg.spec").forEach(function (svg) { svg.__cxSvg = prepSvg(svg); io.observe(svg); });
    /* Example lines type as soon as half of them is on screen (their own observer, no margin). */
    var typeIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        typeIo.unobserve(en.target);
        setTimeout(function () { type(en.target); }, 300);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll(".specimen__line").forEach(function (el) { el.classList.add("cx-pretype"); typeIo.observe(el); });

    /* Anything already on screen when scrolling stops is shown, so nothing in view ever stays
       blank (arriving by a section link, or resting with a block in the bottom of the window). */
    function settle() {
      document.querySelectorAll(".cx-rv:not(.cx-in)").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) { io.unobserve(el); el.classList.add("cx-in"); }
      });
    }
    var settleTimer = null;
    addEventListener("scroll", function () { clearTimeout(settleTimer); settleTimer = setTimeout(settle, 160); }, { passive: true });
    addEventListener("load", function () { setTimeout(settle, 300); });
    addEventListener("hashchange", function () { setTimeout(settle, 600); });
    setTimeout(settle, 900);

    /* The hero window only moves while it is on screen. */
    var art = document.querySelector(".hero .art");
    if (art) {
      var square = art.querySelector(".art__squares i");
      if (square) square.classList.add("cx-rec");
      var wires = Array.prototype.slice.call(art.querySelectorAll("svg.art__wires"));
      var paused = false, onscreen = false;
      function sync() {
        art.classList.toggle("cx-onscreen", onscreen && !paused);
        wires.forEach(function (svg) {
          try { if (onscreen && !paused) svg.unpauseAnimations(); else svg.pauseAnimations(); } catch (e) { /* no SMIL */ }
        });
      }
      var bar = art.querySelector(".art__bar");
      if (bar) {
        var btn = document.createElement("button");
        btn.type = "button"; btn.className = "art__pause"; btn.textContent = "Pause"; btn.setAttribute("aria-label", "Pause motion");
        btn.addEventListener("click", function () {
          paused = !paused;
          btn.textContent = paused ? "Play" : "Pause";
          btn.setAttribute("aria-label", paused ? "Play motion" : "Pause motion");
          sync();
        });
        bar.appendChild(btn);
      }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { onscreen = en.isIntersecting; sync(); });
      }, { threshold: 0.15 }).observe(art);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
