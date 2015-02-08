var XML_EXPENSE_ADD_URL = null;
var ADD_EXPENSES_TABLE = null;
var XML_TREES_ELTS = new Array();
var LAST_EXPENSE_ID = 0;

function readExpenseDate(expense) {
	var date_input = expense.find("input.date-input");
	if (date_input.length != 1) {
		return undefined;
	}
	if (date_input[0].type == "date") {
		if (date_input.val().match('^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$')) {
			return date_input.val();
		}
	} else { //text
		var m = date_input.val().match('^([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})$');
		if (m) {
			return m[3] + '-' + m[2] + '-' + m[1];
		}
	}
	return undefined;
}

function readExpenseTitle(expense) {
	var title_input = expense.find("input.title-input");
	if (title_input.length != 1 || title_input.val().length == 0) {
		return undefined;
	}
	return title_input.val();
}

function readExpensePrice(expense) {
	var price_input = expense.find("input.price-input");
	if (price_input.length != 1
				|| ! price_input.val().match('^[-+]?(([0-9]{1,3}([, ][0-9]{3})*|[0-9]+)(.[0-9]?[0-9]?)?)$')
				|| parseFloat(price_input.val().replace(/ /g, '').replace(/,/g, '')) == 0) {
		return undefined;
	}
	return parseFloat(price_input.val().replace(/ /g, '').replace(/,/g, ''));
}

function isFilledExpense(expense) {
	// Given an expense, return true is it is fully and correctly filled
	
	var expense_date = readExpenseDate(expense);
	if (! expense_date) {
		return undefined;
	}
	
	var expense_title = readExpenseTitle(expense);
	if (! expense_title) {
		return undefined;
	}
	
	var expense_price = readExpensePrice(expense);
	if (! expense_price) {
		return undefined;
	}
	return {date: expense_date, title: expense_title, price: expense_price};
}

function reactOnExpenseChange() {
	// Automaticcaly append expenses when the last line is fully filled
	// Only the last line is checked
	
	var expense = $(this).parent().parent();
	// expense is the last expense of the table is not equivalent to
	// data-expense-identifier == LAST_EXPENSE_ID as the expense could have been deleted..
	if (expense[0] == ADD_EXPENSES_TABLE.children().last()[0] && isFilledExpense(expense)) {
		appendExpense();
	}
}

function reactOnPriceFocusOut() {
	// Automatically format the price on focus out action
	
	var price_value = readExpensePrice($(this).parent().parent());
	if (! price_value) {
		return false;
	}
	
	var price_value_str = $(this).val();
	var price_value_new_str = price_value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

	var language = window.navigator.userLanguage || window.navigator.language;
	if (language.toLowerCase() == 'fr' || language.toLowerCase() == 'fr-fr') {
		price_value_new_str = price_value_new_str.replace(/,/g, ' ');
	}
	if (price_value_str != price_value_new_str) {
		$(this).val(price_value_new_str);
	}
}

function reactOnPriceFocus() {
	// Automatically format the price on focus in order to ease the modification
	
	var price_value = readExpensePrice($(this).parent().parent());
	if (! price_value) {
		return false;
	}
	
	var price_value_str = $(this).val();
	var price_value_new_str = price_value.toFixed(2);
	if (price_value_str != price_value_new_str) {
		$(this).val(price_value_new_str);
	}
}

Array.prototype.sortOnBestScore = function() {
	this.sort(function(a, b){
		if(a['score'] < b['score']){
			return -1;
		} else if(a['score'] > b['score']) {
			return 1;
		} else if (a['rawdisplay'] < b['rawdisplay']) {
			return -1;
		} else if (a['rawdisplay'] > b['rawdisplay']) {
			return 1;
		}
		return 0;
	});
}

function toSafeHtml(text) {
	return $("<a/>").text(text).html();
}

function computeAutocompletePriority(elt, query) {
	var elt_text = elt['rawdisplay'];
	var elt_text_lower = elt_text.toLowerCase();
	var query_lower = query.toLowerCase();
	
	var best_origin = -1;
	var best_score = -1;
	for (var i=0 ; i!=elt_text_lower.length ; i++) { // Look for a string starting from this element
		if (query_lower.length == 0 || elt_text_lower[i] != query_lower[0]) {
			continue;
		}
		var padding_pos = 0;
		var query_pos = 0;
		for (query_pos = 0 ; i+padding_pos != elt_text_lower.length && query_pos != query_lower.length ; padding_pos++) {
			if (elt_text_lower[i+padding_pos] == query_lower[query_pos]) {
				query_pos++;
			}
		}

		// Is there a match?
		// If so, is it better than current one?
		if (query_pos == query_lower.length) {//match
			if (best_score == -1 || best_score > padding_pos-query_pos) {
				best_origin = i;
				best_score = padding_pos-query_pos;
				if (best_score == 0) {
					break;
				}
			}
		}
	}

	// Highlight match characteristics
	if (best_score != -1) {
		var new_elt = elt;
		new_elt["score"] = best_score;
		if (query.length == 0) {
			new_elt['display'] = toSafeHtml(elt_text);
		} else {
			new_elt['display'] = "";
			var i = 0;
			var query_pos = 0;
			for ( ; i != elt_text_lower.length ; i++) {
				if (i >= best_origin && query_pos != query_lower.length && elt_text_lower[i] == query_lower[query_pos]) {
					new_elt['display'] += "<b>" + toSafeHtml(elt_text[i]) + "</b>";
					query_pos++;
				}
				else
				{
					new_elt['display'] += toSafeHtml(elt_text[i]);
				}
			}
		}
		return new_elt;
	}
	return undefined;
}

function computeAutocompleteResults(available_elts, query) {
	var elts_to_display = new Array();
	for (var i=0 ; i!=available_elts.length ; i++) {
		var new_elt = computeAutocompletePriority(available_elts[i], query);
		if (new_elt) {
			elts_to_display.push(new_elt);
		}
	}
	elts_to_display.sortOnBestScore();
	return elts_to_display;
}

function reactOnCategoryKeyUp(event) {
	// Refresh the content of the autocomplete list
	
	// Get autocomplete list or create it if not displayed
	var categories_td = $(this).parent();
	var autocomplete_list = categories_td.find(".autocomplete-list");
	if (autocomplete_list.length == 0) {
		categories_td.css('position', 'relative');
		autocomplete_list = $("<ul/>");
		autocomplete_list.addClass("autocomplete-list");
		categories_td.append(autocomplete_list);
	}
	var position_left = $(this).position()['left'];
	var position_top = $(this).position()['top'] + $(this).height();
	autocomplete_list.css('left', position_left + 'px');
	autocomplete_list.css('top', position_top + 'px');
	
	// Get already selected elements position
	var selected_elt = autocomplete_list.find('.autocomplete-list-selected').first();
	var selected_elt_id = -1;
	if (selected_elt.length == 1) {
		selected_elt_id = parseInt(selected_elt.attr('data-autocomplete-id'));
	}
	if (selected_elt_id != -1 && event.keyCode == 13) { // Enter
		//TODO
		event.preventDefault();
		return;
	}
	else if (event.keyCode == 38 || event.keyCode == 40) { // Up or Down
		var autocomplete_elts = autocomplete_list.children();
		var current_index = 0;
		for (current_index=0 ; current_index != autocomplete_elts.length ; current_index++) {
			if ($(autocomplete_elts[current_index]).hasClass('autocomplete-list-selected')) {
				break;
			}
		}
		if (autocomplete_elts.length > 0) {
			if (current_index == autocomplete_elts.length) {
				$(autocomplete_elts[0]).addClass('autocomplete-list-selected');
			} else if (event.keyCode == 38) {
				if (current_index > 0) {
					$(autocomplete_elts[current_index]).removeClass('autocomplete-list-selected');
					$(autocomplete_elts[current_index -1]).addClass('autocomplete-list-selected');
				}
			} else if (event.keyCode == 40) {
				if (current_index < autocomplete_elts.length -1) {
					$(autocomplete_elts[current_index]).removeClass('autocomplete-list-selected');
					$(autocomplete_elts[current_index +1]).addClass('autocomplete-list-selected');
				}
			}
			event.preventDefault();
			return;
		}
	} else if (event.keyCode == 27) {
		autocomplete_list.remove();
	}
	
	// Create autocomplete list
	var elts_to_display = computeAutocompleteResults(XML_TREES_ELTS, $(this).val());
	
	// Display elements
	autocomplete_list.empty();
	for (var i=0 ; i != elts_to_display.length ; i++) {
		var autocomplete_elt = $("<li/>");
		autocomplete_elt.attr('data-autocomplete-id', elts_to_display[i]['id']);
		if (elts_to_display[i]['id'] == selected_elt_id) {
			autocomplete_elt.addClass('autocomplete-list-selected');
		}
		autocomplete_elt.html(elts_to_display[i]['display']);
		autocomplete_list.append(autocomplete_elt);
	}
	if (elts_to_display.length == 0) {
		autocomplete_list.remove();
	}
}

function reactOnCategoryFocusOut() {
	$(this).parent().find(".autocomplete-list").remove();
}

function appendExpense() {
	// Append an empty expense in the form
	
	LAST_EXPENSE_ID++;
	var expense = $("<tr/>");
	expense.addClass('expense-edit');
	expense.attr("data-expense-identifier", LAST_EXPENSE_ID);
	
	var date_td = $("<td/>");
	var date_input_desc = $("<span/>");
	date_input_desc.addClass("glyphicon glyphicon-calendar");
	var date_input = $("<input/>");
	date_input.addClass("date-input");
	date_input.attr("required", "");
	date_input.attr("type", "date");
	if (date_input[0].type == "text") //date type not supported (HTML5)
	{
		date_input.attr("placeholder", "dd/mm/yyyy");
		date_input.datepicker({dateFormat: "dd/mm/yy"});
	}
	date_input.change(reactOnExpenseChange);
	date_input.keyup(reactOnExpenseChange);
	date_td.append(date_input_desc);
	date_td.append(date_input);
	expense.append(date_td);

	var title_td = $("<td/>");
	var title_input = $("<input/>");
	title_input.addClass("title-input");
	title_input.attr("required", "");
	title_input.attr("size", "50");
	title_input.attr("type", "text");
	title_input.attr("placeholder", "Short description of the expense");
	title_input.keyup(reactOnExpenseChange);
	title_td.append(title_input);
	expense.append(title_td);
	
	var price_td = $("<td/>");
	var price_input = $("<input/>");
	price_input.addClass("price-input");
	price_input.attr("required", "");
	price_input.attr("size", "10");
	price_input.attr("type", "text");
	price_input.attr("pattern", "[-+]?(\\d{1,3}([\\s,]\\d{3})*|\\d+)(\\.\\d{0,2})?"); // 1000.00, 1 000.00, 1000 are valids
	price_input.attr("placeholder", "0.00");
	price_input.focus(reactOnPriceFocus);
	price_input.focusout(reactOnPriceFocusOut);
	price_input.keyup(reactOnExpenseChange);
	price_td.append(price_input);
	expense.append(price_td);

	var categories_td = $("<td/>");
	var categories_input = $("<input/>");
	categories_input.addClass("categories-input");
	categories_input.attr("type", "text");
	categories_input.attr("placeholder", "Classify expense");
	categories_input.focusout(reactOnCategoryFocusOut);
	categories_input.keyup(reactOnCategoryKeyUp);
	categories_td.append(categories_input);
	expense.append(categories_td);

	var actions_td = $("<td/>");
	var delete_img = $("<span/>");
	delete_img.addClass("glyphicon glyphicon-trash");
	delete_img.attr("style", "cursor:pointer;");
	delete_img.attr("title", "Delete this expense");
	delete_img.click(function() {
		$(this).parent().parent().remove();
		if (ADD_EXPENSES_TABLE.children().length == 0) {
			appendExpense();
		}
	});
	actions_td.append(delete_img);
	var send_img = $("<span/>");
	send_img.addClass("glyphicon glyphicon-ok");
	send_img.attr("style", "cursor:pointer;");
	send_img.attr("title", "Save this expense");
	send_img.click(ajaxSaveNewExpense);
	actions_td.append(send_img);
	expense.append(actions_td);

	ADD_EXPENSES_TABLE.append(expense);
}

function getTreeNodePath(node) {
	if (node && node.attr("title")) {
		var parent_path = getTreeNodePath(node.parent());
		if (parent_path.length > 0) {
			return parent_path + " > " + node.attr("title");
		} else {
			return node.attr("title");
		}
	}
	return "";
}

function loadTrees(nodes) {
	for (var i = 0 ; i != nodes.length ; i++) {
		var node = $(nodes[i]);
		var children = node.children();
		if (children.length > 0) {
			loadTrees(children);
		} else {
			var elt = {rawdisplay: getTreeNodePath(node), id: node.attr("id")};
			XML_TREES_ELTS.push(elt);
		}
	}
}

function initAddExpensesTable(addExpenseUrl, xmlTreeUrl) {
	// Initialize expenses table
	
	XML_EXPENSE_ADD_URL = addExpenseUrl;	
	ADD_EXPENSES_TABLE = $('table#add_expenses_table tbody');
	ADD_EXPENSES_TABLE.html("");
	appendExpense();
	$("button#submit-expenses").click(ajaxSaveAllExpenses);

	$.ajax({
		type: "get",
		url: xmlTreeUrl,
		dataType: "xml",
		success: function(xml)
		{
			XML_TREES_ELTS = new Array();
			var root_nodes = $(xml).find("trees").first().find("> node");
			loadTrees(root_nodes);
		}
	});
}

/**
 * AJAX query to save all expenses
 */
function ajaxSaveAllExpenses()
{
	if (! XML_EXPENSE_ADD_URL)
	{
		alert("Unable to find the url");
		return;
	}
	
	var expenses = ADD_EXPENSES_TABLE.find("tr");
	for (var i = 0 ; i != expenses.length ; i++) {
		var expense = $(expenses[i]);
		var expense_details = isFilledExpense(expense);
		if (expense_details && (expense.hasClass('expense-edit') || expense.hasClass('expense-fail'))) {
			expense.find("span.glyphicon-ok").click();
		}
	}
}

/**
 * AJAX query to save new expense
 */
function ajaxSaveNewExpense()
{
	if (! XML_EXPENSE_ADD_URL)
	{
		alert("Unable to find the url");
		return;
	}

	var expense = $(this).parent().parent();
	if (! expense.hasClass('expense-edit') && ! expense.hasClass('expense-fail'))
	{
		alert("The operation cannot be run on this expense");
		return;
	}
	var expense_details = isFilledExpense(expense);
	if (! expense_details) {
		alert("Please fill the expense before saving it");
		return;
	}
	
	expense.removeClass('expense-edit');
	expense.addClass('expense-wait');
	$.ajax({
		type: "post",
		url: XML_EXPENSE_ADD_URL,
		data:
		{
			_xsrf: getCookie("_xsrf"),
			client_id: expense.attr('data-expense-identifier'),
			title: expense_details['title'],
			date: expense_details['date'],
			price: expense_details['price'],
		},
		dataType: "xml",
		success: function(xml)
		{
			expense.removeClass('expense-wait');
			expense.addClass('expense-success');
			setTimeout(function() {
				expense.remove();
			}, 3000);
		},
		error: function(xhr)
		{
			expense.removeClass("expense-wait");
			expense.addClass('expense-fail');
			setTimeout(function() {
				expense.removeClass("expense-fail");
				expense.addClass('expense-edit');
			}, 3000);
			alert($(xhr.responseText).text());
		}
	});
}

