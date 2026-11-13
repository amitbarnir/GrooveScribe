// GrooveScribe user-groove library.
//
// Storage-backend agnostic. Swap LocalStorageBackend for another
// implementation (e.g. File System Access API) without touching the UI.
//
// Data model: `library[author]` is a tree.
//   - leaf  = string (the "?..." query) — saved entry
//   - leaf  = null                        — placeholder / unsaved slot
//   - folder = object of {childName: subtree, ...}
// Example:
//   {
//     "Joel Rothman": {
//       "Mini Monster": {
//         "Page 6": {
//           "Beat 1": "?TimeSig=..."
//         }
//       }
//     },
//     "Me": { "My Groove": "?TimeSig=..." }   // top-level leaf
//   }
//
// A backend implements:
//   read()                       -> the tree (or {})
//   write(tree)                  -> persist
//   save(author, path[], query)  -> upsert leaf at library[author][path...]
//   remove(author, path[])       -> delete leaf and prune empty parents
//   isEmpty()                    -> bool

var GrooveLibrary = (function () {

	function LocalStorageBackend(storageKey) {
		this.storageKey = storageKey || "gscribe_library";
	}
	LocalStorageBackend.prototype.read = function () {
		try {
			var raw = window.localStorage.getItem(this.storageKey);
			return raw ? JSON.parse(raw) : {};
		} catch (e) {
			return {};
		}
	};
	LocalStorageBackend.prototype.write = function (tree) {
		window.localStorage.setItem(this.storageKey, JSON.stringify(tree));
	};
	LocalStorageBackend.prototype.save = function (author, path, query) {
		var tree = this.read();
		if (!tree[author] || typeof tree[author] === "string") tree[author] = {};
		var node = tree[author];
		for (var i = 0; i < path.length - 1; i++) {
			var key = path[i];
			if (!node[key] || typeof node[key] === "string") node[key] = {};
			node = node[key];
		}
		node[path[path.length - 1]] = query;
		this.write(tree);
	};
	LocalStorageBackend.prototype.remove = function (author, path) {
		var tree = this.read();
		if (!tree[author]) return;
		// walk down, keeping parent refs so we can prune
		var stack = [{parent: tree, key: author, node: tree[author]}];
		var node = tree[author];
		for (var i = 0; i < path.length - 1; i++) {
			if (!node || typeof node !== "object" || !(path[i] in node)) return;
			stack.push({parent: node, key: path[i], node: node[path[i]]});
			node = node[path[i]];
		}
		var leafKey = path[path.length - 1];
		if (node && typeof node === "object") delete node[leafKey];
		// prune empty ancestors
		for (var j = stack.length - 1; j >= 0; j--) {
			var entry = stack[j];
			if (typeof entry.node === "object" && Object.keys(entry.node).length === 0) {
				delete entry.parent[entry.key];
			} else {
				break;
			}
		}
		this.write(tree);
	};
	LocalStorageBackend.prototype.isEmpty = function () {
		var tree = this.read();
		for (var _ in tree) return false;
		return true;
	};

	// Default seed. Populate with { author, path: [folder..., leaf], query }.
	// Verified against printed pages 1–15 (PDF pages 3–17).
	// Repeated numbering on pages 12–13 is separated into top-to-bottom groups.
	var DEFAULT_SEED = [
		{"author": "Mini Monster", "path": ["Page 1", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co---o---o---o---%7C&Title=Mini+Monster+Page+1+Beat+1&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co---o---o---o---%7C&Title=Mini+Monster+Page+1+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-------o-------%7C&Title=Mini+Monster+Page+1+Beat+2&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-------o-------%7C&Title=Mini+Monster+Page+1+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-------o-o-----%7C&Title=Mini+Monster+Page+1+Beat+3&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-------o-o-----%7C&Title=Mini+Monster+Page+1+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o-----o-------%7C&Title=Mini+Monster+Page+1+Beat+4&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o-----o-------%7C&Title=Mini+Monster+Page+1+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+1+Beat+5&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+1+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-----o-o-------%7C&Title=Mini+Monster+Page+1+Beat+6&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-----o-o-------%7C&Title=Mini+Monster+Page+1+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-------o-----o-%7C&Title=Mini+Monster+Page+1+Beat+7&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-------o-----o-%7C&Title=Mini+Monster+Page+1+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+1+Beat+8&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+1+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-----o-o-o-----%7C&Title=Mini+Monster+Page+1+Beat+9&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-----o-o-o-----%7C&Title=Mini+Monster+Page+1+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-----o-o-o---o-%7C&Title=Mini+Monster+Page+1+Beat+10&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-----o-o-o---o-%7C&Title=Mini+Monster+Page+1+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o---o-o-------%7C&Title=Mini+Monster+Page+1+Beat+11&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o---o-o-------%7C&Title=Mini+Monster+Page+1+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o---o-o-----o-%7C&Title=Mini+Monster+Page+1+Beat+12&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o---o-o-----o-%7C&Title=Mini+Monster+Page+1+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o---o-o-o-----%7C&Title=Mini+Monster+Page+1+Beat+13&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o---o-o-o-----%7C&Title=Mini+Monster+Page+1+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+1+Beat+14&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+1+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-----o-------o-%7C&Title=Mini+Monster+Page+1+Beat+15&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-----o-------o-%7C&Title=Mini+Monster+Page+1+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-----o---o-----%7C&Title=Mini+Monster+Page+1+Beat+16&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-----o---o-----%7C&Title=Mini+Monster+Page+1+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co---------o---o-%7C&Title=Mini+Monster+Page+1+Beat+17&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co---------o---o-%7C&Title=Mini+Monster+Page+1+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-----o---o---o-%7C&Title=Mini+Monster+Page+1+Beat+18&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-----o---o---o-%7C&Title=Mini+Monster+Page+1+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 19"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o-------o---o-%7C&Title=Mini+Monster+Page+1+Beat+19&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o-------o---o-%7C&Title=Mini+Monster+Page+1+Beat+19&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 1", "Beat 20"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-o---o---o---o-%7C&Title=Mini+Monster+Page+1+Beat+20&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o---o---o---o-%7C&Title=Mini+Monster+Page+1+Beat+20&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o---------%7C&Title=Mini+Monster+Page+2+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o-------o-----%7C&Title=Mini+Monster+Page+2+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o-----------o-%7C&Title=Mini+Monster+Page+2+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C------o---o-----%7C&Title=Mini+Monster+Page+2+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C------o-------o-%7C&Title=Mini+Monster+Page+2+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o---o-----%7C&Title=Mini+Monster+Page+2+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o-------o-%7C&Title=Mini+Monster+Page+2+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o-------o---o-%7C&Title=Mini+Monster+Page+2+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C------o---o---o-%7C&Title=Mini+Monster+Page+2+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o---o---o-%7C&Title=Mini+Monster+Page+2+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o-----o-------%7C&Title=Mini+Monster+Page+2+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o-----o-o-----%7C&Title=Mini+Monster+Page+2+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o-----o-----o-%7C&Title=Mini+Monster+Page+2+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o-----o-o---o-%7C&Title=Mini+Monster+Page+2+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o-o-------%7C&Title=Mini+Monster+Page+2+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o-o-o-----%7C&Title=Mini+Monster+Page+2+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o-o-----o-%7C&Title=Mini+Monster+Page+2+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 2", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7C--o---o-o-o---o-%7C&Title=Mini+Monster+Page+2+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-----o-o-----o-%7Co-----o-o-o---o-%7C&Title=Mini+Monster+Page+3+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-----o-o-----o-%7Co-----o---o---o-%7C&Title=Mini+Monster+Page+3+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-----o-o-----o-%7Co-o---o---o---o-%7C&Title=Mini+Monster+Page+3+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-----o-o-o---o-%7Co-o---o---o---o-%7C&Title=Mini+Monster+Page+3+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-----o-o-----o-%7C--o---o-o-----o-%7C&Title=Mini+Monster+Page+3+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-------o-o---o-%7C--o---o-o-o---o-%7C&Title=Mini+Monster+Page+3+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-----o-o-----o-%7C--o---o---o---o-%7C&Title=Mini+Monster+Page+3+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-o---o-o-o---o-%7C--o---o---o---o-%7C&Title=Mini+Monster+Page+3+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-----o---o---o-%7C--o---o---o---o-%7C&Title=Mini+Monster+Page+3+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 3", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=2&H=%7Cx-x-x-x-x-x-x-x-%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C----o-------o---%7C&K=%7Co-o---o---o---o-%7C--o---o-o-o---o-%7C&Title=Mini+Monster+Page+3+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o-o-%7C&K=%7Co-------o-o-----%7C&Title=Mini+Monster+Page+4+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o-o-%7C&K=%7Co-----o---o-----%7C&Title=Mini+Monster+Page+4+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-----o-----%7C&K=%7Co-------o-----o-%7C&Title=Mini+Monster+Page+4+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-----o-----%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+4+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-----o-o---%7C&K=%7Co-------o-----o-%7C&Title=Mini+Monster+Page+4+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-----o-o---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+4+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-o-----o---%7C&K=%7Co-------o-o---o-%7C&Title=Mini+Monster+Page+4+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-o-----o-o-%7C&K=%7Co-o-------o-----%7C&Title=Mini+Monster+Page+4+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-o---o-o---%7C&K=%7Co-------o-----o-%7C&Title=Mini+Monster+Page+4+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C--o-------o-----%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+4+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C--o-----o-------%7C&K=%7Co-------------o-%7C&Title=Mini+Monster+Page+4+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C--o-----o-------%7C&K=%7Co-----o-------o-%7C&Title=Mini+Monster+Page+4+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C--o-o-------o---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+4+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C--o-o-----o-o---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+4+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C--o-o-------o-o-%7C&K=%7Co-----o-o-------%7C&Title=Mini+Monster+Page+4+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C--o-o---o-o---o-%7C&K=%7Co-----o-----o---%7C&Title=Mini+Monster+Page+4+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7Co-----o-----o---%7C&K=%7C--o-o---o-o---o-%7C&Title=Mini+Monster+Page+4+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 4", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7Co---o---o---o---%7C&K=%7C--o---o---o---o-%7C&Title=Mini+Monster+Page+4+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o----o--o---%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o----o--o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o----o---%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o-o--o---%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o-o--o--o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo------oo--%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--oo---o--oo--%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo-o----oo-o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--oo-o-o--oo-o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-oo----o-oo%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o-oo-o--o-oo%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-oo-o----oo-o---%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-oo-o--o-oo-o--o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-oo-oo-o-oo-oo-o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o-oo--o-o-oo--o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o-ooo-o-o-ooo-o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 19"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o--o--o-o%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+19&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 5", "Beat 20"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7Co--oo----o--o---%7C&K=%7C----------------%7C&Title=Mini+Monster+Page+5+Beat+20&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o----o--o---%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+6+Beat+1&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=40&Measures=1&H=%7CX-X-X-X-X-X-X-X-%7C&S=%7C-O--OO---O--OO--%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+6+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o----o--o---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+6+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o----o--o---%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+6+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o----o--o%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+6+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o----o--o%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+6+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=45&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o----o--o%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+6+Beat+6&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=45&Measures=1&H=%7CX-X-X-X-X-X-X-X-%7C&S=%7C----OO-O----OO-O%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+6+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=39&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-------------o-%7C&Title=Mini+Monster+Page+6+Beat+7&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=39&Measures=1&H=%7CX-X-X-X-X-X-X-X-%7C&S=%7C-O--OO-O-O--OO-O%7C&K=%7Co-----o-o-------%7C&Title=Mini+Monster+Page+6+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-----o-o-o---o-%7C&Title=Mini+Monster+Page+6+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-----o---o---o-%7C&Title=Mini+Monster+Page+6+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+6+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+6+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co-----o-o-o---o-%7C&Title=Mini+Monster+Page+6+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o-o--o---%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+6+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o-o--o--o%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+6+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo------oo--%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+6+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo------oo--%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+6+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo------oo--%7C&K=%7Co-----o---o---o-%7C&Title=Mini+Monster+Page+6+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 6", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo------oo--%7C&K=%7C--o---o---o---o-%7C&Title=Mini+Monster+Page+6+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--oo---o--oo--%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--oo---o--oo--%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+7+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--oo---o--oo--%7C&K=%7C--o---o---o---o-%7C&Title=Mini+Monster+Page+7+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo-o----oo-o%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+7+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo-o----oo-o%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----oo-o----oo-o%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+7+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--oo-o-o--oo-o%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--oo-o-o--oo-o%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+7+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-oo----o-oo%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+7+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o-oo-o--o-oo%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+7+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-oo-o----oo-o---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-oo-o--o-oo-o--o%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+12&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-OO-O--O-OO-O--O%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-oo-oo-o-oo-oo-o%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+13&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-OO-OO-O-OO-OO-O%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o-oo----o-oo---%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o-oo--o-o-oo--o%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+7+Beat+15&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-O-OO--O-O-OO--O%7C&K=%7Co-o---o-o-o---o-%7C&Title=Mini+Monster+Page+7+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o-oo-oo-o-oo-oo%7C&K=%7Co-o-----o-o-----%7C&Title=Mini+Monster+Page+7+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o--o--o-o%7C&K=%7Co-----o-o-----o-%7C&Title=Mini+Monster+Page+7+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 7", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o--o--o-o%7C&K=%7Co-----o-----o---%7C&Title=Mini+Monster+Page+7+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 1"], "query": "?TimeSig=2%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co----o--%7C&Title=Mini+Monster+Page+8+Beat+1&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o--o-------%7C&Title=Mini+Monster+Page+8+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 2"], "query": "?TimeSig=2%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co------o%7C&Title=Mini+Monster+Page+8+Beat+2&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------oo-------%7C&Title=Mini+Monster+Page+8+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 3"], "query": "?TimeSig=2%2F4&Div=16&Tempo=99&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co----o-o%7C&Title=Mini+Monster+Page+8+Beat+3&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=99&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-oo-------%7C&Title=Mini+Monster+Page+8+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 4"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co----oo-%7C&Title=Mini+Monster+Page+8+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 5"], "query": "?TimeSig=2%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-o--o--%7C&Title=Mini+Monster+Page+8+Beat+5&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o--o--o-------%7C&Title=Mini+Monster+Page+8+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 6"], "query": "?TimeSig=2%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-o----o%7C&Title=Mini+Monster+Page+8+Beat+6&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=40&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o----oo-------%7C&Title=Mini+Monster+Page+8+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 7"], "query": "?TimeSig=2%2F4&Div=16&Tempo=99&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-o--o-o%7C&Title=Mini+Monster+Page+8+Beat+7&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=99&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-o--o-oo-------%7C&Title=Mini+Monster+Page+8+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 8"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-o--oo-%7C&Title=Mini+Monster+Page+8+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 9"], "query": "?TimeSig=2%2F4&Div=16&Tempo=100&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co--o----%7C&Title=Mini+Monster+Page+8+Beat+9&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=100&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o----o-------%7C&Title=Mini+Monster+Page+8+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 10"], "query": "?TimeSig=2%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+8+Beat+10&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o--o-o--o--o-%7C&Title=Mini+Monster+Page+8+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 11"], "query": "?TimeSig=2%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co--o-o--%7C&Title=Mini+Monster+Page+8+Beat+11&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o-o--o--o-o--%7C&Title=Mini+Monster+Page+8+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 12"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co--o---o%7C&Title=Mini+Monster+Page+8+Beat+12&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o---oo--o---o%7C&Title=Mini+Monster+Page+8+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 13"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co--o-o-o%7C&Title=Mini+Monster+Page+8+Beat+13&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o-o-oo--o-o-o%7C&Title=Mini+Monster+Page+8+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 14"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co--o-oo-%7C&Title=Mini+Monster+Page+8+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 15"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-oo----%7C&Title=Mini+Monster+Page+8+Beat+15&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-oo----o-oo----%7C&Title=Mini+Monster+Page+8+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 16"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+8+Beat+16&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-oo--o-o-oo--o-%7C&Title=Mini+Monster+Page+8+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 17"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-oo-o--%7C&Title=Mini+Monster+Page+8+Beat+17&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-oo-o--o-oo-o--%7C&Title=Mini+Monster+Page+8+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 18"], "query": "?TimeSig=2%2F4&Div=16&Tempo=55&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-oo---o%7C&Title=Mini+Monster+Page+8+Beat+18&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=55&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-oo---oo-oo---o%7C&Title=Mini+Monster+Page+8+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 19"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-oo-o-o%7C&Title=Mini+Monster+Page+8+Beat+19&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co-oo-o-oo-------%7C&Title=Mini+Monster+Page+8+Beat+19&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 20"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Co-oo-oo-%7C&Title=Mini+Monster+Page+8+Beat+20&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 21"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo------%7C&Title=Mini+Monster+Page+8+Beat+21&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo------oo------%7C&Title=Mini+Monster+Page+8+Beat+21&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 22"], "query": "?TimeSig=2%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo----o-%7C&Title=Mini+Monster+Page+8+Beat+22&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo----o-o-------%7C&Title=Mini+Monster+Page+8+Beat+22&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 23"], "query": "?TimeSig=2%2F4&Div=16&Tempo=73&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo---o--%7C&Title=Mini+Monster+Page+8+Beat+23&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=73&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo---o--o-------%7C&Title=Mini+Monster+Page+8+Beat+23&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 24"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo-----o%7C&Title=Mini+Monster+Page+8+Beat+24&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo-----oo-------%7C&Title=Mini+Monster+Page+8+Beat+24&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 25"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo---o-o%7C&Title=Mini+Monster+Page+8+Beat+25&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo---o-oo-------%7C&Title=Mini+Monster+Page+8+Beat+25&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 26"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo---oo-%7C&Title=Mini+Monster+Page+8+Beat+26&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo---oo-o-------%7C&Title=Mini+Monster+Page+8+Beat+26&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 27"], "query": "?TimeSig=2%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo-o----%7C&Title=Mini+Monster+Page+8+Beat+27&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo-o----oo-o----%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+8+Beat+27&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 28"], "query": "?TimeSig=2%2F4&Div=16&Tempo=75&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo-o--o-%7C&Title=Mini+Monster+Page+8+Beat+28&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=75&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo-o--o-oo-o--o-%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+8+Beat+28&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 29"], "query": "?TimeSig=2%2F4&Div=16&Tempo=65&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo-o-o--%7C&Title=Mini+Monster+Page+8+Beat+29&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=65&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo-o-o--oo-o-o--%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+8+Beat+29&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 30"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo-o---o%7C&Title=Mini+Monster+Page+8+Beat+30&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 31"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo-o-o-o%7C&Title=Mini+Monster+Page+8+Beat+31&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 8", "Beat 32"], "query": "?TimeSig=2%2F4&Div=16&Tempo=75&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o---%7C&K=%7Coo-o-oo-%7C&Title=Mini+Monster+Page+8+Beat+32&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=75&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Coo-o-oo-oo-o-oo-%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+8+Beat+32&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------oo-o--o--%7C&Title=Mini+Monster+Page+9+Beat+1&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------oo-o--o--%7C&Title=Mini+Monster+Page+9+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------oo-o--o-o%7C&Title=Mini+Monster+Page+9+Beat+2&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------oo-o--o-o%7C&Title=Mini+Monster+Page+9+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------o--o--o--%7C&Title=Mini+Monster+Page+9+Beat+3&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------o--o--o--%7C&Title=Mini+Monster+Page+9+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------o--o--o-o%7C&Title=Mini+Monster+Page+9+Beat+4&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------o--o--o-o%7C&Title=Mini+Monster+Page+9+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------o-o----o-%7C&Title=Mini+Monster+Page+9+Beat+5&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------o-o----o-%7C&Title=Mini+Monster+Page+9+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------o-o-----o%7C&Title=Mini+Monster+Page+9+Beat+6&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------o-o-----o%7C&Title=Mini+Monster+Page+9+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------o-o---o-o%7C&Title=Mini+Monster+Page+9+Beat+7&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------o-o---o-o%7C&Title=Mini+Monster+Page+9+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------o-o-o--o-%7C&Title=Mini+Monster+Page+9+Beat+8&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------o-o-o--o-%7C&Title=Mini+Monster+Page+9+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co------o-o-o---o%7C&Title=Mini+Monster+Page+9+Beat+9&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co------o-o-o---o%7C&Title=Mini+Monster+Page+9+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o--o----o%7C&Title=Mini+Monster+Page+9+Beat+10&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o--o----o%7C&Title=Mini+Monster+Page+9+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o---o-o--%7C&Title=Mini+Monster+Page+9+Beat+11&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o---o-o--%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o---o---o%7C&Title=Mini+Monster+Page+9+Beat+12&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o---o---o%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o---o-o-o%7C&Title=Mini+Monster+Page+9+Beat+13&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o---o-o-o%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o-o----o-%7C&Title=Mini+Monster+Page+9+Beat+14&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o-o----o-%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o-o-----o%7C&Title=Mini+Monster+Page+9+Beat+15&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o-o-----o%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o-o---o-o%7C&Title=Mini+Monster+Page+9+Beat+16&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o-o---o-o%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o--oo-o---o%7C&Title=Mini+Monster+Page+9+Beat+17&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o--oo-o---o%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 9", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co----o-o-o-o---o%7C&Title=Mini+Monster+Page+9+Beat+18&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co----o-o-o-o---o%7C&T1=%7C----------------%7C&T4=%7C----------------%7C&Title=Mini+Monster+Page+9+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--o---o--o--%7C&Title=Mini+Monster+Page+10+Beat+1&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o--o---o--o--%7C&Title=Mini+Monster+Page+10+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--o---o----o%7C&Title=Mini+Monster+Page+10+Beat+2&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o--o---o----o%7C&Title=Mini+Monster+Page+10+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--o---o--o-o%7C&Title=Mini+Monster+Page+10+Beat+3&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o--o---o--o-o%7C&Title=Mini+Monster+Page+10+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--o--o-----o%7C&Title=Mini+Monster+Page+10+Beat+4&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o--o--o-----o%7C&Title=Mini+Monster+Page+10+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--o--o---o-o%7C&Title=Mini+Monster+Page+10+Beat+5&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o--o--o---o-o%7C&Title=Mini+Monster+Page+10+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--o--o-o---o%7C&Title=Mini+Monster+Page+10+Beat+6&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o--o--o-o---o%7C&Title=Mini+Monster+Page+10+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---oo-o--o--%7C&Title=Mini+Monster+Page+10+Beat+7&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o---oo-o--o--%7C&Title=Mini+Monster+Page+10+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---oo-o--o-o%7C&Title=Mini+Monster+Page+10+Beat+8&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o---oo-o--o-o%7C&Title=Mini+Monster+Page+10+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---o-o----o-%7C&Title=Mini+Monster+Page+10+Beat+9&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o---o-o----o-%7C&Title=Mini+Monster+Page+10+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---o-o-----o%7C&Title=Mini+Monster+Page+10+Beat+10&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o---o-o-----o%7C&Title=Mini+Monster+Page+10+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---o-o---o-o%7C&Title=Mini+Monster+Page+10+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---o---o-o--%7C&Title=Mini+Monster+Page+10+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---o---o-o-o%7C&Title=Mini+Monster+Page+10+Beat+13&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o---o---o-o-o%7C&Title=Mini+Monster+Page+10+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o---o-o-o---o%7C&Title=Mini+Monster+Page+10+Beat+14&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o---o-o-o---o%7C&Title=Mini+Monster+Page+10+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o-o---o-o---o%7C&Title=Mini+Monster+Page+10+Beat+15&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o-o---o-o---o%7C&Title=Mini+Monster+Page+10+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o-o-----o-o-o%7C&Title=Mini+Monster+Page+10+Beat+16&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o-o-----o-o-o%7C&Title=Mini+Monster+Page+10+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o-o--oo-----o%7C&Title=Mini+Monster+Page+10+Beat+17&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o-o--oo-----o%7C&Title=Mini+Monster+Page+10+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 10", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o-o--oo-o---o%7C&Title=Mini+Monster+Page+10+Beat+18&Author=Joel+Rothman", "previousQuery": "?TimeSig=4%2F4&Div=16&Tempo=70&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----O-------O---%7C&K=%7Co--o-o--oo-o---o%7C&Title=Mini+Monster+Page+10+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--oo--o----o%7C&Title=Mini+Monster+Page+11+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--oo--o--o-o%7C&Title=Mini+Monster+Page+11+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--oo-o----o-%7C&Title=Mini+Monster+Page+11+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--oo-o-----o%7C&Title=Mini+Monster+Page+11+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co--o--oo-o-o---o%7C&Title=Mini+Monster+Page+11+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo--o--o-----o%7C&Title=Mini+Monster+Page+11+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo--o--o-o---o%7C&Title=Mini+Monster+Page+11+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo---o-o----o-%7C&Title=Mini+Monster+Page+11+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo---o-o-----o%7C&Title=Mini+Monster+Page+11+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo---o-o---o-o%7C&Title=Mini+Monster+Page+11+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo---o-o-o---o%7C&Title=Mini+Monster+Page+11+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo--oo--o--o-o%7C&Title=Mini+Monster+Page+11+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo--oo-o-----o%7C&Title=Mini+Monster+Page+11+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo-o---o-o---o%7C&Title=Mini+Monster+Page+11+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Co-oo-o--oo-o---o%7C&Title=Mini+Monster+Page+11+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Coo-----oo-o--o--%7C&Title=Mini+Monster+Page+11+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Coo-----o-o----o-%7C&Title=Mini+Monster+Page+11+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 11", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o-------o---%7C&K=%7Coo-o--oo-o---o-o%7C&Title=Mini+Monster+Page+11+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 1"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co----o--%7C&Title=Mini+Monster+Page+12+Group+1+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 2"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-o--o--%7C&Title=Mini+Monster+Page+12+Group+1+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 3"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co------o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 4"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-o----o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 5"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co----o-o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 6"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-o--o-o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 7"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co----oo-%7C&Title=Mini+Monster+Page+12+Group+1+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 8"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-o--oo-%7C&Title=Mini+Monster+Page+12+Group+1+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 9"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co--o----%7C&Title=Mini+Monster+Page+12+Group+1+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 10"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+12+Group+1+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 11"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co--o-o--%7C&Title=Mini+Monster+Page+12+Group+1+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 12"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co--o---o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 13"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co--o-o-o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 14"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co--o-oo-%7C&Title=Mini+Monster+Page+12+Group+1+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 15"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-oo----%7C&Title=Mini+Monster+Page+12+Group+1+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 16"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+12+Group+1+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 17"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-oo-o--%7C&Title=Mini+Monster+Page+12+Group+1+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 18"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-oo---o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 19"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-oo-o-o%7C&Title=Mini+Monster+Page+12+Group+1+Beat+19&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 1", "Beat 20"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o---%7C&K=%7Co-oo-oo-%7C&Title=Mini+Monster+Page+12+Group+1+Beat+20&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 1"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co----o--%7C&Title=Mini+Monster+Page+12+Group+2+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 2"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co-o--o--%7C&Title=Mini+Monster+Page+12+Group+2+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 3"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co--o----%7C&Title=Mini+Monster+Page+12+Group+2+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 4"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+12+Group+2+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 5"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co--o-o--%7C&Title=Mini+Monster+Page+12+Group+2+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 6"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co-oo----%7C&Title=Mini+Monster+Page+12+Group+2+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 7"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+12+Group+2+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 8"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co-oo-o--%7C&Title=Mini+Monster+Page+12+Group+2+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 9"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Coo------%7C&Title=Mini+Monster+Page+12+Group+2+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 10"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Coo----o-%7C&Title=Mini+Monster+Page+12+Group+2+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 11"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Coo---o--%7C&Title=Mini+Monster+Page+12+Group+2+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 12"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Coo-o----%7C&Title=Mini+Monster+Page+12+Group+2+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 13"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Coo-o--o-%7C&Title=Mini+Monster+Page+12+Group+2+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 14"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Coo-o-o--%7C&Title=Mini+Monster+Page+12+Group+2+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 15"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co-o--oo-%7C&Title=Mini+Monster+Page+12+Group+2+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 12", "Group 2", "Beat 16"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o--o%7C&K=%7Co-oo-oo-%7C&Title=Mini+Monster+Page+12+Group+2+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 1"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co----o--%7C&Title=Mini+Monster+Page+13+Group+1+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 2"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co-o--o--%7C&Title=Mini+Monster+Page+13+Group+1+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 3"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co--o----%7C&Title=Mini+Monster+Page+13+Group+1+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 4"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+13+Group+1+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 5"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co--o-o--%7C&Title=Mini+Monster+Page+13+Group+1+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 6"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co-oo----%7C&Title=Mini+Monster+Page+13+Group+1+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 7"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+13+Group+1+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 1", "Beat 8"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o--o%7C&K=%7Co-oo-o--%7C&Title=Mini+Monster+Page+13+Group+1+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 1"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Co------o%7C&Title=Mini+Monster+Page+13+Group+2+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 2"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Co-o----o%7C&Title=Mini+Monster+Page+13+Group+2+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 3"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+13+Group+2+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 4"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Co--o---o%7C&Title=Mini+Monster+Page+13+Group+2+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 5"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+13+Group+2+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 6"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Co-oo---o%7C&Title=Mini+Monster+Page+13+Group+2+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 7"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Coo----o-%7C&Title=Mini+Monster+Page+13+Group+2+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 2", "Beat 8"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo--%7C&K=%7Coo-o--o-%7C&Title=Mini+Monster+Page+13+Group+2+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 1"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo-o%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 2"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo-o%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 3"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo-o%7C&K=%7Coo----o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 4"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----oo-o%7C&K=%7Coo-o--o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 5"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--oo--%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 6"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--oo--%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 7"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--oo-o%7C&K=%7Co--o--o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 3", "Beat 8"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--oo-o%7C&K=%7Co-oo--o-%7C&Title=Mini+Monster+Page+13+Group+3+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 1"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o-oo%7C&K=%7Co-o--o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 2"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o-oo%7C&K=%7Co--o-o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 3"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o-oo%7C&K=%7Co-oo-o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 4"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o-oo%7C&K=%7Coo---o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 5"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C----o-oo%7C&K=%7Coo-o-o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 6"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o-oo%7C&K=%7Co-o--o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 7"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o-oo%7C&K=%7Co--o-o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 13", "Group 4", "Beat 8"], "query": "?TimeSig=2%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-%7C&S=%7C-o--o-oo%7C&K=%7Co-oo-o--%7C&Title=Mini+Monster+Page+13+Group+4+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co-----o-o--o--o-%7C&Title=Mini+Monster+Page+14+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-o---o-o--o---o%7C&Title=Mini+Monster+Page+14+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co-----o-o--o-o--%7C&Title=Mini+Monster+Page+14+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-o---o-o--o-o-o%7C&Title=Mini+Monster+Page+14+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co-----o---oo-o--%7C&Title=Mini+Monster+Page+14+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-o---o-o-oo---o%7C&Title=Mini+Monster+Page+14+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co----o--o--o--o-%7C&Title=Mini+Monster+Page+14+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-o--o--o--o---o%7C&Title=Mini+Monster+Page+14+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co----o-----o-o--%7C&Title=Mini+Monster+Page+14+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-o--o--o--o-o-o%7C&Title=Mini+Monster+Page+14+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co----o--o-oo--o-%7C&Title=Mini+Monster+Page+14+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-o--o--o-oo---o%7C&Title=Mini+Monster+Page+14+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co----o--o-oo-o--%7C&Title=Mini+Monster+Page+14+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o--o---o----o%7C&Title=Mini+Monster+Page+14+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co--o--o-o-o--o--%7C&Title=Mini+Monster+Page+14+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o--o-o-o--o-o%7C&Title=Mini+Monster+Page+14+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o--o-o-oo---o%7C&Title=Mini+Monster+Page+14+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 14", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co--o--o---oo-o--%7C&Title=Mini+Monster+Page+14+Beat+18&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 1"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o-o--o-o----o%7C&Title=Mini+Monster+Page+15+Beat+1&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 2"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o-o----o--o-o%7C&Title=Mini+Monster+Page+15+Beat+2&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 3"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o-o--o--o--o-%7C&Title=Mini+Monster+Page+15+Beat+3&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 4"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co--o-o-----o-o--%7C&Title=Mini+Monster+Page+15+Beat+4&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 5"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o-o--o--o---o%7C&Title=Mini+Monster+Page+15+Beat+5&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 6"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co--o-o-----o-o-o%7C&Title=Mini+Monster+Page+15+Beat+6&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 7"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-oo--o-o-o----o%7C&Title=Mini+Monster+Page+15+Beat+7&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 8"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-oo--o-o-o--o-o%7C&Title=Mini+Monster+Page+15+Beat+8&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 9"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-oo--o-o--o--o-%7C&Title=Mini+Monster+Page+15+Beat+9&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 10"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-oo--o-o--o---o%7C&Title=Mini+Monster+Page+15+Beat+10&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 11"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o-o--o--o%7C&K=%7Co-oo--o-o--o-o--%7C&Title=Mini+Monster+Page+15+Beat+11&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 12"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-oo--o---oo---o%7C&Title=Mini+Monster+Page+15+Beat+12&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 13"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o-o--o---%7C&K=%7Co-oo--o---oo-o--%7C&Title=Mini+Monster+Page+15+Beat+13&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 14"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o--o%7C&K=%7Co-oo-o--o--o--o-%7C&Title=Mini+Monster+Page+15+Beat+14&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 15"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C-o--o--o-o--o--o%7C&K=%7Co-oo-o-----o-o--%7C&Title=Mini+Monster+Page+15+Beat+15&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 16"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Co-oo-o----oo---o%7C&Title=Mini+Monster+Page+15+Beat+16&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 17"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Coo-o--o-o--o--o-%7C&Title=Mini+Monster+Page+15+Beat+17&Author=Joel+Rothman"},
		{"author": "Mini Monster", "path": ["Page 15", "Beat 18"], "query": "?TimeSig=4%2F4&Div=16&Tempo=60&Measures=1&H=%7Cx-x-x-x-x-x-x-x-%7C&S=%7C----o--o-o--o---%7C&K=%7Coo-o--o-o--o-o--%7C&Title=Mini+Monster+Page+15+Beat+18&Author=Joel+Rothman"}
	];

	function GrooveLibrary(backend) {
		this.backend = backend;
	}
	// Normalize known legacy beat-label typos only. Preserve custom names,
	// nested groups and both entries when a canonical name already exists.
	GrooveLibrary.prototype.cleanupMiniMonster = function () {
		var tree = this.backend.read();
		var mm = tree["Mini Monster"];
		if (!mm || typeof mm !== "object") return;
		var changed = false;
		Object.keys(mm).forEach(function (pageKey) {
			var page = mm[pageKey];
			if (!page || typeof page !== "object") return;
			Object.keys(page).forEach(function (oldName) {
				if (page[oldName] !== null && typeof page[oldName] !== "string") return;
				var match = /^(?:beat|bat)\s+(\d+)$/i.exec(oldName);
				if (!match) return;
				var newName = "Beat " + match[1];
				if (newName === oldName || Object.prototype.hasOwnProperty.call(page, newName)) return;
				page[newName] = page[oldName];
				delete page[oldName];
				changed = true;
			});
		});
		if (changed) this.backend.write(tree);
	};

	// Fill missing slots and update unchanged older defaults. Custom saves survive.
	// previousQuery is the exact shipped value, not a match on title or rhythm.
	GrooveLibrary.prototype.seedMissing = function () {
		var tree = this.backend.read();
		var changed = false;
		for (var i = 0; i < DEFAULT_SEED.length; i++) {
			var g = DEFAULT_SEED[i];
			if (tree[g.author] === undefined || tree[g.author] === null) tree[g.author] = {};
			var node = tree[g.author];
			for (var j = 0; j < g.path.length - 1; j++) {
				if (!node || typeof node !== "object") break;
				if (node[g.path[j]] === undefined || node[g.path[j]] === null) node[g.path[j]] = {};
				node = node[g.path[j]];
			}
			if (!node || typeof node !== "object") continue;
			var key = g.path[g.path.length - 1];
			var current = node[key];
			if (current === undefined || current === null ||
				(g.previousQuery && current === g.previousQuery)) {
				if (current !== g.query) {
					node[key] = g.query;
					changed = true;
				}
			}
		}
		if (changed) this.backend.write(tree);
	};

	GrooveLibrary.prototype.save = function (a, p, q) { this.backend.save(a, p, q); };
	// If the (author, path) is defined in the seed at all (as a real entry OR
	// placeholder), we treat "delete" as "revert to empty placeholder" so the
	// tree slot stays visible for re-use. Otherwise we fully remove.
	GrooveLibrary.prototype.remove = function (a, p) {
		var fullPath = [a].concat(p);
		var isSeeded = DEFAULT_SEED.some(function (g) {
			if (g.author !== a || g.path.length !== p.length) return false;
			for (var i = 0; i < p.length; i++) if (g.path[i] !== p[i]) return false;
			return true;
		});
		if (isSeeded) {
			this.backend.save(a, p, null);
		} else {
			this.backend.remove(a, p);
		}
	};
	GrooveLibrary.prototype.read = function () { return this.backend.read(); };

	// Natural-sort comparator (so "Beat 2" < "Beat 10").
	function naturalCompare(a, b) {
		var ax = [], bx = [];
		a.replace(/(\d+)|(\D+)/g, function (_, n, s) { ax.push([n ? +n : Infinity, s || ""]); return ""; });
		b.replace(/(\d+)|(\D+)/g, function (_, n, s) { bx.push([n ? +n : Infinity, s || ""]); return ""; });
		while (ax.length && bx.length) {
			var an = ax.shift(), bn = bx.shift();
			var nn = an[0] - bn[0];
			if (nn) return nn;
			var ns = an[1].toLowerCase().localeCompare(bn[1].toLowerCase());
			if (ns) return ns;
		}
		return ax.length - bx.length;
	}

	function escapeHTML(s) {
		return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
	function pathToAttr(path) {
		// path is array of strings; encode as JSON so we can round-trip through a data attr
		return escapeHTML(JSON.stringify(path)).replace(/"/g, "&quot;");
	}
	function parsePathAttr(attr) {
		return JSON.parse(attr);
	}

	// Render a single subtree recursively. `path` is the accumulated path from
	// the author root; we use it for click handlers.
	function renderSubtree(node, path, expandedSet) {
		if (typeof node === "string" || node === null) return ""; // handled by parent
		var keys = Object.keys(node).sort(naturalCompare);
		var html = "";
		for (var i = 0; i < keys.length; i++) {
			var k = keys[i];
			var childPath = path.concat([k]);
			var pathKey = childPath.join("\0");
			var val = node[k];
			if (typeof val === "string" || val === null) {
				// leaf. null = placeholder / unsaved slot.
				var isPlaceholder = (val === null);
				var cls = "library-leaf" + (isPlaceholder ? " library-leaf-placeholder" : "");
				html += '<div class="' + cls + '" data-path="' + pathToAttr(childPath) + '">';
				html += '<span class="library-leaf-title">' + escapeHTML(k) + '</span>';
				if (isPlaceholder) {
					html += '<span class="library-leaf-hint">empty</span>';
				} else {
					html += '<span class="library-leaf-delete" title="Delete"><i class="fa fa-times"></i></span>';
				}
				html += '</div>';
			} else {
				// folder
				var isOpen = expandedSet[pathKey] === true;
				var chev = isOpen ? "fa-caret-down" : "fa-caret-right";
				html += '<div class="library-folder" data-path="' + pathToAttr(childPath) + '">';
				html += '<div class="library-folder-name"><i class="fa ' + chev + '"></i> ' + escapeHTML(k) + '</div>';
				html += '<div class="library-folder-children" style="display:' + (isOpen ? "block" : "none") + '">';
				html += renderSubtree(val, childPath, expandedSet);
				html += '</div></div>';
			}
		}
		return html;
	}

	// Render the whole library into `containerEl`. onLoad(query) fires when a
	// leaf is clicked. Delete click removes the leaf and re-renders.
	// Expansion state is stored on the container element itself so re-renders
	// preserve which folders were open.
	GrooveLibrary.prototype.render = function (containerEl, onLoad) {
		var self = this;
		if (!containerEl._expandedSet) containerEl._expandedSet = {};
		var expanded = containerEl._expandedSet;
		var tree = this.read();
		var authors = Object.keys(tree).sort(naturalCompare);

		var html = '<div class="library-header">Library</div>';
		if (authors.length === 0) {
			html += '<div class="library-empty">No saved grooves yet. Fill in Title and Author, then click ★ Save.</div>';
		} else {
			for (var i = 0; i < authors.length; i++) {
				var author = authors[i];
				var authorNode = tree[author];
				// Author is treated as a top-level folder even if it directly
				// holds leaves — so the user always drills through an author.
				var pathKey = author;
				var isOpen = expanded[pathKey] === true;
				var chev = isOpen ? "fa-caret-down" : "fa-caret-right";
				html += '<div class="library-author" data-path="' + pathToAttr([author]) + '">';
				html += '<div class="library-author-name"><i class="fa ' + chev + '"></i> ' + escapeHTML(author) + '</div>';
				html += '<div class="library-author-children" style="display:' + (isOpen ? "block" : "none") + '">';
				if (typeof authorNode === "object") {
					html += renderSubtree(authorNode, [author], expanded);
				}
				html += '</div></div>';
			}
		}
		containerEl.innerHTML = html;

		// Single delegated click handler. Stop propagation so document.onclick
		// (which closes the menu on any outside click) doesn't fire while the
		// user is navigating the tree.
		containerEl.onclick = function (e) {
			e.stopPropagation();

			// Delete click on a leaf?
			var deleteBtn = e.target.closest && e.target.closest(".library-leaf-delete");
			if (deleteBtn) {
				var leafEl = deleteBtn.closest(".library-leaf");
				var delPath = parsePathAttr(leafEl.getAttribute("data-path"));
				var author = delPath[0];
				var restPath = delPath.slice(1);
				var name = delPath[delPath.length - 1];
				if (confirm('Delete "' + name + '"?')) {
					self.remove(author, restPath);
					self.render(containerEl, onLoad);
				}
				return;
			}
			// Leaf body click → load. query may be null for placeholders.
			var leaf = e.target.closest && e.target.closest(".library-leaf");
			if (leaf) {
				var loadPath = parsePathAttr(leaf.getAttribute("data-path"));
				var query = self._lookup(loadPath); // null for placeholders
				onLoad(loadPath, query);
				return;
			}
			// Folder header click → toggle expand.
			var folderName = e.target.closest && (e.target.closest(".library-folder-name") || e.target.closest(".library-author-name"));
			if (folderName) {
				var folderEl = folderName.parentElement;
				var togglePath = parsePathAttr(folderEl.getAttribute("data-path"));
				var key = togglePath.length === 1 ? togglePath[0] : togglePath.join("\0");
				expanded[key] = !expanded[key];
				var childrenEl = folderEl.querySelector(".library-folder-children, .library-author-children");
				var caret = folderName.querySelector("i.fa");
				if (expanded[key]) {
					childrenEl.style.display = "block";
					if (caret) { caret.classList.remove("fa-caret-right"); caret.classList.add("fa-caret-down"); }
				} else {
					childrenEl.style.display = "none";
					if (caret) { caret.classList.remove("fa-caret-down"); caret.classList.add("fa-caret-right"); }
				}
			}
		};
	};

	// Walk `library[path[0]]` following path[1..] and return the leaf string.
	GrooveLibrary.prototype._lookup = function (path) {
		var tree = this.read();
		var node = tree[path[0]];
		for (var i = 1; i < path.length; i++) {
			if (!node || typeof node !== "object") return null;
			node = node[path[i]];
		}
		return typeof node === "string" ? node : null;
	};

	return {
		LocalStorageBackend: LocalStorageBackend,
		GrooveLibrary: GrooveLibrary,
		DEFAULT_SEED: DEFAULT_SEED,
	};
})();
