import { getStorageItem, setStorageItem, showError, showNotification } from './utils.js';
import calendarModule from './calendar.js';
import profileModule from './profile.js';
import statisticsModule from './statistics.js';
import { programsModule } from './programs.js';
import { programDataManager } from './program-data.js';

const uiManager = {
    // Переключение вкладок
    switchTab(tabName) {
        const tabs = ['programs', 'calendar', 'statistics', 'profile'];
        const mainContainer = document.querySelector('#mainContainer');
        
        // Обновляем активную вкладку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Очищаем контейнер
        if (mainContainer) {
            mainContainer.innerHTML = '';
        }

        // Загружаем содержимое вкладки
        switch (tabName) {
            case 'programs':
                this.renderProgramCards();
                break;
            case 'calendar':
                calendarModule.renderCalendar();
                break;
            case 'statistics':
                statisticsModule.renderStatistics();
                break;
            case 'profile':
                profileModule.loadProfile();
                break;
        }

        // Добавляем тактильный отклик
        window.tg.HapticFeedback.impactOccurred('light');
    },

    // Отрисовка карточек программ
    renderProgramCards() {
        const mainContainer = document.querySelector('#mainContainer');
        if (!mainContainer || !window.programData) return;

        // Сортируем программы так, чтобы утренняя зарядка была первой
        const sortedPrograms = [...window.programData].sort((a, b) => {
            if (a.id === 'morning_workout') return -1;
            if (b.id === 'morning_workout') return 1;
            return 0;
        });

        const programCards = sortedPrograms.map(program => `
            <div class="program-card" onclick="window.showProgramDetails('${program.id}')">
                <div class="program-icon">
                    <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
                </div>
                <div class="program-info">
                    <h3>${program.name}</h3>
                    <p>${program.description}</p>
                    <div class="program-meta">
                        <span>
                            <span class="material-symbols-rounded">timer</span>
                            ${program.duration === 'unlimited' ? 'Бессрочная' : `${program.duration} недель`}
                        </span>
                        <span>
                            <span class="material-symbols-rounded">calendar_month</span>
                            ${program.workoutsPerWeek} тр/нед
                        </span>
                        <span class="difficulty-badge">
                            ${programsModule.getDifficultyText(program.difficulty)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        mainContainer.innerHTML = `
            <div class="programs-list">
                ${programCards}
            </div>
        `;
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчики для нижней навигации
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // Обработчики для кнопок очистки данных
        const clearDataBtn = document.querySelector('#clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.confirmClearData();
            });
        }
    },

    // Подтверждение очистки данных
    async confirmClearData() {
        try {
            const result = await window.tg.showConfirm('Вы уверены, что хотите очистить все данные?');
            // Проверяем результат подтверждения
            if (result === true || (typeof result === 'object' && result?.button_id === 'ok')) {
                await this.clearAllData();
            }
        } catch (error) {
            console.error('Ошибка при очистке данных:', error);
            showError('Не удалось очистить данные');
        }
    },

    // Очистка всех данных
    async clearAllData() {
        try {
            // Список всех ключей для очистки
            const keysToDelete = [
                'profile',
                'workoutStats',
                'weightHistory',
                'programs_meta',
                'activeProgram',
                'currentWorkout',
                'workoutHistory',
                'statistics',
                'calendar_events',
                'exercise_progress',
                'user_settings',
                'completedPrograms'
            ];

            // Очищаем все данные через Telegram WebApp Storage
            const clearPromises = keysToDelete.map(key => 
                window.tg.CloudStorage.removeItem(key)
                    .catch(err => console.warn(`Ошибка при удалении ${key}:`, err))
            );

            // Очищаем чанки программ
            const meta = await getStorageItem('programs_meta');
            if (meta) {
                const { totalChunks } = JSON.parse(meta);
                for (let i = 0; i < totalChunks; i++) {
                    clearPromises.push(
                        window.tg.CloudStorage.removeItem(`programs_chunk_${i}`)
                            .catch(err => console.warn(`Ошибка при удалении programs_chunk_${i}:`, err))
                    );
                }
            }

            // Ждем завершения всех операций очистки
            await Promise.all(clearPromises);

            // Очищаем localStorage
            localStorage.clear();

            // Очищаем sessionStorage
            sessionStorage.clear();

            console.log('Данные успешно очищены');
            
            // Показываем уведомление об успехе
            showNotification('Все данные успешно очищены');
            
            // Перезагружаем страницу после небольшой задержки
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Ошибка при очистке данных:', error);
            showError('Не удалось очистить данные: ' + error.message);
        }
    },

    // Вспомогательные функции
    getDifficultyText(difficulty) {
        switch (difficulty) {
            case 'beginner':
                return 'Начальный';
            case 'intermediate':
                return 'Средний';
            case 'advanced':
                return 'Продвинутый';
            default:
                return 'Начальный';
        }
    }
};

export default uiManager; 