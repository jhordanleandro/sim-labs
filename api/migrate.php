<?php
require __DIR__ . '/db.php';
$pdo->exec('CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula TEXT NOT NULL UNIQUE,
  dob TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT "student",
  must_set_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
)');
$pdo->exec('CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scenario TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)');
// Abre a janela de 60 minutos para o cadastro do primeiro professor
$pdo->exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('installed_at', datetime('now'))");
json_out(["ok"=>true]);
