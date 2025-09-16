// ui.js - interface do simulador
// Responsável por atualizar DOM, gráficos, controles e logs

document.addEventListener('DOMContentLoaded', () => {
  const scenarioSelect = document.getElementById('scenario');
  const reloadBtn = document.getElementById('reload-btn');
  const metricsDiv = document.getElementById('metrics');
  const metricsGraph = document.getElementById('metrics-graph');
  const controlsForm = document.getElementById('controls');
  const logsDiv = document.getElementById('logs');
  const theoryDiv = document.getElementById('theory');
  const quizDiv = document.getElementById('quiz');
  const targetInput = document.getElementById('target-input');
  // auth
  const matriculaInput = document.getElementById('matricula');
  const dobInput = document.getElementById('dob');
  const tokenInput = document.getElementById('teacher-token');
  const btnRegisterTeacher = document.getElementById('btn-register-teacher');
  const studMat = document.getElementById('stud-mat');
  const studDob = document.getElementById('stud-dob');
  const btnRegisterStudent = document.getElementById('btn-register-student');
  const btnRefreshStudents = document.getElementById('btn-refresh-students');
  const studentsList = document.getElementById('students-list');
  const teacherPanel = document.getElementById('teacher-panel');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const authStatus = document.getElementById('auth-status');
  const resultsPanel = document.getElementById('results-panel');
  const resultsDiv = document.getElementById('results');
  const filterScenario = document.getElementById('filter-scenario');
  const filterFrom = document.getElementById('filter-from');
  const filterTo = document.getElementById('filter-to');
  const btnFilter = document.getElementById('btn-filter');
  const appContent = document.getElementById('app-content');
  const loginRequired = document.getElementById('login-required');

  let currentScenario = null;
  let metricsHistory = [];
  let lang = 'pt';
  let session = { user: null };

  async function api(path, method='GET', body) {
    const opts = { method, headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const r = await fetch('api/' + path, opts);
    return r.json();
  }

  async function refreshSession() {
    try {
      const me = await api('me.php');
      session.user = me.user;
      updateAuthUI();
      if (session.user) loadResults();
    } catch (e) {
      session.user = null; updateAuthUI();
    }
  }

  function updateAuthUI() {
    if (session.user) {
      authStatus.textContent = session.user.role === 'teacher' ? 'Logado (Professor)' : 'Logado (Aluno)';
      btnLogout.style.display = '';
      resultsPanel.style.display = '';
      appContent.style.display = '';
      loginRequired.style.display = 'none';
      teacherPanel.style.display = session.user.role === 'teacher' ? '' : 'none';
    } else {
      authStatus.textContent = 'Não logado';
      btnLogout.style.display = 'none';
      resultsPanel.style.display = 'none';
      appContent.style.display = 'none';
      loginRequired.style.display = '';
      teacherPanel.style.display = 'none';
    }
  }

  btnRegisterTeacher?.addEventListener('click', async () => {
    const out = await api('register.php','POST', { matricula: matriculaInput.value.trim(), dob: dobInput.value.trim(), token: tokenInput.value.trim() });
    authStatus.textContent = out.ok ? 'Professor cadastrado. Faça login.' : ('Erro: ' + (out.error || 'falha no cadastro'));
  });

  btnRegisterStudent?.addEventListener('click', async () => {
    const out = await api('register.php','POST', { matricula: studMat.value.trim(), dob: studDob.value.trim() });
    if (out.ok) {
      studMat.value=''; studDob.value='';
      authStatus.textContent = 'Aluno cadastrado com sucesso.';
      loadStudents();
    } else {
      authStatus.textContent = 'Erro: ' + (out.error || 'falha ao cadastrar aluno');
    }
  });

  btnRefreshStudents?.addEventListener('click', loadStudents);

  async function loadStudents() {
    if (!session.user || session.user.role !== 'teacher') return;
    const r = await api('students.php?action=list');
    if (!r.ok) { studentsList.textContent = 'Falha ao carregar alunos.'; return; }
    studentsList.innerHTML = r.students.map(s => `<div>#${s.id} - ${s.matricula} (desde ${s.created_at})</div>`).join('');
  }

  btnLogin?.addEventListener('click', async () => {
    const out = await api('login.php','POST', { matricula: matriculaInput.value.trim(), dob: dobInput.value.trim() });
    if (out.ok) {
      await refreshSession();
      loadStudents();
    } else {
      authStatus.textContent = 'Erro: ' + (out.error || 'login falhou');
    }
  });
  btnLogout?.addEventListener('click', async () => {
    await api('logout.php','POST',{});
    await refreshSession();
    studentsList.innerHTML = '';
  });

  btnFilter?.addEventListener('click', () => loadResults());

  async function loadResults() {
    const params = new URLSearchParams();
    if (filterScenario?.value) params.set('scenario', filterScenario.value.trim());
    if (filterFrom?.value) params.set('from', filterFrom.value.trim());
    if (filterTo?.value) params.set('to', filterTo.value.trim());
    const path = 'list_results.php' + (params.toString() ? ('?' + params.toString()) : '');
    const list = await api(path);
    if (!list.ok) { resultsDiv.textContent = 'Falha ao carregar resultados'; return; }
    const rows = list.results;
    resultsDiv.innerHTML = rows.map(r => {
      const who = r.matricula ? ` (Aluno: ${r.matricula})` : '';
      const pdfUrl = `api/report_html.php?id=${encodeURIComponent(r.id)}`;
      return `<div>(${r.created_at}) Cenário: ${r.scenario}${who} - <a href="#" data-id="${r.id}" class="view-res">ver</a> | <a href="#" data-id="${r.id}" class="dl-res">baixar</a> | <a href="${pdfUrl}" target="_blank">PDF</a></div>`;
    }).join('');
    resultsDiv.querySelectorAll('.view-res').forEach(a => a.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = e.target.getAttribute('data-id');
      const res = await api('get_result.php?id=' + encodeURIComponent(id));
      if (res.ok) {
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = JSON.stringify(res.result.payload, null, 2);
        e.target.closest('div').after(pre);
      }
    }));
    resultsDiv.querySelectorAll('.dl-res').forEach(a => a.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = e.target.getAttribute('data-id');
      const res = await api('get_result.php?id=' + encodeURIComponent(id));
      if (res.ok) {
        const blob = new Blob([JSON.stringify(res.result.payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resultado_${res.result.scenario}_${res.result.id}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }));
  }

  // Carrega lista de cenários
  const scenarios = [
    { file: 'ddos-basic.json', label: 'DDoS Básico' },
    { file: 'sqli-basic.json', label: 'SQL Injection' },
    { file: 'arp-spoof.json', label: 'ARP Spoof' }
  ];
  scenarios.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.file;
    opt.textContent = s.label;
    scenarioSelect.appendChild(opt);
  });

  // Carrega cenário selecionado
  async function loadSelectedScenario() {
    const file = scenarioSelect.value;
    const resp = await fetch('scenarios/' + file);
    const data = await resp.json();
    currentScenario = data;
    metricsHistory = [];
    Engine.loadScenario(data, { lang, target: targetInput.value });
  }

  scenarioSelect.addEventListener('change', loadSelectedScenario);
  targetInput.addEventListener('change', loadSelectedScenario);
  reloadBtn.addEventListener('click', () => {
    Engine.reset(targetInput.value);
    metricsHistory = [];
    clearGraph();
  });

  // Atualiza painel de métricas
  Engine.onMetrics((metrics, schema, dict, extra) => {
    metricsDiv.innerHTML = '';
    Object.keys(schema).forEach(k => {
      const m = document.createElement('div');
      m.className = 'metric';
      m.innerHTML = `<strong>${t(k, dict)}</strong><br>${metrics[k]}`;
      metricsDiv.appendChild(m);
    });
    // Gráfico
    metricsHistory.push(deepClone(metrics));
    drawGraph(metricsHistory, schema);
    // Topologia (ARP Spoof)
    if (extra && extra.drawTopology) drawTopology();
  });

  // Atualiza painel de logs
  Engine.onLog((entry, all) => {
    const last = all.slice(-50).join('<br>');
    logsDiv.innerHTML = last;
    logsDiv.scrollTop = logsDiv.scrollHeight;
  });

  // Atualiza painel de teoria
  Engine.onTheory(explanation => {
    if (!explanation) return;
    // Se for string simples
    if (typeof explanation === 'string') {
      theoryDiv.innerHTML = `<p>${explanation}</p>` + theoryDiv.innerHTML;
    } else if (Array.isArray(explanation)) {
      const html = explanation.map(p => `<p>${p}</p>`).join('');
      theoryDiv.innerHTML = html + theoryDiv.innerHTML;
    } else if (typeof explanation === 'object') {
      // chave: parágrafo
      const html = Object.values(explanation).map(p => `<p>${p}</p>`).join('');
      theoryDiv.innerHTML = html + theoryDiv.innerHTML;
    }
  });

  // Quiz
  Engine.onQuiz(questionObj => {
    // Estrutura esperada: { id, question, options:[...], answer: index, explain } OU array de tais objetos
    const list = Array.isArray(questionObj) ? questionObj : [questionObj];
    list.forEach(q => renderQuiz(q));
  });

  function renderQuiz(q) {
    if (!q || !q.question) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'quiz-block';
    const title = document.createElement('h3');
    title.textContent = q.question;
    wrapper.appendChild(title);
    const opts = document.createElement('div');
    opts.className = 'quiz-options';
    q.options.forEach((opt, idx) => {
      const label = document.createElement('label');
      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = 'quiz_' + (q.id || q.question.replace(/\s+/g,'_'));
      rb.value = idx;
      rb.addEventListener('change', () => {
        giveFeedback(idx === q.answer, wrapper, q);
      });
      label.appendChild(rb);
      label.appendChild(document.createTextNode(' ' + opt));
      opts.appendChild(label);
    });
    wrapper.appendChild(opts);
    const fb = document.createElement('div');
    fb.className = 'quiz-feedback';
    wrapper.appendChild(fb);
    quizDiv.prepend(wrapper);
  }

  function giveFeedback(correct, block, q) {
    const fb = block.querySelector('.quiz-feedback');
    fb.textContent = correct ? 'Correto!' : 'Incorreto.';
    fb.classList.remove('quiz-correct','quiz-wrong');
    fb.classList.add(correct ? 'quiz-correct' : 'quiz-wrong');
    if (q.explain) {
      const p = document.createElement('p');
      p.style.margin = '0.3em 0 0';
      p.textContent = q.explain;
      fb.appendChild(p);
    }
  }

  // Atualiza controles
  Engine.onControls((controls, schema, dict) => {
    controlsForm.innerHTML = '';
    Object.keys(schema).forEach(k => {
      const s = schema[k];
      const label = document.createElement('label');
      label.textContent = t(k, dict);
      let input;
      if (s.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = controls[k];
        input.addEventListener('change', e => Engine.applyControl(k, e.target.checked));
      } else if (s.type === 'range') {
        input = document.createElement('input');
        input.type = 'range';
        input.min = s.min;
        input.max = s.max;
        input.value = controls[k];
        input.addEventListener('input', e => Engine.applyControl(k, Number(e.target.value)));
      }
      label.appendChild(input);
      controlsForm.appendChild(label);
    });
    // Botão iniciar
  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.textContent = 'Iniciar Simulação';
  startBtn.onclick = () => Engine.start(targetInput.value);
  controlsForm.appendChild(startBtn);
    // Botão exportar
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.textContent = 'Exportar Resultados';
    exportBtn.onclick = async () => {
      const data = Engine.exportResults();
      if (session.user) {
        try {
          const res = await api('save_result.php','POST',{ scenario: currentScenario?.id || currentScenario?.name || 'scenario', payload: data });
          if (res.ok) {
            authStatus.textContent = 'Resultados enviados ao servidor.';
            loadResults();
            return;
          }
        } catch {}
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'simulacao_resultado.json';
      a.click();
      URL.revokeObjectURL(url);
    };
    controlsForm.appendChild(exportBtn);

    // Botão mostrar resumo (teoria.final)
    const summaryBtn = document.createElement('button');
    summaryBtn.type = 'button';
    summaryBtn.textContent = 'Mostrar Resumo';
    summaryBtn.onclick = () => {
      if (currentScenario && currentScenario.theory && currentScenario.theory.final) {
        // Reaproveita mecanismo de teoria adicionando manualmente
        const finalBlock = currentScenario.theory.final;
        if (Array.isArray(finalBlock)) {
          const html = finalBlock.map(p => `<p>${p}</p>`).join('');
          theoryDiv.innerHTML = html + theoryDiv.innerHTML;
        } else if (typeof finalBlock === 'string') {
          theoryDiv.innerHTML = `<p>${finalBlock}</p>` + theoryDiv.innerHTML;
        } else if (typeof finalBlock === 'object') {
          const html = Object.values(finalBlock).map(p => `<p>${p}</p>`).join('');
          theoryDiv.innerHTML = html + theoryDiv.innerHTML;
        }
      }
    };
    controlsForm.appendChild(summaryBtn);
  });

  // Gráfico simples (Canvas)
  function drawGraph(history, schema) {
    const ctx = metricsGraph.getContext('2d');
    ctx.clearRect(0, 0, metricsGraph.width, metricsGraph.height);
    const keys = Object.keys(schema);
    const colors = ['#2196f3', '#f44336', '#4caf50', '#ff9800'];
    keys.forEach((k, i) => {
      ctx.beginPath();
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = 2;
      history.forEach((m, j) => {
        const x = (j / Math.max(1,(history.length - 1))) * (metricsGraph.width - 10) + 5;
        const y = metricsGraph.height - 10 - (m[k] / 100) * (metricsGraph.height - 20);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.closePath();
    });
  }
  function clearGraph() {
    const ctx = metricsGraph.getContext('2d');
    ctx.clearRect(0, 0, metricsGraph.width, metricsGraph.height);
  }

  // Topologia animada (ARP Spoof)
  function drawTopology() {
    const ctx = metricsGraph.getContext('2d');
    ctx.clearRect(0, 0, metricsGraph.width, metricsGraph.height);
    // Desenha hosts e setas
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(40, 60, 40, 40); // Host A
    ctx.fillStyle = '#f44336';
    ctx.fillRect(320, 60, 40, 40); // Host B
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(180, 10, 40, 40); // Atacante
    // Setas
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, 80); ctx.lineTo(180, 30); // A -> Atacante
    ctx.moveTo(360, 80); ctx.lineTo(220, 30); // B -> Atacante
    ctx.moveTo(200, 50); ctx.lineTo(200, 100); // Atacante -> B
    ctx.stroke();
    ctx.closePath();
    // Rótulos
    ctx.fillStyle = '#222';
    ctx.font = '14px Arial';
    ctx.fillText('Host A', 30, 115);
    ctx.fillText('Host B', 310, 115);
    ctx.fillText('Atacante', 170, 8);
  }

  // Inicializa
  refreshSession().then(() => loadSelectedScenario());
});
