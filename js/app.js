import { getStorageItem, setStorageItem, showPopupSafe, showError, showNotification, formatTime } from './utils.js';
import calendarModule from './calendar.js';
import profileModule from './profile.js';
import statisticsModule from './statistics.js';
import {
    renderExercise,
    getExerciseIcon,
    getExerciseTypeText,
    getMuscleGroupsText,
    startExerciseTimer,
    toggleTimer,
    updateTimerDisplay,
    startRestTimer,
    skipRest,
    clearTimers,
    completeExercise,
    prevExercise,
    nextExercise
} from './exercise-renderer.js';

// Импортируем функции из profile.js
const { loadProfile, saveProfile: saveProfileSettings } = profileModule;

// Глобальные переменные
window.tg = window.Telegram.WebApp;
window.mainButton = tg.MainButton;
window.backButton = tg.BackButton;
window.currentWorkout = null;
window.currentExerciseIndex = 0;
window.currentSet = 1;
window.isResting = false;
window.restTimeLeft = 0;
window.isTimerMode = false;
window.isTimerPaused = false;
window.workoutStartTime = null;

// Делаем функции глобальными
window.clearAllData = clearAllData;
window.startWorkout = startWorkout;
window.clearTimers = clearTimers;
window.startExerciseTimer = startExerciseTimer;
window.toggleTimer = toggleTimer;
window.completeExercise = completeExercise;
window.prevExercise = prevExercise;
window.nextExercise = nextExercise;
window.skipRest = skipRest;

// Функция для предзагрузки шрифтов
async function preloadFonts() {
    try {
        const font = new FontFace(
            'Material Symbols Rounded',
            'url(../fonts/MaterialSymbolsRounded.woff2) format("woff2")',
            { style: 'normal', weight: '400' }
        );
        
        // Ждем загрузки шрифта
        await font.load();
        
        // Добавляем шрифт в document.fonts
        document.fonts.add(font);
        
        console.log('Шрифты успешно загружены');
        } catch (error) {
        console.error('Ошибка при загрузке шрифтов:', error);
    }
}

// Обновляем функцию initApp
async function initApp() {
    try {
        // Инициализируем Telegram WebApp
        window.tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();

        // Предзагружаем шрифты
        await preloadFonts();

        // Инициализируем программы по умолчанию
        await initializeDefaultPrograms();

        // Загружаем профиль
        await profileModule.loadProfile();

        // Настраиваем обработчики событий
        setupEventListeners();
        setupCheckboxHandlers();
        profileModule.setupProfileEquipmentHandlers();

        // Загружаем активную программу
        await loadActiveProgram();

        // Рендерим карточки программ
        await renderProgramCards();

        // Обновляем статистику
        statisticsModule.renderStatistics();

        // Рендерим советы
        await renderTips();

        // Инициализируем календарь
        calendarModule.initCalendar();

    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
        showError('Не удалось инициализировать приложение');
    }
}

// Обновляем обработчик DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Загруженные программы:', window.programData);
    console.log('Загруженная база упражнений:', window.exercisesDB);

    if (!window.programData) {
        console.error('Ошибка: данные программ не загружены');
        return;
    }

    if (!window.exercisesDB) {
        console.error('Ошибка: база упражнений не загружена');
        return;
    }

    initApp().catch(error => {
        console.error('Ошибка при инициализации приложения:', error);
        showError('Не удалось загрузить приложение');
    });
});

// Функция показа деталей тренировки
function showWorkoutDetails(workout) {
    // Функция для получения типа тренировки на русском
    function getWorkoutType(type) {
        const types = {
            'cardio': 'Кардио',
            'strength': 'Силовая',
            'hiit': 'HIIT',
            'cardio_strength': 'Кардио + Сила',
            'circuit': 'Круговая'
        };
        return types[type] || type;
    }

    tg.showPopup({
        title: workout.title,
        message: `
${workout.type ? `📋 Тип: ${getWorkoutType(workout.type)}` : ''}
🕒 Длительность: ${workout.duration} мин
🔥 Калории: ${workout.calories} ккал

Упражнения:
${workout.exercises.map(ex => `• ${ex.name}
  ${ex.sets}×${ex.reps}${ex.rest ? ` (отдых ${ex.rest} сек)` : ''}`).join('\n')}
        `,
        buttons: [
            {
                type: 'default',
                text: 'Закрыть'
            }
        ]
    });
}

// Обновим обработчики событий
function setupWorkoutHandlers(program) {
    document.querySelectorAll('.workout-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const workoutCard = button.closest('.workout-card');
            const workoutTitle = workoutCard.querySelector('h3').textContent;
            const workoutId = getWorkoutIdByTitle(workoutTitle);
            
            if (button.classList.contains('info-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                showWorkoutDetails(workoutId);
            } else if (button.classList.contains('start-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                startWorkout(program.id, workoutId);
            }
        });
    });
}

// Вспомогательная функция для получения ID тренировки по заголовку
function getWorkoutIdByTitle(title) {
    return Object.keys(workoutData).find(key => 
        workoutData[key].title === title
    );
}

// Обновляем функцию renderProgramCards
async function renderProgramCards() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    try {
        // Получаем активную программу
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        let html = '';
        
        // Сначала сортируем программы, чтобы утренняя зарядка и активная программа были первыми
        const sortedPrograms = [...window.programData].sort((a, b) => {
            // Утренняя зарядка всегда первая
            if (a.id === 'morning_workout') return -1;
            if (b.id === 'morning_workout') return 1;
            
            // Активная программа вторая
            const isActiveA = activeProgram?.id === a.id;
            const isActiveB = activeProgram?.id === b.id;
            if (isActiveA && !isActiveB) return -1;
            if (!isActiveA && isActiveB) return 1;
            
            // Остальные программы без изменения порядка
            return 0;
        });

        // Теперь перебираем отсортированный массив программ
        sortedPrograms.forEach((program) => {
            const isActive = activeProgram?.id === program.id;
            // Утренняя зарядка не блокируется и не блокирует другие программы
            const isDisabled = program.id !== 'morning_workout' && activeProgram && !isActive && activeProgram.id !== 'morning_workout';
            const durationText = program.duration === 'unlimited' ? 'Бессрочная' : `${program.duration} недель`;

            html += `
                <div class="program-card ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" data-program-id="${program.id}">
                    <div class="program-icon">
                        <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
                    </div>
                    <div class="program-info">
                        <h3>${program.name}</h3>
                        <p>${program.description}</p>
                        <div class="program-meta">
                            <span>
                                <span class="material-symbols-rounded">timer</span>
                                ${durationText}
                            </span>
                            <span>
                                <span class="material-symbols-rounded">calendar_month</span>
                                ${program.workoutsPerWeek} тр/нед
                            </span>
                            <span class="difficulty-badge">
                                ${getDifficultyText(program.difficulty)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Добавляем обработчики для карточек
        document.querySelectorAll('.program-card').forEach(card => {
            card.addEventListener('click', async () => {
                const programId = card.dataset.programId;
                const program = window.programData.find(p => p.id === programId);
                
                if (!card.classList.contains('disabled') && program) {
                    await showProgramDetails(program);
                    tg.HapticFeedback.impactOccurred('light');
                } else if (card.classList.contains('disabled')) {
                    tg.HapticFeedback.notificationOccurred('error');
                    showNotification('Сначала завершите текущую программу', true);
                }
            });
        });

    } catch (error) {
        console.error('Ошибка при отображении программ:', error);
        container.innerHTML = '<div class="no-data">Ошибка при загрузке программ</div>';
    }
}

// Обновляем функцию showProgramDetails
async function showProgramDetails(program) {
    if (!program) return;

    await showPopupSafe({
        title: program.name,
        message: `${program.description}\n\n${program.workoutsPerWeek} тр/нед • ${getDifficultyText(program.difficulty)}\n\nДлительность: ${program.duration} недель`,
        buttons: [
            {
                id: `start_program_${program.id}`,
                type: 'default',
                text: 'Начать программу'
            },
            {
                type: 'cancel',
                text: 'Закрыть'
            }
        ]
    });
}

// Функция для отображения списка тренировок программы
function renderProgramWorkouts(program) {
    const mainContainer = document.querySelector('#mainContainer');
    if (!mainContainer) return;

    mainContainer.innerHTML = `
        <div class="workout-list">
            <div class="workout-list-header">
                <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
                <h2>${program.name}</h2>
            </div>
            <div class="workouts-container">
                ${program.workouts.map((workout, index) => `
                    <div class="workout-day">
                        <div class="workout-day-header">День ${index + 1}</div>
                        <div class="workout-title">${workout.name}</div>
                        <div class="workout-meta">
                            <span>
                                <span class="material-symbols-rounded">timer</span>
                                ${workout.duration} мин
                            </span>
                            <span>
                                <span class="material-symbols-rounded">exercise</span>
                                ${workout.exercises ? workout.exercises.length : 0} упражнений
                            </span>
                        </div>
                        <button class="start-workout-btn" onclick="window.startWorkout('${program.id}', '${workout.id}')">
                            <span class="material-symbols-rounded">play_arrow</span>
                            Начать тренировку
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Функция показа результатов программы
function showProgramResults(programId) {
    const program = programData[programId];
    if (!program) return;

    const resultsInfo = program.results
        .map(result => `✅ ${result}`)
        .join('\n');

    tg.showPopup({
        title: 'Ожидаемые результаты',
        message: resultsInfo,
        buttons: [
            {type: 'default', text: '⬅️ Назад', id: `back_to_main_${programId}`},
            {type: 'default', text: 'Расписание ➜', id: `schedule_${programId}`},
            {type: 'default', text: 'Начать программу', id: `start_program_${programId}`}
        ]
    });
}

// Функция показа расписания программы
async function showProgramSchedule(programId) {
    const program = window.programData[programId];
    if (!program) return;

    // Форматируем расписание в более читаемый вид
    const scheduleMessage = formatScheduleMessage(program);

    await showPopupSafe({
        title: 'Расписание тренировок',
        message: scheduleMessage,
        buttons: [
            {
                type: 'default',
                text: 'Начать программу',
                id: `start_program_${programId}`
            }
        ]
    });
}

// Обновляем обработчик события закрытия попапа
tg.onEvent('popupClosed', async (event) => {
    console.log('Popup closed with event:', event);
    
    if (!event || !event.button_id) return;

    if (event.button_id === 'quit_workout') {
        clearTimers();
        renderProgramCards();
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
    } else if (event.button_id.startsWith('start_program_')) {
        const programId = event.button_id.replace('start_program_', '');
        console.log('Starting program:', programId);
        const program = window.programData.find(p => p.id === programId);
        
        if (!program) {
            console.error('Программа не найдена:', programId);
            showError('Программа не найдена');
            return;
        }

        try {
            // Проверяем наличие профиля перед запуском программы
            const profileData = await getStorageItem('profile')
                .then(data => data ? JSON.parse(data) : null);

            if (!profileData) {
                showError('Пожалуйста, заполните профиль перед началом программы');
                switchTab('profile');
                return;
            }

            // Проверяем наличие тренировок
            if (!program.workouts || program.workouts.length === 0) {
                showError('В программе нет тренировок');
                return;
            }

            // Сохраняем программу как активную
            const saveResult = await setStorageItem('activeProgram', JSON.stringify(program));
            console.log('Program saved as active, result:', saveResult);

            // Если сохранение не удалось, но есть localStorage - продолжаем
            if (!saveResult && !localStorage.getItem('activeProgram')) {
                throw new Error('Не удалось сохранить программу');
            }

            // Отображаем список тренировок программы
            renderProgramWorkouts(program);

            // Добавляем тактильный отклик
            window.tg.HapticFeedback.impactOccurred('medium');
        } catch (error) {
            console.error('Ошибка при запуске программы:', error);
            showError(error.message);
            window.tg.HapticFeedback.notificationOccurred('error');
        }
    }
});

// Добавляем функцию инициализации программы
async function initializeProgram(program) {
    try {
        // Проверяем, нет ли уже активной программы
        const existingProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
            
        if (existingProgram) {
            // Если это та же программа, просто возвращаем её
            if (existingProgram.id === program.id) {
                return existingProgram;
            }
        }

        // Получаем данные профиля
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);

        if (!profileData) {
            throw new Error('Необходимо заполнить профиль перед началом программы');
        }

        // Генерируем план тренировок
        const workouts = await generateWorkoutPlan(program, profileData);
        if (!workouts) {
            throw new Error('Не удалось сгенерировать план тренировок');
        }

        // Создаем новую структуру активной программы
        const activeProgram = {
            ...program,
            startDate: Date.now(),
            workouts: workouts.map(w => ({
                ...w,
                completed: false,
                started: false
            }))
        };

        // Сохраняем программу
        await setStorageItem('activeProgram', JSON.stringify(activeProgram));
        
        console.log('Инициализирована программа:', activeProgram);
        
        return activeProgram;
    } catch (error) {
        console.error('Ошибка при инициализации программы:', error);
        throw error;
    }
}

// Добавляем функцию для загрузки активной программы
async function loadActiveProgram() {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        if (activeProgram) {
            const program = window.programData[activeProgram.id];
            if (program) {
                // Показываем список тренировок активной программы
                showProgramWorkouts(program);
                return;
            }
        }
        
        // Если нет активной программы, показываем список всех программ
        renderProgramCards();
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
        renderProgramCards();
    }
}

// Функция обновления прогресса программы
async function updateProgramProgress(workout, isCompleted) {
    try {
        // Получаем текущую статистику
        const stats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0,
            completedWorkouts: []
            });

        if (isCompleted) {
        // Обновляем статистику
            stats.totalWorkouts++;
            stats.totalCalories += workout.calories;
            stats.totalMinutes += workout.duration;
            stats.completedWorkouts.push({
                date: Date.now(),
                programId: currentProgramId,
                workout: workout
            });

            // Сохраняем обновленную статистику
            await setStorageItem('workoutStats', JSON.stringify(stats));

            // Проверяем завершение программы
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        if (activeProgram) {
                const allWorkouts = activeProgram.workouts.length;
                const completed = activeProgram.workouts.filter(w => w.completed).length;

                if (completed === allWorkouts) {
                    // Программа завершена
                    await showPopupSafe({
                        title: 'Поздравляем! 🎉',
                        message: 'Вы успешно завершили программу тренировок!',
                        buttons: [{
                            type: 'default',
                            text: 'Отлично!'
                        }]
                    });

                    // Очищаем активную программу
                    await setStorageItem('activeProgram', '');
                    
                    // Возвращаемся к списку программ
    renderProgramCards();
                }
            }
        }

        // Обновляем календарь
        updateCalendar();
        // Обновляем статистику
        updateStatistics();

    } catch (error) {
        console.error('Ошибка при обновлении прогресса:', error);
    }
}

// Функция для отображения календаря
function renderCalendar() {
    const calendarHeader = document.querySelector('.calendar-header h2');
    const calendarDays = document.querySelector('.calendar-days');
    if (!calendarHeader || !calendarDays) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Устанавливаем заголовок календаря
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    calendarHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Получаем первый день месяца
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Получаем день недели для первого дня (0 - воскресенье, 1 - понедельник, и т.д.)
    let firstDayOfWeek = firstDay.getDay();
    // Преобразуем воскресенье (0) в 7 для правильного отображения
    firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

    let html = '';
    
    // Добавляем пустые ячейки для дней до начала месяца
    for (let i = 1; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Добавляем дни месяца
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

    // Добавляем обработчики для кнопок навигации
    const prevBtn = document.querySelector('.calendar-nav-btn:first-child');
    const nextBtn = document.querySelector('.calendar-nav-btn:last-child');

    if (prevBtn && nextBtn) {
        prevBtn.onclick = () => navigateCalendar('prev');
        nextBtn.onclick = () => navigateCalendar('next');
    }
}

// Функция для навигации по календарю
function navigateCalendar(direction) {
    const currentDate = new Date();
    if (direction === 'prev') {
        currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    renderCalendar();
    tg.HapticFeedback.impactOccurred('light');
}

// Обновляем функцию switchTab
function switchTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Показываем нужную вкладку
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Активируем соответствующую кнопку
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Дополнительные действия при переключении вкладок
    switch(tabName) {
        case 'stats':
            renderStatistics();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'workouts':
            loadActiveProgram();
            break;
        case 'calendar':
            calendarModule.renderCalendar();
            break;
    }

    // Вибрация при переключении
    if (window.tg) {
        window.tg.HapticFeedback.impactOccurred('light');
    }
}

// Функция для очистки всех данных
async function clearAllData() {
    try {
        // Список ключей для очистки
        const keysToDelete = [
            'profile',
            'activeProgram',
            'workoutStats',
            'weightHistory'
        ];

        // Очищаем данные в CloudStorage и localStorage
        for (const key of keysToDelete) {
            await setStorageItem(key, '');
            localStorage.removeItem(key);
        }

        // Показываем уведомление об успешной очистке
        await showPopupSafe({
            title: 'Готово',
            message: 'Все данные успешно очищены',
            buttons: [{type: 'ok'}]
        });

        // Перезагружаем страницу
        location.reload();
    } catch (error) {
        console.error('Ошибка при очистке данных:', error);
        await showError('Не удалось очистить данные');
    }
}

// Обновляем функцию updateWeightChart
async function updateWeightChart(period = 'week') {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;

    try {
        // Уничтожаем существующий график, если он есть
        if (window.weightChart) {
            window.weightChart.destroy();
            window.weightChart = null;
        }

        // Получаем историю веса
        const weightHistoryStr = await getStorageItem('weightHistory');
        const weightHistory = weightHistoryStr ? JSON.parse(weightHistoryStr) : [];

        if (weightHistory.length === 0) {
            ctx.style.display = 'none';
            ctx.parentElement.innerHTML = '<div class="no-data">Нет данных о весе</div>';
            return;
        }

        ctx.style.display = 'block';

        const now = new Date();
        let startDate = new Date();
        let labels = [];
        let data = [];

        // Определяем диапазон дат для выбранного периода
        switch(period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                    labels.push(d.toLocaleDateString('ru-RU', { weekday: 'short' }));
                    const dayWeight = weightHistory.find(w => 
                        new Date(w.date).toDateString() === d.toDateString()
                    );
                    data.push(dayWeight ? dayWeight.weight : null);
                }
                break;

            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                    labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                    const dayWeight = weightHistory.find(w => 
                        new Date(w.date).toDateString() === d.toDateString()
                    );
                    data.push(dayWeight ? dayWeight.weight : null);
                }
                break;

            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                for(let m = new Date(startDate); m <= now; m.setMonth(m.getMonth() + 1)) {
                    labels.push(m.toLocaleDateString('ru-RU', { month: 'short' }));
                    const monthWeights = weightHistory.filter(w => {
                        const date = new Date(w.date);
                        return date.getMonth() === m.getMonth() && 
                               date.getFullYear() === m.getFullYear();
                    });
                    const avgWeight = monthWeights.length ? 
                        monthWeights.reduce((sum, w) => sum + w.weight, 0) / monthWeights.length : 
                        null;
                    data.push(avgWeight);
                }
                break;
        }

        // Находим минимальный и максимальный вес для настройки шкалы
        const weights = data.filter(w => w !== null);
        const minWeight = Math.min(...weights) - 1;
        const maxWeight = Math.max(...weights) + 1;

        // Создаем новый график
        window.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Вес (кг)',
                    data: data,
                    borderColor: '#40a7e3',
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#40a7e3',
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        min: minWeight,
                        max: maxWeight,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Ошибка при обновлении графика веса:', error);
        ctx.style.display = 'none';
        ctx.parentElement.innerHTML = '<div class="no-data">Ошибка при загрузке данных</div>';
    }
}

// Функция сохранения веса
async function saveWeight(weight) {
    try {
        // Получаем текущую историю весов
        const weightHistoryStr = await getStorageItem('weightHistory');
        const weightHistory = weightHistoryStr ? JSON.parse(weightHistoryStr) : [];
        
        // Добавляем новую запись
        weightHistory.push({
            date: new Date().toISOString(),
            weight: parseFloat(weight)
        });
        
        // Сохраняем обновленную историю
        await setStorageItem('weightHistory', JSON.stringify(weightHistory));
        
        // Обновляем график, если мы на странице статистики
        const statsTab = document.getElementById('stats');
        if (statsTab && statsTab.classList.contains('active')) {
            statisticsModule.updateWeightChart(statisticsModule.currentPeriod || 'week');
        }

        // Добавляем тактильный отклик
        tg.HapticFeedback.impactOccurred('light');
    } catch (error) {
        console.error('Ошибка сохранения веса:', error);
        showNotification('Не удалось сохранить вес', 'error');
    }
}

// Функция для настройки обработчиков оборудования в профиле
function setupProfileEquipmentHandlers() {
    // Обработчики для кнопок места тренировки
    const placeButtons = document.querySelectorAll('.place-btn');
    placeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            saveProfileSettings();
            tg.HapticFeedback.impactOccurred('light');
        });
    });
    // Обработчики для чекбоксов оборудования
    const equipmentCheckboxes = document.querySelectorAll('.equipment-item input[type="checkbox"]');
    equipmentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            saveProfileSettings();
            tg.HapticFeedback.impactOccurred('light');
        });
    });
}

// Функция для отображения статистики
function renderStatistics() {
    getStorageItem('workoutStats')
        .then(data => {
            const stats = data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0,
                completedWorkouts: []
            };

            // Проверяем наличие элементов перед обновлением
            const totalWorkoutsEl = document.querySelector('.total-workouts');
            const totalTimeEl = document.querySelector('.total-time');
            const totalCaloriesEl = document.querySelector('.total-calories');
            const completionRateEl = document.querySelector('.completion-rate');

            if (totalWorkoutsEl) {
                totalWorkoutsEl.textContent = stats.totalWorkouts || 0;
            }
            if (totalTimeEl) {
                totalTimeEl.textContent = `${Math.round(stats.totalMinutes || 0)} мин`;
            }
            if (totalCaloriesEl) {
                totalCaloriesEl.textContent = `${Math.round(stats.totalCalories || 0)} ккал`;
            }
            if (completionRateEl) {
                const completionRate = stats.completedWorkouts?.length > 0 
                    ? Math.round((stats.completedWorkouts.filter(w => w.completed).length / stats.completedWorkouts.length) * 100)
                    : 0;
                completionRateEl.textContent = `${completionRate}%`;
            }

            // Обновляем график веса через модуль статистики
            statisticsModule.updateWeightChart('week');
            
            // Добавляем вызов renderTips
            renderTips();
        })
        .catch(error => {
            console.error('Ошибка при загрузке статистики:', error);
            showError('Не удалось загрузить статистику');
        });
}

async function initializeDefaultPrograms() {
    try {
        console.log('Starting program initialization...');
        const existingPrograms = await getStorageItem('programs_meta');
        console.log('Existing programs meta:', existingPrograms);
        
        if (!existingPrograms) {
            console.log('No existing programs found, initializing defaults...');
            const defaultPrograms = [
                {
                    id: 'weight_loss',
                    name: 'Снижение веса',
                    title: 'Снижение веса',
                    description: 'Программа для снижения веса и улучшения метаболизма',
                    icon: 'monitor_weight',
                    difficulty: 'beginner',
                    duration: 8,
                    schedule: '3-4 тр/нед',
                    workoutsPerWeek: 3,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'Кардио + Сила',
                            description: 'Сочетание кардио и силовых упражнений',
                            duration: 45,
                            type: 'cardio_strength',
                            exercises: [
                                {
                                    id: 'warmup_1',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    description: 'Легкая разминка для подготовки к тренировке',
                                    duration: 300,
                                    sets: 1,
                                    restBetweenSets: 0
                                },
                                {
                                    id: 'jumping_jacks',
                                    name: 'Прыжки Jumping Jack',
                                    type: 'cardio',
                                    description: 'Прыжки с разведением рук и ног',
                                    duration: 60,
                                    sets: 3,
                                    restBetweenSets: 30
                                },
                                {
                                    id: 'squats',
                                    name: 'Приседания',
                                    type: 'strength',
                                    description: 'Классические приседания',
                                    reps: 15,
                                    sets: 3,
                                    restBetweenSets: 60
                                },
                                {
                                    id: 'pushups',
                                    name: 'Отжимания',
                                    type: 'strength',
                                    description: 'Классические отжимания от пола',
                                    reps: 10,
                                    sets: 3,
                                    restBetweenSets: 60
                                },
                                {
                                    id: 'plank',
                                    name: 'Планка',
                                    type: 'static',
                                    description: 'Удержание планки',
                                    duration: 30,
                                    sets: 3,
                                    restBetweenSets: 30
                                },
                                {
                                    id: 'cooldown_1',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    description: 'Легкая растяжка для завершения тренировки',
                                    duration: 300,
                                    sets: 1,
                                    restBetweenSets: 0
                                }
                            ]
                        },
                        {
                            id: 'workout_2',
                            name: 'ВИИТ тренировка',
                            description: 'Высокоинтенсивная интервальная тренировка',
                            duration: 30,
                            type: 'hiit',
                            exercises: []
                        },
                        {
                            id: 'workout_3',
                            name: 'Круговая тренировка',
                            description: 'Круговая тренировка для сжигания жира',
                            duration: 40,
                            type: 'circuit',
                            exercises: []
                        }
                    ]
                },
                {
                    id: 'endurance',
                    name: 'Выносливость',
                    title: 'Выносливость',
                    description: 'Программа для развития общей выносливости',
                    icon: 'directions_run',
                    difficulty: 'beginner',
                    duration: 6,
                    schedule: '4-5 тр/нед',
                    workoutsPerWeek: 4,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'ВИИТ тренировка',
                            description: 'Высокоинтенсивная интервальная тренировка',
                            duration: 30,
                            type: 'hiit',
                            exercises: []
                        },
                        {
                            id: 'workout_2',
                            name: 'Кардио выносливость',
                            description: 'Развитие общей выносливости',
                            duration: 45,
                            type: 'cardio',
                            exercises: []
                        },
                        {
                            id: 'workout_3',
                            name: 'Круговая тренировка',
                            description: 'Комплексная тренировка на все тело',
                            duration: 40,
                            type: 'circuit',
                            exercises: []
                        }
                    ]
                },
                {
                    id: 'maintenance',
                    name: 'Поддержание формы',
                    title: 'Поддержание формы',
                    description: 'Программа для поддержания текущей формы и тонуса мышц',
                    icon: 'sports_gymnastics',
                    difficulty: 'beginner',
                    duration: 4,
                    schedule: '3-4 тр/нед',
                    workoutsPerWeek: 3,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'Общая тренировка',
                            description: 'Комплексная тренировка на все тело',
                            duration: 40,
                            type: 'general',
                            exercises: [
                                {
                                    id: 'warmup_1',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Комплексная разминка всего тела',
                                    sequence: [
                                        'Вращения головой',
                                        'Круговые движения руками',
                                        'Наклоны в стороны',
                                        'Круговые движения тазом',
                                        'Разминка коленей и голеностопов'
                                    ]
                                },
                                {
                                    id: 'ex_1',
                                    name: 'Приседания с собственным весом',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 15,
                                    rest: 60,
                                    description: 'Классические приседания с акцентом на технику',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_2',
                                    name: 'Отжимания с колен',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 12,
                                    rest: 60,
                                    description: 'Отжимания с опорой на колени для контроля нагрузки',
                                    muscleGroups: ['chest', 'shoulders', 'triceps']
                                },
                                {
                                    id: 'ex_3',
                                    name: 'Планка с подъемом рук',
                                    type: 'core',
                                    sets: 3,
                                    duration: 30,
                                    rest: 45,
                                    description: 'Удержание планки с поочередным подниманием рук',
                                    muscleGroups: ['core', 'shoulders']
                                },
                                {
                                    id: 'ex_4',
                                    name: 'Обратные отжимания от стула',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 12,
                                    rest: 60,
                                    description: 'Отжимания для трицепса с опорой на стул',
                                    muscleGroups: ['triceps']
                                },
                                {
                                    id: 'cooldown_1',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка основных групп мышц',
                                    sequence: [
                                        'Растяжка квадрицепсов',
                                        'Растяжка груди и плеч',
                                        'Растяжка спины',
                                        'Растяжка трицепсов'
                                    ]
                                }
                            ]
                        },
                        {
                            id: 'workout_2',
                            name: 'Кардио + Сила',
                            description: 'Сочетание кардио и силовых упражнений',
                            duration: 35,
                            type: 'cardio_strength',
                            exercises: [
                                {
                                    id: 'warmup_2',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Кардио разминка',
                                    sequence: [
                                        'Ходьба на месте',
                                        'Легкий бег на месте',
                                        'Прыжки на месте',
                                        'Разминка суставов'
                                    ]
                                },
                                {
                                    id: 'ex_5',
                                    name: 'Прыжки с высоким подъемом колен',
                                    type: 'cardio',
                                    sets: 3,
                                    duration: 30,
                                    rest: 45,
                                    description: 'Прыжки на месте с высоким подъемом колен',
                                    muscleGroups: ['legs', 'cardio']
                                },
                                {
                                    id: 'ex_6',
                                    name: 'Выпады на месте',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 12,
                                    rest: 60,
                                    description: 'Выпады на месте с чередованием ног',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_7',
                                    name: 'Скручивания',
                                    type: 'core',
                                    sets: 3,
                                    reps: 20,
                                    rest: 45,
                                    description: 'Классические скручивания на пресс',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'ex_8',
                                    name: 'Бег на месте',
                                    type: 'cardio',
                                    sets: 2,
                                    duration: 60,
                                    rest: 60,
                                    description: 'Интенсивный бег на месте',
                                    muscleGroups: ['legs', 'cardio']
                                },
                                {
                                    id: 'cooldown_2',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Восстановление дыхания и растяжка',
                                    sequence: [
                                        'Глубокое дыхание',
                                        'Растяжка ног',
                                        'Растяжка корпуса',
                                        'Расслабление мышц'
                                    ]
                                }
                            ]
                        },
                        {
                            id: 'workout_3',
                            name: 'Функциональная тренировка',
                            description: 'Упражнения на функциональную силу и гибкость',
                            duration: 45,
                            type: 'functional',
                            exercises: [
                                {
                                    id: 'warmup_3',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Динамическая разминка',
                                    sequence: [
                                        'Круговые движения суставами',
                                        'Наклоны и повороты',
                                        'Легкие прыжки',
                                        'Разогрев мышц'
                                    ]
                                },
                                {
                                    id: 'ex_9',
                                    name: 'Берпи без прыжка',
                                    type: 'functional',
                                    sets: 3,
                                    reps: 8,
                                    rest: 60,
                                    description: 'Модифицированные берпи для поддержания формы',
                                    muscleGroups: ['full_body']
                                },
                                {
                                    id: 'ex_10',
                                    name: 'Мостик на лопатках',
                                    type: 'flexibility',
                                    sets: 3,
                                    duration: 30,
                                    rest: 45,
                                    description: 'Удержание мостика с опорой на лопатки',
                                    muscleGroups: ['back', 'core']
                                },
                                {
                                    id: 'ex_11',
                                    name: 'Боковая планка',
                                    type: 'core',
                                    sets: 3,
                                    duration: 30,
                                    rest: 45,
                                    description: 'Удержание боковой планки на каждую сторону',
                                    muscleGroups: ['core', 'obliques']
                                },
                                {
                                    id: 'ex_12',
                                    name: 'Воздушные приседания',
                                    type: 'functional',
                                    sets: 3,
                                    reps: 15,
                                    rest: 60,
                                    description: 'Приседания с задержкой в нижней точке',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'cooldown_3',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Глубокая растяжка',
                                    sequence: [
                                        'Растяжка позвоночника',
                                        'Растяжка боковых мышц',
                                        'Растяжка ног',
                                        'Расслабление всего тела'
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 'beginner_strength',
                    name: 'Базовая сила',
                    description: 'Программа для начинающих, направленная на развитие силы и мышечной массы',
                    icon: 'fitness_center',
                    difficulty: 'beginner',
                    duration: 4,
                    workoutsPerWeek: 3,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'Тренировка A (Верх)',
                            description: 'Фокус на верхнюю часть тела',
                            duration: 45,
                            type: 'strength',
                            exercises: [
                                {
                                    id: 'warmup_1',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Легкая разминка всего тела'
                                },
                                {
                                    id: 'ex_1',
                                    name: 'Отжимания',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 10,
                                    rest: 60,
                                    description: 'Классические отжимания от пола',
                                    muscleGroups: ['chest', 'shoulders', 'triceps']
                                },
                                {
                                    id: 'ex_2',
                                    name: 'Тяга с упором в стену',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 12,
                                    rest: 60,
                                    description: 'Тяга для укрепления мышц спины',
                                    muscleGroups: ['back', 'biceps']
                                },
                                {
                                    id: 'ex_3',
                                    name: 'Планка',
                                    type: 'static',
                                    sets: 3,
                                    duration: 30,
                                    rest: 45,
                                    description: 'Удержание планки',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'cooldown_1',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка мышц верхней части тела'
                                }
                            ]
                        },
                        {
                            id: 'workout_2',
                            name: 'Тренировка B (Низ)',
                            description: 'Фокус на нижнюю часть тела',
                            duration: 45,
                            exercises: [
                                {
                                    id: 'warmup_2',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Разминка с акцентом на ноги'
                                },
                                {
                                    id: 'ex_4',
                                    name: 'Приседания',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 15,
                                    rest: 60,
                                    description: 'Классические приседания',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_5',
                                    name: 'Выпады',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 10,
                                    rest: 60,
                                    description: 'Выпады на каждую ногу',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_6',
                                    name: 'Подъемы на носки',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 20,
                                    rest: 45,
                                    description: 'Подъемы на носки стоя',
                                    muscleGroups: ['calves']
                                },
                                {
                                    id: 'cooldown_2',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка мышц ног'
                                }
                            ]
                        },
                        {
                            id: 'workout_3',
                            name: 'Тренировка C (Всё тело)',
                            description: 'Комплексная тренировка на все тело',
                            duration: 45,
                            exercises: [
                                {
                                    id: 'warmup_3',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Общая разминка'
                                },
                                {
                                    id: 'ex_7',
                                    name: 'Берпи',
                                    type: 'cardio',
                                    sets: 3,
                                    reps: 8,
                                    rest: 60,
                                    description: 'Комплексное упражнение',
                                    muscleGroups: ['full_body']
                                },
                                {
                                    id: 'ex_8',
                                    name: 'Скручивания',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 15,
                                    rest: 45,
                                    description: 'Упражнение на пресс',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'ex_9',
                                    name: 'Обратные отжимания от стула',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 12,
                                    rest: 60,
                                    description: 'Отжимания для трицепса',
                                    muscleGroups: ['triceps', 'shoulders']
                                },
                                {
                                    id: 'cooldown_3',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Общая растяжка'
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 'cardio_endurance',
                    name: 'Кардио и выносливость',
                    description: 'Программа для улучшения выносливости и сжигания жира',
                    icon: 'directions_run',
                    difficulty: 'intermediate',
                    duration: 6,
                    workoutsPerWeek: 4,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'ВИИТ тренировка',
                            description: 'Высокоинтенсивная интервальная тренировка',
                            duration: 30,
                            type: 'hiit',
                            exercises: [
                                {
                                    id: 'warmup_1',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Легкая разминка всего тела'
                                },
                                {
                                    id: 'ex_1',
                                    name: 'Берпи',
                                    type: 'hiit',
                                    sets: 4,
                                    reps: 10,
                                    rest: 30,
                                    description: 'Интенсивное упражнение на все тело',
                                    muscleGroups: ['full_body']
                                },
                                {
                                    id: 'ex_2',
                                    name: 'Прыжки с высоким подъемом колен',
                                    type: 'cardio',
                                    sets: 4,
                                    duration: 30,
                                    rest: 30,
                                    description: 'Прыжки на месте с высоким подъемом колен',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_3',
                                    name: 'Скалолаз',
                                    type: 'hiit',
                                    sets: 4,
                                    duration: 45,
                                    rest: 30,
                                    description: 'Динамичное упражнение для пресса',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'cooldown_1',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка и восстановление дыхания'
                                }
                            ]
                        },
                        {
                            id: 'workout_2',
                            name: 'Круговая тренировка',
                            description: 'Комплексная тренировка на все тело',
                            duration: 40,
                            type: 'circuit',
                            exercises: [
                                {
                                    id: 'warmup_2',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Разогрев мышц и суставов'
                                },
                                {
                                    id: 'ex_4',
                                    name: 'Приседания с выпрыгиванием',
                                    type: 'cardio',
                                    sets: 3,
                                    reps: 12,
                                    rest: 45,
                                    description: 'Приседания с прыжком вверх',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_5',
                                    name: 'Отжимания',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 15,
                                    rest: 45,
                                    description: 'Классические отжимания от пола',
                                    muscleGroups: ['chest', 'shoulders']
                                },
                                {
                                    id: 'ex_6',
                                    name: 'Планка с переходом в боковую',
                                    type: 'core',
                                    sets: 3,
                                    duration: 45,
                                    rest: 45,
                                    description: 'Планка с поворотами',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'cooldown_2',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка всех групп мышц'
                                }
                            ]
                        },
                        {
                            id: 'workout_3',
                            name: 'Кардио выносливость',
                            description: 'Тренировка для развития выносливости',
                            duration: 45,
                            type: 'cardio',
                            exercises: [
                                {
                                    id: 'warmup_3',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Легкая разминка'
                                },
                                {
                                    id: 'ex_7',
                                    name: 'Бег на месте с высоким подъемом колен',
                                    type: 'cardio',
                                    sets: 4,
                                    duration: 60,
                                    rest: 30,
                                    description: 'Интенсивный бег на месте',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_8',
                                    name: 'Прыжки со скакалкой',
                                    type: 'cardio',
                                    sets: 4,
                                    duration: 60,
                                    rest: 30,
                                    description: 'Прыжки на скакалке',
                                    muscleGroups: ['legs', 'cardio']
                                },
                                {
                                    id: 'ex_9',
                                    name: 'Выпады с чередованием ног',
                                    type: 'cardio',
                                    sets: 4,
                                    duration: 60,
                                    rest: 30,
                                    description: 'Динамичные выпады',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'cooldown_3',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка и восстановление'
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 'morning_workout',
                    name: 'Утренняя зарядка',
                    description: 'Легкая зарядка для бодрого начала каждого дня',
                    icon: 'wb_sunny',
                    difficulty: 'beginner',
                    duration: 'unlimited',
                    workoutsPerWeek: 7,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'morning_1',
                            name: 'Утренний комплекс',
                            description: 'Разминка всего тела, растяжка и легкие упражнения для заряда энергией',
                            duration: 15,
                            type: 'morning',
                            exercises: [
                                {
                                    id: 'warmup_1',
                                    name: 'Разминка суставов',
                                    type: 'warmup',
                                    description: 'Мягкие круговые движения в суставах сверху вниз:\n- Шея: наклоны и повороты\n- Плечи: круговые движения\n- Локти и запястья\n- Тазобедренные суставы\n- Колени и голеностопы',
                                    duration: 180,
                                    sets: 1,
                                    restBetweenSets: 0
                                },
                                {
                                    id: 'ex_1',
                                    name: 'Потягивания',
                                    type: 'stretch',
                                    description: 'Потягивания с глубоким дыханием',
                                    sets: 2,
                                    reps: 8,
                                    restBetweenSets: 20,
                                    muscleGroups: ['full_body']
                                },
                                {
                                    id: 'ex_2',
                                    name: 'Наклоны в стороны',
                                    type: 'stretch',
                                    description: 'Наклоны корпуса влево и вправо с поднятой рукой',
                                    sets: 2,
                                    reps: 10,
                                    restBetweenSets: 20,
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'ex_3',
                                    name: 'Круговые вращения руками',
                                    type: 'warmup',
                                    description: 'Вращения руками вперед и назад',
                                    sets: 2,
                                    reps: 10,
                                    restBetweenSets: 20,
                                    muscleGroups: ['shoulders', 'arms']
                                },
                                {
                                    id: 'ex_4',
                                    name: 'Наклоны к ногам',
                                    type: 'stretch',
                                    description: 'Наклоны к прямым ногам из положения стоя',
                                    sets: 2,
                                    reps: 10,
                                    restBetweenSets: 20,
                                    muscleGroups: ['legs', 'back']
                                },
                                {
                                    id: 'ex_5',
                                    name: 'Планка с подъемом рук',
                                    type: 'strength',
                                    description: 'Планка на предплечьях с поочередным подъемом рук',
                                    duration: 30,
                                    sets: 2,
                                    restBetweenSets: 30,
                                    muscleGroups: ['core', 'shoulders']
                                }
                            ]
                        }
                    ],
                    features: [
                        'Мягкая разминка суставов',
                        'Легкие кардио упражнения',
                        'Растяжка основных мышц',
                        'Дыхательные упражнения'
                    ],
                    benefits: [
                        'Улучшение кровообращения',
                        'Повышение гибкости',
                        'Заряд энергией на весь день',
                        'Ускорение метаболизма'
                    ]
                },
                {
                    id: 'weight_loss_intensive',
                    name: 'Интенсивное похудение',
                    description: 'Программа для быстрого и эффективного снижения веса',
                    icon: 'monitor_weight',
                    difficulty: 'intermediate',
                    duration: 6,
                    workoutsPerWeek: 5,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'weight_loss_1',
                            name: 'Жиросжигающая тренировка',
                            description: 'Интенсивная тренировка для сжигания жира',
                            duration: 40,
                            type: 'hiit',
                            exercises: [
                                {
                                    id: 'warmup_1',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Легкая разминка всего тела'
                                },
                                {
                                    id: 'ex_1',
                                    name: 'Джампинг джек',
                                    type: 'cardio',
                                    sets: 4,
                                    duration: 45,
                                    rest: 30,
                                    description: 'Прыжки с разведением рук и ног',
                                    muscleGroups: ['full_body']
                                },
                                {
                                    id: 'ex_2',
                                    name: 'Берпи',
                                    type: 'hiit',
                                    sets: 4,
                                    reps: 10,
                                    rest: 30,
                                    description: 'Комплексное упражнение на все тело',
                                    muscleGroups: ['full_body']
                                },
                                {
                                    id: 'ex_3',
                                    name: 'Скалолаз',
                                    type: 'hiit',
                                    sets: 4,
                                    duration: 45,
                                    rest: 30,
                                    description: 'Динамичное упражнение для пресса',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'ex_4',
                                    name: 'Приседания с выпрыгиванием',
                                    type: 'hiit',
                                    sets: 4,
                                    reps: 12,
                                    rest: 30,
                                    description: 'Приседания с прыжком вверх',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'cooldown_1',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка и восстановление дыхания'
                                }
                            ]
                        },
                        {
                            id: 'weight_loss_2',
                            name: 'Кардио + Силовая',
                            description: 'Комбинированная тренировка для ускорения метаболизма',
                            duration: 45,
                            type: 'cardio_strength',
                            exercises: [
                                {
                                    id: 'warmup_2',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Разогрев мышц и суставов'
                                },
                                {
                                    id: 'ex_5',
                                    name: 'Бег на месте с высоким подъемом колен',
                                    type: 'cardio',
                                    sets: 3,
                                    duration: 60,
                                    rest: 30,
                                    description: 'Интенсивный бег на месте',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_6',
                                    name: 'Отжимания',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 15,
                                    rest: 45,
                                    description: 'Классические отжимания от пола',
                                    muscleGroups: ['chest', 'shoulders']
                                },
                                {
                                    id: 'ex_7',
                                    name: 'Приседания',
                                    type: 'strength',
                                    sets: 3,
                                    reps: 20,
                                    rest: 45,
                                    description: 'Классические приседания',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_8',
                                    name: 'Планка',
                                    type: 'strength',
                                    sets: 3,
                                    duration: 45,
                                    rest: 45,
                                    description: 'Статическая планка',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'cooldown_2',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка всех групп мышц'
                                }
                            ]
                        },
                        {
                            id: 'weight_loss_3',
                            name: 'Табата',
                            description: 'Высокоинтенсивная интервальная тренировка',
                            duration: 25,
                            type: 'tabata',
                            exercises: [
                                {
                                    id: 'warmup_3',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Легкая разминка'
                                },
                                {
                                    id: 'ex_9',
                                    name: 'Прыжки с высоким подъемом колен',
                                    type: 'tabata',
                                    sets: 8,
                                    duration: 20,
                                    rest: 10,
                                    description: 'Интенсивные прыжки',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_10',
                                    name: 'Выпады с чередованием ног',
                                    type: 'tabata',
                                    sets: 8,
                                    duration: 20,
                                    rest: 10,
                                    description: 'Динамичные выпады',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_11',
                                    name: 'Скручивания',
                                    type: 'tabata',
                                    sets: 8,
                                    duration: 20,
                                    rest: 10,
                                    description: 'Упражнение на пресс',
                                    muscleGroups: ['core']
                                },
                                {
                                    id: 'cooldown_3',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка и восстановление'
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 'advanced_strength',
                    name: 'Продвинутая сила',
                    description: 'Программа для опытных атлетов, нацеленная на максимальную силу',
                    icon: 'exercise',
                    difficulty: 'advanced',
                    duration: 8,
                    workoutsPerWeek: 5,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'strength_1',
                            name: 'Сила верха тела',
                            description: 'Интенсивная тренировка верхней части тела',
                            duration: 60,
                            type: 'strength',
                            exercises: [
                                {
                                    id: 'warmup_1',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 5,
                                    description: 'Разогрев мышц и суставов верхней части тела'
                                },
                                {
                                    id: 'ex_1',
                                    name: 'Отжимания с весом',
                                    type: 'strength',
                                    sets: 5,
                                    reps: 12,
                                    rest: 90,
                                    description: 'Отжимания с дополнительным весом или усложненные варианты',
                                    muscleGroups: ['chest', 'shoulders', 'triceps']
                                },
                                {
                                    id: 'ex_2',
                                    name: 'Подтягивания с весом',
                                    type: 'strength',
                                    sets: 5,
                                    reps: 8,
                                    rest: 120,
                                    description: 'Подтягивания с утяжелением',
                                    muscleGroups: ['back', 'biceps']
                                },
                                {
                                    id: 'ex_3',
                                    name: 'Отжимания на брусьях',
                                    type: 'strength',
                                    sets: 4,
                                    reps: 15,
                                    rest: 90,
                                    description: 'Отжимания на параллельных брусьях',
                                    muscleGroups: ['chest', 'triceps']
                                },
                                {
                                    id: 'ex_4',
                                    name: 'Планка на одной руке',
                                    type: 'static',
                                    sets: 3,
                                    duration: 45,
                                    rest: 60,
                                    description: 'Удержание планки с поочередным подниманием рук',
                                    muscleGroups: ['core', 'shoulders']
                                },
                                {
                                    id: 'cooldown_1',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 5,
                                    description: 'Растяжка мышц верхней части тела'
                                }
                            ]
                        },
                        {
                            id: 'strength_2',
                            name: 'Сила ног',
                            description: 'Мощная тренировка нижней части тела',
                            duration: 65,
                            type: 'strength',
                            exercises: [
                                {
                                    id: 'warmup_2',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 7,
                                    description: 'Тщательный разогрев суставов и мышц ног'
                                },
                                {
                                    id: 'ex_5',
                                    name: 'Приседания с выпрыгиванием',
                                    type: 'strength',
                                    sets: 5,
                                    reps: 10,
                                    rest: 120,
                                    description: 'Глубокие приседания с мощным выпрыгиванием вверх',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_6',
                                    name: 'Болгарские сплит-приседания',
                                    type: 'strength',
                                    sets: 4,
                                    reps: 12,
                                    rest: 90,
                                    description: 'Приседания на одной ноге с задней ногой на возвышении',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_7',
                                    name: 'Прыжки в длину',
                                    type: 'power',
                                    sets: 4,
                                    reps: 8,
                                    rest: 120,
                                    description: 'Максимально длинные прыжки с места',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'ex_8',
                                    name: 'Икроножные подъемы',
                                    type: 'strength',
                                    sets: 4,
                                    reps: 20,
                                    rest: 60,
                                    description: 'Подъемы на носки с дополнительным весом',
                                    muscleGroups: ['calves']
                                },
                                {
                                    id: 'cooldown_2',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 8,
                                    description: 'Глубокая растяжка мышц ног'
                                }
                            ]
                        },
                        {
                            id: 'strength_3',
                            name: 'Взрывная сила',
                            description: 'Тренировка на развитие взрывной силы',
                            duration: 55,
                            type: 'power',
                            exercises: [
                                {
                                    id: 'warmup_3',
                                    name: 'Разминка',
                                    type: 'warmup',
                                    duration: 8,
                                    description: 'Динамическая разминка всего тела'
                                },
                                {
                                    id: 'ex_9',
                                    name: 'Взрывные отжимания',
                                    type: 'power',
                                    sets: 4,
                                    reps: 8,
                                    rest: 90,
                                    description: 'Отжимания с отрывом рук от пола',
                                    muscleGroups: ['chest', 'shoulders', 'triceps']
                                },
                                {
                                    id: 'ex_10',
                                    name: 'Бурпи с подтягиванием',
                                    type: 'power',
                                    sets: 4,
                                    reps: 6,
                                    rest: 120,
                                    description: 'Бурпи с переходом в подтягивание',
                                    muscleGroups: ['full_body']
                                },
                                {
                                    id: 'ex_11',
                                    name: 'Выпрыгивания из приседа',
                                    type: 'power',
                                    sets: 5,
                                    reps: 10,
                                    rest: 90,
                                    description: 'Максимально высокие выпрыгивания из приседа',
                                    muscleGroups: ['legs']
                                },
                                {
                                    id: 'cooldown_3',
                                    name: 'Заминка',
                                    type: 'cooldown',
                                    duration: 7,
                                    description: 'Растяжка всех групп мышц'
                                }
                            ]
                        }
                    ]
                }
            ];

            console.log('Default programs before chunking:', defaultPrograms);

            // Сохраняем программы чанками
            const chunkSize = 1; // Размер чанка
            const chunks = [];
            
            // Разбиваем на чанки
            for (let i = 0; i < defaultPrograms.length; i += chunkSize) {
                const chunk = defaultPrograms.slice(i, i + chunkSize);
                chunks.push(chunk);
            }
            
            console.log('Created chunks:', chunks);

            // Сохраняем каждый чанк
            for (let i = 0; i < chunks.length; i++) {
                console.log(`Saving chunk ${i}:`, chunks[i]);
                await setStorageItem(`programs_chunk_${i}`, JSON.stringify(chunks[i]));
            }
            
            // Сохраняем метаданные
            const meta = {
                totalChunks: chunks.length,
                totalPrograms: defaultPrograms.length
            };
            console.log('Saving meta:', meta);
            await setStorageItem('programs_meta', JSON.stringify(meta));

            // Сохраняем программы в глобальной переменной
            window.programData = defaultPrograms;
            console.log('Programs initialized:', window.programData);
        } else {
            console.log('Loading existing programs from chunks...');
            const meta = JSON.parse(existingPrograms);
            console.log('Parsed meta:', meta);
            
            const programs = [];
            
            for (let i = 0; i < meta.totalChunks; i++) {
                console.log(`Loading chunk ${i}...`);
                const chunk = await getStorageItem(`programs_chunk_${i}`);
                console.log(`Loaded chunk ${i}:`, chunk);
                if (chunk) {
                    const parsedChunk = JSON.parse(chunk);
                    console.log(`Parsed chunk ${i}:`, parsedChunk);
                    programs.push(...parsedChunk);
                }
            }
            
            window.programData = programs;
            console.log('Loaded all programs:', window.programData);
        }
    } catch (error) {
        console.error('Ошибка при инициализации программ:', error);
        showError('Не удалось загрузить программы тренировок');
    }
}

function getDifficultyText(difficulty) {
    switch (difficulty) {
        case 'beginner':
            return 'Начальный';
        case 'intermediate':
            return 'Средний';
        case 'advanced':
            return 'Продвинутый';
        default:
            return 'Начальный';
    }
}

async function renderTips() {
    const tipsContainer = document.querySelector('.tips-list');
    if (!tipsContainer) return;

    try {
        // Получаем данные профиля и статистику
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);

        const stats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : null);

        const tips = [];

        // Базовые советы (всегда показываются)
                    tips.push({
            icon: 'water_drop',
            title: 'Пейте больше воды',
            text: 'Поддерживайте водный баланс. Рекомендуется выпивать 30мл воды на кг веса тела.'
                    });

                    tips.push({
            icon: 'schedule',
            title: 'Регулярность важна',
            text: 'Тренируйтесь регулярно, даже если это будут короткие тренировки. Регулярность важнее интенсивности.'
        });

        // Советы на основе профиля
        if (profileData) {
            if (profileData.level === 'beginner') {
                tips.push({
                    icon: 'trending_up',
                    title: 'Начните с малого',
                    text: 'Не перегружайте себя в начале. Постепенно увеличивайте нагрузку и длительность тренировок.'
                });
            }

            if (profileData.goal === 'weight_loss') {
                tips.push({
                    icon: 'nutrition',
                    title: 'Следите за питанием',
                    text: 'Для снижения веса важно создать дефицит калорий. Комбинируйте тренировки с правильным питанием.'
                });
            }

            if (profileData.goal === 'muscle_gain') {
                tips.push({
                    icon: 'restaurant',
                    title: 'Белок важен',
                    text: 'Для набора мышечной массы употребляйте достаточно белка - 1.6-2.2г на кг веса тела.'
                });
            }
        }

        // Советы на основе статистики
        if (stats) {
            if (stats.totalWorkouts === 0) {
        tips.push({
                    icon: 'fitness_center',
                    title: 'Начните свой путь',
                    text: 'Выберите программу тренировок, соответствующую вашему уровню и целям.'
                });
            } else if (stats.totalWorkouts > 0 && stats.totalWorkouts < 5) {
                tips.push({
                    icon: 'emoji_events',
                    title: 'Отличное начало!',
                    text: 'Вы уже сделали первый шаг. Продолжайте в том же духе!'
                });
            }
        }

        // Ограничиваем количество советов до 5
        const finalTips = tips.slice(0, 5);

        // Очищаем контейнер
        tipsContainer.innerHTML = '';

        // Добавляем советы с анимацией
        finalTips.forEach((tip, index) => {
            const tipElement = document.createElement('div');
            tipElement.className = 'tip-card';
            tipElement.innerHTML = `
                <div class="tip-icon">
                    <span class="material-symbols-rounded">${tip.icon}</span>
                </div>
                <div class="tip-content">
            <h3>${tip.title}</h3>
            <p>${tip.text}</p>
        </div>
    `;

            tipsContainer.appendChild(tipElement);

            // Добавляем анимацию появления с задержкой
    setTimeout(() => {
                tipElement.classList.add('visible');
            }, index * 100);
        });

    } catch (error) {
        console.error('Ошибка при отображении советов:', error);
        tipsContainer.innerHTML = '<div class="no-data">Не удалось загрузить советы</div>';
    }
}

async function generateWorkoutPlan(program, profileData) {
    try {
        if (!program || !profileData) {
            console.error('Отсутствуют необходимые данные:', { program, profileData });
            return null;
        }

        // Проверяем наличие базы упражнений
        if (!window.exercisesDB || !window.exercisesDB.exercises) {
            console.error('База упражнений не загружена');
            return null;
        }

        const exercises = window.exercisesDB.exercises;
        const workouts = [];

        // Определяем базовые параметры на основе уровня подготовки
        const level = profileData.level || 'beginner';
        const setsPerExercise = {
            'beginner': { min: 2, max: 3 },
            'intermediate': { min: 3, max: 4 },
            'advanced': { min: 4, max: 5 }
        }[level] || { min: 2, max: 3 };

        const repsPerSet = {
            'beginner': { min: 8, max: 12 },
            'intermediate': { min: 10, max: 15 },
            'advanced': { min: 12, max: 20 }
        }[level] || { min: 8, max: 12 };

        // Подбираем упражнения в зависимости от цели
        const goal = profileData.goal || 'general';
        const targetMuscleGroups = {
            'weight_loss': ['legs', 'back', 'chest', 'core'],
            'muscle_gain': ['chest', 'back', 'legs', 'shoulders', 'arms'],
            'endurance': ['legs', 'core', 'back', 'cardio'],
            'general': ['legs', 'back', 'chest', 'core']
        }[goal] || ['legs', 'back', 'chest', 'core'];

        // Фильтруем упражнения по доступному оборудованию
        const availableEquipment = Array.isArray(profileData.equipment) ? profileData.equipment : [];
        const workoutPlaces = Array.isArray(profileData.workoutPlaces) ? profileData.workoutPlaces : ['home'];

        // Проверяем наличие тренировок в программе
        if (!Array.isArray(program.workouts)) {
            console.error('В программе отсутствуют тренировки');
            return null;
        }

        for (const workout of program.workouts) {
            const workoutExercises = [];
            const usedMuscleGroups = new Set();
            const exercisesPerWorkout = level === 'beginner' ? 5 : 
                                      level === 'intermediate' ? 7 : 9;

            // Подбираем упражнения для тренировки
            for (let i = 0; i < exercisesPerWorkout; i++) {
                // Выбираем мышечную группу
                const availableMuscleGroups = targetMuscleGroups.filter(group => 
                    !usedMuscleGroups.has(group) || usedMuscleGroups.size >= targetMuscleGroups.length
                );
                
                if (availableMuscleGroups.length === 0) continue;
                
                const muscleGroup = availableMuscleGroups[Math.floor(Math.random() * availableMuscleGroups.length)];

                // Фильтруем подходящие упражнения
                const suitableExercises = Object.values(exercises).filter(exercise => {
                    if (!exercise || !Array.isArray(exercise.muscleGroups)) return false;

                    const hasRequiredEquipment = !exercise.equipment || 
                        exercise.equipment.every(eq => availableEquipment.includes(eq));
                    const suitablePlace = !exercise.place || workoutPlaces.includes(exercise.place);
                    const matchesDifficulty = (exercise.difficulty || 1) <= 
                        (level === 'beginner' ? 1 : 
                         level === 'intermediate' ? 2 : 3);
                    const matchesMuscleGroup = exercise.muscleGroups.includes(muscleGroup);

                    return hasRequiredEquipment && suitablePlace && matchesDifficulty && matchesMuscleGroup;
                });

                if (suitableExercises.length > 0) {
                    const exercise = suitableExercises[Math.floor(Math.random() * suitableExercises.length)];
                    const sets = Math.floor(Math.random() * (setsPerExercise.max - setsPerExercise.min + 1)) + setsPerExercise.min;
                    const reps = Math.floor(Math.random() * (repsPerSet.max - repsPerSet.min + 1)) + repsPerSet.min;

                    workoutExercises.push({
                        id: exercise.id || `exercise_${i}`,
                        name: exercise.name || 'Упражнение',
                        sets: sets,
                        reps: reps,
                        rest: goal === 'endurance' ? 30 : 
                              goal === 'weight_loss' ? 45 : 60,
                        type: exercise.type || 'strength',
                        equipment: exercise.equipment || [],
                        description: exercise.description || '',
                        image: exercise.image || ''
                    });

                    usedMuscleGroups.add(muscleGroup);
                }
            }

            // Добавляем разминку и заминку
            const warmup = {
                id: 'warmup',
                name: 'Разминка',
                duration: 5,
                type: 'warmup',
                description: 'Разогрев мышц и суставов перед тренировкой'
            };

            const cooldown = {
                id: 'cooldown',
                name: 'Заминка',
                duration: 5,
                type: 'cooldown',
                description: 'Растяжка и восстановление после тренировки'
            };

            const updatedWorkout = {
                ...workout,
                exercises: [warmup, ...workoutExercises, cooldown]
            };
            workouts.push(updatedWorkout);
        }

        if (workouts.length === 0) {
            console.error('Не удалось сгенерировать тренировки');
            return null;
        }

        return workouts;
    } catch (error) {
        console.error('Ошибка при генерации плана тренировок:', error);
        return null;
    }
}

function analyzeExercisesDatabase() {
    try {
        if (!window.exercisesDB || !window.exercisesDB.exercises) {
            console.warn('База упражнений не загружена или имеет неверный формат');
            return {
                total: 0,
                byEquipment: {},
                byMuscleGroup: {},
                byDifficulty: {
                    1: 0,
                    2: 0,
                    3: 0
                },
                byPlace: {
                    home: 0,
                    gym: 0,
                    outdoor: 0,
                    any: 0
                }
            };
        }

        const exercises = window.exercisesDB.exercises;
        const analysis = {
            total: Object.keys(exercises).length,
            byEquipment: {},
            byMuscleGroup: {},
            byDifficulty: {
                1: 0,
                2: 0,
                3: 0
            },
            byPlace: {
                home: 0,
                gym: 0,
                outdoor: 0,
                any: 0
            }
        };

        Object.values(exercises).forEach(exercise => {
            if (!exercise) return;

            // Подсчет по оборудованию
            if (Array.isArray(exercise.equipment) && exercise.equipment.length) {
                exercise.equipment.forEach(eq => {
                    if (eq) {
                        analysis.byEquipment[eq] = (analysis.byEquipment[eq] || 0) + 1;
                    }
                });
            } else {
                analysis.byEquipment['bodyweight'] = (analysis.byEquipment['bodyweight'] || 0) + 1;
            }

            // Подсчет по мышечным группам
            if (Array.isArray(exercise.muscleGroups)) {
                exercise.muscleGroups.forEach(group => {
                    if (group) {
                        analysis.byMuscleGroup[group] = (analysis.byMuscleGroup[group] || 0) + 1;
                    }
                });
            }

            // Подсчет по сложности
            if (exercise.difficulty) {
                analysis.byDifficulty[exercise.difficulty] = (analysis.byDifficulty[exercise.difficulty] || 0) + 1;
            }

            // Подсчет по месту выполнения
            if (exercise.place) {
                analysis.byPlace[exercise.place]++;
            } else {
                analysis.byPlace.any++;
            }
        });

        console.log('Анализ базы упражнений:', analysis);
        return analysis;
    } catch (error) {
        console.error('Ошибка при анализе базы упражнений:', error);
        return null;
    }
}

// Основная логика выполнения тренировки
function startWorkoutExecution(workout) {
    currentWorkout = workout;
    
    if (!workout || !workout.exercises || !workout.exercises.length) {
        console.error('Некорректные данные тренировки:', workout);
        return;
    }

    // Сбрасываем все переменные
    currentExerciseIndex = 0;
    currentSet = 1;
    isResting = false;
    restTimeLeft = 0;
    workoutStartTime = Date.now();
    
    // Очищаем все таймеры
    clearInterval(timerInterval);
    clearInterval(restInterval);
    timerInterval = null;
    restInterval = null;

    const container = document.querySelector('.container');
    if (!container) return;

    // Скрываем нижнюю навигацию
    document.querySelector('.bottom-nav')?.classList.add('hidden');

    // Инициализируем обработчик выхода
    initExitHandler();

    // Отображаем первое упражнение
    renderExercise();
}

// Функция подтверждения выхода из тренировки
async function confirmQuitWorkout() {
    tg.HapticFeedback.impactOccurred('medium');
    
    const result = await showPopupSafe({
        title: 'Завершить тренировку?',
        message: 'Вы уверены, что хотите завершить тренировку? Прогресс будет потерян.',
        buttons: [
            {
                type: 'destructive',
                text: 'Завершить',
                id: 'quit_workout'
            },
            {
                type: 'cancel',
                text: 'Продолжить'
            }
        ]
    });

    if (result === 'quit_workout') {
        clearTimers();
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
        renderProgramCards();
    }
}

// Функция завершения тренировки
async function finishWorkout() {
    clearTimers();
    
    // Обновляем статистику
    const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 60000); // в минутах
    const stats = {
        date: new Date().toISOString(),
        programId: currentWorkout.programId,
        workoutId: currentWorkout.id,
        duration: workoutDuration,
        exercises: currentWorkout.exercises.length,
        completed: true
    };

    // Получаем текущую статистику
    const currentStats = await getStorageItem('workoutStats')
        .then(data => data ? JSON.parse(data) : { workouts: [] });
    
    currentStats.workouts = currentStats.workouts || [];
    currentStats.workouts.push(stats);
    
    // Сохраняем обновленную статистику
    await setStorageItem('workoutStats', JSON.stringify(currentStats));

    // Показываем поздравление
    await showPopupSafe({
        title: 'Поздравляем! 🎉',
        message: `Тренировка завершена!\n\nДлительность: ${formatTime(workoutDuration)}\nУпражнений: ${currentWorkout.exercises.length}`,
        buttons: [{
            type: 'default',
            text: 'Отлично!'
        }]
    });

    // Возвращаемся к списку тренировок
    document.querySelector('.bottom-nav')?.classList.remove('hidden');
    renderProgramCards();
}

// Функция инициализации обработчика выхода
function initExitHandler() {
    // Показываем кнопку "Назад"
    tg.BackButton.show();
    
    // Обработчик нажатия кнопки "Назад"
    tg.BackButton.onClick(() => {
        confirmQuitWorkout();
    });
    
    // Обработчик закрытия приложения
    tg.onEvent('viewportChanged', ({ isStateStable }) => {
        if (!isStateStable) {
            confirmQuitWorkout();
        }
    });
}

// Функция запуска тренировки
async function startWorkout(programId, workoutId) {
    try {
        console.log('Starting workout with programId:', programId, 'workoutId:', workoutId);
        console.log('Available programs:', window.programData);

        // Получаем данные программы
        const program = window.programData.find(p => p.id === programId);
        console.log('Found program:', program);
        
        if (!program) {
            throw new Error('Программа не найдена');
        }

        // Находим тренировку
        const workout = program.workouts.find(w => w.id === workoutId);
        console.log('Found workout:', workout);
        
        if (!workout) {
            throw new Error('Тренировка не найдена');
        }

        // Проверяем наличие упражнений
        console.log('Checking exercises:', workout.exercises);
        if (!workout.exercises || workout.exercises.length === 0) {
            throw new Error('В тренировке нет упражнений');
        }

        // Добавляем дополнительные данные к тренировке
        window.currentWorkout = {
            ...workout,
            programId: programId
        };

        // Инициализируем переменные тренировки
        window.currentExerciseIndex = 0;
        window.currentSet = 1;
        window.isResting = false;
        window.restTimeLeft = 0;
        window.workoutStartTime = Date.now();

        // Очищаем таймеры
        clearTimers();

        // Скрываем нижнюю навигацию
        document.querySelector('.bottom-nav')?.classList.add('hidden');

        // Инициализируем обработчик выхода
        initExitHandler();

        console.log('Starting workout with:', window.currentWorkout);

        // Отображаем первое упражнение
        renderExercise();

        // Добавляем тактильный отклик
        window.tg.HapticFeedback.impactOccurred('medium');
    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showError(error.message);
        window.tg.HapticFeedback.notificationOccurred('error');
    }
}

// Функция настройки обработчиков событий
function setupEventListeners() {
    // Обработчики для нижней навигации
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        });
    });

    // Обработчики для кнопок очистки данных
    const clearDataBtn = document.querySelector('#clearDataBtn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            clearAllData();
        });
    }

    // Обработчики для кнопок периода в статистике
    document.querySelectorAll('.period-btn').forEach(button => {
        button.addEventListener('click', () => {
            const period = button.dataset.period;
            if (period) {
                document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                updateWeightChart(period);
            }
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчик для формы ввода веса
    const weightForm = document.querySelector('#weightForm');
    if (weightForm) {
        weightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const weightInput = weightForm.querySelector('input[type="number"]');
            if (weightInput && weightInput.value) {
                await saveWeight(parseFloat(weightInput.value));
                weightInput.value = '';
                showNotification('Вес успешно сохранен', 'success');
            }
        });
    }
}

// Функция настройки обработчиков чекбоксов
function setupCheckboxHandlers() {
    // Обработчики для чекбоксов оборудования
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            tg.HapticFeedback.impactOccurred('light');
            
            // Если чекбокс находится в профиле
            if (checkbox.closest('#profile')) {
                saveProfileSettings();
            }
        });
    });
}

// Функция очистки хранилища программ
async function clearProgramStorage() {
    try {
        const meta = await getStorageItem('programs_meta');
        if (meta) {
            const { totalChunks } = JSON.parse(meta);
            // Удаляем все чанки
            for (let i = 0; i < totalChunks; i++) {
                await setStorageItem(`programs_chunk_${i}`, '');
            }
        }
        // Удаляем метаданные
        await setStorageItem('programs_meta', '');
        console.log('Хранилище программ очищено');
    } catch (error) {
        console.error('Ошибка при очистке хранилища программ:', error);
    }
}

// Добавляем функцию в глобальную область
window.clearProgramStorage = clearProgramStorage;
