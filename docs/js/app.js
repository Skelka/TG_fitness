// Инициализация Telegram WebApp
let tg;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализируем Telegram WebApp
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        // Инициализируем состояние приложения
        window.state = {
            currentSection: 'main-menu',
            workoutInProgress: false,
            profile: null,
            statistics: null
        };

        // Инициализируем индикатор загрузки
        window.loading = {
            show() {
                document.getElementById('loading').style.display = 'flex';
            },
            hide() {
                document.getElementById('loading').style.display = 'none';
            }
        };

        // Загружаем данные
        loading.show();
        await Promise.all([
            loadProfile(),
            loadStatistics()
        ]);
        loading.hide();

        // Устанавливаем тему
        document.documentElement.style.setProperty('--tg-theme-button-color', tg.MainButton.color);
        
        // Инициализируем обработчики офлайн режима
        initOfflineHandlers();
        
    } catch (error) {
        console.error('Initialization error:', error);
        tg?.showAlert('Ошибка инициализации приложения');
    }
});

// Переключение между секциями
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
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

// Инициализация обработчиков офлайн режима
function initOfflineHandlers() {
    window.addEventListener('online', () => {
        tg.showAlert('Подключение восстановлено');
        syncData();
    });

    window.addEventListener('offline', () => {
        tg.showAlert('Отсутствует подключение к интернету. Приложение работает в офлайн режиме.');
    });
}

// Отправка данных боту
async function sendDataToBot(data) {
    try {
        tg.sendData(JSON.stringify(data));
        return true;
    } catch (error) {
        const cachedData = JSON.parse(localStorage.getItem('cachedData') || '[]');
        cachedData.push({
            ...data,
            timestamp: Date.now()
        });
        localStorage.setItem('cachedData', JSON.stringify(cachedData));
        throw error;
    }
}

// Синхронизация данных
async function syncData() {
    const cachedData = localStorage.getItem('cachedData');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            await sendDataToBot(data);
            localStorage.removeItem('cachedData');
        } catch (error) {
            handleError(error);
        }
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
} 