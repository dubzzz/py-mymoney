var ADD_EXPENSES_TABLE = null;
var LAST_EXPENSE_ID = 0;

function isFilledExpense(expense) {
	// Given an expense, return true is it is fully and correctly filled
	
	var date_input = expense.find("input.date-input");
	if (date_input.length != 1
				|| (date_input[0].type == "date" && ! date_input.val().match('^[[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$'))
				|| (date_input[0].type == "text" && ! date_input.val().match('^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'))) {
		return false;
	}
	
	var title_input = expense.find("input.title-input");
	if (title_input.length != 1 || title_input.val().length == 0) {
		return false;
	}
	
	var price_input = expense.find("input.price-input");
	if (price_input.length != 1
				|| ! price_input.val().match('^[-+]?(([0-9]{1,3}([, ][0-9]{3})*|[0-9]+)(.[0-9]?[0-9]?)?)$')
				|| parseFloat(price_input.val().replace(' ', '').replace(',', '')) == 0) {
		return false;
	}
	return true;
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
	
	if (! $(this).val().match('^[-+]?(([0-9]{1,3}([, ][0-9]{3})*|[0-9]+)(.[0-9]?[0-9]?)?)$')) {
		return false;
	}
	var price_value_str = $(this).val();
	var price_value = parseFloat(price_value_str.replace(' ', '').replace(',', ''));
	var price_value_new_str = price_value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

	var language = window.navigator.userLanguage || window.navigator.language;
	if (language.toLowerCase() == 'fr' || language.toLowerCase() == 'fr-fr') {
		price_value_new_str = price_value_new_str.replace(',', ' ');
	}
	if (price_value_str != price_value_new_str) {
		$(this).val(price_value_new_str);
	}
}

function reactOnPriceFocus() {
	// Automatically format the price on focus in order to ease the modification
	
	if (! $(this).val().match('^[-+]?(([0-9]{1,3}([, ][0-9]{3})*|[0-9]+)(.[0-9]?[0-9]?)?)$')) {
		return false;
	}
	var price_value_str = $(this).val();
	var price_value = parseFloat(price_value_str.replace(' ', '').replace(',', ''));
	var price_value_new_str = price_value.toFixed(2);
	if (price_value_str != price_value_new_str) {
		$(this).val(price_value_new_str);
	}
}

function appendExpense() {
	// Append an empty expense in the form
	
	LAST_EXPENSE_ID++;
	var expense = $("<tr/>");
	expense.attr("data-expense-identifier", LAST_EXPENSE_ID);
	
	var date_li = $("<td/>");
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
	date_input.keyup(reactOnExpenseChange);
	date_li.append(date_input_desc);
	date_li.append(date_input);
	expense.append(date_li);

	var title_li = $("<td/>");
	var title_input = $("<input/>");
	title_input.addClass("title-input");
	title_input.attr("required", "");
	title_input.attr("size", "50");
	title_input.attr("type", "text");
	title_input.attr("placeholder", "Short description of the expense");
	title_input.keyup(reactOnExpenseChange);
	title_li.append(title_input);
	expense.append(title_li);
	
	var price_li = $("<td/>");
	var price_input = $("<input/>");
	price_input.addClass("price-input");
	price_input.attr("required", "");
	price_input.attr("size", "10");
	price_input.attr("type", "text");
	price_input.attr("pattern", "[-+]?(\\d{1,3}([\\s,]\\d{3})*|\\d+)(\\.\\d{0,2})?"); // 1000.00, 1 000.00, 1000 are valids
	price_input.attr("placeholder", "0.00");
	price_input.keyup(reactOnExpenseChange);
	price_input.focus(reactOnPriceFocus);
	price_input.focusout(reactOnPriceFocusOut);
	price_li.append(price_input);
	expense.append(price_li);

	var categories_li = $("<td/>");
	expense.append(categories_li);

	var actions_li = $("<td/>");
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
	actions_li.append(delete_img);
	var send_img = $("<span/>");
	send_img.addClass("glyphicon glyphicon-ok");
	send_img.attr("style", "cursor:pointer;");
	send_img.attr("title", "Save this expense");
	actions_li.append(send_img);
	expense.append(actions_li);

	ADD_EXPENSES_TABLE.append(expense);
}

function initAddExpensesTable() {
	// Initialize expenses table
	
	ADD_EXPENSES_TABLE = $('table#add_expenses_table tbody');
	ADD_EXPENSES_TABLE.html("");
	appendExpense();
}
