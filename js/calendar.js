import { tg } from './globals.js';

// Календарь
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

export function renderCalendar() {
    const calendarHeader = document.querySelector('.calendar-header h2');
    const calendarDays = document.querySelector('.calendar-days');
    if (!calendarHeader || !calendarDays) return;

    const now = new Date();
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    calendarHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

    let html = '';
    
    for (let i = 1; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const isToday = day === now.getDate() && 
                       currentMonth === now.getMonth() && 
                       currentYear === now.getFullYear();
        
        html += `
            <div class="calendar-day${isToday ? ' today' : ''}">
                <span>${day}</span>
            </div>
        `;
    }

    calendarDays.innerHTML = html;

    const prevBtn = document.querySelector('.calendar-nav-btn:first-child');
    const nextBtn = document.querySelector('.calendar-nav-btn:last-child');

    if (prevBtn && nextBtn) {
        prevBtn.onclick = () => navigateCalendar('prev');
        nextBtn.onclick = () => navigateCalendar('next');
    }
}

export function navigateCalendar(direction) {
    if (direction === 'prev') {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
    } else {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    renderCalendar();
    tg.HapticFeedback.impactOccurred('light');
} 