import { getStorageItem } from './utils.js';

// Глобальные переменные для календаря
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Функция для отображения календаря
function renderCalendar() {
    const calendarHeader = document.querySelector('.calendar-header h2');
    const calendarDays = document.querySelector('.calendar-days');
    if (!calendarHeader || !calendarDays) return;

    // Устанавливаем заголовок календаря
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    calendarHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Получаем первый и последний день месяца
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Получаем день недели для первого дня
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

    let html = '';
    
    // Добавляем пустые ячейки для дней до начала месяца
    for (let i = 1; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Добавляем дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentYear, currentMonth, day);
        const isToday = isCurrentDay(date);
        const status = getWorkoutStatus(date);
        
        html += `
            <div class="calendar-day${isToday ? ' today' : ''}${status ? ` ${status}` : ''}">
                <span>${day}</span>
            </div>
        `;
    }

    calendarDays.innerHTML = html;
}

// Функция для проверки текущего дня
function isCurrentDay(date) {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
}

// Функция для получения статуса тренировки на определенную дату
async function getWorkoutStatus(date) {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        if (!activeProgram || !activeProgram.workouts) return null;

        const workout = activeProgram.workouts.find(w => {
            const workoutDate = new Date(w.scheduledDate);
            return workoutDate.toDateString() === date.toDateString();
        });

        if (!workout) return null;
        return workout.completed ? 'completed' : 'planned';
    } catch (error) {
        console.error('Ошибка при получении статуса тренировки:', error);
        return null;
    }
}

// Функция для навигации по календарю
function navigateCalendar(direction) {
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
    if (window.tg) {
        window.tg.HapticFeedback.impactOccurred('light');
    }
}

// Функция инициализации календаря
function initCalendar() {
    // Добавляем обработчики для кнопок навигации
    const prevBtn = document.querySelector('.calendar-nav-btn:first-child');
    const nextBtn = document.querySelector('.calendar-nav-btn:last-child');

    if (prevBtn && nextBtn) {
        prevBtn.onclick = () => navigateCalendar('prev');
        nextBtn.onclick = () => navigateCalendar('next');
    }

    // Отображаем календарь
    renderCalendar();
}

// Экспортируем функции для использования в других модулях
const calendarModule = {
    renderCalendar,
    initCalendar,
    navigateCalendar
};

export default calendarModule; 