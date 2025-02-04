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
        // Добавляем HTML разметку профиля
        const mainContainer = document.querySelector('#mainContainer');
        if (!mainContainer) return;

        mainContainer.innerHTML = `
            <div class="profile-header">
                <img id="profile-photo" src="" alt="Фото профиля" class="profile-photo">
                <div class="profile-info">
                    <h3 id="profile-name"></h3>
                    <span class="profile-status">Новичок</span>
                </div>
            </div>

            <form id="profile-form" class="profile-form">
                <div class="form-section">
                    <h4>Основная информация</h4>
                    <div class="input-group-row">
                        <div class="input-group">
                            <label>Возраст</label>
                            <input type="number" name="age" min="14" max="100" required>
                        </div>
                        <div class="input-group">
                            <label>Рост (см)</label>
                            <input type="number" name="height" min="100" max="250" required>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Вес (кг)</label>
                        <input type="number" name="weight" min="30" max="200" step="0.1" required>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Пол</h4>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="gender" value="male" required>
                            <span>Мужской</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="gender" value="female">
                            <span>Женский</span>
                        </label>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Цель тренировок</h4>
                    <div class="goals-grid">
                        <label class="goal-item">
                            <input type="radio" name="goal" value="weight_loss" required>
                            <div class="goal-icon">
                                <span class="material-symbols-rounded">monitor_weight</span>
                            </div>
                            <span class="goal-label">Снижение веса</span>
                        </label>
                        <label class="goal-item">
                            <input type="radio" name="goal" value="muscle_gain">
                            <div class="goal-icon">
                                <span class="material-symbols-rounded">fitness_center</span>
                            </div>
                            <span class="goal-label">Набор массы</span>
                        </label>
                        <label class="goal-item">
                            <input type="radio" name="goal" value="endurance">
                            <div class="goal-icon">
                                <span class="material-symbols-rounded">directions_run</span>
                            </div>
                            <span class="goal-label">Выносливость</span>
                        </label>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Уровень подготовки</h4>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="level" value="beginner" required>
                            <span>Начинающий</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="level" value="intermediate">
                            <span>Средний</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="level" value="advanced">
                            <span>Продвинутый</span>
                        </label>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Место тренировок</h4>
                    <div class="workout-place-selector">
                        <button type="button" class="place-btn" data-place="home">
                            <span class="material-symbols-rounded">home</span>
                            Дома
                        </button>
                        <button type="button" class="place-btn" data-place="gym">
                            <span class="material-symbols-rounded">fitness_center</span>
                            В зале
                        </button>
                        <button type="button" class="place-btn" data-place="outdoor">
                            <span class="material-symbols-rounded">park</span>
                            На улице
                        </button>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Доступное оборудование</h4>
                    <div class="equipment-list">
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="dumbbells">
                            <div class="equipment-icon">
                                <span class="material-symbols-rounded">exercise</span>
                            </div>
                            <span>Гантели</span>
                        </label>
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="barbell">
                            <div class="equipment-icon">
                                <span class="material-symbols-rounded">fitness_center</span>
                            </div>
                            <span>Штанга</span>
                        </label>
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="pullup_bar">
                            <div class="equipment-icon">
                                <span class="material-symbols-rounded">horizontal_rule</span>
                            </div>
                            <span>Турник</span>
                        </label>
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="resistance_bands">
                            <div class="equipment-icon">
                                <span class="material-symbols-rounded">straighten</span>
                            </div>
                            <span>Резинки</span>
                        </label>
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="mat">
                            <div class="equipment-icon">
                                <span class="material-symbols-rounded">rectangle</span>
                            </div>
                            <span>Коврик</span>
                        </label>
                    </div>
                </div>

                <button type="button" class="danger-btn" id="clearDataBtn">
                    <span class="material-symbols-rounded">delete</span>
                    Очистить все данные
                </button>
            </form>
        `;

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
        setupProfileHandlers();

        // Добавляем обработчик для кнопки очистки данных
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', async () => {
                const confirmed = await window.tg.showConfirm('Вы уверены, что хотите очистить все данные?');
                if (confirmed) {
                    try {
                        // Очищаем все данные из localStorage
                        localStorage.clear();
                        
                        // Очищаем все данные из WebStorage
                        await Promise.all([
                            setStorageItem('profile', ''),
                            setStorageItem('workoutStats', ''),
                            setStorageItem('weightHistory', ''),
                            setStorageItem('programs_meta', ''),
                            setStorageItem('activeProgram', '')
                        ]);
                        
                        window.tg.showAlert('Все данные успешно очищены');
                        window.location.reload(); // Перезагружаем страницу
                    } catch (error) {
                        console.error('Ошибка при очистке данных:', error);
                        showError('Не удалось очистить данные');
                    }
                }
            });
        }

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

// Функция для сохранения данных профиля
async function saveProfile() {
    try {
        const form = document.getElementById('profile-form');
        if (!form) return;

        // Собираем данные формы
        const formData = new FormData(form);
        const profileData = {};

        // Обрабатываем обычные поля
        for (let [key, value] of formData.entries()) {
            if (key !== 'equipment') { // Оборудование обработаем отдельно
                profileData[key] = value;
            }
        }

        // Собираем выбранное оборудование
        const equipment = [];
        document.querySelectorAll('input[name="equipment"]:checked').forEach(checkbox => {
            equipment.push(checkbox.value);
        });
        profileData.equipment = equipment;

        // Собираем места тренировок
        const workoutPlaces = [];
        document.querySelectorAll('.place-btn.active').forEach(button => {
            workoutPlaces.push(button.dataset.place);
        });
        profileData.workoutPlaces = workoutPlaces;

        // Сохраняем данные
        await setStorageItem('profile', JSON.stringify(profileData));
        
        // Обновляем статус
        updateProfileStatus(profileData);
        
        window.tg.showAlert('Профиль успешно сохранен');
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        showError('Не удалось сохранить профиль');
    }
}

// Функция настройки обработчиков событий
function setupProfileHandlers() {
    // Обработчики для мест тренировок
    document.querySelectorAll('.place-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            saveProfile();
        });
    });

    // Обработчики для оборудования
    document.querySelectorAll('input[name="equipment"]').forEach(checkbox => {
        checkbox.addEventListener('change', saveProfile);
    });

    // Обработчики для остальных полей формы
    const form = document.getElementById('profile-form');
    if (form) {
        const inputs = form.querySelectorAll('input:not([type="checkbox"]):not([type="radio"])');
        inputs.forEach(input => {
            input.addEventListener('change', saveProfile);
        });

        const radioInputs = form.querySelectorAll('input[type="radio"]');
        radioInputs.forEach(radio => {
            radio.addEventListener('change', saveProfile);
        });
    }
}

// Экспортируем функции
export default {
    loadProfile,
    saveProfile,
    getProfile,
    updateProfileStatus,
    setupProfileHandlers
};

// Делаем функции доступными глобально
window.profileModule = {
    loadProfile,
    saveProfile,
    getProfile,
    updateProfileStatus,
    setupProfileHandlers
}; 