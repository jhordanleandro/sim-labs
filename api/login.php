<?php
require __DIR__ . '/db.php';
require_session();
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$mat = trim($in['matricula'] ?? '');
$secret = (string)($in['senha'] ?? $in['dob'] ?? '');
if (!$mat || $secret === '') json_out(['error'=>'missing_fields'], 400);
$stmt = $pdo->prepare('SELECT id, password_hash, role, must_set_password FROM users WHERE matricula=?');
$stmt->execute([$mat]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) json_out(['error'=>'invalid_credentials'], 401);
// 1º acesso (ou senha redefinida): a credencial é a data de nascimento
$pending = (int)$row['must_set_password'] === 1;
$pass = $pending ? ($mat . '|' . trim($secret)) : $secret;
if (!password_verify($pass, $row['password_hash'])) json_out(['error'=>'invalid_credentials'], 401);
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$row['id'];
$_SESSION['role'] = $row['role'];
$_SESSION['must_set_password'] = $pending;
json_out(['ok'=>true, 'role'=>$row['role'], 'must_set_password'=>$pending]);
