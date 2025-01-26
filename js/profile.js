import { tg } from './globals.js';
import { getStorageItem, setStorageItem } from './storage.js';
import { showNotification } from './ui.js';

export async function loadProfile() {
    try {
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : {
                gender: 'male',
                age: '',
                weight: '',
                height: '',
                goal: 'strength',
                level: 'beginner',
                equipment: [],
                workoutPlaces: ['home'],
                lastUpdated: null
            });

        const container = document.querySelector('#profile');
        if (!container) return;

        container.innerHTML = `
            <div class="profile-header">
                <h2>Ваш профиль</h2>
                <div class="profile-status">Новичок</div>
            </div>

            <form class="profile-form" onsubmit="saveProfile(event)">
                <div class="form-group">
                    <label>Пол</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="gender" value="male" ${profileData.gender === 'male' ? 'checked' : ''}>
                            <span>Мужской</span>
                        </label>
                        <label>
                            <input type="radio" name="gender" value="female" ${profileData.gender === 'female' ? 'checked' : ''}>
                            <span>Женский</span>
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label>Возраст</label>
                    <input type="number" name="age" value="${profileData.age}" placeholder="Лет">
                </div>

                <div class="form-group">
                    <label>Вес</label>
                    <input type="number" name="weight" value="${profileData.weight}" placeholder="кг">
                </div>

                <div class="form-group">
                    <label>Рост</label>
                    <input type="number" name="height" value="${profileData.height}" placeholder="см">
                </div>

                <div class="form-group">
                    <label>Цель</label>
                    <select name="goal">
                        <option value="strength" ${profileData.goal === 'strength' ? 'selected' : ''}>Набор мышечной массы</option>
                        <option value="weight_loss" ${profileData.goal === 'weight_loss' ? 'selected' : ''}>Снижение веса</option>
                        <option value="endurance" ${profileData.goal === 'endurance' ? 'selected' : ''}>Выносливость</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Уровень подготовки</label>
                    <select name="level">
                        <option value="beginner" ${profileData.level === 'beginner' ? 'selected' : ''}>Начинающий</option>
                        <option value="intermediate" ${profileData.level === 'intermediate' ? 'selected' : ''}>Средний</option>
                        <option value="advanced" ${profileData.level === 'advanced' ? 'selected' : ''}>Продвинутый</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Доступное оборудование</label>
                    <div class="equipment-grid">
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="dumbbells" ${profileData.equipment?.includes('dumbbells') ? 'checked' : ''}>
                            <span>Гантели</span>
                        </label>
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="barbell" ${profileData.equipment?.includes('barbell') ? 'checked' : ''}>
                            <span>Штанга</span>
                        </label>
                        <label class="equipment-item">
                            <input type="checkbox" name="equipment" value="resistance_bands" ${profileData.equipment?.includes('resistance_bands') ? 'checked' : ''}>
                            <span>Резинки</span>
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label>Место тренировок</label>
                    <div class="place-buttons">
                        <button type="button" class="place-btn ${profileData.workoutPlaces?.includes('home') ? 'active' : ''}" data-place="home">
                            <span class="material-symbols-rounded">home</span>
                            <span>Дома</span>
                        </button>
                        <button type="button" class="place-btn ${profileData.workoutPlaces?.includes('gym') ? 'active' : ''}" data-place="gym">
                            <span class="material-symbols-rounded">fitness_center</span>
                            <span>В зале</span>
                        </button>
                        <button type="button" class="place-btn ${profileData.workoutPlaces?.includes('outdoor') ? 'active' : ''}" data-place="outdoor">
                            <span class="material-symbols-rounded">park</span>
                            <span>На улице</span>
                        </button>
                    </div>
                </div>

                <button type="submit" class="save-btn">
                    <span class="material-symbols-rounded">save</span>
                    Сохранить
                </button>
            </form>
        `;

        setupProfileHandlers();

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showNotification('Ошибка при загрузке профиля', true);
    }
}

function setupProfileHandlers() {
    // Обработчики для кнопок места тренировок
    document.querySelectorAll('.place-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчик формы
    const form = document.querySelector('.profile-form');
    if (form) {
        form.addEventListener('submit', saveProfile);
    }
}

export async function saveProfile(event) {
    if (event) event.preventDefault();

    try {
        const form = document.querySelector('.profile-form');
        if (!form) return;

        const formData = new FormData(form);
        const profileData = {
            gender: formData.get('gender'),
            age: formData.get('age'),
            weight: formData.get('weight'),
            height: formData.get('height'),
            goal: formData.get('goal'),
            level: formData.get('level'),
            equipment: formData.getAll('equipment'),
            workoutPlaces: Array.from(document.querySelectorAll('.place-btn.active')).map(btn => btn.dataset.place),
            lastUpdated: Date.now()
        };

        await setStorageItem('profile', JSON.stringify(profileData));
        showNotification('Профиль сохранен');
        tg.HapticFeedback.notificationOccurred('success');

    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        showNotification('Ошибка при сохранении профиля', true);
        tg.HapticFeedback.notificationOccurred('error');
    }
} 