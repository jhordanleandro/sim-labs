<?php
// db.php - SQLite + helpers
$dbFile = __DIR__ . '/../data/app.sqlite';
$dsn = 'sqlite:' . $dbFile;
$pdo = new PDO($dsn);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON');

// Mantém bancos antigos compatíveis sem precisar rodar migrate.php de novo
$pdo->exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
$userCols = $pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_COLUMN, 1);
if ($userCols && !in_array('must_set_password', $userCols, true)) {
  $pdo->exec('ALTER TABLE users ADD COLUMN must_set_password INTEGER NOT NULL DEFAULT 1');
}

function json_out($data, $code=200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function require_session() {
  if (session_status() !== PHP_SESSION_ACTIVE) session_start();
}

// Logado com a data de nascimento, mas ainda sem senha própria
function password_pending() {
  return !empty($_SESSION['must_set_password']);
}

function is_teacher() {
  return !password_pending() && isset($_SESSION['role']) && $_SESSION['role'] === 'teacher';
}

function current_user_id() {
  if (password_pending()) return null;
  return $_SESSION['user_id'] ?? null;
}

// Credencial inicial (1º acesso ou senha redefinida pelo professor)
function initial_password_hash($matricula, $dob) {
  return password_hash($matricula . '|' . $dob, PASSWORD_DEFAULT);
}
