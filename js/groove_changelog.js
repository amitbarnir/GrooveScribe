// Changelog + "what's new" popup for GrooveScribe.
//
// Bump GS_APP_VERSION and add an entry at the top of GS_CHANGELOG whenever something
// user visible ships.   On load we compare the running version against the last one this
// browser acknowledged and, if it moved, show everything that landed in between.

/*global window, document, localStorage */

var GS_APP_VERSION = "1.05";

// Newest first.   "changes" is a plain list of strings.
var GS_CHANGELOG = [
	{
		version: "1.05",
		date: "2026-09-01",
		changes: [
			"Silent measures is now its own option in the metronome menu, so you can practice holding time without also having to turn on Auto speed up.",
			"Auto speed up can now step in 10 second increments up to a minute, then a minute at a time - useful for short bursts where a whole minute at one tempo is too long.",
			"Fixed: the play clock and progress bar froze during a silent measure.   They keep running now.   The note highlight still stops, on purpose, so you have to keep your place by feel.",
			"Silent measures and Auto speed up settings are now saved into the share URL, so you can bookmark or send a groove along with the way you practice it.",
			"Fixed: adding or changing a note while the groove was playing fired a preview hit in the middle of the bar.   Edits are silent during playback now and you hear them when the phrase comes back around.",
			"Fixed: the remove measure button could ignore clicks near its right hand edge, where the next measure was overlapping it."
		]
	},
	{
		version: "1.04",
		date: "2026-08-17",
		changes: [
			"Flams on the toms.   Right click any tom note (High, Middle or Floor) and pick Flam - previously only the snare could do it.   Tom flams play as a real two hit flam rather than a single accented note.",
			"Auto speed up now defaults to 10 bpm in 1 min, instead of 5 bpm in 2 min.",
			"New \"Step up all at once\" option in Auto speed up: hold the tempo flat for the whole interval, then jump the full amount in one go instead of creeping up gradually.",
			"New \"Silent measures %\" slider in Auto speed up: randomly mutes whole measures - drums and metronome both - so you have to hold the time yourself.   The muted measures are re-rolled every time the loop comes around.",
			"This changelog popup."
		]
	},
	{
		version: "1.03",
		date: "2026-07-14",
		changes: [
			"Added a Middle Tom row, and renamed the tom labels to High Tom / Middle Tom / Floor.",
			"Groove library: save your own grooves into nested folders, seeded with the Mini Monster book.",
			"Tom rows are shown by default on page load."
		]
	}
];

var GrooveChangelog = (function () {
	"use strict";

	var STORAGE_KEY = "gscribe_last_seen_version";

	function readLastSeen() {
		try {
			return localStorage.getItem(STORAGE_KEY);
		} catch (e) {
			return null; // private browsing / storage disabled
		}
	}

	function writeLastSeen(version) {
		try {
			localStorage.setItem(STORAGE_KEY, version);
		} catch (e) {
			// nothing we can do, the popup will just show again next time
		}
	}

	// Compare two dotted version strings.   Returns >0 if a is newer than b.
	function compareVersions(a, b) {
		var pa = String(a).split("."),
			pb = String(b).split("."),
			len = Math.max(pa.length, pb.length),
			i,
			na,
			nb;

		for (i = 0; i < len; i++) {
			na = parseInt(pa[i], 10) || 0;
			nb = parseInt(pb[i], 10) || 0;
			if (na !== nb)
				return na - nb;
		}
		return 0;
	}

	// Every entry newer than "sinceVersion".   A null sinceVersion means we have never
	// recorded anything for this browser, so just show the current release.
	function entriesSince(sinceVersion) {
		if (!sinceVersion)
			return GS_CHANGELOG.slice(0, 1);

		return GS_CHANGELOG.filter(function (entry) {
			return compareVersions(entry.version, sinceVersion) > 0;
		});
	}

	function escapeHTML(text) {
		return String(text)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	function buildHTML(entries) {
		var html = '<div id="changelogPopupTitle">What\'s new</div>';

		entries.forEach(function (entry) {
			html += '<div class="changelogEntry">';
			html += '<div class="changelogVersion">Version ' + escapeHTML(entry.version) +
					' <span class="changelogDate">' + escapeHTML(entry.date) + '</span></div>';
			html += '<ul class="changelogList">';
			entry.changes.forEach(function (change) {
				html += '<li>' + escapeHTML(change) + '</li>';
			});
			html += '</ul></div>';
		});

		html += '<div id="changelogPopupCloseButtonDiv">' +
				'<button id="changelogPopupCloseButton" onclick="GrooveChangelog.close();">Got it</button>' +
				'</div>';
		return html;
	}

	var root = {};

	root.close = function () {
		var popup = document.getElementById("changelogPopup");
		if (popup)
			popup.style.display = "none";
		writeLastSeen(GS_APP_VERSION);
	};

	// Show the popup regardless of what version was last seen.   Used by the Help menu.
	root.showAll = function () {
		var popup = document.getElementById("changelogPopup");
		if (!popup)
			return;
		popup.innerHTML = buildHTML(GS_CHANGELOG);
		popup.style.display = "block";
	};

	// Called on page load.   Only shows when the version actually moved.
	root.showIfVersionChanged = function () {
		var lastSeen = readLastSeen();

		if (lastSeen === GS_APP_VERSION)
			return false;

		var entries = entriesSince(lastSeen);
		if (entries.length === 0) {
			// running an older build than the one last acknowledged, nothing to announce
			writeLastSeen(GS_APP_VERSION);
			return false;
		}

		var popup = document.getElementById("changelogPopup");
		if (!popup)
			return false;

		popup.innerHTML = buildHTML(entries);
		popup.style.display = "block";
		return true;
	};

	// exposed for testing
	root.compareVersions = compareVersions;
	root.entriesSince = entriesSince;
	root.STORAGE_KEY = STORAGE_KEY;

	return root;
}());
