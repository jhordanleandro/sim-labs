<?php
require __DIR__ . '/db.php';
require_session();
$userId = $_SESSION['user_id'] ?? null;
if (!$userId || !password_pending()) json_out(['error'=>'forbidden'], 403);
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$password = (string)($in['password'] ?? '');
// bcrypt considera só os primeiros 72 bytes
if (strlen($password) < 8) json_out(['error'=>'password_too_short'], 400);
if (strlen($password) > 72) json_out(['error'=>'password_too_long'], 400);
$stmt = $pdo->prepare('UPDATE users SET password_hash=?, must_set_password=0 WHERE id=?');
$stmt->execute([password_hash($password, PASSWORD_DEFAULT), (int)$userId]);
session_regenerate_id(true);
unset($_SESSION['must_set_password']);
json_out(['ok'=>true, 'role'=>$_SESSION['role']]);
