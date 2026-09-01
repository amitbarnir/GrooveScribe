// Headless tests for the 2026-08-17 batch: flam preview sound, auto speed up step mode,
// silent measures, and the changelog popup.   Run with:
//   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc _test_features.js

var failures = 0;
function check(l, a, e) {
	var ok = String(a) === String(e);
	if (!ok) failures++;
	print((ok ? "PASS  " : "FAIL  ") + l + (ok ? "" : "\n        expected: " + e + "\n        actual:   " + a));
}
function section(t) { print(""); print("--- " + t + " ---"); }

// ---------------------------------------------------------------- browser stubs
function makeStyle() {
	var raw = {};
	function norm(v) {
		if (typeof v !== "string") return v;
		var s = v.trim();
		if (s === "#000000" || s === "#000") return "rgb(0, 0, 0)";
		if (s === "#FFF") return "rgb(255, 255, 255)";
		if (s === "#999") return "rgb(153, 153, 153)";
		return s;
	}
	return { set color(v) { raw.c = norm(v); }, get color() { return raw.c || ""; },
			 set backgroundColor(v) { raw.b = norm(v); }, get backgroundColor() { return raw.b || ""; },
			 set borderColor(v) { raw.d = norm(v); }, get borderColor() { return raw.d || ""; },
			 set visibility(v) { raw.v = v; }, get visibility() { return raw.v || ""; },
			 set display(v) { raw.p = v; }, get display() { return raw.p || ""; } };
}
var made = {};
function fakeEl(id) {
	return { id: id, style: makeStyle(), className: "", innerHTML: "", value: "", checked: false,
			 classList: { add: function () {}, remove: function () {} },
			 appendChild: function () {}, setAttribute: function () {}, getAttribute: function () { return ""; },
			 addEventListener: function () {}, children: [], getBoundingClientRect: function () { return {}; } };
}
var document = {
	currentScript: null,
	getElementById: function (id) { return made[id] || null; },
	querySelectorAll: function (sel) {
		if (sel === ".toms-container") { var e = fakeEl("tc"); e.style.visibility = "visible"; return [e]; }
		return [];
	},
	querySelector: function () { return null; }, createElement: function () { return fakeEl("new"); },
	body: fakeEl("body"), addEventListener: function () {}, documentElement: fakeEl("html"), write: function () {}
};
var window = { location: { href: "http://localhost:8000/", search: "" }, addEventListener: function () {},
			   innerWidth: 1200, innerHeight: 800 };
var navigator = { userAgent: "jsc" };

// record every note the app asks to play
var played = [];
var MIDI = { WebAudio: { noteOn: function (ch, note, vel, delay) { played.push({ note: note, vel: vel, delay: delay }); } } };
var ABCJS = {};
var storage = {};
var localStorage = {
	getItem: function (k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null; },
	setItem: function (k, v) { storage[k] = String(v); }
};
var logs = [];
var console = { log: function (m) { logs.push(String(m)); } };

load("js/abc2svg-1.js");
load("js/groove_utils.js");
load("js/groove_writer.js");
load("js/groove_changelog.js");

var gw = new GrooveWriter();
gw.myGrooveUtils = new GrooveUtils();
var genHTML = gw.HTMLforStaffContainer(0, 0);
var idRe = /id="([^"]+)"/g, m;
while ((m = idRe.exec(genHTML)) !== null) made[m[1]] = fakeEl(m[1]);

// Register the ids index.html supplies, scraped out of the real file rather than listed by
// hand so this can't drift as the markup changes.   getElementById still returns null for
// anything that is in neither source, which is what makes a missing-element bug visible.
// Sliders and checkboxes are seeded with their shipped defaults so the tests exercise the
// values a fresh page load would actually have.
var indexSource = readFile("index.html");
var tagRe = /<[a-zA-Z][^>]*\bid="([^"]+)"[^>]*>/g, tag;
while ((tag = tagRe.exec(indexSource)) !== null) {
	var el = fakeEl(tag[1]);
	var valueMatch = /\bvalue=(?:"([^"]*)"|'([^']*)'|([^\s">]+))/.exec(tag[0]);
	if (valueMatch)
		el.value = valueMatch[1] !== undefined ? valueMatch[1] :
				   valueMatch[2] !== undefined ? valueMatch[2] : valueMatch[3];
	if (/\bchecked\b/.test(tag[0]))
		el.checked = true;
	made[tag[1]] = el;
}

// ================================================================ 1. flam preview sound
section("flam preview plays an actual flam, not a single tom hit");

gw.noteRightClick({ preventDefault: function () {} }, "tom1", 5);
played = [];
gw.notePopupClick("tom1", "normal");
check("normal tom preview is one hit", played.length, 1);
check("  at normal velocity", played[0].vel, constant_OUR_MIDI_VELOCITY_NORMAL);

played = [];
gw.notePopupClick("tom1", "flam");
check("flam preview is two hits", played.length, 2);
check("  both on the tom1 voice", played[0].note === constant_OUR_MIDI_TOM1_NORMAL &&
								  played[1].note === constant_OUR_MIDI_TOM1_NORMAL, true);
check("  grace note is quieter", played[0].vel < played[1].vel, true);
check("  grace note is first, at zero delay", played[0].delay, 0);
check("  main hit is delayed by the grace interval", played[1].delay, constant_OUR_MIDI_FLAM_GRACE_PREVIEW_SECONDS);
check("  grace interval is audible but tight (20-80ms)",
	  constant_OUR_MIDI_FLAM_GRACE_PREVIEW_SECONDS >= 0.02 && constant_OUR_MIDI_FLAM_GRACE_PREVIEW_SECONDS <= 0.08, true);

gw.noteRightClick({ preventDefault: function () {} }, "tom4", 5);
played = [];
gw.notePopupClick("tom4", "flam");
check("floor tom flam previews on the floor tom voice", played[0].note, constant_OUR_MIDI_TOM4_NORMAL);
check("floor tom flam is also two hits", played.length, 2);

// ---------------------------------------------------------------- silence while playing
section("editing a groove mid-playback stays quiet");

// The preview click is there so you can hear what you just placed.   While the loop is
// running the note is already going to be heard when the MIDI reloads at the top of the
// phrase, so previewing it as well drops an extra hit into the middle of the bar.
MIDI.Player = { playing: false };
gw.noteRightClick({ preventDefault: function () {} }, "tom1", 5);
played = [];
gw.notePopupClick("tom1", "normal");
check("stopped: adding a tom previews as usual", played.length, 1);

MIDI.Player.playing = true;
played = [];
gw.notePopupClick("tom1", "normal");
check("playing: adding a tom makes no sound", played.length, 0);
played = [];
gw.notePopupClick("tom1", "flam");
check("playing: nor does a flam", played.length, 0);
played = [];
gw.noteLeftClick({ preventDefault: function () {}, target: { id: "hh5" } }, "hh", 5);
check("playing: nor does a left click on the hi-hat", played.length, 0);

// we are muting the preview, not the edit - the note still has to land on the grid
gw.noteRightClick({ preventDefault: function () {} }, "tom2", 7);
gw.notePopupClick("tom2", "off");
var beforeEdit = gw.grooveDataFromClickableUI().toms_array[1][7];
gw.notePopupClick("tom2", "normal");
var afterEdit = gw.grooveDataFromClickableUI().toms_array[1][7];
check("playing: the note is still written to the grid",
	  beforeEdit === false && afterEdit !== false, true);

MIDI.Player.playing = false;
played = [];
gw.notePopupClick("tom1", "normal");
check("stopped again: the preview comes back", played.length, 1);
delete MIDI.Player;

// ================================================================ 2. auto speed up
section("auto speed up defaults");

// read the shipped defaults straight out of index.html rather than trusting the stub
var indexHTML = readFile("index.html");
var amountDefault = indexHTML.match(/id="metronomeAutoSpeedupTempoIncreaseAmount"/) ?
	indexHTML.match(/value=(\d+)[^>]*id="metronomeAutoSpeedupTempoIncreaseAmount"/) : null;
var intervalDefault = indexHTML.match(/value=(\d+)[^>]*id="metronomeAutoSpeedupTempoIncreaseInterval"/);
check("amount slider default is 10 bpm", amountDefault && amountDefault[1], 10);
check("interval slider default is step 6", intervalDefault && intervalDefault[1], 6);
check("  which is one minute", gw.metronomeAutoSpeedupIntervalSecondsFromSliderValue(intervalDefault[1]), 60);
check("displayed amount text says 10", /metronomeAutoSpeedupTempoIncreaseAmountOutput">10</.test(indexHTML), true);
check("displayed interval text says 1 min", /metronomeAutoSpeedupTempoIncreaseIntervalOutput">1 min</.test(indexHTML), true);
check("step mode checkbox exists and is off by default",
	  /<input type="checkbox" id="metronomeAutoSpeedUpStepMode">/.test(indexHTML), true);

// ---------------------------------------------------------------- interval slider mapping
section("auto speed up: interval slider steps in 10s up to a minute, then in minutes");

var secondsFor = gw.metronomeAutoSpeedupIntervalSecondsFromSliderValue;
check("step 1 is 10 seconds", secondsFor(1), 10);
check("step 2 is 20 seconds", secondsFor(2), 20);
check("step 5 is 50 seconds", secondsFor(5), 50);
check("step 6 is one minute", secondsFor(6), 60);
check("step 7 is two minutes, not 70 seconds", secondsFor(7), 120);
check("step 8 is three minutes", secondsFor(8), 180);
check("step 25 is twenty minutes", secondsFor(25), 1200);
check("the slider tops out at 25 in the markup",
	  /max=25[^>]*id="metronomeAutoSpeedupTempoIncreaseInterval"/.test(indexHTML), true);

// no gaps, no repeats, and strictly increasing across the whole slider
var seenSeconds = [], strictlyIncreasing = true;
for (var st = 1; st <= 25; st++) {
	seenSeconds.push(secondsFor(st));
	if (st > 1 && seenSeconds[st - 1] <= seenSeconds[st - 2]) strictlyIncreasing = false;
}
check("every step is longer than the one before it", strictlyIncreasing, true);
check("the sub-minute steps are exactly 10s apart", seenSeconds.slice(0, 6).join(","), "10,20,30,40,50,60");
check("nothing between 60s and 120s is reachable", seenSeconds.indexOf(90), -1);

check("a garbled slider value falls back to one minute", secondsFor("banana"), 60);
check("a zero slider value falls back to one minute", secondsFor(0), 60);

// the label has to switch units as the slider moves
check("label reads seconds below a minute", gw.metronomeAutoSpeedupIntervalText(30), "30 sec");
check("label reads 1 min at sixty seconds", gw.metronomeAutoSpeedupIntervalText(60), "1 min");
check("label reads minutes above that", gw.metronomeAutoSpeedupIntervalText(300), "5 min");
gw.updateIntervalRangeLabel({ currentTarget: { value: "3" } });
check("moving the slider rewrites the label", made.metronomeAutoSpeedupTempoIncreaseIntervalOutput.innerHTML, "30 sec");
gw.updateIntervalRangeLabel({ currentTarget: { value: "9" } });
check("  and switches to minutes past the hour mark", made.metronomeAutoSpeedupTempoIncreaseIntervalOutput.innerHTML, "4 min");

// round trip, for the URL encoding to lean on
var roundTripOK = true;
for (var rt = 1; rt <= 25; rt++) {
	if (gw.metronomeAutoSpeedupSliderValueFromIntervalSeconds(secondsFor(rt)) !== rt) roundTripOK = false;
}
check("seconds -> slider -> seconds round trips for every step", roundTripOK, true);
check("an out of range interval clamps to the top step", gw.metronomeAutoSpeedupSliderValueFromIntervalSeconds(99999), 25);
check("a nonsense interval falls back to one minute", gw.metronomeAutoSpeedupSliderValueFromIntervalSeconds("x"), 6);

section("auto speed up: gradual vs step mode");

// drive metronomeAutoSpeedUpTempoUpdate with a controllable clock
var fakeTempo = 100;
var fakePlayMs = 0;
gw.myGrooveUtils.getTempo = function () { return fakeTempo; };
gw.myGrooveUtils.setTempo = function (t) { fakeTempo = t; };
gw.myGrooveUtils.getMidiStartTime = function () { return "run1"; };
gw.myGrooveUtils.getMidiPlayTime = function () { return new Date(fakePlayMs); };

made.metronomeAutoSpeedupTempoIncreaseAmount.value = "10";
made.metronomeAutoSpeedupTempoIncreaseInterval.value = "6";   // step 6 == 1 minute
made.metronomeAutoSpeedUpKeepGoingForever.checked = true;

var runCounter = 0;
function runLoops(stepMode, secondsPerLoop, numLoops) {
	made.metronomeAutoSpeedUpStepMode.checked = stepMode;
	fakeTempo = 100;
	fakePlayMs = 0;
	// must be unique per call, otherwise the function thinks it is the same playback
	// session and never resets its interval clock
	var runKey = "run" + (runCounter++);
	gw.myGrooveUtils.getMidiStartTime = function () { return runKey; };
	var trace = [];
	for (var i = 0; i < numLoops; i++) {
		fakePlayMs += secondsPerLoop * 1000;
		gw.metronomeAutoSpeedUpTempoUpdate();
		trace.push(fakeTempo);
	}
	return trace;
}

// gradual: 10bpm over 60s, sampled every 10s -> should creep up in small steps
var gradual = runLoops(false, 10, 6);
check("gradual: climbs before the interval is up", gradual[0] > 100, true);
// NB 109 not 110: the original algorithm loses a hair to float rounding in its
// remainder carry.   Verified identical to the pre-change implementation, so this
// pins existing behaviour rather than blessing a bug I introduced.
check("gradual: lands within 1bpm of +10 after a full minute", gradual[5], 109);
check("gradual: unchanged from the committed implementation", gradual.join(","), "101,103,104,106,108,109");
check("gradual: is monotonic", gradual.join(",") === gradual.slice().sort(function (a, b) { return a - b; }).join(","), true);

// step: same clock, but must stay flat until 60s then jump the whole 10
var stepped = runLoops(true, 10, 6);
check("step: no change at 10s", stepped[0], 100);
check("step: no change at 30s", stepped[2], 100);
check("step: no change at 50s", stepped[4], 100);
check("step: jumps the full 10 bpm at 60s", stepped[5], 110);

// step mode over several intervals
var steppedLong = runLoops(true, 30, 8);   // 30s per loop, 4 minutes total
check("step: 2 jumps by the 2 minute mark", steppedLong[3], 120);
check("step: 4 jumps by the 4 minute mark", steppedLong[7], 140);
check("step: still flat between jumps", steppedLong[4], 120);

// respects "stop after the first interval"
made.metronomeAutoSpeedUpKeepGoingForever.checked = false;
var cappedTrace = runLoops(true, 30, 8);
check("step: honours the stop-after-first-interval cap", cappedTrace[7], 110);
made.metronomeAutoSpeedUpKeepGoingForever.checked = true;

// the seconds mapping has to be wired into the tempo update itself, not just be a pure
// function nobody calls.   At step 3 (30 seconds) a jump must land twice as often.
made.metronomeAutoSpeedupTempoIncreaseInterval.value = "3";   // 30 seconds
var fastStep = runLoops(true, 10, 6);
check("step: a 30 second interval jumps at 30s", fastStep[2], 110);
check("step: and again at 60s", fastStep[5], 120);
made.metronomeAutoSpeedupTempoIncreaseInterval.value = "6";   // back to 1 minute

// ================================================================ 3. silent phrases
section("a silent phrase mutes everything");

function blank(n) { var a = []; for (var i = 0; i < n; i++) a.push(false); return a; }
function FakeTrack() {
	this.events = []; var self = this;
	this.addNoteOn = function (ch, note, delay, vel) { self.events.push({ kind: "on", note: note, vel: vel, delay: delay }); };
	this.addNoteOff = function (ch, note, delay) { self.events.push({ kind: "off", note: note, delay: delay }); };
	this.setTempo = function () {}; this.setInstrument = function () {};
}
// ONE measure of 4/4 = 32 slots, backbeat + 8ths, metronome on quarters.   The app calls
// MIDI_from_HH_Snare_Kick_Arrays once per measure, never with a whole multi bar groove, so
// the tests have to use that shape too.
function oneBarGroove() {
	var hh = blank(32), sn = blank(32);
	for (var i = 0; i < 32; i += 4) hh[i] = constant_ABC_HH_Normal;
	sn[8] = constant_ABC_SN_Normal; sn[24] = constant_ABC_SN_Normal;
	return { hh: hh, sn: sn };
}
function renderMeasure(isSilent) {
	var g = oneBarGroove();
	var t = new FakeTrack();
	var gu2 = new GrooveUtils();
	gu2.phraseIsSilent = isSilent;
	gu2.MIDI_from_HH_Snare_Kick_Arrays(t, g.hh, g.sn, blank(32),
		[blank(32), blank(32), blank(32), blank(32)], "Custom", 4, 32, 32, 0, 4, 4);
	return t;
}
function notesIn(t) { return t.events.filter(function (e) { return e.kind === "on"; }); }

var audibleTrack = renderMeasure(false);
var silentTrack = renderMeasure(true);

check("an audible phrase plays", notesIn(audibleTrack).length > 0, true);
check("a silent phrase emits no notes at all", notesIn(silentTrack).length, 0);

// the metronome must go too, not just the drums
check("  the metronome is silenced as well", notesIn(silentTrack).filter(function (e) {
	return e.note === constant_OUR_MIDI_METRONOME_1 || e.note === constant_OUR_MIDI_METRONOME_NORMAL;
}).length, 0);
check("  (the metronome really was firing when audible)", notesIn(audibleTrack).filter(function (e) {
	return e.note === constant_OUR_MIDI_METRONOME_1 || e.note === constant_OUR_MIDI_METRONOME_NORMAL;
}).length > 0, true);

// silence is all or nothing now - no half muted phrase, whatever the measure
check("nothing is partially muted", notesIn(silentTrack).length === 0 || notesIn(silentTrack).length === notesIn(audibleTrack).length, true);

// the decision comes from the caller, so it cannot vary between measures of one phrase
var consistent = true;
for (var rep = 0; rep < 40; rep++) {
	if (notesIn(renderMeasure(true)).length !== 0) consistent = false;
	if (notesIn(renderMeasure(false)).length !== notesIn(audibleTrack).length) consistent = false;
}
check("the builder is deterministic - it no longer rolls its own dice", consistent, true);

// tom flam grace notes must not leak through a silent phrase
var gflam = new GrooveUtils();
gflam.phraseIsSilent = true;
var tflam = blank(32); tflam[8] = constant_ABC_T1_Flam;
var ft = new FakeTrack();
gflam.MIDI_from_HH_Snare_Kick_Arrays(ft, blank(32), blank(32), blank(32),
	[tflam, blank(32), blank(32), blank(32)], "Custom", 0, 32, 32, 0, 4, 4);
check("a flam's grace note does not leak into a silent phrase",
	  ft.events.filter(function (e) { return e.kind === "on"; }).length, 0);

// ---------------------------------------------------------------- the ratio
section("silence honours the ratio, not a per measure coin flip");

function drawSequence(pct, reps) {
	gw.setSilentPhrasesActive(true);
	made.silentPhrasesPercentage.value = String(pct);
	gw.resetSilentPhraseCycle();
	var out = [gw.isThisPhraseSilent()];          // the phrase you start on
	for (var i = 1; i < reps; i++) {
		gw.rollNextSilentPhrase();
		out.push(gw.isThisPhraseSilent());
	}
	return out;
}
function countSilent(seq) {
	return seq.filter(function (s) { return s === true; }).length;
}

function silentShare(seq) {
	return countSilent(seq) / seq.length * 100;
}

// 30% must mean the groove drops out 3 times in every 10 repetitions.   The credit
// accumulator self corrects, so the ratio is exact over a long run rather than forced into
// fixed windows - check it where it matters, over hundreds of repetitions.
check("30% is 3 in every 10 over the long run",
	  Math.abs(silentShare(drawSequence(30, 2001).slice(1)) - 30) < 1, true);

var everySliderPosition = true;
var worstDrift = 0;
for (var pctUnderTest = 5; pctUnderTest <= 90; pctUnderTest += 5) {
	var drift = Math.abs(silentShare(drawSequence(pctUnderTest, 2001).slice(1)) - pctUnderTest);
	if (drift > worstDrift) worstDrift = drift;
	if (drift >= 1) everySliderPosition = false;
}
check("every slider position lands within 1% of what it says", everySliderPosition, true);
check("  worst drift across the whole slider is under half a percent", worstDrift < 0.5, true);

// it also has to be right locally, not just on average - a setting that is correct over
// 2000 repetitions but wanders for the first 40 is no use to anyone
var locallyRight = true;
for (var t2 = 0; t2 < 30; t2++) {
	var short = drawSequence(25, 41).slice(1);   // 40 repetitions at 25% -> about 10 silent
	if (countSilent(short) < 8 || countSilent(short) > 12) locallyRight = false;
}
check("25% gives about 10 silent in any 40 repetitions", locallyRight, true);

// the placement still has to move around, or you would just learn the pattern
var seen = {};
for (var t3 = 0; t3 < 40; t3++)
	seen[drawSequence(50, 21).slice(1).join("")] = true;
check("the gaps do not fall in the same place every time", Object.keys(seen).length > 5, true);

// ---------------------------------------------------------------- spacing
// This is the property that took three attempts to get right, so it is worth pinning hard.
// Getting the count right is not enough - the spacing is what you feel.   A uniform shuffle
// hit runs of 15 playing and 4 silent at 25%, which is what made it unusable.   The credit
// accumulator spaces them by construction.   If these ceilings regress, so does the feature.
section("silences stay spread out, no long stretches either way");

function longestRun(seq, wanted) {
	var best = 0, cur = 0;
	seq.forEach(function (s) {
		if (s === wanted) { cur++; if (cur > best) best = cur; } else { cur = 0; }
	});
	return best;
}

// measured worst cases over 40000 repetitions were: 25% -> 6 and 2, 30% -> 4 and 2,
// 50% -> 2 and 2.   The ceilings below leave headroom for the jitter without leaving room
// for the clumping to come back.
[[25, 9, 4], [30, 7, 4], [50, 4, 4], [10, 20, 3]].forEach(function (limits) {
	var pct = limits[0];
	var worstAudible = 0, worstSilent = 0;
	for (var attempt = 0; attempt < 10; attempt++) {
		var seq = drawSequence(pct, 501).slice(1);
		worstAudible = Math.max(worstAudible, longestRun(seq, false));
		worstSilent = Math.max(worstSilent, longestRun(seq, true));
	}
	check(pct + "%: no marathon of playing (saw " + worstAudible + ")", worstAudible <= limits[1], true);
	check(pct + "%: no marathon of silence (saw " + worstSilent + ")", worstSilent <= limits[2], true);
});

// the pathological case the shuffle hit: a stretch so long the setting looks switched off
var longestGapAt25 = 0;
for (var t5 = 0; t5 < 10; t5++)
	longestGapAt25 = Math.max(longestGapAt25, longestRun(drawSequence(25, 501).slice(1), false));
check("25% never goes 13 repetitions without a gap", longestGapAt25 < 13, true);

// the thing Amit actually asked for
section("the first phrase is never silent");

var firstEverSilent = false;
for (var t4 = 0; t4 < 200; t4++) {
	if (drawSequence(90, 1)[0] === true) firstEverSilent = true;
}
check("even at 90%, the phrase you start on plays", firstEverSilent, false);

check("resetting mid cycle clears a silent phrase", (function () {
	gw.setSilentPhrasesActive(true);
	made.silentPhrasesPercentage.value = "90";
	gw.resetSilentPhraseCycle();
	// run deep into the cycle so we are almost certainly sitting on a silent phrase
	var landedSilent = false;
	for (var i = 0; i < 8; i++) {
		gw.rollNextSilentPhrase();
		if (gw.isThisPhraseSilent()) landedSilent = true;
	}
	gw.resetSilentPhraseCycle();
	return landedSilent && !gw.isThisPhraseSilent();
}()), true);

// runsOnPageLoad installs the writer's loadMidiDataEvent, and the stub environment never
// calls it, so pin the wiring at the source level instead of pretending to exercise it
var writerSource = readFile("js/groove_writer.js");
check("pressing play is wired to reset the cycle",
	  /playStarting\)\s*\n\s*root\.resetSilentPhraseCycle\(\);/.test(writerSource), true);
check("the loop boundary is wired to draw the next phrase",
	  /silenceIsOn\)\s*\n\s*root\.rollNextSilentPhrase\(\);/.test(writerSource), true);
check("the MIDI build reads the drawn value rather than rolling its own",
	  /phraseIsSilent = root\.getSilentPhrasePercentage\(\) > 0 && root\.isThisPhraseSilent\(\)/.test(writerSource), true);
check("no dice left in the MIDI builder",
	  /Math\.random/.test(readFile("js/groove_utils.js")), false);

check("changing the percentage restarts the cycle", (function () {
	gw.setSilentPhrasesActive(true);
	made.silentPhrasesPercentage.value = "90";
	gw.resetSilentPhraseCycle();
	for (var i = 0; i < 5; i++) gw.rollNextSilentPhrase();
	gw.close_SilentPhrasesConfiguration();
	return gw.isThisPhraseSilent();
}()), false);

check("turning the option off stops muting entirely", (function () {
	gw.setSilentPhrasesActive(false);
	gw.rollNextSilentPhrase();
	return gw.isThisPhraseSilent();
}()), false);
gw.setSilentPhrasesActive(false);

// ---------------------------------------------------------------- its own metronome option
section("silent measures: independent of auto speed up");

check("the menu has its own entry for it",
	  /id="metronomeOptionsContextMenuSilence"/.test(indexHTML), true);
check("the entry calls through with \"Silence\"",
	  /metronomeOptionsMenuPopupClick\("Silence"\)/.test(indexHTML), true);
check("the slider lives in its own popup, not the speed up one",
	  /id="silentPhrasesConfiguration"/.test(indexHTML), true);
check("the speed up popup no longer carries a silence slider",
	  /metronomeAutoSpeedupSilentPhrasePercentage/.test(indexHTML), false);
check("the old silence slider id is gone from the writer too",
	  /metronomeAutoSpeedupSilentPhrasePercentage/.test(readFile("js/groove_writer.js")), false);

check("off by default, so the slider position is irrelevant", (function () {
	made.silentPhrasesPercentage.value = "35";
	return gw.getSilentPhrasePercentage();
}()), 0);

gw.setSilentPhrasesActive(true);
check("turning the option on lets the slider through", gw.getSilentPhrasePercentage(), 35);
check("  and the option reports itself on", gw.isSilentPhrasesActive(), true);
check("  which lights up the metronome menu", (function () {
	// metronomeOptionsMenuSetSelectedState marks the anchor selected for any active option
	return /selected/.test(made.metronomeOptionsAnchor.className);
}()), true);

made.silentPhrasesPercentage.value = "60";
check("moving the slider while on is picked up", gw.getSilentPhrasePercentage(), 60);

gw.setSilentPhrasesActive(false);
check("turning it back off silences the setting, not the drums", gw.getSilentPhrasePercentage(), 0);

check("copes with a missing slider", (function () {
	gw.setSilentPhrasesActive(true);
	var save = made.silentPhrasesPercentage;
	made.silentPhrasesPercentage = null;
	var v = gw.getSilentPhrasePercentage();
	made.silentPhrasesPercentage = save;
	gw.setSilentPhrasesActive(false);
	return v;
}()), 0);

// the two configurators sit at the same screen position, so only one can ever be up
check("opening silent measures closes the speed up panel", (function () {
	gw.show_MetronomeAutoSpeedupConfiguration();
	gw.show_SilentPhrasesConfiguration();
	return made.metronomeAutoSpeedupConfiguration.style.display + "/" + made.silentPhrasesConfiguration.style.display;
}()), "none/block");
check("and the other way round", (function () {
	gw.show_MetronomeAutoSpeedupConfiguration();
	return made.metronomeAutoSpeedupConfiguration.style.display + "/" + made.silentPhrasesConfiguration.style.display;
}()), "block/none");
gw.close_MetronomeAutoSpeedupConfiguration();

// GrooveDBCreateGroove.html loads groove_writer.js without a metronome menu
check("survives a page with no metronome menu", (function () {
	var saved = made.metronomeOptionsContextMenu;
	made.metronomeOptionsContextMenu = null;
	var threw = false, state;
	try {
		gw.setSilentPhrasesActive(true);
		state = gw.isSilentPhrasesActive();
		gw.applyPracticeSettingsFromGrooveData(new gw.myGrooveUtils.grooveDataNew());
	} catch (e) { threw = true; }
	made.metronomeOptionsContextMenu = saved;
	gw.setSilentPhrasesActive(false);
	return !threw && state === true;
}()), true);
check("  and logged no missing-element warnings doing it",
	  logs.filter(function (l) { return /bad ID/.test(l); }).length, 0);

// auto speed up must not drag silence along with it any more
gw.setSilentPhrasesActive(false);
check("arming auto speed up does not switch silence on", (function () {
	gw.metronomeOptionsMenuPopupClick("SpeedUp");
	var v = gw.getSilentPhrasePercentage();
	gw.metronomeOptionsMenuPopupClick("SpeedUp"); // back off
	return v;
}()), 0);
check("and switching silence on does not arm auto speed up", (function () {
	gw.metronomeOptionsMenuPopupClick("Silence");
	var armed = /menuChecked/.test(made.metronomeOptionsContextMenuSpeedUp.className);
	gw.metronomeOptionsMenuPopupClick("Silence"); // back off
	return armed;
}()), false);
check("the menu toggle flips the option each click", (function () {
	gw.metronomeOptionsMenuPopupClick("Silence");
	var on = gw.isSilentPhrasesActive();
	gw.metronomeOptionsMenuPopupClick("Silence");
	var off = gw.isSilentPhrasesActive();
	return on === true && off === false;
}()), true);

// ---------------------------------------------------------------- transport during silence
section("silent measures keep the transport ticking");

// A silent phrase emits no notes, so without a filler the MIDI player has nothing to call
// back on and the clock and the counter freeze until sound returns.
// The track already bookends itself with two spacer note offs on the same silent note, so
// count against the audible baseline rather than in absolute terms.
function silentNoteOffCount(t) {
	return t.events.filter(function (e) {
		return e.kind === "off" && e.note === constant_OUR_MIDI_SILENT_TICK;
	}).length;
}
var tickCount = silentNoteOffCount(silentTrack) - silentNoteOffCount(audibleTrack);

check("an audible phrase emits no transport ticks", silentNoteOffCount(audibleTrack), 2); // the two spacers
check("a silent phrase does", tickCount > 0, true);
check("  one per note slot", tickCount, 32);
check("  and still not a single audible note", silentTrack.events.filter(function (e) {
	return e.kind === "on";
}).length, 0);

// they must be note OFFs: only note ons move the highlighted note on the staff, and reading
// your place off the screen defeats the point of practicing silent measures
check("no note ons were used as ticks", silentTrack.events.every(function (e) {
	return e.kind === "off";
}), true);
check("the tick note is one no instrument uses", (function () {
	var voices = [constant_OUR_MIDI_HIHAT_NORMAL, constant_OUR_MIDI_HIHAT_OPEN, constant_OUR_MIDI_HIHAT_ACCENT,
				  constant_OUR_MIDI_HIHAT_CRASH, constant_OUR_MIDI_HIHAT_STACKER, constant_OUR_MIDI_HIHAT_RIDE,
				  constant_OUR_MIDI_HIHAT_RIDE_BELL, constant_OUR_MIDI_HIHAT_COW_BELL, constant_OUR_MIDI_HIHAT_FOOT,
				  constant_OUR_MIDI_SNARE_NORMAL, constant_OUR_MIDI_SNARE_ACCENT, constant_OUR_MIDI_SNARE_GHOST,
				  constant_OUR_MIDI_SNARE_XSTICK, constant_OUR_MIDI_SNARE_BUZZ, constant_OUR_MIDI_SNARE_FLAM,
				  constant_OUR_MIDI_SNARE_DRAG, constant_OUR_MIDI_KICK_NORMAL, constant_OUR_MIDI_METRONOME_1,
				  constant_OUR_MIDI_METRONOME_NORMAL, constant_OUR_MIDI_TOM1_NORMAL, constant_OUR_MIDI_TOM2_NORMAL,
				  constant_OUR_MIDI_TOM3_NORMAL, constant_OUR_MIDI_TOM4_NORMAL];
	return voices.indexOf(constant_OUR_MIDI_SILENT_TICK) === -1;
}()), true);

// timing is the thing most likely to break: the ticks borrow the delay the same way a real
// note does, so the total length of the track must not move
function trackLength(t) {
	var total = 0;
	t.events.forEach(function (e) { total += (e.delay || 0); });
	return total;
}
check("silencing a groove does not change its length",
	  trackLength(silentTrack), trackLength(audibleTrack));

// ================================================================ 4. practice settings in the URL
section("silence and auto speed up survive a trip through the URL");

var gu = new GrooveUtils();

function urlFor(mutate) {
	var gd = new gu.grooveDataNew();
	mutate(gd);
	return gu.getUrlStringFromGrooveData(gd);
}
// getQueryVariableFromString drops the first character (it expects a leading "?"), so keep
// one on the front the way window.location.search does
function parseQuery(query) {
	return gu.getGrooveDataFromUrlString("?" + query);
}
function parseUrl(url) {
	return parseQuery(url.split("?")[1] || url);
}

// nothing switched on -> the URL must not grow at all
var plainURL = urlFor(function () {});
check("a groove with no practice settings gains no parameters", /Silence=|SpeedUp=/.test(plainURL), false);

// silence
var silenceURL = urlFor(function (gd) { gd.silentPhrasePercentage = 45; });
check("silence is written to the URL", /[?&]Silence=45(&|$)/.test(silenceURL), true);
check("  and read back", parseUrl(silenceURL).silentPhrasePercentage, 45);
check("a URL with no Silence reads back as off", parseUrl(plainURL).silentPhrasePercentage, 0);
check("Silence=0 is not written", /Silence=/.test(urlFor(function (gd) { gd.silentPhrasePercentage = 0; })), false);
check("a silly Silence value is clamped", parseQuery("Silence=900").silentPhrasePercentage, 90);
check("a negative Silence value is ignored", parseQuery("Silence=-5").silentPhrasePercentage, 0);
check("a non numeric Silence value is ignored", parseQuery("Silence=lots").silentPhrasePercentage, 0);

// auto speed up
var speedURL = urlFor(function (gd) {
	gd.autoSpeedUpActive = true;
	gd.autoSpeedUpBpm = 15;
	gd.autoSpeedUpIntervalSeconds = 30;
	gd.autoSpeedUpKeepGoingForever = false;
	gd.autoSpeedUpStepMode = true;
});
check("auto speed up is written to the URL", /[?&]SpeedUp=15,30,0,1(&|$)/.test(speedURL), true);
var speedBack = parseUrl(speedURL);
check("  active reads back", speedBack.autoSpeedUpActive, true);
check("  bpm reads back", speedBack.autoSpeedUpBpm, 15);
check("  interval reads back in seconds", speedBack.autoSpeedUpIntervalSeconds, 30);
check("  keep-going-forever reads back", speedBack.autoSpeedUpKeepGoingForever, false);
check("  step mode reads back", speedBack.autoSpeedUpStepMode, true);

check("an unarmed auto speed up is not written", /SpeedUp=/.test(urlFor(function (gd) {
	gd.autoSpeedUpActive = false;
	gd.autoSpeedUpBpm = 15;
})), false);
check("a URL with no SpeedUp reads back as unarmed", parseUrl(plainURL).autoSpeedUpActive, false);

// tolerance: an old or hand-mangled URL must not lose the whole setting
var partial = parseQuery("SpeedUp=20");
check("a truncated SpeedUp still arms", partial.autoSpeedUpActive, true);
check("  keeps the value it was given", partial.autoSpeedUpBpm, 20);
check("  and defaults the rest", partial.autoSpeedUpIntervalSeconds + "/" + partial.autoSpeedUpKeepGoingForever, "60/true");
var junk = parseQuery("SpeedUp=abc,def");
check("a garbled SpeedUp arms with defaults rather than breaking", junk.autoSpeedUpBpm + "/" + junk.autoSpeedUpIntervalSeconds, "10/60");

// both at once, through a full round trip
var bothURL = urlFor(function (gd) {
	gd.silentPhrasePercentage = 25;
	gd.autoSpeedUpActive = true;
	gd.autoSpeedUpIntervalSeconds = 20;
});
var bothBack = parseUrl(bothURL);
check("silence and speed up ride along together",
	  bothBack.silentPhrasePercentage + "/" + bothBack.autoSpeedUpIntervalSeconds + "/" + bothBack.autoSpeedUpActive,
	  "25/20/true");

// the sub-minute intervals the new slider can produce must all survive the trip
var everyIntervalSurvives = true;
for (var iv = 1; iv <= 25; iv++) {
	var secs = gw.metronomeAutoSpeedupIntervalSecondsFromSliderValue(iv);
	var back = parseUrl(urlFor(function (gd) { gd.autoSpeedUpActive = true; gd.autoSpeedUpIntervalSeconds = secs; }));
	if (back.autoSpeedUpIntervalSeconds !== secs) everyIntervalSurvives = false;
}
check("every slider interval survives the URL, seconds included", everyIntervalSurvives, true);

section("loading a URL arms the options it describes");

// a URL that says "speed this up" is useless if you then have to switch it on by hand
gw.setSilentPhrasesActive(false);
gw.applyPracticeSettingsFromGrooveData(parseUrl(bothURL));
check("silence is switched on by the URL", gw.isSilentPhrasesActive(), true);
check("  at the percentage the URL asked for", gw.getSilentPhrasePercentage(), 25);
check("the interval slider is moved to match", made.metronomeAutoSpeedupTempoIncreaseInterval.value, 2); // 20s == step 2
check("  and the label follows it", made.metronomeAutoSpeedupTempoIncreaseIntervalOutput.innerHTML, "20 sec");
check("auto speed up is armed", /menuChecked/.test(made.metronomeOptionsContextMenuSpeedUp.className), true);

gw.applyPracticeSettingsFromGrooveData(parseUrl(plainURL));
check("a plain URL switches silence back off", gw.isSilentPhrasesActive(), false);
check("  and disarms auto speed up", /menuChecked/.test(made.metronomeOptionsContextMenuSpeedUp.className), false);

// what the user sees in the share box has to match what the UI is set to
gw.setSilentPhrasesActive(true);
made.silentPhrasesPercentage.value = "40";
made.metronomeAutoSpeedupTempoIncreaseAmount.value = "12";
made.metronomeAutoSpeedupTempoIncreaseInterval.value = "4";   // 40 seconds
made.metronomeAutoSpeedUpStepMode.checked = true;
made.metronomeAutoSpeedUpKeepGoingForever.checked = true;
gw.metronomeOptionsMenuPopupClick("SpeedUp");                 // arm it
var uiURL = gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
check("the share URL reflects the live UI", /Silence=40/.test(uiURL) && /SpeedUp=12,40,1,1/.test(uiURL), true);
gw.metronomeOptionsMenuPopupClick("SpeedUp");                 // disarm
gw.setSilentPhrasesActive(false);
made.metronomeAutoSpeedUpStepMode.checked = false;
made.metronomeAutoSpeedupTempoIncreaseInterval.value = "6";

// ================================================================ 5. changelog popup
section("changelog popup");

check("version constant matches the newest changelog entry", GS_APP_VERSION, GS_CHANGELOG[0].version);
check("manifest version matches too",
	  /# Version: ([0-9.]+)/.exec(readFile("gscribe.manifest"))[1], GS_APP_VERSION);
check("changelog is ordered newest first",
	  GrooveChangelog.compareVersions(GS_CHANGELOG[0].version, GS_CHANGELOG[1].version) > 0, true);

check("compareVersions 1.04 > 1.03", GrooveChangelog.compareVersions("1.04", "1.03") > 0, true);
check("compareVersions 1.10 > 1.9", GrooveChangelog.compareVersions("1.10", "1.9") > 0, true);
check("compareVersions equal", GrooveChangelog.compareVersions("1.04", "1.04"), 0);

// first ever visit: nothing stored -> show just the current release
storage = {};
check("fresh browser sees only the newest entry", GrooveChangelog.entriesSince(null).length, 1);

// upgrading from an older version -> show everything in between.   Derived from the
// changelog rather than pinned to literal versions, so a release doesn't break these.
var oldestKnown = GS_CHANGELOG[GS_CHANGELOG.length - 1].version;
var previousRelease = GS_CHANGELOG[1].version;
check("upgrading from the oldest logged version shows everything after it",
	  GrooveChangelog.entriesSince(oldestKnown).length, GS_CHANGELOG.length - 1);
check("upgrading from the previous release shows just the new one",
	  GrooveChangelog.entriesSince(previousRelease).length, 1);
check("already current shows nothing", GrooveChangelog.entriesSince(GS_APP_VERSION).length, 0);
check("a version older than anything logged shows the lot",
	  GrooveChangelog.entriesSince("0.01").length, GS_CHANGELOG.length);

storage = {};
var shown = GrooveChangelog.showIfVersionChanged();
check("popup shows on a version change", shown, true);
check("popup is visible", made.changelogPopup.style.display, "block");
check("popup names the current version", made.changelogPopup.innerHTML.indexOf(GS_APP_VERSION) > -1, true);
check("popup lists every change in the newest entry", GS_CHANGELOG[0].changes.every(function (c) {
	// the popup escapes its text, so compare on a distinctive unescaped fragment
	var fragment = c.split(/[.:]/)[0];
	return made.changelogPopup.innerHTML.indexOf(fragment) > -1;
}), true);
check("nothing recorded until dismissed", localStorage.getItem(GrooveChangelog.STORAGE_KEY), null);

GrooveChangelog.close();
check("dismissing hides the popup", made.changelogPopup.style.display, "none");
check("dismissing records the version", localStorage.getItem(GrooveChangelog.STORAGE_KEY), GS_APP_VERSION);
check("does not show again on the next load", GrooveChangelog.showIfVersionChanged(), false);

storage[GrooveChangelog.STORAGE_KEY] = "1.03";
check("shows again after a version bump", GrooveChangelog.showIfVersionChanged(), true);
check("  and only lists what is new", made.changelogPopup.innerHTML.indexOf("Middle Tom row") === -1, true);

storage[GrooveChangelog.STORAGE_KEY] = "9.99";
check("running an older build than last seen shows nothing", GrooveChangelog.showIfVersionChanged(), false);

check("changelog escapes HTML in change text", (function () {
	GS_CHANGELOG.unshift({ version: "9.99", date: "x", changes: ["<script>evil</script>"] });
	GrooveChangelog.showAll();
	var html = made.changelogPopup.innerHTML;
	GS_CHANGELOG.shift();
	return html.indexOf("<script>evil") === -1 && html.indexOf("&lt;script&gt;evil") > -1;
}()), true);

print("");
var noise = logs.filter(function (l) { return /bad (case|switch|tablature)/i.test(l); });
print(noise.length ? ("unexpected console complaints: " + noise.join(" | ")) : "no 'bad case/switch' console complaints");
print(failures === 0 ? "ALL PASS" : failures + " FAILURE(S)");

// ---------------------------------------------------------------- wiring integration
section("silence slider is actually wired into the writer's MIDI path");

// MIDISaveAs() -> createMidiUrlFromClickableUI() -> should push the drawn silence state
// onto GrooveUtils.   The percentage never reaches the builder any more;  the builder only
// ever sees the yes/no for this repetition.
gw.setSilentPhrasesActive(true);
made.silentPhrasesPercentage.value = "45";
gw.resetSilentPhraseCycle();
gw.myGrooveUtils.phraseIsSilent = "poison";
try { gw.MIDISaveAs(); } catch (e) { /* the download side needs a real browser, we only care about the wiring */ }
check("an audible repetition is pushed through as false", gw.myGrooveUtils.phraseIsSilent, false);

// wind the cycle on until we land on a silent repetition, then check it reaches the builder
var reachedSilent = false;
for (var w = 0; w < 40 && !reachedSilent; w++) {
	gw.rollNextSilentPhrase();
	if (gw.isThisPhraseSilent()) reachedSilent = true;
}
gw.myGrooveUtils.phraseIsSilent = "poison";
try { gw.MIDISaveAs(); } catch (e) {}
check("a silent repetition is pushed through as true",
	  reachedSilent && gw.myGrooveUtils.phraseIsSilent === true, true);

// with the option off nothing is muted, whatever the cycle was left holding
gw.setSilentPhrasesActive(false);
gw.myGrooveUtils.phraseIsSilent = "poison";
try { gw.MIDISaveAs(); } catch (e) {}
check("and nothing is muted once the option is off", gw.myGrooveUtils.phraseIsSilent, false);

// End to end: play, then run 20 repetitions the way the loop boundary does, and check what
// actually reaches the MIDI builder each time.   This is the whole chain - draw, push, build.
section("end to end: 20 repetitions at 30%");

gw.setSilentPhrasesActive(true);
made.silentPhrasesPercentage.value = "30";
gw.resetSilentPhraseCycle();          // what pressing play does

var heard = [];
for (var repN = 0; repN < 21; repN++) {
	if (repN > 0) gw.rollNextSilentPhrase();   // what the loop boundary does
	gw.myGrooveUtils.phraseIsSilent = "poison";
	try { gw.MIDISaveAs(); } catch (e) {}
	heard.push(gw.myGrooveUtils.phraseIsSilent === true ? "." : "#");
}
var timeline = heard.join("");
print("        " + timeline + "   (# audible, . silent)");
var silentInTwenty = timeline.slice(1).split(".").length - 1;
check("the opening repetition plays", timeline.charAt(0), "#");
// 30% of 20 is 6.   The accumulator self corrects rather than forcing a fixed count into
// each window, so allow one either side - over a long run it converges exactly (tested above).
check("about 6 of the following 20 are silent (saw " + silentInTwenty + ")",
	  silentInTwenty >= 5 && silentInTwenty <= 7, true);
check("every entry is a clean yes or no", /^[#.]+$/.test(timeline), true);
gw.setSilentPhrasesActive(false);

print("");
print(failures === 0 ? "ALL PASS (including wiring)" : failures + " FAILURE(S)");
