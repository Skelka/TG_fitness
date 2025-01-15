<<<<<<< HEAD
// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
const state = {
    currentSection: 'main-menu',
    workoutInProgress: false,
    profile: null,
    statistics: null
};

// Показ/скрытие индикатора загрузки
const loading = {
    show() {
        document.getElementById('loading').style.display = 'flex';
    },
    hide() {
        document.getElementById('loading').style.display = 'none';
    }
};

// Переключение между секциями
function showSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Показываем нужную секцию
    const section = document.getElementById(`${sectionId}-section`);
    if (section) {
        section.classList.remove('hidden');
        state.currentSection = sectionId;
    }
}

// Обработка ошибок
function handleError(error) {
    console.error('Error:', error);
    tg.showAlert(`Произошла ошибка: ${error.message}`);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    try {
        loading.show();
        // Загружаем профиль и статистику
        await Promise.all([
            loadProfile(),
            loadStatistics()
        ]);
        loading.hide();
    } catch (error) {
        handleError(error);
        loading.hide();
    }
});

// Обработка офлайн режима
window.addEventListener('online', () => {
    tg.showAlert('Подключение восстановлено');
    // Синхронизируем данные
    syncData();
});

window.addEventListener('offline', () => {
    tg.showAlert('Отсутствует подключение к интернету. Приложение работает в офлайн режиме.');
});

// Функция синхронизации данных
async function syncData() {
    const cachedData = localStorage.getItem('cachedData');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            // Отправляем накопленные данные
            await sendDataToBot(data);
            localStorage.removeItem('cachedData');
        } catch (error) {
            handleError(error);
        }
    }
} 

// Отправка данных боту
async function sendDataToBot(data) {
    try {
        tg.sendData(JSON.stringify(data));
        return true;
    } catch (error) {
        // Если отправка не удалась, сохраняем локально
        const cachedData = JSON.parse(localStorage.getItem('cachedData') || '[]');
        cachedData.push({
            ...data,
            timestamp: Date.now()
        });
        localStorage.setItem('cachedData', JSON.stringify(cachedData));
        throw error;
    }
}

// Загрузка статистики
async function loadStatistics() {
    try {
        // Пытаемся загрузить из локального хранилища
        const stats = JSON.parse(localStorage.getItem('statistics'));
        if (stats) {
            updateStatisticsUI(stats);
            state.statistics = stats;
        }
    } catch (error) {
        handleError(error);
    }
}

// Обновление UI статистики
function updateStatisticsUI(stats) {
    document.getElementById('total-workouts').textContent = stats.total_workouts || 0;
    document.getElementById('total-calories').textContent = stats.total_calories || 0;
    
    // Обновляем историю тренировок
    const historyContainer = document.getElementById('workout-history');
    if (stats.history && stats.history.length > 0) {
        historyContainer.innerHTML = stats.history
            .map(workout => `
                <div class="workout-history-item">
                    <div class="workout-type">${workout.type}</div>
                    <div class="workout-stats">
                        <span>${workout.duration} мин</span>
                        <span>${workout.calories} ккал</span>
                    </div>
                    <div class="workout-date">
                        ${new Date(workout.completed_at).toLocaleDateString()}
                    </div>
                </div>
            `)
            .join('');
    } else {
        historyContainer.innerHTML = '<p>История тренировок пуста</p>';
    }
}

// Обновление статистики после тренировки
function updateStatistics(workoutData) {
    const stats = JSON.parse(localStorage.getItem('statistics') || '{}');
    stats.total_workouts = (stats.total_workouts || 0) + 1;
    stats.total_calories = (stats.total_calories || 0) + workoutData.calories;
    
    // Добавляем тренировку в историю
    if (!stats.history) stats.history = [];
    stats.history.unshift(workoutData);
    
    // Ограничиваем историю последними 10 тренировками
    stats.history = stats.history.slice(0, 10);
    
    localStorage.setItem('statistics', JSON.stringify(stats));
    state.statistics = stats;
    updateStatisticsUI(stats);
=======
// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
const state = {
    currentSection: 'main-menu',
    workoutInProgress: false,
    profile: null,
    statistics: null
};

// Показ/скрытие индикатора загрузки
const loading = {
    show() {
        document.getElementById('loading').style.display = 'flex';
    },
    hide() {
        document.getElementById('loading').style.display = 'none';
    }
};

// Переключение между секциями
function showSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Показываем нужную секцию
    const section = document.getElementById(`${sectionId}-section`);
    if (section) {
        section.classList.remove('hidden');
        state.currentSection = sectionId;
    }
}

// Обработка ошибок
function handleError(error) {
    console.error('Error:', error);
    tg.showAlert(`Произошла ошибка: ${error.message}`);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    try {
        loading.show();
        // Загружаем профиль и статистику
        await Promise.all([
            loadProfile(),
            loadStatistics()
        ]);
        loading.hide();
    } catch (error) {
        handleError(error);
        loading.hide();
    }
});

// Обработка офлайн режима
window.addEventListener('online', () => {
    tg.showAlert('Подключение восстановлено');
    // Синхронизируем данные
    syncData();
});

window.addEventListener('offline', () => {
    tg.showAlert('Отсутствует подключение к интернету. Приложение работает в офлайн режиме.');
});

// Функция синхронизации данных
async function syncData() {
    const cachedData = localStorage.getItem('cachedData');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            // Отправляем накопленные данные
            await sendDataToBot(data);
            localStorage.removeItem('cachedData');
        } catch (error) {
            handleError(error);
        }
    }
} 

// Отправка данных боту
async function sendDataToBot(data) {
    try {
        tg.sendData(JSON.stringify(data));
        return true;
    } catch (error) {
        // Если отправка не удалась, сохраняем локально
        const cachedData = JSON.parse(localStorage.getItem('cachedData') || '[]');
        cachedData.push({
            ...data,
            timestamp: Date.now()
        });
        localStorage.setItem('cachedData', JSON.stringify(cachedData));
        throw error;
    }
}

// Загрузка статистики
async function loadStatistics() {
    try {
        // Пытаемся загрузить из локального хранилища
        const stats = JSON.parse(localStorage.getItem('statistics'));
        if (stats) {
            updateStatisticsUI(stats);
            state.statistics = stats;
        }
    } catch (error) {
        handleError(error);
    }
}

// Обновление UI статистики
function updateStatisticsUI(stats) {
    document.getElementById('total-workouts').textContent = stats.total_workouts || 0;
    document.getElementById('total-calories').textContent = stats.total_calories || 0;
    
    // Обновляем историю тренировок
    const historyContainer = document.getElementById('workout-history');
    if (stats.history && stats.history.length > 0) {
        historyContainer.innerHTML = stats.history
            .map(workout => `
                <div class="workout-history-item">
                    <div class="workout-type">${workout.type}</div>
                    <div class="workout-stats">
                        <span>${workout.duration} мин</span>
                        <span>${workout.calories} ккал</span>
                    </div>
                    <div class="workout-date">
                        ${new Date(workout.completed_at).toLocaleDateString()}
                    </div>
                </div>
            `)
            .join('');
    } else {
        historyContainer.innerHTML = '<p>История тренировок пуста</p>';
    }
}

// Обновление статистики после тренировки
function updateStatistics(workoutData) {
    const stats = JSON.parse(localStorage.getItem('statistics') || '{}');
    stats.total_workouts = (stats.total_workouts || 0) + 1;
    stats.total_calories = (stats.total_calories || 0) + workoutData.calories;
    
    // Добавляем тренировку в историю
    if (!stats.history) stats.history = [];
    stats.history.unshift(workoutData);
    
    // Ограничиваем историю последними 10 тренировками
    stats.history = stats.history.slice(0, 10);
    
    localStorage.setItem('statistics', JSON.stringify(stats));
    state.statistics = stats;
    updateStatisticsUI(stats);
>>>>>>> 14f3ba79ce7643c2429781e250c7293da79353c9
} 