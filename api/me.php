<?php
require __DIR__ . '/db.php';
require_session();
if (password_pending()) json_out(['ok'=>true, 'user'=>null, 'must_set_password'=>true]);
if (!current_user_id()) json_out(['ok'=>true, 'user'=>null]);
json_out(['ok'=>true, 'user'=>[
  'id'=>current_user_id(),
  'role'=>$_SESSION['role']
]]);
