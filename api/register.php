<?php
require __DIR__ . '/db.php';
require_session();
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$mat = trim($in['matricula'] ?? '');
$dob = trim($in['dob'] ?? ''); // AAAA-MM-DD
$token = trim($in['token'] ?? '');
if (!$mat || !$dob) json_out(['error'=>'missing_fields'], 400);

$teacherTokenFile = __DIR__ . '/../data/admin_token.txt';
$hasValidTeacherToken = false;
if ($token && is_file($teacherTokenFile)) {
  $valid = trim(file_get_contents($teacherTokenFile));
  if (hash_equals($valid, $token)) $hasValidTeacherToken = true;
}

// Fluxo 1: cadastro de professor (somente com token válido)
if ($hasValidTeacherToken) {
  $pass = $mat . '|' . $dob;
  $hash = password_hash($pass, PASSWORD_DEFAULT);
  try {
    $stmt = $pdo->prepare('INSERT INTO users (matricula, dob, password_hash, role, created_at) VALUES (?,?,?,?,datetime("now"))');
    $stmt->execute([$mat, $dob, $hash, 'teacher']);
  } catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'UNIQUE')) json_out(['error'=>'matricula_exists'], 409);
    throw $e;
  }
  json_out(['ok'=>true, 'role'=>'teacher']);
}

// Fluxo 2: cadastro de aluno (somente se logado como professor)
if (!is_teacher()) {
  json_out(['error'=>'forbidden'], 403);
}

$pass = $mat . '|' . $dob;
$hash = password_hash($pass, PASSWORD_DEFAULT);
try {
  $stmt = $pdo->prepare('INSERT INTO users (matricula, dob, password_hash, role, created_at) VALUES (?,?,?,?,datetime("now"))');
  $stmt->execute([$mat, $dob, $hash, 'student']);
} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'UNIQUE')) json_out(['error'=>'matricula_exists'], 409);
  throw $e;
}
json_out(['ok'=>true, 'role'=>'student']);
