import { Component, AfterViewInit } from '@angular/core';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements AfterViewInit {

  ngAfterViewInit(): void {

    const calendarEl = document.getElementById('calendar');

    const calendar = new Calendar(calendarEl!, {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth'
    });

    calendar.render();
  }
}