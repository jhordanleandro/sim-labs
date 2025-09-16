<?php
// db.php - SQLite + helpers
$dbFile = __DIR__ . '/../data/app.sqlite';
$dsn = 'sqlite:' . $dbFile;
$pdo = new PDO($dsn);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON');

function json_out($data, $code=200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function require_session() {
  if (session_status() !== PHP_SESSION_ACTIVE) session_start();
}

function is_teacher() {
  return isset($_SESSION['role']) && $_SESSION['role'] === 'teacher';
}

function current_user_id() {
  return $_SESSION['user_id'] ?? null;
}
