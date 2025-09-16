<?php
require __DIR__ . '/db.php';
require_session();
$userId = current_user_id();
if (!$userId) json_out(['error'=>'unauthorized'], 401);
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) json_out(['error'=>'missing_id'], 400);
$stmt = $pdo->prepare('SELECT r.id, r.user_id, r.scenario, r.payload, r.created_at, u.matricula FROM results r JOIN users u ON u.id=r.user_id WHERE r.id=?');
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) json_out(['error'=>'not_found'], 404);
if (!is_teacher() && (int)$row['user_id'] !== (int)$userId) json_out(['error'=>'forbidden'], 403);
json_out(['ok'=>true, 'result'=>[
  'id'=>$row['id'],
  'scenario'=>$row['scenario'],
  'created_at'=>$row['created_at'],
  'matricula'=>$row['matricula'] ?? null,
  'payload'=>json_decode($row['payload'], true)
]]);
