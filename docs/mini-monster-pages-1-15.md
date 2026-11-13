# Mini Monster: printed pages 1–15

Source: the user-provided scan of Joel Rothman's *Mini Monster Book of Rock Drumming*. Printed pages 1–15 correspond to PDF pages 3–17. The PDF and page images are not included in this repository.

The library contains 312 individually selectable exercises under **Mini Monster**. There were 96 populated entries before this audit; 216 exercises were added (including previously empty placeholders).

| Printed page | Exercises | Meter | Measures per exercise |
| --- | ---: | --- | ---: |
| 1 | 20 | 4/4 | 1 |
| 2 | 18 | 4/4 | 1 |
| 3 | 10 | 4/4 | 2 |
| 4 | 18 | 4/4 | 1 |
| 5 | 20 | 4/4 | 1 |
| 6 | 18 | 4/4 | 1 |
| 7 | 18 | 4/4 | 1 |
| 8 | 32 | 2/4 | 1 |
| 9 | 18 | 4/4 | 1 |
| 10 | 18 | 4/4 | 1 |
| 11 | 18 | 4/4 | 1 |
| 12 | 20 + 16 | 2/4 | 1 |
| 13 | 8 + 8 + 8 + 8 | 2/4 | 1 |
| 14 | 18 | 4/4 | 1 |
| 15 | 18 | 4/4 | 1 |

Pages 12 and 13 restart exercise numbering. Their folders contain **Group 1**, **Group 2**, etc., in top-to-bottom printed order; each group retains the printed beat numbers.

## Transcription choices and corrections

- Every exercise was visually transcribed from the scanned notation, including rests and sixteenth-note placements.
- Cymbal notes use ordinary closed hi-hat hits; snare and bass notes use ordinary hits. No accents or ghost notes are added where the source has none.
- Page 5 intentionally has an empty bass drum part.
- Page 3 retains both measures, rather than splitting each combination into unrelated entries.
- Page 8's existing 4/4 adaptations were replaced with the printed 2/4 exercises.
- Page 6 beats 1, 6 and 7 had incorrect snare/bass rhythms and were corrected.
- Existing saved default tempos are retained; new exercises default to 60 BPM. Tempo is a practice setting, not a marking transcribed from the book.

## Existing browser libraries

Opening Library fills missing and empty slots. An entry matching its exact previously shipped default is upgraded to the corrected transcription. Custom saved queries and user-owned folders are preserved. A customized entry at an existing book location therefore keeps its custom version; a fresh library always receives the verified default. Seeding is idempotent and writes once per update.

## Validation

Run `node _test_mini_monster.js` from the repository root. It checks complete and unique page coverage, correct time signatures and measure lengths, the omitted bass part, migration of old defaults, preservation of custom saves, and repeated initialization.

Browser validation: all 312 queries were parsed by GrooveScribe and rendered to SVG in Chromium with no exceptions or page errors. Library navigation was also checked for a grouped 2/4 exercise, a two-measure exercise, and a snare-only exercise.
