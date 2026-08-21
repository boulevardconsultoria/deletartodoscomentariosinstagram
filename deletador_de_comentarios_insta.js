(async () => { 
  const BATCH_SIZE = 40; 
  const WAIT_AFTER_SELECT = 1200; 
  const WAIT_AFTER_DELETE = 2500; 
  const WAIT_BETWEEN_CLICKS = 250; 
 
  const sleep = ms => new Promise(r => setTimeout(r, ms)); 
 
  const visible = el => { 
    if (!el) return false; 
 
    const r = el.getBoundingClientRect(); 
 
    return ( 
      r.width > 0 && 
      r.height > 0 && 
      getComputedStyle(el).visibility !== "hidden" 
    ); 
  }; 
 
  const click = el => { 
    if (!el) return false; 
 
    el.scrollIntoView({ 
      block: "center", 
      behavior: "instant" 
    }); 
 
    // O Instagram atual coloca pointer-events:none 
    // nesses elementos, mas o click programático ainda 
    // pode disparar o evento DOM. 
    el.click(); 
 
    return true; 
  }; 
 
  const getCheckboxes = () => 
    [...document.querySelectorAll( 
      '[data-testid="bulk_action_checkbox"] [role="button"][aria-label="Alternar caixa de seleção"]' 
    )].filter(visible); 
 
  const getDeleteButtons = () => 
    [...document.querySelectorAll( 
      '[role="button"][aria-label="Excluir"]' 
    )].filter(visible) 
      .filter(el => !el.disabled) 
      .filter(el => el.getAttribute("aria-disabled") !== "true"); 
 
  async function waitForDeleteButton(timeout = 10000) { 
    const start = Date.now(); 
 
    while (Date.now() - start < timeout) { 
      const buttons = getDeleteButtons(); 
 
      if (buttons.length) { 
        return buttons[0]; 
      } 
 
      await sleep(250); 
    } 
 
    return null; 
  } 
 
  async function waitForConfirmation(timeout = 10000) { 
    const start = Date.now(); 
 
    while (Date.now() - start < timeout) { 
      const buttons = [...document.querySelectorAll( 
        '[role="button"], button' 
      )] 
        .filter(visible) 
        .filter(el => { 
          const txt = (el.innerText || el.textContent || "") 
            .trim() 
            .toLowerCase(); 
 
          return txt === "excluir"; 
        }) 
        .filter(el => !el.disabled) 
        .filter(el => el.getAttribute("aria-disabled") !== "true"); 
 
      if (buttons.length) { 
        return buttons[buttons.length - 1]; 
      } 
 
      await sleep(250); 
    } 
 
    return null; 
  } 
 
  let total = 0; 
 
  console.log("🚀 Iniciando..."); 
  console.log("Comentários encontrados:", getCheckboxes().length); 
 
  while (true) { 
    let boxes = getCheckboxes(); 
 
    if (!boxes.length) { 
      console.log("✅ Não há mais comentários carregados."); 
      break; 
    } 
 
    const amount = Math.min(BATCH_SIZE, boxes.length); 
 
    console.log(`📌 Selecionando ${amount} comentários...`); 
 
    for (let i = 0; i < amount; i++) { 
      const current = getCheckboxes(); 
 
      if (!current[i]) break; 
 
      click(current[i]); 
 
      await sleep(WAIT_BETWEEN_CLICKS); 
    } 
 
    await sleep(WAIT_AFTER_SELECT); 
 
    // Depois da seleção, procura o botão Excluir habilitado 
    let deleteButton = await waitForDeleteButton(); 
 
    if (!deleteButton) { 
      console.error( 
        "❌ Não encontrei um botão 'Excluir' habilitado." 
      ); 
      console.log( 
        "Pare o script para evitar qualquer ação inesperada." 
      ); 
      break; 
    } 
 
    console.log("🗑️ Excluindo lote..."); 
 
    click(deleteButton); 
 
    await sleep(WAIT_AFTER_DELETE); 
 
    // Caso apareça confirmação 
    const confirmation = await waitForConfirmation(5000); 
 
    if (confirmation) { 
      console.log("⚠️ Confirmando exclusão..."); 
      click(confirmation); 
 
      await sleep(WAIT_AFTER_DELETE); 
    } 
 
    total += amount; 
 
    console.log(`✅ Lote concluído. Aproximadamente ${total} processados.`); 
 
    // Dá tempo para o Instagram reconstruir a lista 
    await sleep(1500); 
  } 
 
  console.log("🏁 Finalizado."); 
})();
