// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

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
    
    // Очищаем и добавляем новый контент с анимацией
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

// Вспомогательная функция для отправки данных боту
async function sendDataToBot(data) {
    if (!tg || typeof tg.sendData !== 'function') {
        console.error('Telegram WebApp не инициализирован корректно');
        return false;
    }

    return new Promise((resolve) => {
        try {
            // Устанавливаем обработчик ответа от бота
            const messageHandler = (event) => {
                if (event.data && typeof event.data === 'string') {
                    try {
                        const response = JSON.parse(event.data);
                        tg.WebApp.offEvent('message', messageHandler);
                        resolve(response);
                    } catch (e) {
                        console.error('Ошибка при разборе ответа:', e);
                        resolve(null);
                    }
                }
            };

            tg.WebApp.onEvent('message', messageHandler);
            
            // Отправляем данные
            tg.sendData(JSON.stringify(data));
        } catch (error) {
            console.error('Ошибка при отправке данных:', error);
            resolve(null);
        }
    });
}

// Загрузка тренировок
async function loadWorkouts() {
    const workoutHistory = document.getElementById('workout-history');
    try {
        const response = await sendDataToBot({
            action: 'get_workouts'
        });
        
        if (response) {
            workoutHistory.innerHTML = response.map(workout => `
                <div class="workout-item">
                    <div class="card-title">${workout.type}</div>
                    <div class="card-subtitle">
                        ${new Date(workout.date).toLocaleDateString()} • ${workout.duration} мин
                    </div>
                    <div>Сожжено калорий: ${workout.calories_burned}</div>
                </div>
            `).join('') || '<p>Нет записей о тренировках</p>';
        }
    } catch (error) {
        console.error('Ошибка при загрузке тренировок:', error);
        workoutHistory.innerHTML = '<p>Ошибка при загрузке тренировок</p>';
    }
}

// Загрузка статистики
async function loadStats() {
    const weightChart = document.getElementById('weight-chart');
    const workoutStats = document.getElementById('workout-stats');
    
    try {
        const response = await sendDataToBot({
            action: 'get_weight_history'
        });
        
        if (response) {
            weightChart.innerHTML = `
                <h3>История изменения веса</h3>
                <div class="weight-list">
                    ${response.map(entry => `
                        <div class="weight-item">
                            ${entry.weight} кг • ${new Date(entry.date).toLocaleDateString()}
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        weightChart.innerHTML = '<p>Ошибка при загрузке статистики</p>';
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
        const response = await sendDataToBot({
            action: 'get_profile'
        });

        if (response && response.profile) {
            Object.keys(response.profile).forEach(key => {
                const input = document.getElementById(key);
                if (input) input.value = response.profile[key];
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось загрузить профиль',
            buttons: [{type: 'ok'}]
        });
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
        const response = await sendDataToBot(formData);
        if (response && response.success) {
            tg.showPopup({
                title: 'Успех',
                message: 'Профиль успешно сохранен!',
                buttons: [{type: 'ok'}]
            });
        }
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Произошла ошибка при сохранении',
            buttons: [{type: 'ok'}]
        });
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