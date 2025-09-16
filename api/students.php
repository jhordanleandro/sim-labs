<?php
require __DIR__ . '/db.php';
require_session();
if (!is_teacher()) json_out(['error'=>'forbidden'], 403);
$action = $_GET['action'] ?? 'list';
if ($action === 'list') {
  $stmt = $pdo->query("SELECT id, matricula, created_at FROM users WHERE role='student' ORDER BY created_at DESC");
  json_out(['ok'=>true, 'students'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
}
if ($action === 'delete') {
  $id = (int)($_POST['id'] ?? 0);
  if ($id<=0) json_out(['error'=>'missing_id'], 400);
  $stmt = $pdo->prepare('DELETE FROM users WHERE id=? AND role=\'student\'');
  $stmt->execute([$id]);
  json_out(['ok'=>true]);
}
json_out(['error'=>'unknown_action'], 400);
