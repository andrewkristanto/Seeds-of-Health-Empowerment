$('.datepicker').each(function(){
	var picker = new Pikaday({
		field: this
	});
});
var monthDays = {'01':'31', '02':'28', '03':'31', '04':'30', '05':'31', '06':'30', '07':'31', '08':'31', '09':'30', '10':'31', '11':'30', '12':'31'};

function formatDate(date) {
    date = date.split("T");
    date[0] = date[0].slice(5, 10) + "-" + date[0].slice(0, 4);
    date[1] = date[1].slice(0, 5);

    var hour = date[1].slice(0, 2) - 3;

    if (hour < 0) {
        hour = hour + 24;
        month = date[0].slice(0, 2);
        day = date[0].slice(3, 5) - 1;
        year = date[0].slice(6, 10);
        
        if (day <= 0) {
            month = (month - 1) < 10 ? "0" + (month - 1) : (month - 1);
            if (month <= 0) {
                month = 12;
                year = year - 1;
            }
            day = monthDays[month];
        }

        date[0] = month + "-" + day + "-" + year;
    }
    if (hour > 12) {
        hour = (hour - 12) < 10 ? "0" + (hour - 12) : (hour - 12);
        date[1] = hour + date[1].slice(2, 5) + " PM";
    } else {
        if (hour == 0) {
            hour = 12
        }
        hour = hour < 10 ? "0" + hour : hour;
        date[1] = hour + date[1].slice(2, 5) +  " AM";
    }

    temp = date[0];
    date[0] = date[1];
    date[1] = temp;

    return date.join(" ");
}