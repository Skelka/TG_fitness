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
        const result = await getStorageItem('profile');
        console.log('Результат из CloudStorage:', result);
        
        if (result) {
            const profile = JSON.parse(result);
            console.log('Загружены данные из CloudStorage:', profile);
            window.profileData = profile;

            if (document.getElementById('profile').classList.contains('active')) {
                fillProfileForm(profile);
            }
            
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            console.log('Нет сохраненных данных в CloudStorage');
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError(error);
    }
}

// Сохранение профиля
async function saveProfile() {
    try {
        mainButton.setText('Сохранение...');
        mainButton.showProgress();

        const profileData = {
            name: document.getElementById('name').value || '',
            age: parseInt(document.getElementById('age').value) || 0,
            gender: document.getElementById('gender').value || 'male',
            height: parseFloat(document.getElementById('height').value) || 0,
            weight: parseFloat(document.getElementById('weight').value) || 0,
            goal: document.getElementById('goal').value || 'maintenance',
            lastUpdated: Date.now()
        };

        // Загружаем историю веса
        let weightHistory = [];
        const storedHistory = await getStorageItem('weightHistory');
        if (storedHistory) {
            weightHistory = JSON.parse(storedHistory);
        }

        // Добавляем новую запись веса
        weightHistory.push({
            weight: profileData.weight,
            date: Date.now()
        });

        // Сохраняем данные
        await setStorageItem('profile', JSON.stringify(profileData));
        await setStorageItem('weightHistory', JSON.stringify(weightHistory));

        // Обновляем UI
        window.profileData = profileData;
        if (document.getElementById('stats').classList.contains('active')) {
            updateWeightChart(weightHistory);
        }

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

            if (tabId === 'profile' && window.profileData) {
                fillProfileForm(window.profileData);
                mainButton.setText('Сохранить профиль');
                mainButton.show();
            } else if (tabId === 'stats') {
                // Загружаем и отображаем историю веса
                try {
                    const weightHistory = await new Promise((resolve) => {
                        tg.CloudStorage.getItem('weightHistory', (error, value) => {
                            resolve(value ? JSON.parse(value) : []);
                        });
                    });
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
    loadProfile();
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