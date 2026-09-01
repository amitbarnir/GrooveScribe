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

// ================================================================ 3. silent measures
section("silent measures");

function blank(n) { var a = []; for (var i = 0; i < n; i++) a.push(false); return a; }
function FakeTrack() {
	this.events = []; var self = this;
	this.addNoteOn = function (ch, note, delay, vel) { self.events.push({ kind: "on", note: note, vel: vel, delay: delay }); };
	this.addNoteOff = function (ch, note, delay) { self.events.push({ kind: "off", note: note, delay: delay }); };
	this.setTempo = function () {}; this.setInstrument = function () {};
}
// two measures of 4/4 = 64 slots, backbeat + 8ths, metronome on quarters
function twoBarGroove() {
	var hh = blank(64), sn = blank(64);
	for (var i = 0; i < 64; i += 4) hh[i] = constant_ABC_HH_Normal;
	sn[8] = constant_ABC_SN_Normal; sn[24] = constant_ABC_SN_Normal;
	sn[40] = constant_ABC_SN_Normal; sn[56] = constant_ABC_SN_Normal;
	return { hh: hh, sn: sn };
}
function renderMidiTrack(pct) {
	var g = twoBarGroove();
	var t = new FakeTrack();
	var gu2 = new GrooveUtils();
	gu2.silentMeasurePercentage = pct;
	gu2.MIDI_from_HH_Snare_Kick_Arrays(t, g.hh, g.sn, blank(64),
		[blank(64), blank(64), blank(64), blank(64)], "Custom", 4, 64, 32, 0, 4, 4);
	return t;
}
function renderMidi(pct) {
	return renderMidiTrack(pct).events.filter(function (e) { return e.kind === "on"; });
}
var full = renderMidi(0);
check("0% silence leaves the groove intact", full.length > 0, true);

var none = renderMidi(100);
check("100% silence emits no notes at all", none.length, 0);

// at 100% the metronome must go too, not just the drums
var metronomeNotes = none.filter(function (e) {
	return e.note === constant_OUR_MIDI_METRONOME_1 || e.note === constant_OUR_MIDI_METRONOME_NORMAL;
});
check("  metronome is silenced as well", metronomeNotes.length, 0);
var metronomeWhenAudible = full.filter(function (e) {
	return e.note === constant_OUR_MIDI_METRONOME_1 || e.note === constant_OUR_MIDI_METRONOME_NORMAL;
});
check("  (metronome really was firing at 0%)", metronomeWhenAudible.length > 0, true);

// partial silence should land strictly between the two extremes over many rolls
var sawFull = false, sawPartial = false, sawEmpty = false;
for (var trial = 0; trial < 60; trial++) {
	var n = renderMidi(50).length;
	if (n === full.length) sawFull = true;
	else if (n === 0) sawEmpty = true;
	else sawPartial = true;
}
check("50% silence sometimes mutes exactly one of the two bars", sawPartial, true);
check("50% silence sometimes mutes neither bar", sawFull, true);
check("50% silence sometimes mutes both bars", sawEmpty, true);

// tom flam grace notes must not leak through a silent measure
var gflam = new GrooveUtils();
gflam.silentMeasurePercentage = 100;
var tflam = blank(64); tflam[8] = constant_ABC_T1_Flam;
var ft = new FakeTrack();
gflam.MIDI_from_HH_Snare_Kick_Arrays(ft, blank(64), blank(64), blank(64),
	[tflam, blank(64), blank(64), blank(64)], "Custom", 0, 64, 32, 0, 4, 4);
check("a flam's grace note does not leak into a silenced measure",
	  ft.events.filter(function (e) { return e.kind === "on"; }).length, 0);

// ---------------------------------------------------------------- its own metronome option
section("silent measures: independent of auto speed up");

check("the menu has its own entry for it",
	  /id="metronomeOptionsContextMenuSilence"/.test(indexHTML), true);
check("the entry calls through with \"Silence\"",
	  /metronomeOptionsMenuPopupClick\("Silence"\)/.test(indexHTML), true);
check("the slider lives in its own popup, not the speed up one",
	  /id="silentMeasuresConfiguration"/.test(indexHTML), true);
check("the speed up popup no longer carries a silence slider",
	  /metronomeAutoSpeedupSilentMeasurePercentage/.test(indexHTML), false);
check("the old silence slider id is gone from the writer too",
	  /metronomeAutoSpeedupSilentMeasurePercentage/.test(readFile("js/groove_writer.js")), false);

check("off by default, so the slider position is irrelevant", (function () {
	made.silentMeasuresPercentage.value = "35";
	return gw.getSilentMeasurePercentage();
}()), 0);

gw.setSilentMeasuresActive(true);
check("turning the option on lets the slider through", gw.getSilentMeasurePercentage(), 35);
check("  and the option reports itself on", gw.isSilentMeasuresActive(), true);
check("  which lights up the metronome menu", (function () {
	// metronomeOptionsMenuSetSelectedState marks the anchor selected for any active option
	return /selected/.test(made.metronomeOptionsAnchor.className);
}()), true);

made.silentMeasuresPercentage.value = "60";
check("moving the slider while on is picked up", gw.getSilentMeasurePercentage(), 60);

gw.setSilentMeasuresActive(false);
check("turning it back off silences the setting, not the drums", gw.getSilentMeasurePercentage(), 0);

check("copes with a missing slider", (function () {
	gw.setSilentMeasuresActive(true);
	var save = made.silentMeasuresPercentage;
	made.silentMeasuresPercentage = null;
	var v = gw.getSilentMeasurePercentage();
	made.silentMeasuresPercentage = save;
	gw.setSilentMeasuresActive(false);
	return v;
}()), 0);

// the two configurators sit at the same screen position, so only one can ever be up
check("opening silent measures closes the speed up panel", (function () {
	gw.show_MetronomeAutoSpeedupConfiguration();
	gw.show_SilentMeasuresConfiguration();
	return made.metronomeAutoSpeedupConfiguration.style.display + "/" + made.silentMeasuresConfiguration.style.display;
}()), "none/block");
check("and the other way round", (function () {
	gw.show_MetronomeAutoSpeedupConfiguration();
	return made.metronomeAutoSpeedupConfiguration.style.display + "/" + made.silentMeasuresConfiguration.style.display;
}()), "block/none");
gw.close_MetronomeAutoSpeedupConfiguration();

// GrooveDBCreateGroove.html loads groove_writer.js without a metronome menu
check("survives a page with no metronome menu", (function () {
	var saved = made.metronomeOptionsContextMenu;
	made.metronomeOptionsContextMenu = null;
	var threw = false, state;
	try {
		gw.setSilentMeasuresActive(true);
		state = gw.isSilentMeasuresActive();
		gw.applyPracticeSettingsFromGrooveData(new gw.myGrooveUtils.grooveDataNew());
	} catch (e) { threw = true; }
	made.metronomeOptionsContextMenu = saved;
	gw.setSilentMeasuresActive(false);
	return !threw && state === true;
}()), true);
check("  and logged no missing-element warnings doing it",
	  logs.filter(function (l) { return /bad ID/.test(l); }).length, 0);

// auto speed up must not drag silence along with it any more
gw.setSilentMeasuresActive(false);
check("arming auto speed up does not switch silence on", (function () {
	gw.metronomeOptionsMenuPopupClick("SpeedUp");
	var v = gw.getSilentMeasurePercentage();
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
	var on = gw.isSilentMeasuresActive();
	gw.metronomeOptionsMenuPopupClick("Silence");
	var off = gw.isSilentMeasuresActive();
	return on === true && off === false;
}()), true);

// ---------------------------------------------------------------- transport during silence
section("silent measures keep the transport ticking");

// A silent measure emits no notes, so without a filler the MIDI player has nothing to call
// back on and the clock, the counter and the progress bar all freeze until sound returns.
// the track already bookends itself with two spacer note offs on the same silent note, so
// count against the audible baseline rather than in absolute terms
function silentNoteOffCount(t) {
	return t.events.filter(function (e) {
		return e.kind === "off" && e.note === constant_OUR_MIDI_SILENT_TICK;
	}).length;
}
var silentTrack = renderMidiTrack(100);
var audibleTrack = renderMidiTrack(0);
var tickCount = silentNoteOffCount(silentTrack) - silentNoteOffCount(audibleTrack);

check("an audible groove emits no transport ticks", silentNoteOffCount(audibleTrack), 2); // the two spacers
check("a fully silent groove does", tickCount > 0, true);
check("  one per note slot", tickCount, 64);
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

// a half-silent groove gets ticks only where the sound stopped
var oneBarSilent = null;
for (var probe = 0; probe < 200 && !oneBarSilent; probe++) {
	var candidate = renderMidiTrack(50);
	var onCount = candidate.events.filter(function (e) { return e.kind === "on"; }).length;
	if (onCount > 0 && onCount < audibleTrack.events.filter(function (e) { return e.kind === "on"; }).length)
		oneBarSilent = candidate;
}
check("one silent bar out of two gets exactly one bar of ticks",
	  oneBarSilent && (silentNoteOffCount(oneBarSilent) - silentNoteOffCount(audibleTrack)), 32);

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
var silenceURL = urlFor(function (gd) { gd.silentMeasurePercentage = 45; });
check("silence is written to the URL", /[?&]Silence=45(&|$)/.test(silenceURL), true);
check("  and read back", parseUrl(silenceURL).silentMeasurePercentage, 45);
check("a URL with no Silence reads back as off", parseUrl(plainURL).silentMeasurePercentage, 0);
check("Silence=0 is not written", /Silence=/.test(urlFor(function (gd) { gd.silentMeasurePercentage = 0; })), false);
check("a silly Silence value is clamped", parseQuery("Silence=900").silentMeasurePercentage, 90);
check("a negative Silence value is ignored", parseQuery("Silence=-5").silentMeasurePercentage, 0);
check("a non numeric Silence value is ignored", parseQuery("Silence=lots").silentMeasurePercentage, 0);

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
	gd.silentMeasurePercentage = 25;
	gd.autoSpeedUpActive = true;
	gd.autoSpeedUpIntervalSeconds = 20;
});
var bothBack = parseUrl(bothURL);
check("silence and speed up ride along together",
	  bothBack.silentMeasurePercentage + "/" + bothBack.autoSpeedUpIntervalSeconds + "/" + bothBack.autoSpeedUpActive,
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
gw.setSilentMeasuresActive(false);
gw.applyPracticeSettingsFromGrooveData(parseUrl(bothURL));
check("silence is switched on by the URL", gw.isSilentMeasuresActive(), true);
check("  at the percentage the URL asked for", gw.getSilentMeasurePercentage(), 25);
check("the interval slider is moved to match", made.metronomeAutoSpeedupTempoIncreaseInterval.value, 2); // 20s == step 2
check("  and the label follows it", made.metronomeAutoSpeedupTempoIncreaseIntervalOutput.innerHTML, "20 sec");
check("auto speed up is armed", /menuChecked/.test(made.metronomeOptionsContextMenuSpeedUp.className), true);

gw.applyPracticeSettingsFromGrooveData(parseUrl(plainURL));
check("a plain URL switches silence back off", gw.isSilentMeasuresActive(), false);
check("  and disarms auto speed up", /menuChecked/.test(made.metronomeOptionsContextMenuSpeedUp.className), false);

// what the user sees in the share box has to match what the UI is set to
gw.setSilentMeasuresActive(true);
made.silentMeasuresPercentage.value = "40";
made.metronomeAutoSpeedupTempoIncreaseAmount.value = "12";
made.metronomeAutoSpeedupTempoIncreaseInterval.value = "4";   // 40 seconds
made.metronomeAutoSpeedUpStepMode.checked = true;
made.metronomeAutoSpeedUpKeepGoingForever.checked = true;
gw.metronomeOptionsMenuPopupClick("SpeedUp");                 // arm it
var uiURL = gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
check("the share URL reflects the live UI", /Silence=40/.test(uiURL) && /SpeedUp=12,40,1,1/.test(uiURL), true);
gw.metronomeOptionsMenuPopupClick("SpeedUp");                 // disarm
gw.setSilentMeasuresActive(false);
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

// MIDISaveAs() -> createMidiUrlFromClickableUI() -> should push the slider value onto GrooveUtils
gw.myGrooveUtils.silentMeasurePercentage = -1;   // poison it so we can see it get written
gw.setSilentMeasuresActive(true);
made.silentMeasuresPercentage.value = "45";
try { gw.MIDISaveAs(); } catch (e) { /* the download side needs a real browser, we only care about the wiring */ }
check("createMidiUrlFromClickableUI pushes the slider onto GrooveUtils",
	  gw.myGrooveUtils.silentMeasurePercentage, 45);

// with the option off the slider must not reach the MIDI path at all, whatever it reads
gw.myGrooveUtils.silentMeasurePercentage = -1;
gw.setSilentMeasuresActive(false);
try { gw.MIDISaveAs(); } catch (e) {}
check("and pushes 0 when the option is off, even with the slider up at 45",
	  gw.myGrooveUtils.silentMeasurePercentage, 0);

print("");
print(failures === 0 ? "ALL PASS (including wiring)" : failures + " FAILURE(S)");
