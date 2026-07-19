// Shared test definitions for BlockCast's pure logic.
// The code under test lives inside index.html between /* @pure */ and
// /* @end-pure */ markers; buildApi() evaluates those blocks and returns the
// functions. Used by run.mjs (Node) and test.html (browser).

export function buildApi(indexHtmlSource){
  const blocks = indexHtmlSource
    .split("/* @pure */").slice(1)
    .map(s => s.split("/* @end-pure */")[0])
    .join("\n");
  if(!blocks.trim()) throw new Error("no /* @pure */ blocks found in index.html");
  return new Function(`"use strict";
    ${blocks};
    return {ACTIVITIES, TOL_MULT, ramp, blockFactors, riskScore, riskBand,
            planKey, esc, icsEsc, foldIcs};`)();
}

export function runTests(api){
  const {ACTIVITIES, TOL_MULT, ramp, blockFactors, riskScore, riskBand,
         planKey, esc, icsEsc, foldIcs} = api;
  const failures = [];
  let passed = 0;
  const eq = (name, got, want) => {
    if(Object.is(got, want)) passed++;
    else failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  };
  const ok = (name, cond) => eq(name, !!cond, true);

  // a comfortable hour for a summer sport
  const hour = over => ({temp:20, pprob:0, precip:0, wind:5, gust:10, cloud:0, uv:2, sdep:0, ...over});
  const crit = (actKey, over) => {
    const act = ACTIVITIES[actKey];
    return {act, weights:{...act.w}, tMin:act.tMin, tMax:act.tMax, ...over};
  };

  // ramp
  eq("ramp mid", ramp(5, 0, 10), 0.5);
  eq("ramp below", ramp(-1, 0, 10), 0);
  eq("ramp above", ramp(11, 0, 10), 1);

  // risk bands
  eq("band 24 green", riskBand(24), "g");
  eq("band 25 yellow", riskBand(25), "y");
  eq("band 54 yellow", riskBand(54), "y");
  eq("band 55 red", riskBand(55), "r");

  // planner sort key: hours must be zero-padded (12:00 used to sort before 6:00)
  ok("planKey 6h before 12h", planKey({day:"2026-07-20", h:6}) < planKey({day:"2026-07-20", h:12}));
  ok("planKey day order", planKey({day:"2026-07-20", h:22}) < planKey({day:"2026-07-21", h:2}));

  // HTML escaping
  eq("esc tags", esc(`<img src=x onerror="a">`), "&lt;img src=x onerror=&quot;a&quot;&gt;");

  // ICS text escaping (RFC 5545)
  eq("icsEsc", icsEsc("Québec, QC; line1\nline2\\x"), "Québec\\, QC\\; line1\\nline2\\\\x");

  // ICS folding: physical lines stay under 75 octets and unfold losslessly
  const long = "DESCRIPTION:" + "word ".repeat(40) + "été ".repeat(30);
  const folded = foldIcs(long);
  const byteLen = s => new TextEncoder().encode(s).length;
  ok("fold line lengths", folded.split("\r\n").every(l => byteLen(l) <= 75));
  eq("fold roundtrip", folded.replaceAll("\r\n ", ""), long);
  eq("fold short line untouched", foldIcs("BEGIN:VEVENT"), "BEGIN:VEVENT");

  // blockFactors severities
  const fGood = blockFactors([hour()], 0, crit("tennis"));
  ok("perfect hour: rain sev 0", fGood.sev.rain === 0);
  ok("perfect hour: wind sev 0", fGood.sev.wind === 0);
  ok("perfect hour: temp sevs 0", fGood.sev.cold === 0 && fGood.sev.heat === 0);
  eq("downpour rain sev", blockFactors([hour({pprob:100, precip:10})], 0, crit("tennis")).sev.rain, 1);
  eq("freezing cold sev", blockFactors([hour({temp:2})], 0, crit("tennis")).sev.cold, 1);
  eq("heatwave heat sev", blockFactors([hour({temp:40})], 0, crit("tennis")).sev.heat, 1);
  // sailing: a dead calm is as bad as a storm
  eq("sailing calm wind sev", blockFactors([hour({wind:0, gust:0})], 0, crit("sailing")).sev.wind, 1);
  // skiing: thin snow base is a risk, a solid base is not
  eq("skiing bare ground snow sev", blockFactors([hour({temp:-5})], 0, crit("skiing")).sev.snow, 1);
  eq("skiing deep base snow sev", blockFactors([hour({temp:-5, sdep:0.5})], 0, crit("skiing")).sev.snow, 0);

  // riskScore: worst factor dominates, tolerance scales severity
  const f = {sev:{rain:0.5}};
  eq("score balanced", riskScore(f, {rain:10}, TOL_MULT.balanced), 50);
  eq("score tolerant", riskScore(f, {rain:10}, TOL_MULT.tolerant), 34);
  eq("score cautious", riskScore(f, {rain:10}, TOL_MULT.cautious), 65);
  eq("score ignores weight-0 factors", riskScore({sev:{rain:1}}, {rain:0}, 1), 0);
  eq("perfect tennis block scores 0",
    riskScore(fGood, crit("tennis").weights, TOL_MULT.balanced), 0);

  return {passed, failed:failures.length, failures};
}
