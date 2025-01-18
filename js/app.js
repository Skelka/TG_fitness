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

        const profileData = {
            age: parseInt(formData.get('age')) || 0,
            gender: formData.get('gender'),
            height: parseFloat(formData.get('height')) || 0,
            weight: parseFloat(formData.get('weight')) || 0,
            goal: formData.get('goal'),
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

    const fields = ['name', 'age', 'gender', 'height', 'weight', 'goal'];
    fields.forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            input.value = profile[field] || '';
        }
    });
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
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    if (!window.Telegram || !window.Telegram.WebApp) {
        setTimeout(initApp, 100);
        return;
    }
    initApp();
});

function initApp() {
    console.log('Версия WebApp:', tg.version);
    console.log('Платформа:', tg.platform);
    console.log('Инициализация WebApp:', tg.initData);
    console.log('Доступные методы WebApp:', Object.keys(tg));

    setupEventListeners();
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

// Данные о программах тренировок
const programData = {
    weight_loss: {
        id: 'weight_loss',
        title: 'Похудение',
        description: 'Программа для снижения веса и улучшения метаболизма',
        duration: '8 недель',
        difficulty: 'medium',
        category: 'weight_loss',
        icon: 'monitor_weight',
        schedule: '3-4 тренировки в неделю',
        calories_per_week: '3500-4000 ккал',
        results: [
            'Снижение веса 0.5-1 кг в неделю',
            'Улучшение выносливости',
            'Ускорение метаболизма'
        ],
        workouts: [
            {
                day: 1,
                type: 'cardio',
                title: 'HIIT кардио',
                duration: 30,
                exercises: [/*...*/]
            },
            {
                day: 2,
                type: 'strength',
                title: 'Круговая тренировка',
                duration: 45,
                exercises: [/*...*/]
            },
            {
                day: 4,
                type: 'cardio',
                title: 'Интервальный бег',
                duration: 40,
                exercises: [/*...*/]
            }
        ]
    },
    beginner: {
        id: 'beginner',
        title: 'Для начинающих',
        description: 'Базовая программа для знакомства с фитнесом',
        duration: '4 недели',
        difficulty: 'easy',
        category: 'beginner',
        icon: 'fitness_center',
        schedule: '3 тренировки в неделю',
        calories_per_week: '2000-2500 ккал',
        results: [
            'Освоение базовых упражнений',
            'Развитие силы и выносливости',
            'Формирование привычки к тренировкам'
        ],
        workouts: [
            {
                day: 1,
                type: 'full_body',
                title: 'Общая тренировка',
                duration: 40,
                exercises: [/*...*/]
            },
            {
                day: 3,
                type: 'cardio',
                title: 'Кардио + растяжка',
                duration: 30,
                exercises: [/*...*/]
            }
        ]
    },
    muscle_gain: {
        id: 'muscle_gain',
        title: 'Набор мышечной массы',
        description: 'Программа для увеличения мышечной массы и силы',
        duration: '12 недель',
        difficulty: 'hard',
        category: 'muscle_gain',
        icon: 'exercise',
        schedule: '4-5 тренировок в неделю',
        calories_per_week: '4000-4500 ккал',
        results: [
            'Увеличение мышечной массы',
            'Рост силовых показателей',
            'Улучшение рельефа тела'
        ],
        workouts: [
            {
                day: 1,
                type: 'strength',
                title: 'Грудь + Трицепс',
                duration: 60,
                exercises: [/*...*/]
            },
            {
                day: 2,
                type: 'strength',
                title: 'Спина + Бицепс',
                duration: 60,
                exercises: [/*...*/]
            }
        ]
    },
    maintenance: {
        id: 'maintenance',
        title: 'Поддержание формы',
        description: 'Программа для поддержания текущей формы и улучшения общего тонуса',
        duration: '6 недель',
        difficulty: 'medium',
        category: 'maintenance',
        icon: 'sports_gymnastics',
        schedule: '3 тренировки в неделю',
        calories_per_week: '2500-3000 ккал',
        results: [
            'Поддержание текущего веса',
            'Улучшение мышечного тонуса',
            'Повышение выносливости'
        ],
        workouts: [
            {
                day: 1,
                type: 'full_body',
                title: 'Общая тренировка',
                duration: 45,
                exercises: [
                    {
                        name: 'Приседания с собственным весом',
                        sets: 3,
                        reps: '15',
                        rest: 60
                    },
                    {
                        name: 'Отжимания',
                        sets: 3,
                        reps: '12',
                        rest: 60
                    },
                    {
                        name: 'Планка',
                        sets: 3,
                        reps: '45 сек',
                        rest: 45
                    },
                    {
                        name: 'Выпады',
                        sets: 3,
                        reps: '12 на ногу',
                        rest: 60
                    },
                    {
                        name: 'Берпи',
                        sets: 3,
                        reps: '10',
                        rest: 60
                    }
                ]
            },
            {
                day: 3,
                type: 'cardio',
                title: 'Кардио + Ядро',
                duration: 40,
                exercises: [
                    {
                        name: 'Прыжки на скакалке',
                        sets: 3,
                        reps: '2 мин',
                        rest: 60
                    },
                    {
                        name: 'Скручивания',
                        sets: 3,
                        reps: '20',
                        rest: 45
                    },
                    {
                        name: 'Бег на месте с высоким подниманием колен',
                        sets: 3,
                        reps: '1 мин',
                        rest: 60
                    },
                    {
                        name: 'Русские скручивания',
                        sets: 3,
                        reps: '15',
                        rest: 45
                    }
                ]
            },
            {
                day: 5,
                type: 'strength',
                title: 'Силовая тренировка',
                duration: 50,
                exercises: [
                    {
                        name: 'Приседания с прыжком',
                        sets: 4,
                        reps: '12',
                        rest: 60
                    },
                    {
                        name: 'Отжимания с широкой постановкой',
                        sets: 4,
                        reps: '10',
                        rest: 60
                    },
                    {
                        name: 'Подъемы корпуса',
                        sets: 4,
                        reps: '15',
                        rest: 45
                    },
                    {
                        name: 'Обратные отжимания от стула',
                        sets: 4,
                        reps: '12',
                        rest: 60
                    }
                ]
            }
        ]
    }
};

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
    tg.onEvent('popupButtonClicked', (button_id) => {
        const [action, ...params] = button_id.split('_');
        
        switch(action) {
            case 'results':
                showProgramResults(params[0]);
                break;
            case 'schedule':
                showProgramSchedule(params[0]);
                break;
            case 'start':
                if (params[0] === 'workout') {
                    // Начало конкретной тренировки
                    const [programId, workoutDay] = params.slice(1);
                    startWorkoutSession(programId, parseInt(workoutDay));
                } else if (params[0] === 'program') {
                    startProgram(params[1]);
                }
                break;
            case 'back':
                showProgramDetails(params[0]);
                break;
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

    // Создаем объект прогресса программы
    const programProgress = {
        programId: programId,
        startDate: Date.now(),
        currentDay: 1,
        completedWorkouts: []
    };

    // Сохраняем прогресс
    await setStorageItem('activeProgram', JSON.stringify(programProgress));

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
}

// Добавим функцию загрузки активной программы при инициализации
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

    setupEventListeners();
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
    const program = programData[programId];
    const workout = program.workouts.find(w => w.day === workoutDay);
    
    if (!workout) {
        console.error('Тренировка не найдена:', programId, workoutDay);
        return;
    }

    // Показываем экран подготовки к тренировке
    tg.showPopup({
        title: 'Подготовка к тренировке',
        message: `
${workout.title}
Длительность: ${workout.duration} мин
Тип: ${workout.type}

Подготовьте:
- Удобную одежду
- Воду
- Коврик для упражнений
        `,
        buttons: [
            {
                type: 'default',
                text: 'Начать тренировку',
                id: `begin_workout_${programId}_${workoutDay}`
            },
            {
                type: 'cancel',
                text: 'Отложить'
            }
        ]
    });

    // Добавляем обработчик для начала тренировки
    tg.onEvent('popupButtonClicked', async (button_id) => {
        if (button_id === `begin_workout_${programId}_${workoutDay}`) {
            // Загружаем текущий прогресс
            const activeProgram = await getStorageItem('activeProgram')
                .then(data => data ? JSON.parse(data) : null);

            if (!activeProgram) return;

            // Показываем интерфейс тренировки
            showWorkoutInterface(workout, activeProgram);
        }
    });
}

// Функция для отображения интерфейса тренировки
function showWorkoutInterface(workout, programProgress) {
    // Создаем временный интерфейс для тренировки
    const workoutHtml = `
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
            <div class="workout-controls">
                <button class="workout-btn pause-btn">
                    <span class="material-symbols-rounded">pause</span>
                    Пауза
                </button>
                <button class="workout-btn stop-btn">
                    <span class="material-symbols-rounded">stop</span>
                    Завершить
                </button>
            </div>
        </div>
    `;

    // Заменяем содержимое основного контейнера
    const mainContainer = document.querySelector('.container');
    mainContainer.innerHTML = workoutHtml;

    // Добавляем стили для интерфейса тренировки
    const style = document.createElement('style');
    style.textContent = `
        .workout-session {
            padding: 20px;
            text-align: center;
        }
        .workout-timer {
            font-size: 48px;
            margin: 32px 0;
        }
        .workout-controls {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-top: 32px;
        }
        .workout-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: 12px;
            border: none;
            font-size: 16px;
            cursor: pointer;
        }
        .pause-btn {
            background: var(--tg-theme-button-color);
            color: var(--tg-theme-button-text-color);
        }
        .stop-btn {
            background: var(--tg-theme-secondary-bg-color);
            color: var(--tg-theme-text-color);
        }
    `;
    document.head.appendChild(style);

    // Инициализируем таймер
    let timeRemaining = workout.duration * 60;
    let timerInterval = setInterval(() => {
        timeRemaining--;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        document.querySelector('.time-remaining').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const progress = 100 - (timeRemaining / (workout.duration * 60) * 100);
        document.querySelector('.progress').style.width = `${progress}%`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            completeWorkout(workout, programProgress);
        }
    }, 1000);

    // Добавляем обработчики для кнопок
    document.querySelector('.pause-btn').addEventListener('click', () => {
        // Добавить логику паузы
    });

    document.querySelector('.stop-btn').addEventListener('click', () => {
        clearInterval(timerInterval);
        completeWorkout(workout, programProgress);
    });
}

// Функция завершения тренировки
async function completeWorkout(workout, programProgress) {
    // Обновляем прогресс программы
    programProgress.completedWorkouts.push({
        day: workout.day,
        completedAt: Date.now()
    });

    // Сохраняем обновленный прогресс
    await setStorageItem('activeProgram', JSON.stringify(programProgress));

    // Показываем сообщение о завершении
    tg.showPopup({
        title: 'Тренировка завершена!',
        message: 'Поздравляем! Вы успешно завершили тренировку.',
        buttons: [{
            type: 'default',
            text: 'Продолжить',
            id: 'return_to_main'
        }]
    });

    // Возвращаемся на главный экран
    location.reload();
} 