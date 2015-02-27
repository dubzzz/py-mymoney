function HierarchyPriceItem(data) {
	var self = this;
	self.data = data; //data is a price (double)

	self.display = function() {
		var language = window.navigator.userLanguage || window.navigator.language;
		return data.toLocaleString(language, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €";
	};

	self.aggregate = function(other) {
		return new HierarchyPriceItem(self.data + other.data);
	};
}
HierarchyPriceItem.prototype = new HierarchyItem;

function buildHierarchyTable(rawdata, id2node, $table) {
	var data = new Array();
	for (var i = 0 ; i != rawdata.length ; i++) {
		var d = rawdata[i];
		data.push([
				id2node[d["category_id"]],
				new HierarchyNode(d["title"], undefined),
				new HierarchyPriceItem(d["price"]),
		]);
	}

	return new HierarchyTable($table, ["Categories", "Label", "Total"], data);
}

function loadTrees(nodes, _parent, id2node) {
	for (var i = 0 ; i != nodes.length ; i++) {
		var $node = $(nodes[i]);
		var node = new HierarchyNode($node.attr("title"), _parent);
		id2node[$node.attr("id")] = node;
		$children = $node.children();
		if ($children.length > 0) {
			loadTrees($children, node, id2node);
		}
	}
}

function initAddExpensesTable(xmlTreeUrl, rawdata, $table) {
	$.ajax({
		type: "get",
		url: xmlTreeUrl,
		dataType: "xml",
		success: function(xml)
		{
			var id2node = {};
			var root_nodes = $(xml).find("trees").first().find("> node");
			loadTrees(root_nodes, undefined, id2node);
			var table = buildHierarchyTable(rawdata, id2node, $table);
			table.display();
		}
	});
}

