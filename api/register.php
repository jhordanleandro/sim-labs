<?php
require __DIR__ . '/db.php';
require_session();
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$mat = preg_replace('/[^A-Za-z0-9_-]/','', trim($in['matricula'] ?? ''));
$dob = trim($in['dob'] ?? ''); // AAAA-MM-DD
if (!$mat || !$dob) json_out(['error'=>'missing_fields'], 400);

// Verifica se já existe professor
$hasTeacher = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='teacher'")->fetchColumn() > 0;

// Caso não exista professor ainda, primeiro cadastro vira professor,
// mas só nos 60 minutos seguintes à migração (migrate.php)
if (!$hasTeacher) {
  $elapsed = $pdo->query("SELECT (julianday('now') - julianday(value)) * 86400 FROM settings WHERE key='installed_at'")->fetchColumn();
  if ($elapsed === false || (float)$elapsed > 3600) json_out(['error'=>'setup_window_closed'], 403);
  $hash = initial_password_hash($mat, $dob);
  try {
    $stmt = $pdo->prepare('INSERT INTO users (matricula, dob, password_hash, role, created_at) VALUES (?,?,?,?,datetime("now"))');
    $stmt->execute([$mat, $dob, $hash, 'teacher']);
  } catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'UNIQUE')) json_out(['error'=>'matricula_exists'], 409);
    throw $e;
  }
  json_out(['ok'=>true, 'role'=>'teacher', 'mode'=>'first_teacher']);
}

// Demais cadastros de aluno exigem sessão de professor
if (!is_teacher()) {
  json_out(['error'=>'forbidden'], 403);
}

$hash = initial_password_hash($mat, $dob);
try {
  $stmt = $pdo->prepare('INSERT INTO users (matricula, dob, password_hash, role, created_at) VALUES (?,?,?,?,datetime("now"))');
  $stmt->execute([$mat, $dob, $hash, 'student']);
} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'UNIQUE')) json_out(['error'=>'matricula_exists'], 409);
  throw $e;
}
json_out(['ok'=>true, 'role'=>'student']);
