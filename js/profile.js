// Функции для работы с профилем
async function loadProfile() {
    try {
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);

        if (!profileData) return;

        // Заполняем форму данными профиля
        const form = document.getElementById('profile-form');
        if (!form) return;

        // Заполняем текстовые поля
        ['age', 'height', 'weight'].forEach(field => {
            const input = form.querySelector(`input[name="${field}"]`);
            if (input && profileData[field]) {
                input.value = profileData[field];
            }
        });

        // Заполняем радио-кнопки
        ['gender', 'goal', 'level'].forEach(field => {
            const radio = form.querySelector(`input[name="${field}"][value="${profileData[field]}"]`);
            if (radio) {
                radio.checked = true;
            }
        });

        // Заполняем место тренировок
        if (profileData.workoutPlace) {
            const placeBtn = form.querySelector(`.place-btn[data-place="${profileData.workoutPlace}"]`);
            if (placeBtn) {
                document.querySelectorAll('.place-btn').forEach(btn => btn.classList.remove('active'));
                placeBtn.classList.add('active');
            }
        }

        // Заполняем оборудование
        if (profileData.equipment && Array.isArray(profileData.equipment)) {
            profileData.equipment.forEach(eq => {
                const checkbox = form.querySelector(`input[name="equipment"][value="${eq}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        // Обновляем статус профиля
        updateProfileStatus(profileData);

        // Обновляем фото профиля и имя, если доступны
        const profilePhoto = document.getElementById('profile-photo');
        const profileName = document.getElementById('profile-name');
        
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            if (profilePhoto && user.photo_url) {
                profilePhoto.src = user.photo_url;
            }
            if (profileName && user.first_name) {
                profileName.textContent = user.first_name;
            }
        }

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError('Не удалось загрузить профиль');
    }
}

function updateProfileStatus(profile) {
    const statusElement = document.querySelector('.profile-status');
    if (!statusElement) return;

    if (!profile) {
        statusElement.textContent = 'Профиль не заполнен';
        return;
    }

    const level = profile.level || 'beginner';
    const statusMap = {
        beginner: 'Новичок',
        intermediate: 'Продолжающий',
        advanced: 'Продвинутый'
    };

    statusElement.textContent = statusMap[level] || 'Новичок';
}

// Добавляем функцию дебаунса
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

// Создаем дебаунсированную версию saveProfile
const debouncedSaveProfile = debounce(async () => {
    const profileData = await saveProfile();
    if (profileData) {
        // Генерируем план тренировок на основе профиля
        await generateWorkoutPlan(window.programData, profileData);
    }
}, 2000); // Задержка в 2 секунды

function setupProfileEquipmentHandlers() {
    // Обработчики для кнопок места тренировки
    const placeButtons = document.querySelectorAll('.place-btn');
    
    placeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Предотвращаем стандартное поведение
            
            // Сначала снимаем выделение со всех кнопок
            placeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Затем добавляем класс active текущей кнопке
            button.classList.add('active');

            // Добавляем тактильный отклик
            if (window.tg) {
                window.tg.HapticFeedback.impactOccurred('light');
            }

            // Сохраняем изменения
            debouncedSaveProfile();
        });
    });

    // Обработчики для чекбоксов оборудования
    const equipmentCheckboxes = document.querySelectorAll('.equipment-item input[type="checkbox"]');
    equipmentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Добавляем тактильный отклик
            if (window.tg) {
                window.tg.HapticFeedback.impactOccurred('light');
            }
            // Сохраняем изменения
            debouncedSaveProfile();
        });
    });
}

async function saveProfile() {
    try {
        const form = document.getElementById('profile-form');
        if (!form) return;

        // Получаем активную кнопку места тренировки
        const activePlace = form.querySelector('.place-btn.active');
        
        const profileData = {
            age: parseInt(form.querySelector('input[name="age"]').value) || null,
            height: parseInt(form.querySelector('input[name="height"]').value) || null,
            weight: parseFloat(form.querySelector('input[name="weight"]').value) || null,
            gender: form.querySelector('input[name="gender"]:checked')?.value || null,
            goal: form.querySelector('input[name="goal"]:checked')?.value || null,
            level: form.querySelector('input[name="level"]:checked')?.value || null,
            workoutPlace: activePlace ? activePlace.dataset.place : 'home',
            equipment: Array.from(form.querySelectorAll('input[name="equipment"]:checked'))
                .map(input => input.value)
        };

        await setStorageItem('profile', JSON.stringify(profileData));
        updateProfileStatus(profileData);

        // Сохраняем вес в историю только если он указан
        if (profileData.weight) {
            const weightHistory = await getStorageItem('weightHistory')
                .then(data => data ? JSON.parse(data) : []);

            if (!weightHistory.length) {
                await saveWeight(profileData.weight);
            }
        }

        return profileData;
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        return null;
    }
}

async function saveWeight(weight) {
    try {
        const weightHistory = await getStorageItem('weightHistory')
            .then(data => data ? JSON.parse(data) : []);

        weightHistory.push({
            date: new Date().toISOString(),
            weight: parseFloat(weight)
        });

        await setStorageItem('weightHistory', JSON.stringify(weightHistory));
        await statisticsModule.updateWeightChart();
    } catch (error) {
        console.error('Ошибка при сохранении веса:', error);
    }
}

// Обновляем экспорт
window.profileModule = {
    loadProfile,
    updateProfileStatus,
    setupProfileEquipmentHandlers,
    saveProfile,
    saveWeight,
    debouncedSaveProfile
}; 