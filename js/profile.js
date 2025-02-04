import { getStorageItem, setStorageItem, showError } from './utils.js';

// Функция для получения данных профиля
async function getProfile() {
    try {
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);
        return profileData;
    } catch (error) {
        console.error('Ошибка при получении данных профиля:', error);
        return null;
    }
}

// Функция для загрузки профиля
async function loadProfile() {
    try {
        // Загружаем фото профиля из Telegram
        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto && window.tg.initDataUnsafe.user?.photo_url) {
            profilePhoto.src = window.tg.initDataUnsafe.user.photo_url;
        } else if (profilePhoto) {
            profilePhoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23999" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
        }

        // Загружаем имя пользователя
        const profileName = document.getElementById('profile-name');
        if (profileName && window.tg.initDataUnsafe.user?.first_name) {
            profileName.textContent = window.tg.initDataUnsafe.user.first_name;
        }

        // Загружаем сохраненные данные профиля
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);

        if (profileData) {
            // Заполняем текстовые поля и радиокнопки
            Object.entries(profileData).forEach(([key, value]) => {
                const input = document.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'radio') {
                        const radioInput = document.querySelector(`[name="${key}"][value="${value}"]`);
                        if (radioInput) radioInput.checked = true;
                    } else if (input.type !== 'checkbox') {
                        input.value = value;
                    }
                }
            });

            // Восстанавливаем выбранное оборудование
            if (profileData.equipment) {
                const equipmentCheckboxes = document.querySelectorAll('input[name="equipment"]');
                equipmentCheckboxes.forEach(checkbox => {
                    checkbox.checked = profileData.equipment.includes(checkbox.value);
                });
            }

            // Восстанавливаем места тренировок
            if (profileData.workoutPlaces) {
                const placeButtons = document.querySelectorAll('.place-btn');
                placeButtons.forEach(button => {
                    button.classList.toggle('active', 
                        profileData.workoutPlaces.includes(button.dataset.place)
                    );
                });
            }

            // Обновляем статус профиля
            updateProfileStatus(profileData);
        }

        // Устанавливаем обработчики после загрузки данных
        setupProfileEquipmentHandlers();

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError('Не удалось загрузить профиль');
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

// Функция для сохранения профиля
async function saveProfile() {
    try {
        const form = document.getElementById('profile-form');
        if (!form) return;

        const formData = new FormData(form);
        const profileData = {};

        // Собираем данные из формы
        for (let [key, value] of formData.entries()) {
            if (key === 'equipment') {
                if (!profileData[key]) profileData[key] = [];
                profileData[key].push(value);
            } else {
                profileData[key] = value;
            }
        }

        // Добавляем места тренировок
        const selectedPlaces = [];
        document.querySelectorAll('.place-btn.active').forEach(btn => {
            selectedPlaces.push(btn.dataset.place);
        });
        profileData.workoutPlaces = selectedPlaces;

        // Сохраняем данные
        await setStorageItem('profile', JSON.stringify(profileData));
        
        // Обновляем статус
        updateProfileStatus(profileData);

        // Показываем уведомление об успешном сохранении
        if (window.showNotification) {
            window.showNotification('Профиль сохранен');
        }

    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        showError('Не удалось сохранить профиль');
    }
}

// Создаем отложенную версию функции сохранения
const debouncedSaveProfile = debounce(saveProfile, 500);

// Функция для настройки обработчиков оборудования
function setupProfileEquipmentHandlers() {
    // Обработчики для кнопок места тренировок
    document.querySelectorAll('.place-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            if (window.tg) {
                window.tg.HapticFeedback.impactOccurred('light');
            }
            debouncedSaveProfile();
        });
    });

    // Обработчики для чекбоксов оборудования
    document.querySelectorAll('input[name="equipment"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (window.tg) {
                window.tg.HapticFeedback.impactOccurred('light');
            }
            debouncedSaveProfile();
        });
    });
}

// Вспомогательная функция debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Экспортируем функции для использования в других модулях
const profileModule = {
    loadProfile,
    saveProfile,
    debouncedSaveProfile,
    setupProfileEquipmentHandlers,
    updateProfileStatus,
    getProfile
};

export default profileModule; 