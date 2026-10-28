<?php
require __DIR__ . '/db.php';
require_session();
if (!is_teacher()) json_out(['error'=>'forbidden'], 403);
$action = $_GET['action'] ?? 'list';
if ($action === 'list') {
  $stmt = $pdo->query("SELECT id, matricula, must_set_password, created_at FROM users WHERE role='student' ORDER BY created_at DESC");
  json_out(['ok'=>true, 'students'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
}
if ($action === 'delete') {
  $id = (int)($_POST['id'] ?? 0);
  if ($id<=0) json_out(['error'=>'missing_id'], 400);
  $stmt = $pdo->prepare('DELETE FROM users WHERE id=? AND role=\'student\'');
  $stmt->execute([$id]);
  json_out(['ok'=>true]);
}
if ($action === 'reset_password') {
  // Volta para a credencial inicial: o aluno entra com a data de nascimento e cria outra senha
  $in = json_decode(file_get_contents('php://input'), true) ?? [];
  $id = (int)($in['id'] ?? 0);
  if ($id<=0) json_out(['error'=>'missing_id'], 400);
  $stmt = $pdo->prepare("SELECT matricula, dob FROM users WHERE id=? AND role='student'");
  $stmt->execute([$id]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) json_out(['error'=>'not_found'], 404);
  $stmt = $pdo->prepare('UPDATE users SET password_hash=?, must_set_password=1 WHERE id=?');
  $stmt->execute([initial_password_hash($row['matricula'], $row['dob']), $id]);
  json_out(['ok'=>true]);
}
json_out(['error'=>'unknown_action'], 400);
