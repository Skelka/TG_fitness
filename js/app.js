import { tg, initGlobalHandlers } from './globals.js';
import { getStorageItem, setStorageItem } from './storage.js';
import { switchTab, showNotification, showPopupSafe } from './ui.js';
import { renderCalendar } from './calendar.js';
import { renderStatistics } from './statistics.js';
import { loadProfile, saveProfile } from './profile.js';
import { startWorkout, completeWorkout, previousExercise, nextExercise } from './workout.js';
import { initializeProgram, showProgramDetails, showProgramList } from './program.js';

// Инициализация приложения
async function initApp() {
    try {
        // Настройка Telegram WebApp
        tg.expand();
        tg.enableClosingConfirmation();

        // Инициализация глобальных обработчиков
        initGlobalHandlers({
            saveProfile,
            showProgramList,
            startWorkout,
            previousExercise,
            nextExercise,
            completeWorkout,
            clearAllData
        });

        // Загрузка активной программы
        await loadActiveProgram();

        // Настройка обработчиков событий
        setupEventListeners();

        // Инициализация первого таба
        switchTab('workouts');

        // Отображение календаря
        renderCalendar();

    } catch (error) {
        console.error('Ошибка при инициализации:', error);
        showNotification('Ошибка при инициализации приложения', true);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики для навигации
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            switchTab(tabName);
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчик закрытия попапа
    tg.onEvent('popupClosed', async (event) => {
        if (event && event.button_id) {
            if (event.button_id.startsWith('start_workout_')) {
                const [_, __, programId, workoutId] = event.button_id.split('_');
                await startWorkout(programId, workoutId);
            } else {
                const [action, ...params] = event.button_id.split('_');
                switch(action) {
                    case 'program':
                        await showProgramDetails(params[0]);
                        break;
                    case 'start':
                        if (params[0] === 'program') {
                            await initializeProgram(params[1]);
                        }
                        break;
                }
            }
        }
    });
}

// Загрузка активной программы
async function loadActiveProgram() {
    try {
        const activeProgramData = await getStorageItem('activeProgram');
        if (activeProgramData) {
            const program = JSON.parse(activeProgramData);
            // Отображение активной программы
            await showProgramDetails(program.id);
        }
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
    }
}

// Очистка всех данных
async function clearAllData() {
    try {
        await showPopupSafe({
            title: 'Внимание',
            message: 'Вы уверены, что хотите очистить все данные? Это действие нельзя отменить.',
            buttons: [
                {type: 'destructive', text: 'Очистить', id: 'clear'},
                {type: 'default', text: 'Отмена', id: 'cancel'}
            ]
        }).then(async (result) => {
            if (result.button_id === 'clear') {
                await setStorageItem('profile', '');
                await setStorageItem('activeProgram', '');
                await setStorageItem('workoutStats', '');
                showNotification('Все данные очищены');
                location.reload();
            }
        });
    } catch (error) {
        console.error('Ошибка при очистке данных:', error);
        showNotification('Ошибка при очистке данных', true);
    }
}

// Переключение табов
export function switchTab(tabName) {
    // Обновляем активный элемент навигации
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Обновляем активный контент
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });

    // Дополнительные действия при переключении табов
    switch(tabName) {
        case 'stats':
            renderStatistics();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'calendar':
            renderCalendar();
            break;
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);