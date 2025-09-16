<?php
require __DIR__ . '/db.php';
require_session();
$userId = current_user_id();
if (!$userId) json_out(['error'=>'unauthorized'], 401);

$scenario = isset($_GET['scenario']) ? trim($_GET['scenario']) : '';
$from = isset($_GET['from']) ? trim($_GET['from']) : '';
$to = isset($_GET['to']) ? trim($_GET['to']) : '';
$params = [];
$where = [];

if ($scenario !== '') { $where[] = 'r.scenario = ?'; $params[] = $scenario; }
if ($from !== '') { $where[] = 'r.created_at >= ?'; $params[] = $from . (strlen($from)===10 ? ' 00:00:00' : ''); }
if ($to !== '') { $where[] = 'r.created_at <= ?'; $params[] = $to . (strlen($to)===10 ? ' 23:59:59' : ''); }

if (is_teacher()) {
  $sql = 'SELECT r.id, r.scenario, r.created_at, u.matricula FROM results r JOIN users u ON u.id=r.user_id';
  if ($where) { $sql .= ' WHERE ' . implode(' AND ', $where); }
  $sql .= ' ORDER BY r.created_at DESC';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  json_out(['ok'=>true, 'results'=>$rows]);
} else {
  $sql = 'SELECT id, scenario, created_at FROM results r WHERE r.user_id=?';
  $paramsStu = [$userId];
  if ($where) { $sql .= ' AND ' . implode(' AND ', $where); $paramsStu = array_merge($paramsStu, $params); }
  $sql .= ' ORDER BY r.created_at DESC';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($paramsStu);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  json_out(['ok'=>true, 'results'=>$rows]);
}
