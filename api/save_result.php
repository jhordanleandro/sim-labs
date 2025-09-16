<?php
require __DIR__ . '/db.php';
require_session();
$userId = current_user_id();
if (!$userId) json_out(['error'=>'unauthorized'], 401);
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$scenario = $in['scenario'] ?? '';
$payload = $in['payload'] ?? null;
if (!$scenario || $payload === null) json_out(['error'=>'missing_fields'], 400);
$stmt = $pdo->prepare('INSERT INTO results (user_id, scenario, payload, created_at) VALUES (?,?,?,datetime("now"))');
$stmt->execute([$userId, $scenario, json_encode($payload, JSON_UNESCAPED_UNICODE)]);
json_out(['ok'=>true]);
