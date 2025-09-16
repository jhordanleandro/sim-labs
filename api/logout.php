<?php
require __DIR__ . '/db.php';
require_session();
session_destroy();
json_out(['ok'=>true]);
