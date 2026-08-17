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
// the ids index.html supplies
["ABC_Results", "ABCsource", "GrooveDB_MetaData", "GrooveDB_source", "GrooveWriter", "LeftHandNav", "LegendLabel", "PermutationOptions", "RightHandContent", "TopNav", "URLSearchData", "advancedEditAnchor", "bottomButtonRow", "changelogPopup", "clearAllNotesButton", "debugDisplayArea", "debugOutput", "diverr", "divisionButtonContainer", "downloadButton", "downloadContextMenu", "embedCodeCheckbox", "embedCodeLabel", "fullURLPopup", "fullURLPopupCheckboxes", "fullURLPopupCloseButton", "fullURLPopupCopyButton", "fullURLPopupSubSubTitle", "fullURLPopupSubTitle", "fullURLPopupTextField", "fullURLPopupTextFieldContainer", "fullURLPopupTitle", "grooveDBInstructions", "grooveListWrapper", "groovesAnchor", "helpAnchor", "helpContextMenu", "hhContextMenu", "hhLabelContextMenu", "hiddenDescription", "icon-tom1", "icon-tom2", "icon-tom3", "kickContextMenu", "kickLabelContextMenu", "libraryAnchor", "libraryWrapper", "logoInSubdivision", "logoTextUpperLeft", "measureContainer", "metronome16ths", "metronome4ths", "metronome8ths", "metronomeAutoSpeedUpKeepGoingForever", "metronomeAutoSpeedUpStepMode", "metronomeAutoSpeedupCloseButtonDiv", "metronomeAutoSpeedupConfiguration", "metronomeAutoSpeedupConfigurationAmountLable", "metronomeAutoSpeedupConfigurationCloseButton", "metronomeAutoSpeedupConfigurationIntervalLable", "metronomeAutoSpeedupConfigurationKeepIncreasing", "metronomeAutoSpeedupConfigurationSilenceLable", "metronomeAutoSpeedupConfigurationSliders", "metronomeAutoSpeedupOutputText", "metronomeAutoSpeedupSilenceOutputText", "metronomeAutoSpeedupSilentMeasurePercentage", "metronomeAutoSpeedupSilentMeasurePercentageOutput", "metronomeAutoSpeedupTempoIncreaseAmount", "metronomeAutoSpeedupTempoIncreaseAmountOutput", "metronomeAutoSpeedupTempoIncreaseInterval", "metronomeAutoSpeedupTempoIncreaseIntervalOutput", "metronomeContainer", "metronomeLabel", "metronomeOff", "metronomeOptionsAnchor", "metronomeOptionsContextMenu", "metronomeOptionsContextMenuCountIn", "metronomeOptionsContextMenuDropper", "metronomeOptionsContextMenuOffTheOne", "metronomeOptionsContextMenuSolo", "metronomeOptionsContextMenuSpeedUp", "metronomeOptionsOffsetClickContextMenu", "metronomeOptionsOffsetClickContextMenuOnThe1", "metronomeOptionsOffsetClickContextMenuOnThe1Triplet", "metronomeOptionsOffsetClickContextMenuOnTheA", "metronomeOptionsOffsetClickContextMenuOnTheAND", "metronomeOptionsOffsetClickContextMenuOnTheE", "metronomeOptionsOffsetClickContextMenuOnTheROTATE", "metronomeOptionsOffsetClickContextMenuOnTheTA", "metronomeOptionsOffsetClickContextMenuOnTheTI", "metronomeOptionsOffsetClickForTripletsContextMenu", "midiPlayer", "midiTextOutput", "musicalInput", "permutationAnchor", "permutationContextMenu", "printButton", "redoStack", "saveToLibraryButton", "shareButton", "shareButtonContainer", "shareSaveButton", "sheetMusicDiv", "sheetMusicTextFields", "shortURLLabel", "shortenerCheckbox", "showHideABC", "showHideTomsButton", "showLegend", "snareContextMenu", "snareLabelContextMenu", "stickingContextMenu", "stickingsButton", "stickingsContextMenu", "stickingsLabelContextMenu", "subdivision_12ths", "subdivision_16ths", "subdivision_24ths", "subdivision_32ths", "subdivision_48ths", "subdivision_8ths", "svgTarget", "timeLabel", "timeSigLabel", "timeSigPopup", "timeSigPopupButtons", "timeSigPopupCancel", "timeSigPopupOK", "timeSigPopupOptions", "timeSigPopupSlash", "timeSigPopupTimeSigBottom", "timeSigPopupTimeSigTop", "timeSigPopupTitle", "timeSubLabel", "tom1ContextMenu", "tom1LabelContextMenu", "tom2ContextMenu", "tom2LabelContextMenu", "tom4ContextMenu", "tom4LabelContextMenu", "totalPlayTime", "tuneAuthor", "tuneComments", "tuneTitle", "undoButton", "undoStack", "upperLeft", "upperRight", "view-edit-switch"].forEach(function (id) { made[id] = fakeEl(id); });

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

// ================================================================ 2. auto speed up
section("auto speed up defaults");

// read the shipped defaults straight out of index.html rather than trusting the stub
var indexHTML = readFile("index.html");
var amountDefault = indexHTML.match(/id="metronomeAutoSpeedupTempoIncreaseAmount"/) ?
	indexHTML.match(/value=(\d+)[^>]*id="metronomeAutoSpeedupTempoIncreaseAmount"/) : null;
var intervalDefault = indexHTML.match(/value=(\d+)[^>]*id="metronomeAutoSpeedupTempoIncreaseInterval"/);
check("amount slider default is 10 bpm", amountDefault && amountDefault[1], 10);
check("interval slider default is 1 min", intervalDefault && intervalDefault[1], 1);
check("displayed amount text says 10", /metronomeAutoSpeedupTempoIncreaseAmountOutput">10</.test(indexHTML), true);
check("displayed interval text says 1", /metronomeAutoSpeedupTempoIncreaseIntervalOutput">1</.test(indexHTML), true);
check("step mode checkbox exists and is off by default",
	  /<input type="checkbox" id="metronomeAutoSpeedUpStepMode">/.test(indexHTML), true);
check("silence slider exists, defaults to 0",
	  /value=0[^>]*id="metronomeAutoSpeedupSilentMeasurePercentage"/.test(indexHTML), true);

section("auto speed up: gradual vs step mode");

// drive metronomeAutoSpeedUpTempoUpdate with a controllable clock
var fakeTempo = 100;
var fakePlayMs = 0;
gw.myGrooveUtils.getTempo = function () { return fakeTempo; };
gw.myGrooveUtils.setTempo = function (t) { fakeTempo = t; };
gw.myGrooveUtils.getMidiStartTime = function () { return "run1"; };
gw.myGrooveUtils.getMidiPlayTime = function () { return new Date(fakePlayMs); };

made.metronomeAutoSpeedupTempoIncreaseAmount.value = "10";
made.metronomeAutoSpeedupTempoIncreaseInterval.value = "1";   // 1 minute
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

// ================================================================ 3. silent measures
section("silent measures");

function blank(n) { var a = []; for (var i = 0; i < n; i++) a.push(false); return a; }
function FakeTrack() {
	this.events = []; var self = this;
	this.addNoteOn = function (ch, note, delay, vel) { self.events.push({ kind: "on", note: note, vel: vel }); };
	this.addNoteOff = function () {};
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
function renderMidi(pct) {
	var g = twoBarGroove();
	var t = new FakeTrack();
	var gu2 = new GrooveUtils();
	gu2.silentMeasurePercentage = pct;
	gu2.MIDI_from_HH_Snare_Kick_Arrays(t, g.hh, g.sn, blank(64),
		[blank(64), blank(64), blank(64), blank(64)], "Custom", 4, 64, 32, 0, 4, 4);
	return t.events.filter(function (e) { return e.kind === "on"; });
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

check("writer reads the slider back", (function () {
	made.metronomeAutoSpeedupSilentMeasurePercentage.value = "35";
	return gw.getSilentMeasurePercentage();
}()), 35);
check("writer copes with a missing slider", (function () {
	var save = made.metronomeAutoSpeedupSilentMeasurePercentage;
	made.metronomeAutoSpeedupSilentMeasurePercentage = null;
	var v = gw.getSilentMeasurePercentage();
	made.metronomeAutoSpeedupSilentMeasurePercentage = save;
	return v;
}()), 0);
made.metronomeAutoSpeedupSilentMeasurePercentage.value = "0";

// ================================================================ 4. changelog popup
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

// upgrading from an older version -> show everything in between
check("upgrade from 1.02 shows both entries", GrooveChangelog.entriesSince("1.02").length, 2);
check("upgrade from 1.03 shows one entry", GrooveChangelog.entriesSince("1.03").length, 1);
check("already current shows nothing", GrooveChangelog.entriesSince("1.04").length, 0);

storage = {};
var shown = GrooveChangelog.showIfVersionChanged();
check("popup shows on a version change", shown, true);
check("popup is visible", made.changelogPopup.style.display, "block");
check("popup lists the flam change", made.changelogPopup.innerHTML.indexOf("Flam") > -1, true);
check("popup lists the silent measures change", made.changelogPopup.innerHTML.indexOf("Silent measures") > -1, true);
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
made.metronomeAutoSpeedupSilentMeasurePercentage.value = "45";
try { gw.MIDISaveAs(); } catch (e) { /* the download side needs a real browser, we only care about the wiring */ }
check("createMidiUrlFromClickableUI pushes the slider onto GrooveUtils",
	  gw.myGrooveUtils.silentMeasurePercentage, 45);

gw.myGrooveUtils.silentMeasurePercentage = -1;
made.metronomeAutoSpeedupSilentMeasurePercentage.value = "0";
try { gw.MIDISaveAs(); } catch (e) {}
check("and pushes 0 when the slider is off", gw.myGrooveUtils.silentMeasurePercentage, 0);

print("");
print(failures === 0 ? "ALL PASS (including wiring)" : failures + " FAILURE(S)");
