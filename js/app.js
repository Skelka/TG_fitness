import { getStorageItem, setStorageItem, showPopupSafe, showError } from './utils.js';
import calendarModule from './calendar.js';
import profileModule from './profile.js';
import statisticsModule from './statistics.js';
import workoutsModule from './workouts.js';

// Глобальные переменные
let tg = window.Telegram.WebApp;
let mainButton = tg.MainButton;
let backButton = tg.BackButton;

// Делаем showNotification доступной глобально
window.showNotification = function(message, isError = false) {
    // Удаляем предыдущее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;

    // Добавляем уведомление на страницу
    document.body.appendChild(notification);

    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Скрываем и удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
};

// Обработчик закрытия попапа
tg.onEvent('popupClosed', async (event) => {
    if (!event || !event.button_id) return;

    if (event.button_id === 'quit_workout') {
        workoutsModule.clearTimers();
        renderProgramCards();
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
    } else if (event.button_id.startsWith('start_program_')) {
        const programId = event.button_id.replace('start_program_', '');
        const program = window.programData.find(p => p.id === programId);
        
        if (!program) {
            console.error('Программа не найдена:', programId);
            showError('Программа не найдена');
            return;
        }

        try {
            const profileData = await getStorageItem('profile')
                .then(data => data ? JSON.parse(data) : null);

            if (!profileData) {
                showError('Пожалуйста, заполните профиль перед началом программы');
                switchTab('profile');
                return;
            }

            await initializeProgram(program);
            workoutsModule.startWorkout(program.id, program.workouts[0].id);
        } catch (error) {
            console.error('Ошибка при запуске программы:', error);
            showError('Не удалось начать программу');
        }
    }
});

// Функция для загрузки активной программы
async function loadActiveProgram() {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        if (activeProgram) {
            const program = window.programData[activeProgram.id];
            if (program) {
                workoutsModule.startWorkout(program.id, program.workouts[0].id);
                return;
            }
        }
        
        renderProgramCards();
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
        renderProgramCards();
    }
}

// Функция для инициализации приложения
async function initApp() {
    try {
        window.tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();

        await initializeDefaultPrograms();
        await profileModule.loadProfile();
        setupEventListeners();
        await loadActiveProgram();
        await renderProgramCards();
        statisticsModule.renderStatistics();
        await renderTips();
        calendarModule.initCalendar();

    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
        showError('Не удалось инициализировать приложение');
    }
}

// Обработчик DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (!window.programData || !window.exercisesDB) {
        console.error('Ошибка: данные не загружены');
        return;
    }

    initApp().catch(error => {
        console.error('Ошибка при инициализации приложения:', error);
        showError('Не удалось загрузить приложение');
    });
});

// Функция для переключения вкладок
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    switch(tabName) {
        case 'stats':
            statisticsModule.renderStatistics();
            break;
        case 'profile':
            profileModule.loadProfile();
            break;
        case 'workouts':
            loadActiveProgram();
            break;
        case 'calendar':
            calendarModule.renderCalendar();
            break;
    }

    if (window.tg) {
        window.tg.HapticFeedback.impactOccurred('light');
    }
}

// Функция для очистки всех данных
async function clearAllData() {
    try {
        const keysToDelete = [
            'profile',
            'activeProgram',
            'workoutStats',
            'weightHistory'
        ];

        for (const key of keysToDelete) {
            await setStorageItem(key, '');
            localStorage.removeItem(key);
        }

        await showPopupSafe({
            title: 'Готово',
            message: 'Все данные успешно очищены',
            buttons: [{type: 'ok'}]
        });

        location.reload();
    } catch (error) {
        console.error('Ошибка при очистке данных:', error);
        await showError('Не удалось очистить данные');
    }
}

// Делаем функции доступными глобально
window.switchTab = switchTab;
window.clearAllData = clearAllData;