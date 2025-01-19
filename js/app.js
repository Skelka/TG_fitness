// Глобальные переменные
let tg, mainButton, backButton, currentPeriod, weightChart;

// Добавим очередь для попапов
const popupQueue = [];
let isPopupShowing = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Ждем инициализации Telegram WebApp
        await new Promise(resolve => {
            if (window.Telegram?.WebApp) {
                resolve();
            } else {
                const maxAttempts = 10;
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if (window.Telegram?.WebApp) {
                        clearInterval(interval);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        throw new Error('Telegram WebApp не загружен');
                    }
                }, 100);
            }
        });

        // Инициализируем основные переменные
        tg = window.Telegram.WebApp;
        mainButton = tg.MainButton;
        backButton = tg.BackButton;
        currentPeriod = 'week';

        // Базовая настройка WebApp
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();

        // Проверяем наличие данных программ
        if (!window.programData) {
            throw new Error('Данные программ не загружены');
        }

        // Настраиваем кнопки
        mainButton.setText('Сохранить профиль');
        mainButton.hide();

        // Проверяем наличие Chart.js
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js не загружен');
        }

        // Инициализируем все компоненты
        setupEventListeners();
        setupProgramHandlers();
        setupPopupHandlers();
        loadProfile();
        loadActiveProgram();

        // Инициализируем страницу статистики
        await updateStatistics();
        
        // Загружаем и отображаем данные веса
        const weightData = await getWeightData('week');
        if (weightData && weightData.length > 0) {
            updateWeightChart(weightData);
        }

        // Добавляем обработчики для кнопок периода
        setupPeriodButtons();

        console.log('Версия WebApp:', tg.version);
        console.log('Платформа:', tg.platform);
        console.log('Инициализация WebApp:', tg.initData);
        console.log('Доступные методы WebApp:', Object.keys(tg));

    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
});

// Функции для работы с CloudStorage
async function getStorageItem(key) {
    return new Promise((resolve) => {
        if (!tg?.CloudStorage) {
            console.warn('CloudStorage не доступен, используем localStorage');
            resolve(localStorage.getItem(key));
            return;
        }
        tg.CloudStorage.getItem(key, (error, value) => {
            if (error) {
                console.warn(`Ошибка CloudStorage, используем localStorage для ${key}:`, error);
                resolve(localStorage.getItem(key));
            } else {
                resolve(value);
            }
        });
    });
}

async function setStorageItem(key, value) {
    return new Promise((resolve) => {
        if (!tg?.CloudStorage) {
            console.warn('CloudStorage не доступен, используем localStorage');
            localStorage.setItem(key, value);
            resolve(true);
            return;
        }
        tg.CloudStorage.setItem(key, value, (error, success) => {
            if (error || !success) {
                console.warn(`Ошибка CloudStorage, используем localStorage для ${key}:`, error);
                localStorage.setItem(key, value);
                resolve(true);
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
                updateProfilePhoto(user.photo_url);
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

// Функция для получения данных веса за период
async function getWeightData(period) {
    try {
        const result = await getStorageItem('weightHistory');
        const weightHistory = result ? JSON.parse(result) : [];
        
        const now = new Date();
        let startDate;
        
        switch(period) {
            case 'week':
                // Получаем начало текущей недели (понедельник)
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                // Получаем первый день текущего месяца
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                // Получаем первый день текущего года
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0);
        }

        // Создаем массив всех дат в выбранном периоде
        const dates = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= now) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Сопоставляем данные с датами
        return dates.map(date => {
            const entry = weightHistory.find(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.getDate() === date.getDate() &&
                       entryDate.getMonth() === date.getMonth() &&
                       entryDate.getFullYear() === date.getFullYear();
            });
            
            return {
                date: date.toISOString(),
                weight: entry ? entry.weight : null
            };
        });
    } catch (error) {
        console.error('Ошибка при получении данных веса:', error);
        return [];
    }
}

// Функция обновления графика
function updateWeightChart(data) {
    const ctx = document.getElementById('weightChart');
    if (!ctx) return;

    try {
        // Уничтожаем существующий график
        if (window.weightChart instanceof Chart) {
            window.weightChart.destroy();
        }

        // Создаем новый график
        window.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(entry => {
                    const date = new Date(entry.date);
                    switch(window.currentPeriod) {
                        case 'week':
                            return date.toLocaleDateString('ru-RU', { weekday: 'short' });
                        case 'month':
                            return date.getDate();
                        case 'year':
                            return date.toLocaleDateString('ru-RU', { month: 'short' });
                        default:
                            return date.toLocaleDateString('ru-RU', { 
                                day: '2-digit', 
                                month: '2-digit' 
                            });
                    }
                }),
                datasets: [{
                    label: 'Вес (кг)',
                    data: data.map(entry => entry.weight),
                    borderColor: '#40a7e3',
                    backgroundColor: 'rgba(64, 167, 227, 0.1)',
                    fill: true,
                    tension: 0.4,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: value => `${value} кг`,
                            font: { size: 10 }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    }
                },
                layout: {
                    padding: { left: 5, right: 5, top: 5, bottom: 5 }
                }
            }
        });

        // Устанавливаем размеры
        ctx.style.height = '150px';
        ctx.parentElement.style.height = '150px';

    } catch (error) {
        console.error('Ошибка при обновлении графика:', error);
    }
}

// Обработчики переключения периода
document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        try {
            // Убираем активный класс у всех кнопок
            document.querySelectorAll('.period-btn').forEach(b => 
                b.classList.remove('active'));
            // Добавляем активный класс нажатой кнопке
            btn.classList.add('active');
            
            // Обновляем текущий период и график
            currentPeriod = btn.dataset.period;
            const data = await getWeightData(currentPeriod);
            updateWeightChart(data);
        } catch (error) {
            console.error('Ошибка при обновлении графика:', error);
        }
    });
});

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
function setupEventListeners() {
    // Обработчик изменения полей формы
    const form = document.getElementById('profile-form');
    const formInputs = form.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            const hasData = Array.from(formInputs).some(input => input.value);
            if (hasData) {
                mainButton.show();
                backButton.hide();
            } else {
                mainButton.hide();
            }
        });
    });

    // Скрытие клавиатуры
    document.addEventListener('click', function(e) {
        if (!e.target.matches('input') && !e.target.matches('select')) {
            if (document.activeElement instanceof HTMLInputElement || 
                document.activeElement instanceof HTMLSelectElement) {
                document.activeElement.blur();
            }
        }
    });

    // Выделение текста в числовых полях
    document.addEventListener('focus', function(e) {
        if (e.target.type === 'number') {
            e.target.select();
            tg.HapticFeedback.selectionChanged();
        }
    }, true);

    // Обработчик нажатия на MainButton
    mainButton.onClick(saveProfile);

    // Обработчик нажатия на BackButton
    backButton.onClick(() => {
        tg.close();
    });

    // Добавляем новые обработчики
    setupTabHandlers();

    // Обработка событий попапа
    tg.onEvent('popupClosed', (button_id) => {
        if (button_id && button_id.startsWith('start_workout_')) {
            const [_, programId, day] = button_id.split('_').slice(2);
            startWorkout(programId, parseInt(day));
        }
    });

    // Обработка кнопок в интерфейсе тренировки
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('complete-btn')) {
            completeWorkout();
        } else if (e.target.classList.contains('pause-btn')) {
            toggleWorkoutPause();
        }
    });

    // Добавляем обработчики для чекбоксов
    setupCheckboxHandlers();
}

// Настройка кнопок периода
function setupPeriodButtons() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                // Обновляем активную кнопку
                document.querySelectorAll('.period-btn').forEach(b => 
                    b.classList.remove('active'));
                btn.classList.add('active');
                
                // Обновляем график
                window.currentPeriod = btn.dataset.period;
                const data = await getWeightData(window.currentPeriod);
                if (data && data.length > 0) {
                    updateWeightChart(data);
                }
            } catch (error) {
                console.error('Ошибка при обновлении периода:', error);
            }
        });
    });
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

// Функция показа деталей тренировки
function showWorkoutDetails(workoutId) {
    const workout = workoutData[workoutId];
    if (!workout) return;

    let detailsHtml = `
        <div class="workout-details-content">
            <h3>${workout.title}</h3>
            <p class="workout-description">${workout.description}</p>
            
            <div class="workout-info-grid">
                <div class="info-item">
                    <span class="material-symbols-rounded">schedule</span>
                    <span>${workout.duration} мин</span>
                </div>
                <div class="info-item">
                    <span class="material-symbols-rounded">local_fire_department</span>
                    <span>${workout.calories} ккал</span>
                </div>
                <div class="info-item">
                    <span class="material-symbols-rounded">fitness_center</span>
                    <span>${workout.difficulty}</span>
                </div>
            </div>`;

    if (workout.exercises) {
        detailsHtml += `
            <h4>Упражнения:</h4>
            <div class="exercises-list">
                ${workout.exercises.map(ex => `
                    <div class="exercise-item">
                        <h5>${ex.name}</h5>
                        <p>${ex.sets} подхода × ${ex.reps} повторений</p>
                        <p>Отдых: ${ex.rest} сек</p>
                    </div>
                `).join('')}
            </div>`;
    }

    if (workout.intervals) {
        detailsHtml += `
            <h4>Интервалы:</h4>
            <div class="intervals-list">
                ${workout.intervals.map(int => `
                    <div class="interval-item">
                        <span>${int.type}</span>
                        <span>${int.duration} мин - ${int.intensity}</span>
                    </div>
                `).join('')}
            </div>`;
    }

    detailsHtml += `
            <div class="workout-tips">
                <h4>Советы:</h4>
                <ul>
                    ${workout.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    tg.showPopup({
        title: 'Детали тренировки',
        message: detailsHtml,
        buttons: [
            {type: 'default', text: 'Начать', id: `start_${workoutId}`},
            {type: 'cancel', text: 'Закрыть'}
        ]
    });
}

// Обновим обработчики событий
function setupWorkoutHandlers() {
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
                startWorkout(workoutId);
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
                type: workout.type
            });
        }

        // Сохраняем прогресс
        await setStorageItem('activeProgram', JSON.stringify(programProgress));

        // Обновляем статистику
        updateStatistics(programProgress);

        // Обновляем календарь
        renderCalendar();

        // Показываем сообщение о начале программы
        await showPopupSafe({
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

// Обновляем функцию getStatistics
async function getStatistics() {
    try {
        // Получаем все необходимые данные
        const [weightHistoryStr, activeProgramStr] = await Promise.all([
            getStorageItem('weightHistory'),
            getStorageItem('activeProgram')
        ]);

        // Парсим данные
        const weightHistory = weightHistoryStr ? JSON.parse(weightHistoryStr) : [];
        const activeProgram = activeProgramStr ? JSON.parse(activeProgramStr) : null;

        // Вычисляем статистику
        const stats = {
            totalWorkouts: 0,
            totalMinutes: 0,
            totalCalories: 0,
            weightChange: 0,
            currentStreak: 0,
            longestStreak: 0
        };

        // Обрабатываем историю веса
        if (weightHistory.length > 1) {
            const sortedWeights = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
            const firstWeight = sortedWeights[0].weight;
            const lastWeight = sortedWeights[sortedWeights.length - 1].weight;
            stats.weightChange = +(lastWeight - firstWeight).toFixed(1);
        }

        // Обрабатываем данные программы
        if (activeProgram?.completedWorkouts?.length > 0) {
            stats.totalWorkouts = activeProgram.completedWorkouts.length;
            
            // Подсчитываем минуты и калории
            activeProgram.completedWorkouts.forEach(workout => {
                stats.totalMinutes += workout.duration || 0;
                stats.totalCalories += workout.calories || 0;
            });

            // Вычисляем текущую серию тренировок
            const today = new Date().setHours(0, 0, 0, 0);
            let currentStreak = 0;
            let maxStreak = 0;
            let lastWorkoutDate = null;

            const sortedWorkouts = [...activeProgram.completedWorkouts]
                .sort((a, b) => b.completedAt - a.completedAt);

            for (const workout of sortedWorkouts) {
                const workoutDate = new Date(workout.completedAt).setHours(0, 0, 0, 0);
                
                if (!lastWorkoutDate) {
                    currentStreak = 1;
                    lastWorkoutDate = workoutDate;
                } else {
                    const dayDiff = (lastWorkoutDate - workoutDate) / (1000 * 60 * 60 * 24);
                    
                    if (dayDiff === 1) {
                        currentStreak++;
                    } else {
                        maxStreak = Math.max(maxStreak, currentStreak);
                        currentStreak = 1;
                    }
                    lastWorkoutDate = workoutDate;
                }
            }

            stats.currentStreak = currentStreak;
            stats.longestStreak = Math.max(maxStreak, currentStreak);
        }

        return stats;
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        return null;
    }
}

// Обновляем функцию updateStatistics
async function updateStatistics() {
    try {
        const stats = await getStatistics();
        if (!stats) return;

        // Обновляем элементы статистики
        const elements = {
            'total-workouts': stats.totalWorkouts || '0',
            'total-minutes': stats.totalMinutes || '0',
            'total-calories': stats.totalCalories || '0',
            'weight-change': stats.weightChange ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} кг` : '0 кг',
            'current-streak': `${stats.currentStreak || 0} дн.`,
            'longest-streak': `${stats.longestStreak || 0} дн.`
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }

        // Обновляем график веса
        const weightData = await getWeightData(currentPeriod);
        if (weightData && weightData.length > 0) {
            updateWeightChart(weightData);
        } else {
            // Если данных нет, показываем сообщение
            const chartContainer = document.getElementById('weight-chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = '<div class="no-data-message">Нет данных о весе</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка при обновлении статистики:', error);
    }
}

// Обновляем функцию инициализации страницы статистики
async function initStatisticsPage() {
    try {
        // Проверяем наличие Chart.js
        if (typeof Chart === 'undefined') {
            console.error('Chart.js не загружен');
            return;
        }

        // Обновляем статистику
        await updateStatistics();

        // Добавляем обработчики для кнопок периода
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    document.querySelectorAll('.period-btn').forEach(b => 
                        b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    currentPeriod = btn.dataset.period;
                    const data = await getWeightData(currentPeriod);
                    if (data && data.length > 0) {
                        updateWeightChart(data);
                    }
                } catch (error) {
                    console.error('Ошибка при обновлении графика:', error);
                }
            });
        });
    } catch (error) {
        console.error('Ошибка при инициализации страницы статистики:', error);
    }
}

// Заменим использование placeholder на data URL
const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23cccccc"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="14" fill="%23ffffff" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';

// Используем его в коде вместо via.placeholder.com
function updateProfilePhoto(photoUrl) {
    const profilePhoto = document.getElementById('profile-photo');
    if (profilePhoto) {
        profilePhoto.src = photoUrl || defaultImage;
        profilePhoto.onerror = () => {
            profilePhoto.src = defaultImage;
        };
    }
}

// Добавим функцию для отображения попапа
async function showPopupSafe(options) {
    return new Promise((resolve) => {
        const showNext = async () => {
            if (popupQueue.length > 0 && !isPopupShowing) {
                isPopupShowing = true;
                const { options, resolver } = popupQueue[0];
                
                try {
                    const result = await tg.showPopup(options);
                    resolver(result);
                } catch (error) {
                    console.warn('Ошибка показа попапа:', error);
                    resolver(null);
                } finally {
                    isPopupShowing = false;
                    popupQueue.shift();
                    showNext();
                }
            }
        };

        popupQueue.push({ options, resolver: resolve });
        showNext();
    });
} 