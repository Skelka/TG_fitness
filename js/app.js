// Глобальные переменные
const tg = window.Telegram.WebApp;
const mainButton = tg.MainButton;
const backButton = tg.BackButton;

// Инициализация
tg.expand();
tg.enableClosingConfirmation();
mainButton.setText('Сохранить профиль');
mainButton.hide();

// Добавим глобальную переменную для хранения графика
let weightChart = null;

// Инициализация
tg.expand();
tg.enableClosingConfirmation();
mainButton.setText('Сохранить профиль');
mainButton.hide();

// Функции для работы с CloudStorage
async function getStorageItem(key) {
    return new Promise((resolve) => {
        tg.CloudStorage.getItem(key, (error, value) => {
            if (error) {
                console.error(`Ошибка при получении ${key}:`, error);
                resolve(null);
            } else {
                resolve(value);
            }
        });
    });
}

async function setStorageItem(key, value) {
    return new Promise((resolve, reject) => {
        tg.CloudStorage.setItem(key, value, (error, success) => {
            if (error || !success) {
                reject(error || new Error(`Failed to save ${key}`));
            } else {
                resolve(success);
            }
        });
    });
}

// Загрузка данных профиля
async function loadProfile() {
    try {
        // Получаем данные пользователя из Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
            document.getElementById('profile-name').textContent = user.first_name;
            // Если есть фото профиля
            if (user.photo_url) {
                document.getElementById('profile-photo').src = user.photo_url;
            }
        }

        // Загружаем сохраненные данные профиля
        const result = await getStorageItem('profile');
        if (result) {
            const profile = JSON.parse(result);
            fillProfileForm(profile);
            updateProfileStatus(profile);
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError(error);
    }
}

// Функция обновления статуса профиля
function updateProfileStatus(profile) {
    const statusElement = document.querySelector('.profile-status');
    if (!statusElement) return;

    // Определяем статус на основе заполненности профиля и активности
    let status = 'Новичок';
    if (profile.completedWorkouts > 20) {
        status = 'Продвинутый';
    } else if (profile.completedWorkouts > 5) {
        status = 'Опытный';
    }
    statusElement.textContent = status;
}

// Сохранение профиля
async function saveProfile() {
    try {
        mainButton.setText('Сохранение...');
        mainButton.showProgress();

        const form = document.getElementById('profile-form');
        const formData = new FormData(form);

        // Собираем все данные из формы
        const profileData = {
            age: parseInt(formData.get('age')) || 0,
            gender: formData.get('gender'),
            height: parseFloat(formData.get('height')) || 0,
            weight: parseFloat(formData.get('weight')) || 0,
            goal: formData.get('goal'),
            level: formData.get('level'),
            workoutPlaces: formData.getAll('workout_place'),
            equipment: formData.getAll('equipment'),
            lastUpdated: Date.now()
        };

        // Сохраняем данные
        await setStorageItem('profile', JSON.stringify(profileData));

        // Обновляем UI
        updateProfileStatus(profileData);

        // Показываем успешное сохранение
        tg.HapticFeedback.notificationOccurred('success');
        mainButton.hideProgress();
        mainButton.setText('Сохранено ✓');
        setTimeout(() => {
            mainButton.setText('Сохранить профиль');
        }, 2000);

    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        mainButton.hideProgress();
        mainButton.setText('Сохранить профиль');
        showError(error);
    }
}

// Вспомогательные функции
function showError(error) {
    tg.HapticFeedback.notificationOccurred('error');
    tg.showPopup({
        title: 'Ошибка',
        message: error.message,
        buttons: [{type: 'ok'}]
    });
}

// Функция для заполнения формы профиля
function fillProfileForm(profile) {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Заполняем основные поля
    const fields = ['age', 'gender', 'height', 'weight'];
    fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input) {
            input.value = profile[field] || '';
        }
    });

    // Заполняем цель (радио-кнопки)
    if (profile.goal) {
        const goalInput = form.querySelector(`input[name="goal"][value="${profile.goal}"]`);
        if (goalInput) {
            goalInput.checked = true;
        }
    }

    // Заполняем места для тренировок
    if (profile.workoutPlaces) {
        const workoutPlaceInputs = form.querySelectorAll('input[name="workout_place"]');
        workoutPlaceInputs.forEach(input => {
            input.checked = profile.workoutPlaces.includes(input.value);
        });
    }

    // Заполняем доступное оборудование
    if (profile.equipment) {
        const equipmentInputs = form.querySelectorAll('input[name="equipment"]');
        equipmentInputs.forEach(input => {
            input.checked = profile.equipment.includes(input.value);
        });
    }

    // Заполняем уровень подготовки
    if (profile.level) {
        const levelInput = form.querySelector(`input[name="level"][value="${profile.level}"]`);
        if (levelInput) {
            levelInput.checked = true;
        }
    }
}

// Функция обновления графика веса
function updateWeightChart(weightHistory, period = 'week') {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;

    // Подготавливаем данные в зависимости от периода
    const now = new Date();
    const filteredData = filterDataByPeriod(weightHistory, period);
    const { labels, values } = prepareChartData(filteredData, period);

    // Если график уже существует, уничтожаем его
    if (weightChart) {
        weightChart.destroy();
    }

    // Создаем новый график
    weightChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Вес (кг)',
                data: values,
                borderColor: getComputedStyle(document.documentElement)
                    .getPropertyValue('--tg-theme-button-color').trim() || '#40a7e3',
                backgroundColor: 'rgba(64, 167, 227, 0.1)',
                fill: true,
                tension: 0.4
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
                    beginAtZero: false,
                    ticks: {
                        callback: value => `${value} кг`
                    }
                }
            }
        }
    });
}

// Функция фильтрации данных по периоду
function filterDataByPeriod(data, period) {
    const now = new Date();
    const periods = {
        week: now.getTime() - 7 * 24 * 60 * 60 * 1000,
        month: now.getTime() - 30 * 24 * 60 * 60 * 1000,
        year: now.getTime() - 365 * 24 * 60 * 60 * 1000
    };

    return data.filter(record => record.date >= periods[period]);
}

// Функция подготовки данных для графика
function prepareChartData(data, period) {
    const labels = [];
    const values = [];
    const formats = {
        week: { day: '2-digit', month: '2-digit' },
        month: { day: '2-digit', month: '2-digit' },
        year: { month: 'short' }
    };

    data.forEach(record => {
        const date = new Date(record.date);
        labels.push(date.toLocaleDateString('ru-RU', formats[period]));
        values.push(record.weight);
    });

    return { labels, values };
}

// Обновляем обработчик переключения вкладок
function setupTabHandlers() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const tabContent = document.getElementById(tabId);
            tabContent.classList.add('active');

            // При переключении на вкладку с программами
            if (tabId === 'workouts') {
                setupProgramHandlers(); // Переинициализируем обработчики
                mainButton.hide();
            } else if (tabId === 'profile' && window.profileData) {
                fillProfileForm(window.profileData);
                mainButton.setText('Сохранить профиль');
                mainButton.show();
            } else if (tabId === 'stats') {
                try {
                    const weightHistory = await getStorageItem('weightHistory')
                        .then(data => data ? JSON.parse(data) : []);
                    updateWeightChart(weightHistory);
                } catch (e) {
                    console.error('Ошибка при загрузке истории веса:', e);
                }
                mainButton.hide();
            } else {
                mainButton.hide();
            }

            tg.HapticFeedback.selectionChanged();
        });
    });

    // Добавляем обработчики для кнопок периода
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', async () => {
            // Обновляем активную кнопку
            periodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Загружаем данные и обновляем график
            try {
                const weightHistory = await getStorageItem('weightHistory')
                    .then(data => data ? JSON.parse(data) : []);
                updateWeightChart(weightHistory, button.dataset.period);
                tg.HapticFeedback.selectionChanged();
            } catch (e) {
                console.error('Ошибка при обновлении графика:', e);
                showError(e);
            }
        });
    });
}

// Настройка обработчиков событий
function setupEventHandlers() {
    console.log('Setting up event handlers...');
    
    // Обработчики для навигации
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Found nav buttons:', navButtons.length);
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.getAttribute('data-tab');
            console.log('Nav button clicked:', tabId);
            switchTab(tabId);
        });
    });

    // Обработчики для программ
    const programButtons = document.querySelectorAll('.program-btn');
    console.log('Found program buttons:', programButtons.length);
    
    programButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const programId = btn.closest('.program-card').dataset.program;
            console.log('Program button clicked:', btn.className, 'for program:', programId);
            
            if (btn.classList.contains('start-btn')) {
                startProgram(programId);
            } else if (btn.classList.contains('info-btn')) {
                showProgramDetails(programId);
            }
        });
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // Проверяем, что данные загружены
    if (typeof programData === 'undefined') {
        console.error('Ошибка: данные программ не загружены');
        return;
    }

    console.log('Доступные программы:', Object.keys(programData));
    
    // Инициализация Telegram WebApp
    console.log('Платформа:', tg.platform);
    console.log('Инициализация WebApp:', tg.initData);

    // Отображаем начальный интерфейс
    showMainScreen();
    
    // Устанавливаем обработчики событий после отображения интерфейса
    setupEventHandlers();
    setupPopupHandlers();
    
    // Проверяем наличие элементов навигации
    const tabs = document.querySelectorAll('.tab');
    const navBtns = document.querySelectorAll('.nav-btn');
    console.log('Found tabs:', tabs.length);
    console.log('Found nav buttons:', navBtns.length);
});

function initApp() {
    console.log('Версия WebApp:', tg.version);
    console.log('Платформа:', tg.platform);
    console.log('Инициализация WebApp:', tg.initData);
    console.log('Доступные методы WebApp:', Object.keys(tg));

    setupEventHandlers();
    setupProgramHandlers();
    setupPopupHandlers();
    loadProfile();
    loadActiveProgram();
}

// Добавим функцию для запуска тренировки
async function startWorkout(workoutId) {
    try {
        // Получаем текущий профиль
        const profile = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);
            
        if (!profile) {
            tg.showPopup({
                title: 'Заполните профиль',
                message: 'Для начала тренировки необходимо заполнить профиль',
                buttons: [
                    {
                        type: 'default',
                        text: 'Заполнить профиль',
                        id: 'fill_profile'
                    }
                ]
            });
            return;
        }

        // Показываем детали тренировки
        tg.showPopup({
            title: 'Начать тренировку',
            message: 'Выберите длительность и сложность тренировки',
            buttons: [
                {
                    type: 'default',
                    text: 'Начать',
                    id: 'start_workout'
                },
                {
                    type: 'cancel',
                    text: 'Отмена'
                }
            ]
        });
    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showError(error);
    }
}

// Функция показа деталей программы
function showProgramDetails(programId) {
    const program = programData[programId];
    if (!program) return;

    // Показываем основную информацию в более компактном виде
    const mainInfo = `
        <b>${program.title}</b>
        ${program.description}

        📅 ${program.schedule}
        🔥 ${program.calories_per_week}
        💪 Сложность: ${program.difficulty}
    `;

    // Ограничиваем количество кнопок до 3
    const buttons = [
        {
            id: `start_program_${programId}`,
            type: 'default',
            text: 'Начать программу'
        },
        {
            id: `schedule_${programId}`,
            type: 'default',
            text: 'Расписание'
        }
    ];

    tg.showPopup({
        title: program.title,
        message: mainInfo,
        buttons: buttons
    });
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
function showProgramSchedule(programId) {
    const program = programData[programId];
    if (!program) return;

    const scheduleInfo = program.workouts
        .map(workout => `День ${workout.day}: ${workout.title}\n${workout.duration} мин • ${workout.type}`)
        .join('\n\n');

    tg.showPopup({
        title: 'Расписание тренировок',
        message: scheduleInfo,
        buttons: [
            {type: 'default', text: '⬅️ Назад', id: `back_to_main_${programId}`},
            {type: 'default', text: 'Начать программу', id: `start_program_${programId}`}
        ]
    });
}

// Обновим обработчик событий попапа
function setupPopupHandlers() {
    tg.onEvent('popupClosed', (event) => {
        console.log('Popup closed with event:', event);
        if (event && event.button_id) {
            if (event.button_id.startsWith('start_workout_')) {
                // Извлекаем programId и workoutDay из button_id
                const [_, __, programId, workoutDay] = event.button_id.split('_');
                console.log('Starting workout:', programId, workoutDay);
                startWorkoutSession(programId, parseInt(workoutDay));
            } else {
                const [action, ...params] = event.button_id.split('_');
                
                switch(action) {
                    case 'results':
                        showProgramResults(params[0]);
                        break;
                    case 'schedule':
                        showProgramSchedule(params[0]);
                        break;
                    case 'start':
                        if (params[0] === 'program') {
                            startProgram(params[1]);
                        }
                        break;
                    case 'back':
                        showProgramDetails(params[0]);
                        break;
                }
            }
        }
    });
}

// Функция обновления прогресса программы
function updateProgramProgress(progress) {
    const programCard = document.querySelector(`.program-card[data-program="${progress.programId}"]`);
    if (!programCard) return;

    const progressBar = programCard.querySelector('.progress');
    const progressText = programCard.querySelector('.progress-text');
    
    if (progress.status === 'active') {
        // Вычисляем прогресс
        const program = programData[progress.programId];
        const totalWorkouts = program.workouts.length;
        const completedWorkouts = progress.completedWorkouts.length;
        const progressPercent = (completedWorkouts / totalWorkouts) * 100;

        // Обновляем UI
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
        if (progressText) {
            progressText.textContent = `Прогресс: ${completedWorkouts}/${totalWorkouts} тренировок`;
        }

        // Обновляем кнопки
        const startBtn = programCard.querySelector('.start-btn');
        if (startBtn) {
            startBtn.textContent = 'Продолжить';
        }
    }
}

// Обновляем функцию startProgram
async function startProgram(programId) {
    const program = programData[programId];
    if (!program) return;

    try {
        // Очищаем предыдущую статистику
        await setStorageItem('workoutStats', JSON.stringify({
            totalWorkouts: 0,
            totalMinutes: 0,
            totalCalories: 0,
            workoutsByType: {},
            completionRate: 0
        }));

        // Создаем объект прогресса программы
        const programProgress = {
            programId: programId,
            startDate: Date.now(),
            currentDay: 1,
            completedWorkouts: [],
            plannedWorkouts: []
        };

        // Планируем все тренировки
        const startDate = new Date();
        for (const workout of program.workouts) {
            const workoutDate = new Date(startDate);
            workoutDate.setDate(workoutDate.getDate() + workout.day - 1);
            
            programProgress.plannedWorkouts.push({
                day: workout.day,
                plannedDate: workoutDate.getTime(),
                title: workout.title,
                duration: workout.duration,
                type: workout.type,
                calories: workout.calories
            });
        }

        // Сохраняем прогресс
        await setStorageItem('activeProgram', JSON.stringify(programProgress));

        // Обновляем статистику
        updateStatistics(programProgress);

        // Обновляем календарь
        renderCalendar();

        // Показываем сообщение о начале программы
        tg.showPopup({
            title: 'Программа начата!',
            message: `Вы начали программу "${program.title}". Первая тренировка запланирована на сегодня.`,
            buttons: [{
                type: 'default',
                text: 'Начать тренировку',
                id: `start_workout_${programId}_1`
            }]
        });

    } catch (error) {
        console.error('Ошибка при запуске программы:', error);
        showError(error);
    }
}

// Функция обновления статистики
function updateStatistics(programProgress) {
    const stats = {
        totalWorkouts: 0,
        totalMinutes: 0,
        totalCalories: 0,
        workoutsByType: {},
        completionRate: 0
    };

    if (programProgress && programProgress.completedWorkouts) {
        stats.totalWorkouts = programProgress.completedWorkouts.length;

        const program = programData[programProgress.programId];
        if (program) {
            // Подсчитываем статистику по завершенным тренировкам
            programProgress.completedWorkouts.forEach(completed => {
                const workout = program.workouts.find(w => w.day === completed.day);
                if (workout) {
                    stats.totalMinutes += workout.duration || 0;
                    stats.totalCalories += workout.calories || 0;
                    if (workout.type) {
                        stats.workoutsByType[workout.type] = (stats.workoutsByType[workout.type] || 0) + 1;
                    }
                }
            });

            // Вычисляем процент выполнения
            const plannedWorkouts = programProgress.plannedWorkouts.filter(
                w => w.plannedDate <= Date.now()
            ).length;
            
            stats.completionRate = plannedWorkouts > 0 
                ? (stats.totalWorkouts / plannedWorkouts) * 100 
                : 0;
        }
    }

    // Сохраняем статистику
    setStorageItem('workoutStats', JSON.stringify(stats));

    // Обновляем UI статистики
    updateStatisticsUI(stats);
}

// Функция обновления UI статистики
function updateStatisticsUI(stats) {
    const statsContainer = document.getElementById('statistics');
    if (!statsContainer) return;

    // Получаем активную программу для подсчета запланированных тренировок
    getStorageItem('activeProgram')
        .then(data => {
            const programProgress = data ? JSON.parse(data) : null;
            const plannedWorkouts = programProgress ? programProgress.plannedWorkouts.length : 0;

            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">calendar_month</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${plannedWorkouts}</span>
                            <span class="stat-label">Тренировок в месяце</span>
                        </div>
                    </div>
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">local_fire_department</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${stats.totalCalories || 0}</span>
                            <span class="stat-label">Ккал сожжено</span>
                        </div>
                    </div>
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">timer</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${formatDuration(stats.totalMinutes || 0)}</span>
                            <span class="stat-label">Общее время</span>
                        </div>
                    </div>
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">trending_up</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${Math.round(stats.completionRate || 0)}%</span>
                            <span class="stat-label">Достижение цели</span>
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(console.error);
}

// Добавляем функцию форматирования времени
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes}м`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}ч ${remainingMinutes}м`;
}

// Добавим функцию для загрузки активной программы при инициализации
async function loadActiveProgram() {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        if (activeProgram) {
            updateProgramProgress(activeProgram);
        }
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
    }
}

// Обновляем функцию initApp
function initApp() {
    console.log('Версия WebApp:', tg.version);
    console.log('Платформа:', tg.platform);
    console.log('Инициализация WebApp:', tg.initData);
    console.log('Доступные методы WebApp:', Object.keys(tg));

    setupEventHandlers();
    setupProgramHandlers();
    setupPopupHandlers();
    loadProfile();
    loadActiveProgram();
}

// Обновляем обработчики событий
function setupProgramHandlers() {
    // Обработчики для кнопок в карточках программ
    document.querySelectorAll('.program-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const programCard = button.closest('.program-card');
            const programId = programCard.dataset.program;
            
            console.log('Нажата кнопка:', button.className, 'для программы:', programId);
            
            if (button.classList.contains('info-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                showProgramDetails(programId);
            } else if (button.classList.contains('start-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                startProgram(programId);
            }
        });
    });

    // Добавляем обработчик для всей карточки программы
    document.querySelectorAll('.program-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.program-btn')) {
                const programId = card.dataset.program;
                tg.HapticFeedback.impactOccurred('medium');
                showProgramDetails(programId);
            }
        });
    });
}

// Добавим функцию для начала конкретной тренировки
function startWorkoutSession(programId, workoutDay) {
    try {
        console.log('Starting workout session:', programId, workoutDay);
        const program = programData[programId];
        if (!program) {
            throw new Error('Программа не найдена');
        }

        const workout = program.workouts.find(w => w.day === workoutDay);
        if (!workout) {
            throw new Error('Тренировка не найдена');
        }

        // Переключаемся на вкладку тренировок
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => tab.style.display = 'none');
        const workoutsTab = document.getElementById('workouts');
        workoutsTab.style.display = 'block';

        // Показываем интерфейс тренировки
        workoutsTab.innerHTML = `
            <div class="workout-session">
                <h2>${workout.title}</h2>
                <div class="workout-timer">
                    <span class="time-remaining">${workout.duration}:00</span>
                </div>
                <div class="workout-progress">
                    <div class="progress-bar">
                        <div class="progress" style="width: 0%"></div>
                    </div>
                </div>
                <div class="exercises-list">
                    ${workout.exercises.map((exercise, index) => `
                        <div class="exercise-item ${index === 0 ? 'active' : ''}">
                            <h4>${exercise.name}</h4>
                            <p>${exercise.sets} подхода × ${exercise.reps}</p>
                            <p>Отдых: ${exercise.rest} сек</p>
                        </div>
                    `).join('')}
                </div>
                <div class="workout-controls">
                    <button class="workout-btn pause-btn">
                        <span class="material-symbols-rounded">pause</span>
                        Пауза
                    </button>
                    <button class="workout-btn complete-btn">
                        <span class="material-symbols-rounded">check</span>
                        Завершить
                    </button>
                </div>
            </div>
        `;

        // Добавляем обработчики для кнопок
        setupWorkoutControls(workout, programId);

        // Запускаем таймер
        startWorkoutTimer(workout.duration * 60);

        console.log('Workout session started successfully');

    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showError(error);
    }
}

// Функция для управления таймером тренировки
function startWorkoutTimer(duration) {
    let timeRemaining = duration;
    const timerElement = document.querySelector('.time-remaining');
    const progressBar = document.querySelector('.workout-progress .progress');
    
    const timer = setInterval(() => {
        timeRemaining--;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const progress = 100 - (timeRemaining / duration * 100);
        progressBar.style.width = `${progress}%`;
        
        if (timeRemaining <= 0) {
            clearInterval(timer);
            completeWorkout();
        }
    }, 1000);

    // Сохраняем таймер в глобальной переменной для возможности паузы
    window.workoutTimer = timer;
}

// Функция для настройки контролов тренировки
function setupWorkoutControls(workout, programId) {
    const pauseBtn = document.querySelector('.pause-btn');
    const completeBtn = document.querySelector('.complete-btn');
    
    pauseBtn.addEventListener('click', () => {
        if (pauseBtn.classList.contains('paused')) {
            // Возобновляем тренировку
            startWorkoutTimer(parseInt(document.querySelector('.time-remaining').textContent));
            pauseBtn.classList.remove('paused');
            pauseBtn.innerHTML = '<span class="material-symbols-rounded">pause</span>Пауза';
        } else {
            // Ставим на паузу
            clearInterval(window.workoutTimer);
            pauseBtn.classList.add('paused');
            pauseBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>Продолжить';
        }
        tg.HapticFeedback.impactOccurred('medium');
    });

    completeBtn.addEventListener('click', () => {
        clearInterval(window.workoutTimer);
        completeWorkout(workout, programId);
        tg.HapticFeedback.impactOccurred('medium');
    });
}

// Функция завершения тренировки
async function completeWorkout(workout, programId) {
    try {
        if (!workout || typeof workout.day === 'undefined') {
            throw new Error('Некорректные данные тренировки');
        }

        // Получаем текущий прогресс программы
        const result = await getStorageItem('activeProgram');
        let programProgress = result ? JSON.parse(result) : null;

        if (!programProgress) {
            programProgress = {
                programId: programId,
                startDate: Date.now(),
                completedWorkouts: [],
                plannedWorkouts: []
            };
        }

        // Добавляем завершенную тренировку
        programProgress.completedWorkouts.push({
            day: workout.day,
            completedAt: Date.now()
        });

        // Сохраняем обновленный прогресс
        await setStorageItem('activeProgram', JSON.stringify(programProgress));

        // Обновляем статистику
        updateStatistics(programProgress);

        // Показываем сообщение об успехе
        try {
            await tg.showPopup({
                title: 'Тренировка завершена!',
                message: 'Поздравляем! Вы успешно завершили тренировку.',
                buttons: [{
                    type: 'default',
                    text: 'Продолжить',
                    id: 'return_to_main'
                }]
            });
        } catch (popupError) {
            // Если попап уже открыт, просто логируем ошибку
            console.log('Не удалось показать попап:', popupError);
        }

        // Обновляем UI
        updateProgramProgress(programProgress);

    } catch (error) {
        console.error('Ошибка при завершении тренировки:', error);
        // Не показываем ошибку пользователю через попап, чтобы избежать конфликтов
        console.log('Ошибка:', error.message);
    }
}

// Добавим функцию для обработки изменений в чекбоксах
function setupCheckboxHandlers() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Обработчики для радио-кнопок целей
    const goalInputs = form.querySelectorAll('input[name="goal"]');
    goalInputs.forEach(input => {
        input.addEventListener('change', () => {
            mainButton.show();
        });
    });

    // Обработчики для чекбоксов мест тренировок
    const workoutPlaceInputs = form.querySelectorAll('input[name="workout_place"]');
    workoutPlaceInputs.forEach(input => {
        input.addEventListener('change', () => {
            mainButton.show();
        });
    });

    // Обработчики для чекбоксов оборудования
    const equipmentInputs = form.querySelectorAll('input[name="equipment"]');
    equipmentInputs.forEach(input => {
        input.addEventListener('change', () => {
            mainButton.show();
        });
    });
}

// Функция для отображения календаря
function renderCalendar() {
    const calendarContainer = document.getElementById('calendar');
    if (!calendarContainer) return;

    // Получаем активную программу
    getStorageItem('activeProgram')
        .then(data => {
            const programProgress = data ? JSON.parse(data) : null;
            if (!programProgress) return;

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            // Отрисовываем календарь с тренировками
            const calendar = generateCalendar(currentYear, currentMonth, programProgress.plannedWorkouts);
            calendarContainer.innerHTML = calendar;

            // Добавляем обработчики для навигации по календарю
            setupCalendarNavigation(programProgress.plannedWorkouts);
        })
        .catch(console.error);
}

// Функция генерации календаря с тренировками
function generateCalendar(year, month, workouts) {
    const now = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    let calendar = `
        <div class="calendar-header">
            <button class="calendar-nav-btn prev">←</button>
            <h2>${monthNames[month]} ${year}</h2>
            <button class="calendar-nav-btn next">→</button>
        </div>
        <div class="calendar-weekdays">
            <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div>
            <div>Пт</div><div>Сб</div><div>Вс</div>
        </div>
        <div class="calendar-days">
    `;

    // Добавляем пустые ячейки в начале
    let firstDayOfWeek = firstDay.getDay() || 7;
    for (let i = 1; i < firstDayOfWeek; i++) {
        calendar += '<div class="calendar-day empty"></div>';
    }

    // Добавляем дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
        let classes = ['calendar-day'];
        if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
            classes.push('today');
        }

        // Проверяем, есть ли тренировка в этот день
        const workout = workouts?.find(w => {
            const workoutDate = new Date(w.plannedDate);
            return workoutDate.getDate() === day && 
                   workoutDate.getMonth() === month && 
                   workoutDate.getFullYear() === year;
        });

        if (workout) {
            classes.push('has-workout');
        }

        calendar += `
            <div class="${classes.join(' ')}" data-date="${day}">
                ${day}
                ${workout ? `<div class="workout-indicator"></div>` : ''}
            </div>
        `;
    }

    calendar += '</div>';
    return calendar;
}

// Создаем элемент дня
function createDayElement(day) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    div.textContent = day;
    return div;
}

// Загружаем дни тренировок
async function loadWorkoutDays() {
    try {
        const result = await getStorageItem('activeProgram');
        if (result) {
            const program = JSON.parse(result);
            
            // Отмечаем выполненные тренировки
            if (program.completedWorkouts) {
                program.completedWorkouts.forEach(workout => {
                    const date = new Date(workout.completedAt);
                    markWorkoutDay(date, 'completed');
                });
            }
            
            // Отмечаем запланированные тренировки
            if (program.workoutDays) {
                program.workoutDays.forEach(workoutDay => {
                    const date = new Date(workoutDay.date);
                    if (date > new Date()) { // Только будущие тренировки
                        markWorkoutDay(date, 'planned');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке дней тренировок:', error);
    }
}

// Отмечаем день тренировки
function markWorkoutDay(date, type) {
    const days = document.querySelectorAll('.calendar-day');
    const dayNumber = date.getDate();
    
    days.forEach(day => {
        if (day.textContent === String(dayNumber)) {
            // Добавляем иконку штанги
            if (!day.querySelector('.workout-icon')) {
                const icon = document.createElement('span');
                icon.className = 'material-symbols-rounded workout-icon';
                icon.textContent = 'fitness_center';
                day.appendChild(icon);
            }
            day.classList.add(type);
        }
    });
}

// Обновляем стили для календаря
const styles = `
    .calendar-day {
        position: relative;
        min-height: 40px;
    }
    
    .workout-icon {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 14px;
        color: var(--tg-theme-button-color);
    }
    
    .calendar-day.completed .workout-icon {
        color: #4CAF50;
    }
    
    .calendar-day.planned .workout-icon {
        color: var(--tg-theme-button-color);
    }
`;

// Добавляем стили
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Вызываем рендер календаря при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
});

// Функция для добавления тренировки в календарь
async function addWorkoutToCalendar(workout, date) {
    try {
        // Проверяем поддержку календаря
        if (!tg.platform.toLowerCase().includes('android') && !tg.platform.toLowerCase().includes('ios')) {
            console.log('Платформа не поддерживает добавление в календарь');
            return;
        }

        const calendarEvent = {
            title: `Тренировка: ${workout.title}`,
            description: `Длительность: ${workout.duration} мин\nТип: ${workout.type}\n\nУпражнения:\n${
                workout.exercises.map(ex => `- ${ex.name} (${ex.sets}×${ex.reps})`).join('\n')
            }`,
            start_date: Math.floor(date.getTime() / 1000),
            end_date: Math.floor((date.getTime() + workout.duration * 60000) / 1000)
        };

        // Используем CloudStorage для сохранения расписания
        await tg.CloudStorage.setItem(`workout_${workout.day}`, JSON.stringify(calendarEvent));
        
        console.log('Тренировка сохранена:', calendarEvent);
        
    } catch (error) {
        console.error('Ошибка при сохранении тренировки:', error);
        // Не показываем ошибку пользователю, просто логируем
    }
}

// Добавляем функцию setupCalendarNavigation
function setupCalendarNavigation(workouts) {
    const prevBtn = document.querySelector('.calendar-nav-btn.prev');
    const nextBtn = document.querySelector('.calendar-nav-btn.next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const currentDate = new Date();
            currentDate.setMonth(currentDate.getMonth() - 1);
            const calendar = generateCalendar(currentDate.getFullYear(), currentDate.getMonth(), workouts);
            document.getElementById('calendar').innerHTML = calendar;
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const currentDate = new Date();
            currentDate.setMonth(currentDate.getMonth() + 1);
            const calendar = generateCalendar(currentDate.getFullYear(), currentDate.getMonth(), workouts);
            document.getElementById('calendar').innerHTML = calendar;
        });
    }
}

// Добавим функцию для очистки данных
async function resetUserData() {
    try {
        await setStorageItem('activeProgram', null);
        await setStorageItem('workoutStats', null);
        location.reload(); // Перезагружаем страницу
    } catch (error) {
        console.error('Ошибка при сбросе данных:', error);
    }
}

// В функцию renderProfile добавим кнопку сброса
function renderProfile() {
    const profileTab = document.getElementById('profile');
    if (!profileTab) return;

    // Получаем данные пользователя из Telegram WebApp
    const user = tg.initDataUnsafe?.user || {};
    
    profileTab.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">
                <img src="${user.photo_url || 'https://via.placeholder.com/100'}" alt="Profile">
            </div>
            <div class="profile-info">
                <h2>${user.first_name || 'Пользователь'}</h2>
                <p>@${user.username || 'username'}</p>
            </div>
        </div>
        
        <div class="stats-section">
            <h3>Статистика</h3>
            <div id="statistics" class="stats-grid">
                <!-- Статистика будет добавлена динамически -->
            </div>
        </div>

        <div class="calendar-section">
            <h3>Календарь тренировок</h3>
            <div id="calendar">
                <!-- Календарь будет добавлен динамически -->
            </div>
        </div>

        <div class="settings-section">
            <button class="danger-btn" onclick="resetUserData()">
                Сбросить все данные
            </button>
        </div>
    `;

    // Обновляем статистику
    getStorageItem('workoutStats')
        .then(data => {
            const stats = data ? JSON.parse(data) : null;
            if (stats) {
                updateStatisticsUI(stats);
            }
        })
        .catch(console.error);

    // Обновляем календарь
    renderCalendar();
}

// Функция переключения вкладок
function switchTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    // Скрываем все вкладки
    const tabs = document.querySelectorAll('.tab');
    console.log('Found tabs to hide:', tabs.length);
    tabs.forEach(tab => {
        tab.style.display = 'none';
    });

    // Убираем активный класс у всех кнопок навигации
    const navBtns = document.querySelectorAll('.nav-btn');
    console.log('Found nav buttons to update:', navBtns.length);
    navBtns.forEach(btn => {
        btn.classList.remove('active');
    });

    // Показываем выбранную вкладку
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        console.log('Showing selected tab:', tabId);
        selectedTab.style.display = 'block';
    } else {
        console.error('Tab not found:', tabId);
    }

    // Добавляем активный класс выбранной кнопке
    const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (activeBtn) {
        console.log('Setting active button for:', tabId);
        activeBtn.classList.add('active');
    } else {
        console.error('Nav button not found for:', tabId);
    }

    // Дополнительная логика для разных вкладок
    switch(tabId) {
        case 'profile':
            renderProfile();
            break;
        case 'programs':
            // Уже отрендерено в showMainScreen
            break;
        case 'workouts':
            renderWorkouts();
            break;
    }
}

// Функция для отображения тренировок
function renderWorkouts() {
    const workoutsTab = document.getElementById('workouts');
    if (!workoutsTab) return;

    // Получаем активную программу
    getStorageItem('activeProgram')
        .then(data => {
            const programProgress = data ? JSON.parse(data) : null;
            if (!programProgress) {
                workoutsTab.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-rounded">fitness_center</span>
                        <h3>Нет активных тренировок</h3>
                        <p>Выберите программу тренировок, чтобы начать</p>
                    </div>
                `;
                return;
            }

            const program = programData[programProgress.programId];
            if (!program) return;

            // Отображаем запланированные тренировки
            workoutsTab.innerHTML = `
                <h2>Тренировки программы "${program.title}"</h2>
                <div class="workouts-list">
                    ${program.workouts.map(workout => `
                        <div class="workout-card ${isWorkoutCompleted(workout.day, programProgress) ? 'completed' : ''}">
                            <div class="workout-header">
                                <h3>${workout.title}</h3>
                                <span class="workout-duration">${workout.duration} мин</span>
                            </div>
                            <div class="workout-info">
                                <span class="workout-type">${workout.type}</span>
                                <span class="workout-calories">${workout.calories} ккал</span>
                            </div>
                            ${isWorkoutCompleted(workout.day, programProgress) ? `
                                <div class="workout-completed">
                                    <span class="material-symbols-rounded">check_circle</span>
                                    Выполнено
                                </div>
                            ` : `
                                <button class="start-workout-btn" data-workout="${workout.day}">
                                    Начать тренировку
                                </button>
                            `}
                        </div>
                    `).join('')}
                </div>
            `;

            // Добавляем обработчики для кнопок начала тренировки
            setupWorkoutButtons(programProgress.programId);
        })
        .catch(console.error);
}

// Вспомогательная функция для проверки выполнения тренировки
function isWorkoutCompleted(day, progress) {
    return progress.completedWorkouts.some(w => w.day === day);
}

// Функция настройки кнопок тренировок
function setupWorkoutButtons(programId) {
    document.querySelectorAll('.start-workout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const workoutDay = parseInt(btn.dataset.workout);
            startWorkoutSession(programId, workoutDay);
        });
    });
} 