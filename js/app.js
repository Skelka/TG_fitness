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
        const response = await fetch(`/api/workouts/${tg.initDataUnsafe.user.id}`);
        const workouts = await response.json();
        
        workoutHistory.innerHTML = workouts.map(workout => `
            <div class="workout-item">
                <div class="card-title">${workout.workout_type}</div>
                <div class="card-subtitle">
                    ${new Date(workout.date).toLocaleDateString()} • ${workout.duration} мин
                </div>
                <div>Сожжено калорий: ${workout.calories_burned}</div>
            </div>
        `).join('') || '<p>Нет записей о тренировках</p>';
    } catch (error) {
        workoutHistory.innerHTML = '<p>Ошибка при загрузке тренировок</p>';
    }
}

// Загрузка статистики
async function loadStats() {
    const weightChart = document.getElementById('weight-chart');
    const workoutStats = document.getElementById('workout-stats');
    
    try {
        // Загрузка истории веса
        const weightResponse = await fetch(`/api/weight-history/${tg.initDataUnsafe.user.id}`);
        const weightData = await weightResponse.json();
        
        // Здесь можно добавить визуализацию графика
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
        
        // Загрузка статистики тренировок
        const statsResponse = await fetch(`/api/workout-stats/${tg.initDataUnsafe.user.id}`);
        const stats = await statsResponse.json();
        
        workoutStats.innerHTML = `
            <h3>Статистика тренировок</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.total_workouts}</div>
                    <div class="stat-label">Всего тренировок</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.total_minutes}</div>
                    <div class="stat-label">Минут тренировок</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.total_calories}</div>
                    <div class="stat-label">Калорий сожжено</div>
                </div>
            </div>
        `;
    } catch (error) {
        weightChart.innerHTML = '<p>Ошибка при загрузке статистики</p>';
    }
}

// Загрузка советов
async function loadTips() {
    const tipsContainer = document.getElementById('tips-container');
    try {
        const response = await fetch('/api/tips');
        const tips = await response.json();
        
        tipsContainer.innerHTML = tips.map(tip => `
            <div class="tip-card">
                <div class="tip-category">${tip.category}</div>
                <div class="card-title">${tip.title}</div>
                <div class="tip-content">${tip.content}</div>
            </div>
        `).join('');
    } catch (error) {
        tipsContainer.innerHTML = '<p>Ошибка при загрузке советов</p>';
    }
}

// В начало файла добавим функции для работы с ботом
async function sendDataToBot(data) {
    try {
        await tg.sendData(JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Ошибка при отправке данных:', error);
        return false;
    }
}

// Обновим функции загрузки данных
async function loadProfile() {
    try {
        const success = await sendDataToBot({
            action: 'get_profile'
        });
        
        if (success) {
            tg.WebApp.onEvent('message', function(message) {
                try {
                    const profile = JSON.parse(message.text);
                    Object.keys(profile).forEach(key => {
                        const input = document.getElementById(key);
                        if (input) input.value = profile[key];
                    });
                } catch (e) {
                    console.error('Ошибка при разборе данных профиля:', e);
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
    }
}

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
    // Здесь можно добавить модальное окно или переход к выбору типа тренировки
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