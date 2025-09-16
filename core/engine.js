// engine.js - motor de simulação modular
// Carrega cenários, executa passos, atualiza métricas e logs

const Engine = (function() {
  let scenario = null;
  let state = {};
  let running = false;
  let metricsInterval = null;
  let logCallback = null;
  let metricsCallback = null;
  let controlsCallback = null;
  let theoryCallback = null;
  let quizCallback = null;
  let lang = 'pt';
  let dict = {};
  let prevMetrics = null;

  // Carrega cenário a partir de JSON
  async function loadScenario(scenarioData, options = {}) {
    scenario = deepClone(scenarioData);
    state = {
      step: 0,
      metrics: deepClone(scenario.metrics.initial),
      controls: deepClone(scenario.controls.initial),
      logs: [],
      history: [],
      target: options.target || '',
      ...options.state
    };
    lang = options.lang || 'pt';
    dict = scenario.dict ? scenario.dict[lang] : {};
    prevMetrics = deepClone(state.metrics);
    if (controlsCallback) controlsCallback(state.controls, scenario.controls.schema, dict);
    if (metricsCallback) metricsCallback(state.metrics, scenario.metrics.schema, dict);
    log('--- ' + t('simulation_started', dict) + ' ---');
    if(state.target) log('Alvo definido: ' + state.target);
    running = false;
  }

  // Inicia simulação
  async function start(target) {
    if (!scenario) return;
    if (target) state.target = target;
    running = true;
    state.step = 0;
    state.logs = [];
    state.history = [];
    log('--- ' + t('simulation_running', dict) + ' ---');
    if(state.target) log('Alvo: ' + state.target);
    // Atualiza métricas periodicamente
    if (metricsInterval) clearInterval(metricsInterval);
    metricsInterval = setInterval(() => {
      if (metricsCallback) metricsCallback(state.metrics, scenario.metrics.schema, dict);
    }, 500);
    // Executa passos
    for (let i = 0; i < scenario.steps.length && running; i++) {
      state.step = i;
      await runStep(scenario.steps[i]);
    }
    // Simula queda do alvo no DDoS
    if (scenario.name && scenario.name.toLowerCase().includes('ddos')) {
      log('Alvo ' + (state.target || 'desconhecido') + ' ficou INDISPONÍVEL!');
      // Zera métricas
      if (state.metrics) {
        Object.keys(state.metrics).forEach(k => state.metrics[k] = 0);
        if (metricsCallback) metricsCallback(state.metrics, scenario.metrics.schema, dict);
      }
    }
    // Injetar teoria final automática se existir
    if (scenario.theory && scenario.theory.final && theoryCallback) {
      theoryCallback(scenario.theory.final);
    }
    running = false;
    if (metricsInterval) clearInterval(metricsInterval);
    log('--- ' + t('simulation_finished', dict) + ' ---');
  }

  // Executa um passo do cenário
  async function runStep(step) {
    log(t(step.title, dict));
    // Teoria associada ao passo
    if (scenario.theory && scenario.theory[step.title]) {
      if (theoryCallback) theoryCallback(scenario.theory[step.title]);
    }
    // Quiz associado ao passo
    if (scenario.questions && scenario.questions[step.title]) {
      if (quizCallback) quizCallback(scenario.questions[step.title]);
    }
    for (let action of step.actions) {
      if (!running) break;
      await doAction(action);
    }
  }

  // Executa uma ação (simulada)
  async function doAction(action) {
    // Delay simulado
    if (action.delay) await sleep(action.delay);
    // Atualiza métricas
    if (action.metrics) {
      const before = deepClone(state.metrics);
      for (let k in action.metrics) {
        if (typeof state.metrics[k] === 'number') {
          state.metrics[k] += action.metrics[k];
        } else {
          state.metrics[k] = action.metrics[k];
        }
      }
      checkMetricHints(before, state.metrics);
      prevMetrics = deepClone(state.metrics);
    }
    // Log
    if (action.log) log(t(action.log, dict));
    // Ações especiais
    if (action.special) {
      await specialAction(action.special);
    }
    // Atualiza métricas
    if (metricsCallback) metricsCallback(state.metrics, scenario.metrics.schema, dict);
  }

  // Executa ações especiais (ex: gerar IPs, simular topologia)
  async function specialAction(type) {
    if (type === 'generate_ips') {
      let ips = [];
      for (let i = 0; i < 10; i++) ips.push(randomIP());
      log(t('generated_ips', dict) + ': ' + ips.join(', '));
    }
    if (type === 'draw_topology') {
      // Sinaliza para UI desenhar topologia
      if (metricsCallback) metricsCallback(state.metrics, scenario.metrics.schema, dict, { drawTopology: true });
    }
  }

  // Aplica controles (defesas, parâmetros)
  function applyControl(name, value) {
    const before = deepClone(state.metrics);
    state.controls[name] = value;
    log(t('control_applied', dict) + ': ' + t(name, dict) + ' = ' + value);
    // Executa lógica de defesa (simulada)
    if (scenario.controls.effects && scenario.controls.effects[name]) {
      scenario.controls.effects[name](state, scenario, value, log, t, dict);
    }
    checkMetricHints(before, state.metrics);
    prevMetrics = deepClone(state.metrics);
    if (metricsCallback) metricsCallback(state.metrics, scenario.metrics.schema, dict);
  }

  // Reinicia simulação
  function reset(target) {
    loadScenario(scenario, { target: target || state.target });
  }

  // Registra log
  function log(msg) {
    const entry = `[${formatTime()}] ${msg}`;
    state.logs.push(entry);
    if (logCallback) logCallback(entry, state.logs);
  }

  // Exporta resultados
  function exportResults() {
    return {
      scenario: scenario.name,
      metrics: state.metrics,
      controls: state.controls,
      logs: state.logs,
      history: state.history
    };
  }

  // Setters de callback
  function onLog(cb) { logCallback = cb; }
  function onMetrics(cb) { metricsCallback = cb; }
  function onControls(cb) { controlsCallback = cb; }
  function onTheory(cb) { theoryCallback = cb; }
  function onQuiz(cb) { quizCallback = cb; }

  // Suporte a múltiplos idiomas
  function setLang(l) { lang = l; dict = scenario.dict ? scenario.dict[lang] : {}; }

  function checkMetricHints(before, current) {
    if (!scenario.metricHints || !theoryCallback) return;
    const messages = [];
    for (const metric in scenario.metricHints) {
      const cfg = scenario.metricHints[metric];
      const prevVal = typeof before[metric] === 'number' ? before[metric] : null;
      const curVal = typeof current[metric] === 'number' ? current[metric] : null;
      if (prevVal === null || curVal === null) continue;
      // Greater-than thresholds (crossing)
      if (Array.isArray(cfg.gt)) {
        cfg.gt.forEach(rule => {
          const thr = rule.value;
          if (prevVal <= thr && curVal > thr) messages.push(rule.msg);
        });
      }
      // Less-than thresholds (crossing)
      if (Array.isArray(cfg.lt)) {
        cfg.lt.forEach(rule => {
          const thr = rule.value;
          if (prevVal >= thr && curVal < thr) messages.push(rule.msg);
        });
      }
      // Delta up
      if (Array.isArray(cfg.deltaUp)) {
        cfg.deltaUp.forEach(rule => {
          if ((curVal - prevVal) >= rule.value) messages.push(rule.msg);
        });
      }
      // Delta down
      if (Array.isArray(cfg.deltaDown)) {
        cfg.deltaDown.forEach(rule => {
          if ((prevVal - curVal) >= rule.value) messages.push(rule.msg);
        });
      }
    }
    if (messages.length) {
      const text = messages.map(k => t(k, dict));
      theoryCallback(text);
    }
  }

  return {
    loadScenario, start, reset, applyControl, exportResults,
    onLog, onMetrics, onControls, onTheory, onQuiz, setLang
  };
})();
