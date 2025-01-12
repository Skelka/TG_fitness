from telegram import Update, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from database import FitnessDatabase
import json

# Токен вашего бота
TOKEN = '7786352409:AAFV11N3bOgKUenHakNTivjEOK8D963To7o'
db = FitnessDatabase()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        user = update.effective_user
        db.add_user(user.id, user.username)
        
        keyboard = [
            [KeyboardButton(
                text="Открыть приложение", 
                web_app=WebAppInfo(url="https://skelka.github.io/TG_fitness/")   
            )],
            [KeyboardButton(text="Мой профиль")],
            [KeyboardButton(text="Статистика тренировок")]
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
        
        await update.message.reply_text(
            "Добро пожаловать в фитнес-трекер! Выберите действие:",
            reply_markup=reply_markup
        )
    except Exception as e:
        print(f"Ошибка: {e}")
        await update.message.reply_text("Произошла ошибка при запуске приложения.")

async def handle_profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    stats = db.get_user_stats(user_id)
    
    if stats:
        _, username, height, weight, goal, reg_date = stats
        text = f"Профиль пользователя {username}:\n"
        text += f"Рост: {height or 'Не указан'} см\n"
        text += f"Вес: {weight or 'Не указан'} кг\n"
        text += f"Цель: {goal or 'Не указана'}\n"
        
        keyboard = [
            [InlineKeyboardButton("Обновить рост", callback_data="update_height")],
            [InlineKeyboardButton("Обновить вес", callback_data="update_weight")],
            [InlineKeyboardButton("Установить цель", callback_data="set_goal")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(text, reply_markup=reply_markup)
    else:
        await update.message.reply_text("Профиль не найден.")

async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        data = json.loads(update.message.web_app_data.data)
        user_id = update.effective_user.id
        
        # Сохраняем тренировку
        workout_id = db.add_workout(
            user_id=user_id,
            workout_type=data['type'],
            workout_name=data['name'],
            duration=data['duration']
        )
        
        # Сохраняем упражнения
        for exercise in data['exercises']:
            db.add_exercise(
                workout_id=workout_id,
                name=exercise['name'],
                sets=exercise['sets'],
                reps=exercise['reps'],
                weight=exercise['weight']
            )
        
        response_text = f"Тренировка '{data['name']}' завершена!\n"
        response_text += f"Длительность: {data['duration'] // 60} мин {data['duration'] % 60} сек\n"
        response_text += f"Количество упражнений: {len(data['exercises'])}"
        
        await update.message.reply_text(response_text)
    except Exception as e:
        print(f"Ошибка при обработке данных: {e}")
        await update.message.reply_text("Произошла ошибка при сохранении тренировки")

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        query = update.callback_query
        await query.answer()  # Отвечаем на callback query

        if query.data == "update_height":
            context.user_data['expecting'] = 'height'
            await query.message.reply_text("Введите ваш рост в сантиметрах:")
        
        elif query.data == "update_weight":
            context.user_data['expecting'] = 'weight'
            await query.message.reply_text("Введите ваш вес в килограммах:")
        
        elif query.data == "set_goal":
            keyboard = [
                [InlineKeyboardButton("Похудение", callback_data="goal_weight_loss")],
                [InlineKeyboardButton("Набор массы", callback_data="goal_weight_gain")],
                [InlineKeyboardButton("Поддержание формы", callback_data="goal_maintenance")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.message.reply_text("Выберите вашу цель:", reply_markup=reply_markup)
        
        elif query.data.startswith("goal_"):
            goal = query.data.replace("goal_", "")
            goal_text = {
                "weight_loss": "Похудение",
                "weight_gain": "Набор массы",
                "maintenance": "Поддержание формы"
            }.get(goal, "Не указана")
            
            db.update_user_data(query.from_user.id, goal=goal_text)
            await query.message.reply_text(f"Цель установлена: {goal_text}")

    except Exception as e:
        print(f"Ошибка при обработке callback: {e}")
        await query.message.reply_text("Произошла ошибка при обработке запроса")

async def handle_user_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        user_id = update.effective_user.id
        text = update.message.text

        if 'expecting' in context.user_data:
            expecting = context.user_data['expecting']
            
            if expecting == 'height':
                try:
                    height = float(text)
                    if 100 <= height <= 250:
                        db.update_user_data(user_id, height=height)
                        await update.message.reply_text(f"Рост обновлен: {height} см")
                    else:
                        await update.message.reply_text("Пожалуйста, введите корректный рост (100-250 см)")
                except ValueError:
                    await update.message.reply_text("Пожалуйста, введите числовое значение")
            
            elif expecting == 'weight':
                try:
                    weight = float(text)
                    if 30 <= weight <= 300:
                        db.update_user_data(user_id, weight=weight)
                        await update.message.reply_text(f"Вес обновлен: {weight} кг")
                    else:
                        await update.message.reply_text("Пожалуйста, введите корректный вес (30-300 кг)")
                except ValueError:
                    await update.message.reply_text("Пожалуйста, введите числовое значение")
            
            del context.user_data['expecting']
            
            # Показываем обновленный профиль
            await handle_profile(update, context)

    except Exception as e:
        print(f"Ошибка при обработке ввода: {e}")
        await update.message.reply_text("Произошла ошибка при обработке данных")

async def handle_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        user_id = update.effective_user.id
        workouts = db.get_user_workouts(user_id)
        
        if not workouts:
            await update.message.reply_text("У вас пока нет записанных тренировок.")
            return
        
        response = "Ваши последние тренировки:\n\n"
        for workout in workouts:
            workout_id, _, date, w_type, duration, calories = workout
            response += f"📅 {date.split('.')[0]}\n"  # Показываем дату без миллисекунд
            response += f"🏃 Тип: {w_type}\n"
            response += f"⏱ Длительность: {duration} мин\n"
            response += f"🔥 Калории: {calories}\n"
            
            # Получаем упражнения для силовых тренировок
            if w_type == 'strength':
                exercises = db.get_workout_exercises(workout_id)
                if exercises:
                    response += "Упражнения:\n"
                    for ex in exercises:
                        response += f"- {ex[2]}: {ex[3]}x{ex[4]} ({ex[5]}кг)\n"
            response += "\n"
        
        await update.message.reply_text(response)
    except Exception as e:
        print(f"Ошибка при получении статистики: {e}")
        await update.message.reply_text("Произошла ошибка при получении статистики")

def main():
    application = Application.builder().token(TOKEN).build()

    # Добавляем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.Regex("^Мой профиль$"), handle_profile))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    
    # Добавляем обработчик для callback кнопок
    application.add_handler(CallbackQueryHandler(handle_callback))
    
    # Добавляем обработчик для текстовых сообщений
    application.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND & ~filters.Regex("^Мой профиль$"),
        handle_user_input
    ))

    application.add_handler(MessageHandler(
        filters.Regex("^Статистика тренировок$"),
        handle_stats
    ))

    print("Бот запущен...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main() 