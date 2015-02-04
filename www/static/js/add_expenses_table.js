var ADD_EXPENSES_TABLE = null;
var LAST_EXPENSE_ID = 0;

function appendExpense() {
	var expense = $("<tr/>");
	expense.attr("data-expense-identifier", LAST_EXPENSE_ID);
	
	var date_li = $("<td/>");
	var date_button_desc = $("<span/>");
	date_button_desc.addClass("glyphicon glyphicon-calendar");
	var date_button = $("<input/>");
	date_button.addClass("date-button");
	date_button.attr("required", "");
	date_button.attr("type", "text");
	date_button.datepicker({dateFormat: "dd/mm/yy"});
	date_li.append(date_button_desc);
	date_li.append(date_button);
	expense.append(date_li);

	var title_li = $("<td/>");
	var title_input = $("<input/>");
	title_input.addClass("title-input");
	title_input.attr("required", "");
	title_input.attr("size", "50");
	title_input.attr("type", "text");
	title_li.append(title_input);
	expense.append(title_li);

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
	LAST_EXPENSE_ID++;
}

function initAddExpensesTable() {
	ADD_EXPENSES_TABLE = $('table#add_expenses_table tbody');
	ADD_EXPENSES_TABLE.html("");
	appendExpense();
}
