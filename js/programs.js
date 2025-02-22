import { getStorageItem, setStorageItem, showError, showPopupSafe } from './utils.js';
import { defaultPrograms, programDataManager } from './program-data.js';

// Функции для работы с программами
const programsModule = {
    // Инициализация программ
    async initializeDefaultPrograms() {
        try {
            console.log('Starting program initialization...');
            const existingPrograms = await getStorageItem('programs_meta');
            console.log('Existing programs meta:', existingPrograms);
            
            if (!existingPrograms) {
                console.log('No existing programs found, initializing defaults...');

                // Сохраняем программы чанками
                const chunkSize = 1;
                const chunks = [];
                
                for (let i = 0; i < defaultPrograms.length; i += chunkSize) {
                    const chunk = defaultPrograms.slice(i, i + chunkSize);
                    chunks.push(chunk);
                }
                
                for (let i = 0; i < chunks.length; i++) {
                    await setStorageItem(`programs_chunk_${i}`, JSON.stringify(chunks[i]));
                }
                
                const meta = {
                    totalChunks: chunks.length,
                    totalPrograms: defaultPrograms.length
                };
                await setStorageItem('programs_meta', JSON.stringify(meta));

                window.programData = defaultPrograms;
            } else {
                const meta = JSON.parse(existingPrograms);
                const programs = [];
                
                for (let i = 0; i < meta.totalChunks; i++) {
                    const chunk = await getStorageItem(`programs_chunk_${i}`);
                    if (chunk) {
                        const parsedChunk = JSON.parse(chunk);
                        programs.push(...parsedChunk);
                    }
                }
                
                window.programData = programs;
            }
        } catch (error) {
            console.error('Ошибка при инициализации программ:', error);
            showError('Не удалось загрузить программы тренировок');
        }
    },

    // Отображение деталей программы
    async showProgramDetails(programId) {
        const program = programDataManager.getProgramById(programId);
        if (!program) {
            showError('Программа не найдена');
            return;
        }

        // Проверяем доступность программы
        const isAvailable = await programDataManager.isProgramAvailable(programId);
        if (!isAvailable) {
            showError('Сначала завершите текущую программу');
            return;
        }

        const activeProgram = await programDataManager.getActiveProgram();
        const isActive = activeProgram?.id === programId;

        await showPopupSafe({
            title: program.name,
            message: `${program.description}\n\n${program.workoutsPerWeek} тр/нед • ${this.getDifficultyText(program.difficulty)}\n\nДлительность: ${program.duration === 'unlimited' ? 'Бессрочная' : `${program.duration} недель`}`,
            buttons: [
                {
                    id: `start_program_${program.id}`,
                    type: 'default',
                    text: isActive ? 'Продолжить программу' : 'Начать программу'
                },
                {
                    type: 'cancel',
                    text: 'Закрыть'
                }
            ]
        });
    },

    // Отображение списка тренировок программы
    async renderProgramWorkouts(program) {
        const mainContainer = document.querySelector('#mainContainer');
        if (!mainContainer) return;

        const activeProgram = await programDataManager.getActiveProgram();
        const completedWorkouts = activeProgram?.completedWorkouts || [];

        mainContainer.innerHTML = `
            <div class="workout-list">
                <div class="workout-list-header">
                    <div class="program-info">
                        <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
                        <h2>${program.name}</h2>
                    </div>
                    <div class="program-meta">
                        ${program.workoutsPerWeek} тр/нед • ${this.getDifficultyText(program.difficulty)}
                    </div>
                    ${activeProgram?.id === program.id ? `
                        <div class="program-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(completedWorkouts.length / program.workouts.length) * 100}%"></div>
                            </div>
                            <div class="progress-text">
                                Прогресс: ${completedWorkouts.length}/${program.workouts.length}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="workouts-container">
                    ${program.workouts.map((workout, index) => `
                        <div class="workout-card ${completedWorkouts.includes(workout.id) ? 'completed' : ''}">
                            <div class="workout-day">День ${index + 1}</div>
                            <div class="workout-info">
                                <div class="workout-title">${workout.name}</div>
                                <div class="workout-description">${workout.description || ''}</div>
                                <div class="workout-meta">
                                    <span class="workout-stat">
                                        <span class="material-symbols-rounded">timer</span>
                                        ${workout.duration} мин
                                    </span>
                                    <span class="workout-stat">
                                        <span class="material-symbols-rounded">exercise</span>
                                        ${workout.exercises ? workout.exercises.length : 0} упражнений
                                    </span>
                                </div>
                            </div>
                            <button class="start-workout-btn" onclick="window.startWorkout('${program.id}', '${workout.id}')">
                                <span class="material-symbols-rounded">
                                    ${completedWorkouts.includes(workout.id) ? 'replay' : 'play_arrow'}
                                </span>
                                ${completedWorkouts.includes(workout.id) ? 'Повторить' : 'Начать'}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Начало программы
    async startProgram(programId) {
        try {
            const isAvailable = await programDataManager.isProgramAvailable(programId);
            if (!isAvailable) {
                showError('Сначала завершите текущую программу');
                return;
            }

            const activeProgram = await programDataManager.getActiveProgram();
            if (!activeProgram || activeProgram.id !== programId) {
                await programDataManager.setActiveProgram(programId);
            }

            const program = programDataManager.getProgramById(programId);
            this.renderProgramWorkouts(program);
        } catch (error) {
            console.error('Ошибка при запуске программы:', error);
            showError('Не удалось запустить программу');
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
    },

    // Очистка хранилища программ
    async clearProgramStorage() {
        try {
            const meta = await getStorageItem('programs_meta');
            if (meta) {
                const { totalChunks } = JSON.parse(meta);
                for (let i = 0; i < totalChunks; i++) {
                    await setStorageItem(`programs_chunk_${i}`, '');
                }
            }
            await setStorageItem('programs_meta', '');
            console.log('Хранилище программ очищено');
        } catch (error) {
            console.error('Ошибка при очистке хранилища программ:', error);
        }
    }
};

export { programsModule }; 