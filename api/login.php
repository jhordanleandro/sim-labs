<?php
require __DIR__ . '/db.php';
require_session();
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$mat = trim($in['matricula'] ?? '');
$dob = trim($in['dob'] ?? '');
if (!$mat || !$dob) json_out(['error'=>'missing_fields'], 400);
$pass = $mat . '|' . $dob;
$stmt = $pdo->prepare('SELECT id, password_hash, role FROM users WHERE matricula=?');
$stmt->execute([$mat]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row || !password_verify($pass, $row['password_hash'])) json_out(['error'=>'invalid_credentials'], 401);
$_SESSION['user_id'] = (int)$row['id'];
$_SESSION['role'] = $row['role'];
json_out(['ok'=>true, 'role'=>$row['role']]);
