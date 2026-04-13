import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Category } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'todo.db');

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    categoryId TEXT,
    userId TEXT NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES categories(id),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_todos_userId ON todos(userId);
  CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);
  CREATE INDEX IF NOT EXISTS idx_categories_userId ON categories(userId);
`);

// Check if we need to migrate existing data (add userId column if missing)
const checkTodosTable = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='todos'`).get() as { sql: string } | undefined;
const checkCategoriesTable = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='categories'`).get() as { sql: string } | undefined;

const needsMigration = (checkTodosTable && !checkTodosTable.sql.includes('userId')) ||
  (checkCategoriesTable && !checkCategoriesTable.sql.includes('userId'));

if (needsMigration) {
  console.log('Migrating database to add userId support...');

  try {
    // Create a demo user for existing data
    const demoUserId = 'demo-user';
    const demoUserExists = db.prepare('SELECT id FROM users WHERE id = ?').get(demoUserId);

    if (!demoUserExists) {
      db.prepare('INSERT INTO users (id, email, password, name, createdAt) VALUES (?, ?, ?, ?, ?)').run(
        demoUserId,
        'demo@example.com',
        '$2b$10$demo', // placeholder password
        'Demo User',
        new Date().toISOString()
      );
    }

    // Perform migration in a transaction
    const migrate = db.transaction(() => {
      // Check if old tables exist
      const categoriesOldExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='categories_old'`).get();
      const todosOldExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='todos_old'`).get();

      // Rename existing tables if not already renamed
      if (!categoriesOldExists && checkCategoriesTable) {
        db.exec('ALTER TABLE categories RENAME TO categories_old');
      }
      if (!todosOldExists && checkTodosTable) {
        db.exec('ALTER TABLE todos RENAME TO todos_old');
      }

      // Create new tables with userId
      db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          userId TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          date TEXT NOT NULL,
          categoryId TEXT,
          userId TEXT NOT NULL,
          FOREIGN KEY (categoryId) REFERENCES categories(id),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Copy data from old tables if they exist
      const categoriesOld = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='categories_old'`).get();
      const todosOld = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='todos_old'`).get();

      if (categoriesOld) {
        db.exec(`
          INSERT OR IGNORE INTO categories (id, name, icon, color, userId)
          SELECT id, name, icon, color, '${demoUserId}' FROM categories_old;
        `);
      }

      if (todosOld) {
        db.exec(`
          INSERT OR IGNORE INTO todos (id, text, completed, date, categoryId, userId)
          SELECT id, text, completed, date, categoryId, '${demoUserId}' FROM todos_old;
        `);
      }

      // Drop old tables if they exist
      if (categoriesOld) {
        db.exec('DROP TABLE categories_old');
      }
      if (todosOld) {
        db.exec('DROP TABLE todos_old');
      }

      // Create indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_todos_userId ON todos(userId);
        CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);
        CREATE INDEX IF NOT EXISTS idx_categories_userId ON categories(userId);
      `);
    });

    migrate();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Add default categories for demo user if empty
const count = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
if (count.count === 0) {
  const demoUserId = 'demo-user';

  // Ensure demo user exists
  const demoUserExists = db.prepare('SELECT id FROM users WHERE id = ?').get(demoUserId);
  if (!demoUserExists) {
    db.prepare('INSERT INTO users (id, email, password, name, createdAt) VALUES (?, ?, ?, ?, ?)').run(
      demoUserId,
      'demo@example.com',
      '$2b$10$demo', // placeholder password
      'Demo User',
      new Date().toISOString()
    );
  }

  const insert = db.prepare('INSERT INTO categories (id, name, icon, color, userId) VALUES (@id, @name, @icon, @color, @userId)');
  const defaultCategories = [
    { id: 'work', name: '工作', icon: 'Briefcase', color: '#3b82f6', userId: demoUserId },
    { id: 'personal', name: '个人', icon: 'User', color: '#10b981', userId: demoUserId },
    { id: 'shopping', name: '购物', icon: 'ShoppingCart', color: '#f59e0b', userId: demoUserId },
    { id: 'health', name: '健康', icon: 'Heart', color: '#ef4444', userId: demoUserId },
    { id: 'study', name: '学习', icon: 'BookOpen', color: '#8b5cf6', userId: demoUserId },
    { id: 'home', name: '生活', icon: 'Home', color: '#ec4899', userId: demoUserId },
  ];

  const insertMany = db.transaction((cats: typeof defaultCategories) => {
    for (const cat of cats) insert.run(cat);
  });

  insertMany(defaultCategories);
} else {
  // Update existing English categories to Chinese for existing users
  const translationMap: Record<string, string> = {
    'Work': '工作',
    'Personal': '个人',
    'Shopping': '购物',
    'Health': '健康',
    'Study': '学习',
    'Home': '生活'
  };

  const updateStmt = db.prepare('UPDATE categories SET name = ? WHERE name = ?');
  
  try {
    db.transaction(() => {
      for (const [english, chinese] of Object.entries(translationMap)) {
        updateStmt.run(chinese, english);
      }
    })();
    console.log('Categories translated to Chinese successfully.');
  } catch (error) {
    console.error('Failed to translate existing categories:', error);
  }
}

export default db;
