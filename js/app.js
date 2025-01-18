// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Текущий активный раздел
let currentSection = 'workouts';

// Загрузка раздела при запуске
document.addEventListener('DOMContentLoaded', () => {
    loadSection('workouts');
});

// Функция загрузки раздела
function loadSection(sectionName) {
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="loadSection('${sectionName}')"]`).classList.add('active');

    // Получаем шаблон раздела
    const template = document.getElementById(`${sectionName}-template`);
    const content = document.getElementById('main-content');
    
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

// Загрузка тренировок
async function loadWorkouts() {
    const workoutHistory = document.getElementById('workout-history');
    try {
        const success = await sendDataToBot({
            action: 'get_workouts'
        });
        
        if (success) {
            const messageHandler = function(message) {
                try {
                    const workouts = JSON.parse(message.text);
                    workoutHistory.innerHTML = workouts.map(workout => `
                        <div class="workout-item">
                            <div class="card-title">${workout.type}</div>
                            <div class="card-subtitle">
                                ${new Date(workout.date).toLocaleDateString()} • ${workout.duration} мин
                            </div>
                            <div>Сожжено калорий: ${workout.calories_burned}</div>
                        </div>
                    `).join('') || '<p>Нет записей о тренировках</p>';
                    // Удаляем обработчик после успешного получения данных
                    tg.WebApp.offEvent('message', messageHandler);
                } catch (e) {
                    console.error('Ошибка при разборе данных тренировок:', e);
                    workoutHistory.innerHTML = '<p>Ошибка при загрузке тренировок</p>';
                }
            };
            
            tg.WebApp.onEvent('message', messageHandler);
        }
    } catch (error) {
        workoutHistory.innerHTML = '<p>Ошибка при загрузке тренировок</p>';
    }
}

// Загрузка статистики
async function loadStats() {
    const weightChart = document.getElementById('weight-chart');
    const workoutStats = document.getElementById('workout-stats');
    
    try {
        const success = await sendDataToBot({
            action: 'get_weight_history'
        });
        
        if (success) {
            const messageHandler = function(message) {
                try {
                    const weightData = JSON.parse(message.text);
                    weightChart.innerHTML = `
                        <h3>История изменения веса</h3>
                        <div class="weight-list">
                            ${weightData.map(entry => `
                                <div class="weight-item">
                                    ${entry.weight} кг • ${new Date(entry.date).toLocaleDateString()}
                                </div>
                            `).join('')}
                        </div>
                    `;
                    // Удаляем обработчик после успешного получения данных
                    tg.WebApp.offEvent('message', messageHandler);
                } catch (e) {
                    console.error('Ошибка при разборе данных веса:', e);
                }
            };
            
            tg.WebApp.onEvent('message', messageHandler);
        }
    } catch (error) {
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

// Вспомогательная функция для отправки данных боту
async function sendDataToBot(data) {
    try {
        await tg.sendData(JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Ошибка при отправке данных:', error);
        return false;
    }
}

// Сохранение профиля
async function saveProfile(event) {
    event.preventDefault();
    
    const formData = {
        action: 'save_profile',
        profile: {
            name: document.getElementById('name').value,
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            height: parseFloat(document.getElementById('height').value),
            weight: parseFloat(document.getElementById('weight').value),
            goal: document.getElementById('goal').value
        }
    };

    const success = await sendDataToBot(formData);
    if (success) {
        tg.showAlert('Профиль успешно сохранен!');
    } else {
        tg.showAlert('Ошибка при сохранении профиля');
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

async function loadProfile() {
    try {
        const success = await sendDataToBot({
            action: 'get_profile'
        });
        
        if (success) {
            // Устанавливаем обработчик сообщений только один раз
            const messageHandler = function(message) {
                try {
                    const profile = JSON.parse(message.text);
                    Object.keys(profile).forEach(key => {
                        const input = document.getElementById(key);
                        if (input) input.value = profile[key];
                    });
                    // Удаляем обработчик после успешного получения данных
                    tg.WebApp.offEvent('message', messageHandler);
                } catch (e) {
                    console.error('Ошибка при разборе данных профиля:', e);
                }
            };
            
            tg.WebApp.onEvent('message', messageHandler);
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
    }
} 