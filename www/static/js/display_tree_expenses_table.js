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

function HierarchyDateItem(data, label) {
	var self = this;
	self.data = data; //data is a date
	self.label = label;
	HierarchyDateItem.DAYS = [
			"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
			"Friday", "Saturday"];
	HierarchyDateItem.MONTHS = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"];
	self.display = function() {
		var d = new Date(1000*this.data);
		if (self.label == "date_weekday") {
			return HierarchyDateItem.DAYS[d.getDay()];
		} else if (self.label == "date_day") {
			return String(d.getDate());
		} else if (self.label == "date_month") {
			return HierarchyDateItem.MONTHS[d.getMonth()];
		} else if (self.label == "date_year") {
			return String(d.getFullYear());
		}
		return d.toLocaleDateString();
	};

	self.compare = function(other) {
		var d1 = new Date(1000*this.data);
		var d2 = new Date(1000*other.data);
		var v1 = this.data;
		var v2 = other.data;
		if (self.label == "date_weekday") {
			v1 = d1.getDay();
			v2 = d2.getDay();
		} else if (self.label == "date_day") {
			v1 = d1.getDate();
			v2 = d2.getDate();
		} else if (self.label == "date_month") {
			v1 = d1.getMonth();
			v2 = d2.getMonth();
		} else if (self.label == "date_year") {
			v1 = d1.getFullYear();
			v2 = d2.getFullYear();
		}
		return v1 < v2 ? -1 : (v1 > v2 ? 1 : 0);
	};
}
HierarchyDateItem.prototype = new HierarchyItem;

function buildHierarchyTable(rawdata, id2node, $table) {
	var datalisttitles = new Array();
	var datalistlabels = new Array();
	var $columns_hierarchy = $("#columns_hierarchy li");
	var $columns_usual = $("#columns_usual li");
	for (var j = 0 ; j != $columns_hierarchy.length ; j++) {
		datalisttitles.push($($columns_hierarchy[j]).text());
		datalistlabels.push($($columns_hierarchy[j]).attr("data-label"));
	}
	for (var j = 0 ; j != $columns_usual.length ; j++) {
		datalisttitles.push($($columns_usual[j]).text());
		datalistlabels.push($($columns_usual[j]).attr("data-label"));
	}
	
	var data = new Array();
	for (var i = 0 ; i != rawdata.length ; i++) {
		var d = rawdata[i];
		
		var datalist = new Array();

		for (var j = 0 ; j != datalistlabels.length ; j++) {
			var label = datalistlabels[j];
			if (label == "category") {
				var categories = new Array();
				for (var k = 0 ; k != d["category_ids"].length ; k++) {
					categories.push(id2node[d["category_ids"][k]]);
				}
				datalist.push(new HierarchyList(categories));
			} else if (label == "title") {
				datalist.push(new HierarchyItem(d["title"]));
			} else if (label == "price") {
				datalist.push(new HierarchyPriceItem(d["price"]));
			} else if (label.startsWith("date")) {
				datalist.push(new HierarchyDateItem(d["date"], label));
			}
		}
		data.push(datalist);
	}

	return new HierarchyTable($table, datalisttitles, data, $columns_hierarchy.length);
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

function initAddExpensesTable(xmlTreeUrl, rawdata, $table, id2node) {
	$.ajax({
		type: "get",
		url: xmlTreeUrl,
		dataType: "xml",
		success: function(xml)
		{
			var root_nodes = $(xml).find("trees").first().find("> node");
			loadTrees(root_nodes, undefined, id2node);
			var table = buildHierarchyTable(rawdata, id2node, $table);
			table.display();
		}
	});
}

