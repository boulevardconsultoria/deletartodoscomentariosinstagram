(async () => {
  const BATCH_SIZE = 40;
  const WAIT_BETWEEN_CLICKS = [180, 320];
  const WAIT_AFTER_SELECT = [1000, 1600];
  const WAIT_AFTER_DELETE = [2200, 3200];
  const WAIT_BETWEEN_BATCHES = [1200, 2000];
  const MAX_NO_PROGRESS = 3;
  const MAX_CLICK_RETRIES = 2;
  const STORAGE_KEY = "__bulkDeleteState";

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const randSleep = ([min, max]) => sleep(min + Math.random() * (max - min));

  const visible = el => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };

  const click = el => {
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    el.click();
    return true;
  };

  const textOf = el => (el.innerText || el.textContent || "").trim().toLowerCase();

  const getCheckboxes = () =>
    [...document.querySelectorAll(
      '[data-testid="bulk_action_checkbox"] [role="button"][aria-label="Alternar caixa de seleção"]'
    )].filter(visible);

  const getDeleteButtons = () =>
    [...document.querySelectorAll('[role="button"][aria-label="Excluir"]')]
      .filter(visible)
      .filter(el => !el.disabled)
      .filter(el => el.getAttribute("aria-disabled") !== "true");

  const isChecked = el =>
    el.getAttribute("aria-checked") === "true" ||
    el.getAttribute("aria-pressed") === "true";

  const detectErrorToast = () => {
    const texts = [...document.querySelectorAll('[role="alert"], [role="dialog"] span, div')]
      .filter(visible)
      .slice(0, 200)
      .map(textOf)
      .filter(Boolean);

    return texts.find(t =>
      t.includes("tente novamente") ||
      t.includes("algo deu errado") ||
      t.includes("try again") ||
      t.includes("limite")
    );
  };

  const findSelectCommentsButton = () => {
    const all = [...document.querySelectorAll("body *")].filter(visible);

    let match = all.find(el => {
      const label = (el.getAttribute("aria-label") || "").trim().toLowerCase();
      const txt = (el.innerText || "").trim().toLowerCase();
      return label === "selecionar" || txt === "selecionar";
    });

    if (match) {
      let clickable = match;
      let hops = 0;
      while (
        clickable &&
        hops < 4 &&
        clickable.tagName !== "BUTTON" &&
        clickable.getAttribute("role") !== "button" &&
        getComputedStyle(clickable).cursor !== "pointer"
      ) {
        clickable = clickable.parentElement;
        hops++;
      }
      return clickable || match;
    }

    return null;
  };

  const debugListCandidates = () => {
    const all = [...document.querySelectorAll("body *")].filter(visible);
    const candidates = all
      .filter(el => {
        const txt = (el.innerText || "").trim().toLowerCase();
        return txt && txt.length < 30 && txt.includes("selecion");
      })
      .slice(0, 15);

    console.log("🧪 Candidatos encontrados com 'selecion' no texto:");
    candidates.forEach((el, i) => {
      console.log(
        `${i + 1}.`,
        el.tagName,
        JSON.stringify(el.getAttribute("aria-label") || ""),
        JSON.stringify((el.innerText || "").trim()),
        el
      );
    });

    if (!candidates.length) {
      console.log("Nenhum elemento visível contém 'selecion' no texto. Talvez o botão exija hover/scroll pra aparecer, ou o texto seja outro.");
    }
  };

  async function waitFor(fn, timeout = 10000, interval = 250) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = fn();
      if (result) return result;
      await sleep(interval);
    }
    return null;
  }

  const waitForDeleteButton = (timeout = 10000) =>
    waitFor(() => getDeleteButtons()[0] || null, timeout);

  const waitForConfirmation = (timeout = 10000) =>
    waitFor(() => {
      const btns = [...document.querySelectorAll('[role="button"], button')]
        .filter(visible)
        .filter(el => textOf(el) === "excluir")
        .filter(el => !el.disabled)
        .filter(el => el.getAttribute("aria-disabled") !== "true");
      return btns.length ? btns[btns.length - 1] : null;
    }, timeout);

  async function clickCheckboxWithRetry(el) {
    for (let attempt = 0; attempt <= MAX_CLICK_RETRIES; attempt++) {
      click(el);
      await sleep(120);
      if (isChecked(el)) return true;
    }
    return isChecked(el);
  }

  async function ensureSelectionMode() {
    if (getCheckboxes().length > 0) return true;

    console.log("🔎 Procurando botão 'Selecionar'...");
    const btn = await waitFor(findSelectCommentsButton, 8000);

    if (!btn) {
      console.error("❌ Não encontrei o botão 'Selecionar'.");
      debugListCandidates();
      return false;
    }

    console.log("👉 Ativando modo de seleção...", btn);
    click(btn);
    await sleep(1200);

    const ok = await waitFor(() => getCheckboxes().length > 0, 8000);

    if (!ok) {
      console.error("❌ Cliquei no botão, mas os checkboxes não apareceram.");
      debugListCandidates();
    }

    return !!ok;
  }

  function saveState(total) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ total, ts: Date.now() }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearState() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  async function reloadToContinue(total, reason) {
    console.warn(`🔄 ${reason} Atualizando a página para carregar mais comentários...`);
    console.log("💡 Depois do reload, cole e rode este mesmo script de novo para continuar.");
    saveState(total);
    await sleep(1000);
    location.reload();
  }

  window.__stopBulkDelete = false;

  const saved = loadState();
  let total = saved ? saved.total : 0;

  if (saved) {
    console.log(`♻️ Progresso anterior encontrado: ${total} processados. Retomando...`);
  }

  console.log("🚀 Iniciando...");
  console.log("💡 Para parar a qualquer momento, rode: window.__stopBulkDelete = true");

  const enteredSelection = await ensureSelectionMode();
  if (!enteredSelection) {
    console.log("Pare e verifique manualmente, ou me mande o resultado do diagnóstico acima.");
    return;
  }

  console.log("Comentários encontrados:", getCheckboxes().length);

  let noProgressCount = 0;
  let prevCount = Infinity;

  while (true) {
    if (window.__stopBulkDelete) {
      console.log("⏹️ Interrompido manualmente.");
      clearState();
      break;
    }

    let boxes = getCheckboxes();

    if (!boxes.length) {
      // Não há mais checkboxes carregados na tela — mas pode haver mais
      // comentários no total. Recarrega pra tentar continuar.
      await reloadToContinue(total, "Não há mais comentários carregados.");
      return;
    }

    if (boxes.length >= prevCount) {
      noProgressCount++;

      if (noProgressCount >= MAX_NO_PROGRESS) {
        await reloadToContinue(total, "Sem progresso na exclusão.");
        return;
      }
    } else {
      noProgressCount = 0;
    }
    prevCount = boxes.length;

    const amount = Math.min(BATCH_SIZE, boxes.length);
    console.log(`📌 Selecionando ${amount} comentários...`);

    let failedClicks = 0;
    for (let i = 0; i < amount; i++) {
      const current = getCheckboxes();
      if (!current[i]) break;

      const ok = await clickCheckboxWithRetry(current[i]);
      if (!ok) failedClicks++;

      await randSleep(WAIT_BETWEEN_CLICKS);
    }

    if (failedClicks > 0) {
      console.warn(`⚠️ ${failedClicks} checkbox(es) podem não ter sido marcados corretamente.`);
    }

    await randSleep(WAIT_AFTER_SELECT);

    const errorToast = detectErrorToast();
    if (errorToast) {
      console.error("❌ Instagram sinalizou um erro/limite:", errorToast);
      console.log("Pare o script e tente novamente mais tarde.");
      clearState();
      break;
    }

    let deleteButton = await waitForDeleteButton();
    if (!deleteButton) {
      console.error("❌ Não encontrei um botão 'Excluir' habilitado.");
      console.log("Pare o script para evitar qualquer ação inesperada.");
      break;
    }

    console.log("🗑️ Excluindo lote...");
    click(deleteButton);
    await randSleep(WAIT_AFTER_DELETE);

    const confirmation = await waitForConfirmation(5000);
    if (confirmation) {
      console.log("⚠️ Confirmando exclusão...");
      click(confirmation);
      await randSleep(WAIT_AFTER_DELETE);
    }

    const postDeleteError = detectErrorToast();
    if (postDeleteError) {
      console.error("❌ Erro após exclusão:", postDeleteError);
      console.log("Parando por segurança.");
      clearState();
      break;
    }

    total += amount;
    saveState(total);
    console.log(`✅ Lote concluído. Aproximadamente ${total} processados.`);

    await randSleep(WAIT_BETWEEN_BATCHES);
  }

  console.log(`🏁 Finalizado. Total processado: ~${total}`);
})();
