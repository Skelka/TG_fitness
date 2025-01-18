// Глобальные переменные
const tg = window.Telegram.WebApp;
const mainButton = tg.MainButton;
const backButton = tg.BackButton;

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
function updateWeightChart(weightHistory) {
    const chartPlaceholder = document.querySelector('#stats .chart-placeholder');
    if (!chartPlaceholder) return;

    // Очищаем placeholder
    chartPlaceholder.innerHTML = '';

    if (weightHistory.length === 0) {
        chartPlaceholder.textContent = 'Нет данных для отображения';
        return;
    }

    // Создаем простое текстовое представление истории веса
    const weightList = document.createElement('div');
    weightList.style.padding = '10px';
    weightList.style.width = '100%';

    weightHistory.slice(-5).forEach(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('ru-RU');
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.marginBottom = '8px';
        item.innerHTML = `
            <span>${dateStr}</span>
            <span>${record.weight} кг</span>
        `;
        weightList.appendChild(item);
    });

    chartPlaceholder.appendChild(weightList);
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