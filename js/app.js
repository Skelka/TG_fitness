// Глобальные переменные
const tg = window.Telegram.WebApp;
const mainButton = tg.MainButton;
const backButton = tg.BackButton;
let currentPeriod = 'week'; // Добавляем переменную для текущего периода

// В начале файла добавим проверку
if (typeof Chart === 'undefined') {
    console.error('Chart.js не загружен. Графики будут недоступны.');
}

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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Проверяем наличие Telegram WebApp
        if (!window.Telegram?.WebApp) {
            throw new Error('Telegram WebApp не загружен');
        }

        // Инициализируем основные переменные
        window.tg = window.Telegram.WebApp;
        window.mainButton = tg.MainButton;
        window.backButton = tg.BackButton;
        window.currentPeriod = 'week';

        // Базовая настройка WebApp
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();

        // Проверяем наличие Chart.js
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js не загружен');
        }

        // Инициализируем страницу статистики
        await updateStatistics();
        
        // Загружаем и отображаем данные веса
        const weightData = await getWeightData('week');
        if (weightData && weightData.length > 0) {
            updateWeightChart(weightData);
        }

        // Добавляем обработчики для кнопок периода
        setupPeriodButtons();

    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
});

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
async function updateStatistics() {
    try {
        // Получаем активную программу
        const programData = await getStorageItem('activeProgram');
        const program = programData ? JSON.parse(programData) : null;

        // Инициализируем статистику нулевыми значениями
        const stats = {
            plannedWorkouts: 0,
            totalCalories: 0,
            totalMinutes: 0,
            completionRate: 0
        };

        // Обновляем количество запланированных тренировок
        if (program && program.plannedWorkouts) {
            stats.plannedWorkouts = program.plannedWorkouts.length;
        }

        // Обновляем UI
        const statsContainer = document.getElementById('statistics');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">calendar_month</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${stats.plannedWorkouts}</span>
                            <span class="stat-label">Тренировок в месяце</span>
                        </div>
                    </div>
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">local_fire_department</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${stats.totalCalories}</span>
                            <span class="stat-label">Ккал сожжено</span>
                        </div>
                    </div>
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">timer</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${formatDuration(stats.totalMinutes)}</span>
                            <span class="stat-label">Общее время</span>
                        </div>
                    </div>
                    <div class="stat-mini-card">
                        <div class="stat-icon">
                            <span class="material-symbols-rounded">trending_up</span>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">${stats.completionRate}%</span>
                            <span class="stat-label">Достижение цели</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка при обновлении статистики:', error);
    }
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
    }
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

// Функция для сохранения нового значения веса
async function saveWeight(weight) {
    try {
        const result = await getStorageItem('weightHistory');
        const weightHistory = result ? JSON.parse(result) : [];
        
        // Добавляем новую запись
        const newEntry = {
            date: new Date().toISOString(),
            weight: parseFloat(weight)
        };

        // Проверяем, есть ли уже запись за сегодня
        const today = new Date().setHours(0, 0, 0, 0);
        const existingTodayIndex = weightHistory.findIndex(
            entry => new Date(entry.date).setHours(0, 0, 0, 0) === today
        );

        if (existingTodayIndex !== -1) {
            // Обновляем существующую запись
            weightHistory[existingTodayIndex] = newEntry;
        } else {
            // Добавляем новую запись
            weightHistory.push(newEntry);
        }

        // Сохраняем обновленную историю
        await setStorageItem('weightHistory', JSON.stringify(weightHistory));
        
        // Обновляем график
        const data = await getWeightData(currentPeriod);
        updateWeightChart(data);
    } catch (error) {
        console.error('Ошибка при сохранении веса:', error);
    }
}

// Очистка данных
async function clearAllData() {
    try {
        // Очищаем все данные
        await setStorageItem('weightHistory', '[]');
        await setStorageItem('activeProgram', '{}');
        await setStorageItem('profile', '{}');
        
        // Показываем сообщение об успехе
        tg.showPopup({
            title: 'Данные очищены',
            message: 'Все данные успешно удалены',
            buttons: [{type: 'ok'}]
        });

        // Перезагружаем страницу
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('Ошибка при очистке данных:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось очистить данные',
            buttons: [{type: 'ok'}]
        });
    }
}

// Инициализация страницы статистики
async function initStatisticsPage() {
    try {
        // Проверяем наличие Chart.js
        if (typeof Chart === 'undefined') {
            console.error('Chart.js не загружен');
            return;
        }

        // Обновляем статистику
        await updateStatistics();

        // Инициализируем график веса
        const weightData = await getWeightData(currentPeriod);
        if (weightData && weightData.length > 0) {
            updateWeightChart(weightData);
        }

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

// Ждем загрузки Telegram Web App
window.addEventListener('load', () => {
    if (!window.Telegram?.WebApp) {
        console.error('Telegram WebApp не загружен');
        return;
    }

    // Глобальные переменные
    const tg = window.Telegram.WebApp;
    const mainButton = tg.MainButton;
    const backButton = tg.BackButton;
    let currentPeriod = 'week';

    // Инициализация
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    // Инициализируем страницу статистики
    initStatisticsPage();
}); 