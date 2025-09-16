<?php
require __DIR__ . '/db.php';
require_session();
$userId = current_user_id();
if (!$userId) { http_response_code(401); echo 'Unauthorized'; exit; }
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) { http_response_code(400); echo 'Missing id'; exit; }
$stmt = $pdo->prepare('SELECT r.id, r.user_id, r.scenario, r.payload, r.created_at, u.matricula FROM results r JOIN users u ON u.id=r.user_id WHERE r.id=?');
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) { http_response_code(404); echo 'Not found'; exit; }
if (!is_teacher() && (int)$row['user_id'] !== (int)$userId) { http_response_code(403); echo 'Forbidden'; exit; }
$payload = json_decode($row['payload'], true) ?: [];
$metrics = $payload['metrics'] ?? [];
$controls = $payload['controls'] ?? [];
$logs = $payload['logs'] ?? [];
$scenario = htmlspecialchars($row['scenario'] ?? '');
$matricula = htmlspecialchars($row['matricula'] ?? '');
$created = htmlspecialchars($row['created_at'] ?? '');
?><!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Relatório - <?php echo $scenario; ?> #<?php echo (int)$row['id']; ?></title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
  header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  h1 { font-size: 20px; margin: 0; }
  .meta { font-size: 12px; color:#555; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
  .card { border:1px solid #ddd; padding:12px; border-radius:6px; }
  .card h2 { font-size: 16px; margin: 0 0 8px; }
  table { border-collapse: collapse; width:100%; font-size: 13px; }
  th, td { border:1px solid #ddd; padding:6px 8px; text-align:left; }
  pre { white-space: pre-wrap; font-size: 12px; background:#fafafa; border:1px solid #eee; padding:8px; }
  .actions { margin:12px 0 20px; }
  .no-print { display:inline-block; }
  @media print { .no-print { display:none; } }
</style>
</head>
<body>
<header>
  <div>
    <h1>Relatório de Simulação</h1>
    <div class="meta">Cenário: <strong><?php echo $scenario; ?></strong> &nbsp;|&nbsp; ID: <?php echo (int)$row['id']; ?> &nbsp;|&nbsp; Data: <?php echo $created; ?></div>
    <div class="meta">Matrícula: <?php echo $matricula; ?></div>
  </div>
  <div class="no-print">
    <button onclick="window.print()">Imprimir / Salvar em PDF</button>
  </div>
</header>
<div class="grid">
  <div class="card">
    <h2>Métricas</h2>
    <table>
      <thead><tr><th>Métrica</th><th>Valor</th></tr></thead>
      <tbody>
      <?php foreach ($metrics as $k=>$v): ?>
        <tr><td><?php echo htmlspecialchars((string)$k); ?></td><td><?php echo htmlspecialchars(is_scalar($v)? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE)); ?></td></tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="card">
    <h2>Controles</h2>
    <table>
      <thead><tr><th>Controle</th><th>Valor</th></tr></thead>
      <tbody>
      <?php foreach ($controls as $k=>$v): ?>
        <tr><td><?php echo htmlspecialchars((string)$k); ?></td><td><?php echo htmlspecialchars(is_scalar($v)? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE)); ?></td></tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<div class="card" style="margin-top:16px;">
  <h2>Logs</h2>
  <?php if ($logs): ?>
    <pre><?php echo htmlspecialchars(implode("\n", $logs)); ?></pre>
  <?php else: ?>
    <div>Nenhum log disponível.</div>
  <?php endif; ?>
</div>
</body>
</html>