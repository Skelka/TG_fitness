// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Обработчик событий от бота
tg.onEvent('message', function(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('Получены данные от бота:', data);
        
        // Обработка данных в зависимости от действия
        switch(data.action) {
            case 'profile_data':
                updateProfile(data.profile);
                break;
            case 'workouts_data':
                updateWorkouts(data.workouts);
                break;
            case 'weight_history_data':
                updateWeightHistory(data.history);
                break;
        }
    } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
    }
});

// Функции обновления UI
function updateProfile(profile) {
    const form = document.getElementById('profile-form');
    if (form && profile) {
        Object.keys(profile).forEach(key => {
            const input = document.getElementById(key);
            if (input) input.value = profile[key];
        });
    }
}

function updateWorkouts(workouts) {
    const workoutHistory = document.getElementById('workout-history');
    if (workoutHistory && workouts) {
        workoutHistory.innerHTML = workouts.map(workout => `
            <div class="workout-item">
                <div class="card-title">${workout.type}</div>
                <div class="card-subtitle">
                    ${new Date(workout.date).toLocaleDateString()} • ${workout.duration} мин
                </div>
                <div>Сожжено калорий: ${workout.calories_burned}</div>
            </div>
        `).join('') || '<p>Нет записей о тренировках</p>';
    }
}

function updateWeightHistory(history) {
    const weightChart = document.getElementById('weight-chart');
    if (weightChart && history) {
        weightChart.innerHTML = `
            <h3>История изменения веса</h3>
            <div class="weight-list">
                ${history.map(entry => `
                    <div class="weight-item">
                        ${entry.weight} кг • ${new Date(entry.date).toLocaleDateString()}
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Текущий активный раздел
let currentSection = 'workouts';

// Загрузка раздела при запуске
document.addEventListener('DOMContentLoaded', () => {
    loadSection('workouts');
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'profile-form') {
            e.preventDefault();
            saveProfile();
        }
    });
}

// Функция загрузки раздела
function loadSection(sectionName) {
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Находим кнопку для активации
    const activeButton = document.querySelector(`.nav-btn[onclick*="'${sectionName}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Получаем шаблон раздела
    const template = document.getElementById(`${sectionName}-template`);
    const content = document.getElementById('main-content');
    
    if (!template || !content) {
        console.error(`Не найден шаблон или контейнер для раздела ${sectionName}`);
        return;
    }
    
    // Клонируем содержимое шаблона
    const clone = template.content.cloneNode(true);
    content.innerHTML = '';
    content.appendChild(clone);
    
    // Загружаем данные для раздела
    switch(sectionName) {
        case 'workouts':
            loadWorkouts();
            break;
        case 'stats':
            loadStats();
            break;
        case 'tips':
            loadTips();
            break;
        case 'profile':
            loadProfile();
            break;
    }
    
    currentSection = sectionName;
}

// Загрузка тренировок
async function loadWorkouts() {
    const workoutHistory = document.getElementById('workout-history');
    try {
        workoutHistory.innerHTML = '<p>Загрузка тренировок...</p>';
        
        // Отправляем данные через BackButton
        tg.BackButton.show();
        tg.onEvent('backButtonClicked', () => {
            tg.sendData(JSON.stringify({
                action: 'get_workouts'
            }));
            tg.BackButton.hide();
        });
        tg.BackButton.onClick();
    } catch (error) {
        console.error('Ошибка при загрузке тренировок:', error);
        workoutHistory.innerHTML = '<p>Ошибка при загрузке тренировок</p>';
        tg.BackButton.hide();
    }
}

// Загрузка статистики
async function loadStats() {
    const weightChart = document.getElementById('weight-chart');
    try {
        weightChart.innerHTML = '<p>Загрузка статистики...</p>';
        
        tg.BackButton.show();
        tg.onEvent('backButtonClicked', () => {
            tg.sendData(JSON.stringify({
                action: 'get_weight_history'
            }));
            tg.BackButton.hide();
        });
        tg.BackButton.onClick();
    } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        weightChart.innerHTML = '<p>Ошибка при загрузке статистики</p>';
        tg.BackButton.hide();
    }
}

// Загрузка советов
function loadTips() {
    const tipsContainer = document.getElementById('tips-container');
    // Временные статические советы
    const tips = [
        {
            category: "Питание",
            title: "Правильный завтрак",
            content: "Начинайте день с белковой пищи и сложных углеводов для длительной энергии."
        },
        {
            category: "Тренировки",
            title: "Разминка",
            content: "Всегда начинайте тренировку с 5-10 минутной разминки для предотвращения травм."
        },
        {
            category: "Мотивация",
            title: "Ставьте цели",
            content: "Записывайте свои цели и отмечайте прогресс для поддержания мотивации."
        }
    ];
    
    tipsContainer.innerHTML = tips.map(tip => `
        <div class="tip-card">
            <div class="tip-category">${tip.category}</div>
            <div class="card-title">${tip.title}</div>
            <div class="tip-content">${tip.content}</div>
        </div>
    `).join('');
}

// Загрузка профиля
async function loadProfile() {
    try {
        const form = document.getElementById('profile-form');
        if (form) {
            form.innerHTML = '<p>Загрузка данных профиля...</p>';
        }

        tg.BackButton.show();
        tg.onEvent('backButtonClicked', () => {
            tg.sendData(JSON.stringify({
                action: 'get_profile'
            }));
            tg.BackButton.hide();
        });
        tg.BackButton.onClick();
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось загрузить профиль',
            buttons: [{type: 'ok'}]
        });
        tg.BackButton.hide();
    }
}

// Сохранение профиля
async function saveProfile() {
    const formData = {
        action: 'save_profile',
        profile: {
            name: document.getElementById('name').value || '',
            age: parseInt(document.getElementById('age').value) || 0,
            gender: document.getElementById('gender').value || 'male',
            height: parseFloat(document.getElementById('height').value) || 0,
            weight: parseFloat(document.getElementById('weight').value) || 0,
            goal: document.getElementById('goal').value || 'maintenance'
        }
    };

    try {
        tg.BackButton.show();
        tg.onEvent('backButtonClicked', () => {
            tg.sendData(JSON.stringify(formData));
            tg.BackButton.hide();
            tg.showPopup({
                title: 'Успех',
                message: 'Профиль сохранен!',
                buttons: [{type: 'ok'}]
            });
        });
        tg.BackButton.onClick();
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Произошла ошибка при сохранении',
            buttons: [{type: 'ok'}]
        });
        tg.BackButton.hide();
    }
}

// Начало новой тренировки
function startNewWorkout() {
    const workoutTypes = [
        { id: 'cardio', name: 'Кардио', icon: '🏃‍♂️' },
        { id: 'strength', name: 'Силовая', icon: '💪' },
        { id: 'flexibility', name: 'Растяжка', icon: '🧘‍♂️' }
    ];
    
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="section workout-selection">
            <h2>Выберите тип тренировки</h2>
            <div class="workout-types">
                ${workoutTypes.map(type => `
                    <button onclick="selectWorkout('${type.id}')" class="workout-type-btn">
                        <span class="workout-icon">${type.icon}</span>
                        <span class="workout-name">${type.name}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
} 