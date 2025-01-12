import sqlite3
from datetime import datetime

class FitnessDatabase:
    def __init__(self):
        self.conn = sqlite3.connect('fitness.db')
        self.create_tables()
    
    def create_tables(self):
        cursor = self.conn.cursor()
        
        # Таблица пользователей
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            height REAL,
            weight REAL,
            goal TEXT,
            registration_date TIMESTAMP
        )
        ''')
        
        # Таблица тренировок
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date TIMESTAMP,
            workout_type TEXT,
            duration INTEGER,
            calories INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
        ''')
        
        # Таблица упражнений
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER,
            name TEXT,
            sets INTEGER,
            reps INTEGER,
            weight REAL,
            FOREIGN KEY (workout_id) REFERENCES workouts (id)
        )
        ''')
        
        self.conn.commit()
    
    def add_user(self, user_id, username):
        cursor = self.conn.cursor()
        cursor.execute('''
        INSERT OR IGNORE INTO users (user_id, username, registration_date)
        VALUES (?, ?, ?)
        ''', (user_id, username, datetime.now()))
        self.conn.commit()
    
    def update_user_data(self, user_id, height=None, weight=None, goal=None):
        cursor = self.conn.cursor()
        update_fields = []
        values = []
        
        if height is not None:
            update_fields.append("height = ?")
            values.append(height)
        if weight is not None:
            update_fields.append("weight = ?")
            values.append(weight)
        if goal is not None:
            update_fields.append("goal = ?")
            values.append(goal)
            
        if update_fields:
            values.append(user_id)
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = ?"
            cursor.execute(query, values)
            self.conn.commit()
    
    def add_workout(self, user_id, workout_type, duration, calories):
        cursor = self.conn.cursor()
        cursor.execute('''
        INSERT INTO workouts (user_id, date, workout_type, duration, calories)
        VALUES (?, ?, ?, ?, ?)
        ''', (user_id, datetime.now(), workout_type, duration, calories))
        self.conn.commit()
    
    def get_user_stats(self, user_id):
        cursor = self.conn.cursor()
        cursor.execute('''
        SELECT * FROM users WHERE user_id = ?
        ''', (user_id,))
        return cursor.fetchone()
    
    def get_user_workouts(self, user_id, limit=10):
        cursor = self.conn.cursor()
        cursor.execute('''
        SELECT * FROM workouts 
        WHERE user_id = ? 
        ORDER BY date DESC 
        LIMIT ?
        ''', (user_id, limit))
        return cursor.fetchall() 
    
    def add_exercise(self, workout_id, name, sets, reps, weight):
        cursor = self.conn.cursor()
        cursor.execute('''
        INSERT INTO exercises (workout_id, name, sets, reps, weight)
        VALUES (?, ?, ?, ?, ?)
        ''', (workout_id, name, sets, reps, weight))
        self.conn.commit() 
    
    def get_workout_exercises(self, workout_id):
        cursor = self.conn.cursor()
        cursor.execute('''
        SELECT * FROM exercises 
        WHERE workout_id = ?
        ''', (workout_id,))
        return cursor.fetchall() 