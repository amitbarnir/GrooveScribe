// Headless smoke test for tom flams.   Run with:
//   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc _test_flam.js
// Not part of the app.   Exercises the tab -> ABC -> MIDI path without a browser.

var failures = 0;
function check(label, actual, expected) {
	var ok = (String(actual) === String(expected));
	if (!ok) failures++;
	print((ok ? "PASS  " : "FAIL  ") + label +
		  (ok ? "" : "\n        expected: " + expected + "\n        actual:   " + actual));
}
function checkContains(label, haystack, needle) {
	var ok = String(haystack).indexOf(needle) > -1;
	if (!ok) failures++;
	print((ok ? "PASS  " : "FAIL  ") + label +
		  (ok ? "" : "\n        " + needle + " not found in: " + haystack));
}

// ---- minimal browser stubs so groove_utils.js will load ----
var document = { currentScript: null, getElementById: function () { return null; } };
var window = { location: { href: "http://localhost/" } };
var navigator = { userAgent: "jsc" };
var MIDI = {};
var ABCJS = {};
var console = { log: function (m) { /* quiet */ } };

load("js/groove_utils.js");

var gu = new GrooveUtils();

// ---------------------------------------------------------------- tab <-> ABC
// 16 notes per measure, one measure.   Flam on beat 1, normal tom on beat 3.
var t1 = gu.noteArraysFromURLData("T1", "f-------o-------", 16, 1);
check("T1 tab 'f' parses to tom1 flam", t1[0], constant_ABC_T1_Flam);
check("T1 tab 'o' still parses to tom1 normal", t1[8], constant_ABC_T1_Normal);
check("T1 tab '-' still parses to off", t1[1], false);

var t2 = gu.noteArraysFromURLData("T2", "f---", 4, 1);
check("T2 tab 'f' parses to tom2 flam", t2[0], constant_ABC_T2_Flam);
var t4 = gu.noteArraysFromURLData("T4", "f---", 4, 1);
check("T4 tab 'f' parses to tom4 flam", t4[0], constant_ABC_T4_Flam);
var sn = gu.noteArraysFromURLData("S", "f---", 4, 1);
check("snare flam is unchanged", sn[0], constant_ABC_SN_Flam);

// round trip back out to a tab line
check("tom1 flam round trips back to 'f'",
	  gu.tabLineFromAbcNoteArray("T1", t1, true, true, 16, 16).substring(0, 1), "f");
check("tom4 flam round trips back to 'f'",
	  gu.tabLineFromAbcNoteArray("T4", t4, true, true, 4, 4).substring(0, 1), "f");

// ---------------------------------------------------------------- ABC output
// One 4/4 measure scaled up to the 32-slot full size array the ABC/MIDI layers expect.
function blank() {
	var a = [];
	for (var i = 0; i < 32; i++) a.push(false);
	return a;
}
function at(slot, value) {
	var a = blank();
	a[slot] = value;
	return a;
}
// A tom1 flam that shares its slot with a hi-hat, so it gets grouped into a [chord].
// The grace note must be hoisted out in front of the '[' or the ABC is invalid.
function abcFor(hh, snare, kick, toms) {
	return gu.create_ABC_from_snare_HH_kick_arrays(
		blank(), hh, snare, kick, toms, "|\n", 32, 16, 32, false, 4, 4);
}
var empty = blank();
var hh_on_one = at(0, constant_ABC_HH_Normal);
var tom1_flam = at(0, constant_ABC_T1_Flam);

var abc = abcFor(hh_on_one, empty, empty, [tom1_flam, empty, empty, empty]);
checkContains("tom1 flam emits a grace note in ABC", abc, "{/e}");
check("grace note is hoisted outside the chord",
	  abc.indexOf("{/e}") < abc.indexOf("["), true);
check("no stray grace note left inside the chord",
	  abc.indexOf("[{/e}") === -1 && abc.indexOf("{/e}e") === -1 || abc.indexOf("[") === -1, true);

// tom flam alone (no chord) should still carry its grace note
var abcAlone = abcFor(empty, empty, empty, [tom1_flam, empty, empty, empty]);
checkContains("tom1 flam alone still emits a grace note", abcAlone, "{/e}");

// snare flam + tom flam in the same slot: both graces must survive
var sn_flam = at(0, constant_ABC_SN_Flam);
var abcBoth = abcFor(empty, sn_flam, empty, [tom1_flam, empty, empty, empty]);
checkContains("snare grace survives alongside a tom flam", abcBoth, "{/c}");
checkContains("tom grace survives alongside a snare flam", abcBoth, "{/e}");

// ---------------------------------------------------------------- MIDI timing
// MIDI_from_HH_Snare_Kick_Arrays prepends a 1 tick blank note as a spacer (there is a
// comment there about a midi player bug), so every absolute time is shifted by 1.
var MIDI_LEAD_IN_TICKS = 1;

// Fake midi track that just records what it was asked to play.
function FakeTrack() {
	this.events = [];
	var absolute = 0;
	var self = this;
	this.addNoteOn = function (ch, note, delay, velocity) {
		absolute += (delay || 0);
		self.events.push({ kind: "on", note: note, at: absolute, velocity: velocity });
	};
	this.addNoteOff = function (ch, note, delay) {
		absolute += (delay || 0);
		self.events.push({ kind: "off", note: note, at: absolute });
	};
	this.setTempo = function () {};
	this.setInstrument = function () {};
}
function midiFor(toms, snare) {
	var track = new FakeTrack();
	gu.MIDI_from_HH_Snare_Kick_Arrays(track, empty, snare || empty, empty, toms,
									  "Custom", 0, 32, 32, 0, 4, 4);
	return track.events.filter(function (e) { return e.kind === "on"; });
}

// Flam on the "2" (slot 8 of 32).   Should be two tom1 hits, grace quieter and 4 ticks early.
var flamOnTwo = at(8, constant_ABC_T1_Flam);
var ev = midiFor([flamOnTwo, empty, empty, empty]);
check("flam produces two hits", ev.length, 2);
check("both hits are tom1", ev[0].note === constant_OUR_MIDI_TOM1_NORMAL &&
							ev[1].note === constant_OUR_MIDI_TOM1_NORMAL, true);
check("grace note is quieter than the main hit", ev[0].velocity < ev[1].velocity, true);
check("main hit velocity is normal", ev[1].velocity, constant_OUR_MIDI_VELOCITY_NORMAL);
check("grace lands " + constant_OUR_MIDI_FLAM_GRACE_TICKS + " ticks before the main hit",
	  ev[1].at - ev[0].at, constant_OUR_MIDI_FLAM_GRACE_TICKS);
check("main hit lands exactly on the beat (slot 8 * 16 ticks)", ev[1].at, 8 * 16 + MIDI_LEAD_IN_TICKS);

// A normal tom on the same beat, for a baseline on where the beat actually is.
var normOnTwo = at(8, constant_ABC_T1_Normal);
var evNorm = midiFor([normOnTwo, empty, empty, empty]);
check("normal tom is a single hit", evNorm.length, 1);
check("flam main hit lands where the normal tom would", ev[1].at, evNorm[0].at);

// Flam on the very first slot: no room before the beat, so we borrow forward.
// The groove must not drift -- a later note has to stay put.
var flamOnOne = at(0, constant_ABC_T1_Flam);
flamOnOne[16] = constant_ABC_T1_Normal;
var evFirst = midiFor([flamOnOne, empty, empty, empty]);
check("flam on slot 0 still produces two hits plus the later note", evFirst.length, 3);
check("grace still precedes the main hit on slot 0",
	  evFirst[1].at - evFirst[0].at, constant_OUR_MIDI_FLAM_GRACE_TICKS);
var normOnOne = at(0, constant_ABC_T1_Normal);
normOnOne[16] = constant_ABC_T1_Normal;
var evNormFirst = midiFor([normOnOne, empty, empty, empty]);
check("no drift: the note on slot 16 is unmoved by the flam on slot 0",
	  evFirst[2].at, evNormFirst[1].at);

// Everything else in a flam slot must stay on the beat, not ride along with the grace note.
var snareOnTwo = at(8, constant_ABC_SN_Normal);
var evMixed = midiFor([flamOnTwo, empty, empty, empty], snareOnTwo);
var snareHit = evMixed.filter(function (e) { return e.note === constant_OUR_MIDI_SNARE_NORMAL; })[0];
var tomHits = evMixed.filter(function (e) { return e.note === constant_OUR_MIDI_TOM1_NORMAL; });
check("a snare sharing the flam's slot stays on the beat", snareHit.at, 8 * 16 + MIDI_LEAD_IN_TICKS);
check("the flam's main hit is simultaneous with that snare", tomHits[1].at, snareHit.at);
check("the grace note is still early", tomHits[0].at < snareHit.at, true);

// Each tom voices its own grace note.
var t2flam = at(8, constant_ABC_T2_Flam);
var t4flam = at(8, constant_ABC_T4_Flam);
var ev2 = midiFor([empty, t2flam, empty, empty]);
check("tom2 flam graces with tom2", ev2[0].note, constant_OUR_MIDI_TOM2_NORMAL);
var ev4 = midiFor([empty, empty, empty, t4flam]);
check("tom4 flam graces with tom4", ev4[0].note, constant_OUR_MIDI_TOM4_NORMAL);

// Grooves with no flams must be byte-for-byte unchanged in behaviour.
check("a groove with no flams emits nothing extra", midiFor([empty, empty, empty, empty]).length, 0);

print("");
print(failures === 0 ? "ALL PASS" : failures + " FAILURE(S)");
