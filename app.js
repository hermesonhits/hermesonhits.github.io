/* Hermeson hits Studio · peças do app (app 1.1)
   - a chave da API fica guardada no celular: a pessoa cola uma vez só
   - abre mesmo sem internet depois da primeira vez (sw.js)
   - botão "Reportar esta letra" e "Reportar um problema" (a Google Play exige
     denúncia dentro do app para apps que geram conteúdo com IA)
   - link da Política de privacidade em Ajustes
   Fica separado do index.html de propósito: quando trocar o index.html por uma
   versão nova, basta manter no <head> as linhas do manifest, do config.js e do app.js. */
(function(){
"use strict";

const VERSAO_APP = "1.1";
const CFG = window.HH_CONFIG || {};
const NATIVO = window.HHAndroid || null;   // existe só dentro do APK
const $ = id => document.getElementById(id);
const email = () => String(CFG.email || "").trim();
const temEmail = () => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email()) && !/seu-?email|exemplo/i.test(email());

/* ---------- 0. CHAVE GUARDADA NO CELULAR ----------
   Roda antes do app abrir: entrega a chave guardada para ele já começar conectado.
   O resto (ritmo, história, nome falado, histórico) continua abrindo vazio. */
const CHAVE = "hh_chave_api";
const lerChave = () => { try{ return localStorage.getItem(CHAVE) || ""; }catch(e){ return ""; } };
const guardarChave = v => { try{ if(v) localStorage.setItem(CHAVE, v); else localStorage.removeItem(CHAVE); }catch(e){} };
(function prepararChave(){
  let sessao = "";
  try{ sessao = String(JSON.parse(sessionStorage.getItem("lg_key") || '""') || "").trim(); }catch(e){}
  const salva = lerChave();
  if(salva && !sessao){ try{ sessionStorage.setItem("lg_key", JSON.stringify(salva)); }catch(e){} }
  else if(!salva && sessao){ guardarChave(sessao); }   // chave colada na versão anterior: passa a ficar guardada
})();

/* ---------- 1. FUNCIONAR SEM INTERNET ---------- */
function registrarSW(){
  if(NATIVO || !("serviceWorker" in navigator)) return;   // no APK os arquivos já estão dentro do app
  const seguro = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if(seguro) navigator.serviceWorker.register("sw.js").catch(() => {});
}
if(document.readyState === "complete") registrarSW();
else window.addEventListener("load", registrarSW);

function iniciar(){

/* ---------- 2. VISUAL DAS PEÇAS NOVAS (usa as cores do app) ---------- */
const css = document.createElement("style");
css.textContent = `
.hh-report{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:40px;margin:0 0 12px;padding:0 14px;border-radius:11px;
  border:1px dashed var(--line-2,rgba(255,255,255,.15));background:transparent;color:var(--muted,#ADA4B8);font:600 13px/1 var(--font,system-ui,sans-serif);cursor:pointer}
.hh-report svg{width:15px;height:15px;flex:none}
.hh-report:active{transform:scale(.98)}
.hh-sheet-bg{position:fixed;inset:0;z-index:45;display:flex;align-items:flex-end;justify-content:center;background:rgba(8,6,10,.62);
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.hh-sheet{width:100%;max-width:560px;max-height:92vh;max-height:92dvh;overflow:auto;padding:18px 16px calc(16px + env(safe-area-inset-bottom));
  border-radius:20px 20px 0 0;background:var(--surface,#1C1722);border:1px solid var(--line-2,rgba(255,255,255,.15));border-bottom:0;
  box-shadow:0 -24px 60px -24px rgba(0,0,0,.9)}
.hh-sheet h3{margin:0 0 6px;font:800 24px/1 var(--font,system-ui,sans-serif);font-stretch:var(--cond,68%);color:var(--text,#F6F2F8)}
.hh-sheet > p{margin:0 0 14px;color:var(--muted,#ADA4B8);font-size:13px;line-height:1.45}
.hh-sheet .chips{margin:0 0 12px}
.hh-sheet textarea{min-height:76px}
.hh-sheet .btn-row{margin-top:12px}
.hh-sobre{display:grid;gap:8px}
.hh-chave{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 0;color:var(--muted,#ADA4B8);font-size:12.5px;line-height:1.35}
.hh-chave[hidden]{display:none}
.hh-chave span{display:flex;align-items:center;gap:6px;min-width:0}
.hh-chave svg{width:15px;height:15px;flex:none;color:var(--ok,#5ED39B)}
.hh-chave button{flex:none;height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--line-2,rgba(255,255,255,.15));background:transparent;
  color:var(--text,#F6F2F8);font:600 12.5px/1 var(--font,system-ui,sans-serif);cursor:pointer}
.hh-chave button:active{transform:scale(.97)}
.hh-passos{margin:10px 0 2px;padding:0 0 0 20px;color:var(--muted,#ADA4B8);font-size:12.5px;line-height:1.5}
.hh-passos li{margin:0 0 4px;padding-left:2px}
.hh-passos b{color:var(--text,#F6F2F8);font-weight:600}
`;
document.head.appendChild(css);

/* ---------- 3. AVISO RÁPIDO (mesmo balão do app) ---------- */
let avisoT = null;
function avisar(msg, erro){
  const t = $("toast"); if(!t) return;
  t.className = "toast" + (erro ? " err" : "");
  t.textContent = "";
  const i = document.createElement("i"); i.textContent = erro ? "!" : "✓";
  const s = document.createElement("span"); s.textContent = msg;
  t.append(i, s);
  void t.offsetWidth; t.classList.add("show");
  clearTimeout(avisoT); avisoT = setTimeout(() => t.classList.remove("show"), erro ? 6000 : 2600);
}

/* ---------- 4. JANELA DE DENÚNCIA ---------- */
const MOTIVOS = ["Ofensiva ou preconceituosa", "Conteúdo sexual", "Violência ou ódio", "Parece copiada de outra música", "Outro problema"];
const TEXTO = {
  letra: ["Reportar esta letra", "A letra foi escrita por inteligência artificial. Se apareceu algo ofensivo, impróprio ou copiado, conte pra gente. Isso ajuda a melhorar os filtros do app."],
  geral: ["Reportar um problema", "Conte o que deu errado no app ou numa letra que ele escreveu. A mensagem vai direto para o responsável pelo app."]
};
const bg = document.createElement("div");
bg.className = "hh-sheet-bg"; bg.id = "hhSheet"; bg.hidden = true;
bg.innerHTML = `
<div class="hh-sheet" role="dialog" aria-modal="true" aria-labelledby="hhSheetT">
  <h3 id="hhSheetT"></h3>
  <p id="hhSheetP"></p>
  <div class="chips" id="hhMotivos" role="radiogroup" aria-label="Motivo"></div>
  <textarea id="hhComent" maxlength="600" placeholder="O que aconteceu? (opcional)"></textarea>
  <div class="status" id="hhStatus"></div>
  <div class="btn-row">
    <button class="btn btn-sec" id="hhCancelar" type="button">Cancelar</button>
    <button class="btn btn-pri" id="hhEnviar" type="button">Enviar</button>
  </div>
</div>`;
document.body.appendChild(bg);
MOTIVOS.forEach((m, k) => {
  const inp = document.createElement("input");
  inp.type = "radio"; inp.name = "hh_motivo"; inp.value = m; inp.id = "hh_m" + k; inp.className = "sr";
  const lab = document.createElement("label");
  lab.htmlFor = inp.id; lab.textContent = m;
  $("hhMotivos").append(inp, lab);
});

let modo = "letra";
function status(msg, cls){ const el = $("hhStatus"); el.textContent = msg || ""; el.className = "status" + (cls ? " " + cls : ""); }
function esconder(){ bg.hidden = true; document.documentElement.style.overflow = ""; }
function fechar(){
  // o botão voltar do celular também fecha a janela, sem sair do app
  if(history.state && history.state.hhSheet) history.back(); else esconder();
}
window.addEventListener("popstate", () => { if(!bg.hidden) esconder(); });
function abrir(m){
  modo = m;
  $("hhSheetT").textContent = TEXTO[m][0];
  $("hhSheetP").textContent = TEXTO[m][1];
  document.querySelectorAll('input[name="hh_motivo"]').forEach(i => { i.checked = false; });
  if(m === "geral") $("hh_m4").checked = true;
  $("hhComent").value = ""; status("");
  $("hhEnviar").disabled = false;
  bg.hidden = false;
  document.documentElement.style.overflow = "hidden";
  try{ history.pushState({ hhSheet: 1 }, ""); }catch(e){}
}
bg.addEventListener("click", e => { if(e.target === bg) fechar(); });
$("hhCancelar").onclick = fechar;
document.addEventListener("keydown", e => { if(e.key === "Escape" && !bg.hidden) fechar(); });

function dadosDaLetra(){
  const card = $("resultCard");
  const temLetra = !!(card && !card.hidden);
  const txt = id => { const el = $(id); return el ? el.innerText.trim() : ""; };
  const chips = [...document.querySelectorAll("#songMeta .chip")].map(c => c.textContent.trim());
  return {
    titulo: temLetra ? txt("outTitulo") : "",
    ritmo: temLetra ? (chips[0] || "") : "",
    letra: temLetra ? txt("outLetra") : "",
    modelo: $("model") ? $("model").value : ""
  };
}

async function enviar(){
  const sel = document.querySelector('input[name="hh_motivo"]:checked');
  if(!sel){ status("Escolha o motivo.", "err"); return; }
  if(!temEmail()){ status("O e-mail de contato do app ainda não foi configurado (arquivo config.js).", "err"); return; }
  const d = dadosDaLetra();
  const coment = $("hhComent").value.trim();
  const quando = new Date().toLocaleString("pt-BR");
  const assunto = (modo === "letra" ? "Denúncia de letra" : "Problema relatado") + " · Hermeson hits Studio";
  const btn = $("hhEnviar");
  btn.disabled = true; status("Enviando…");

  // 1º: envia direto, sem sair do app
  let ok = false;
  try{
    const ctrl = new AbortController();
    const tempo = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch("https://formsubmit.co/ajax/" + email(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        _subject: assunto, _template: "table",
        motivo: sel.value, comentario: coment || "(sem comentário)",
        titulo: d.titulo || "-", ritmo: d.ritmo || "-", modelo: d.modelo || "-",
        versao: "app " + VERSAO_APP, data: quando, letra: (d.letra || "-").slice(0, 6000)
      }),
      signal: ctrl.signal
    });
    clearTimeout(tempo);
    const j = await r.json().catch(() => ({}));
    ok = r.ok && String(j.success) === "true";
  }catch(e){}
  btn.disabled = false;
  if(ok){
    fechar();
    avisar(modo === "letra" ? "Denúncia enviada. Obrigado!" : "Mensagem enviada. Obrigado!");
    return;
  }

  // 2º: sem internet ou envio ainda não ativado → abre o e-mail já preenchido
  const corpo = [
    "Motivo: " + sel.value,
    "Comentário: " + (coment || "(sem comentário)"),
    d.titulo ? "Título: " + d.titulo : "",
    d.ritmo ? "Ritmo: " + d.ritmo : "",
    "Modelo: " + (d.modelo || "-"),
    "Versão: app " + VERSAO_APP,
    "Data: " + quando,
    d.letra ? "\nLetra:\n" + d.letra : ""
  ].filter(Boolean).join("\n");
  const url = "mailto:" + email() + "?subject=" + encodeURIComponent(assunto) + "&body=" + encodeURIComponent(corpo.slice(0, 1800));
  fechar();
  avisar("Abrindo seu e-mail para enviar.");
  setTimeout(() => { location.href = url; }, 350);
}
$("hhEnviar").onclick = enviar;

/* ---------- 5. BOTÃO EMBAIXO DA LETRA ---------- */
const cardLetra = $("outLetra") && $("outLetra").closest(".card");
if(cardLetra){
  const b = document.createElement("button");
  b.type = "button"; b.className = "hh-report"; b.id = "hhReportar";
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg><span>Reportar esta letra</span>';
  b.onclick = () => abrir("letra");
  cardLetra.insertAdjacentElement("afterend", b);
}

/* ---------- 6. AJUSTES: PRIVACIDADE E PROBLEMAS ---------- */
const sobre = document.querySelector("#view-ajustes .about");
if(sobre){
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = '<div class="card-head"><h3>Sobre o app</h3></div>'
    + '<div class="hh-sobre"><a class="btn btn-sec btn-block" href="privacidade.html">Política de privacidade</a>'
    + '<button class="btn btn-sec btn-block" type="button" id="hhProblema">Reportar um problema</button></div>'
    + '<p class="hint">As letras são criadas por inteligência artificial (Google Gemini) e podem ter erros. Se aparecer algo impróprio, toque em Reportar.</p>';
  sobre.parentNode.insertBefore(sec, sobre);
  $("hhProblema").onclick = () => abrir("geral");
  sobre.textContent = sobre.textContent.replace(/\s*·\s*app [\d.]+( Android)?$/, "") + " · app " + VERSAO_APP + (NATIVO ? " Android" : "");
}

/* ---------- 7. DENTRO DO APK: COPIAR, SALVAR E ENVIAR A CAPA ---------- */
if(NATIVO){
  // copiar letra e estilo pela área de transferência do Android
  const escrever = t => { try{ NATIVO.copiar(String(t)); return Promise.resolve(); }catch(e){ return Promise.reject(e); } };
  try{
    if(navigator.clipboard) Object.defineProperty(navigator.clipboard, "writeText", { value: escrever, configurable: true });
    else Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
  }catch(e){}

  const nomeCapa = () => {
    const t = ($("outTitulo") ? $("outTitulo").innerText.trim() : "") || "capa";
    return (t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "capa") + "-hermeson-hits.png";
  };
  const capaPng = () => $("capa").toDataURL("image/png");

  const baixar = $("btnBaixarCapa");
  if(baixar) baixar.onclick = () => {
    let r = "erro";
    try{ r = NATIVO.salvarImagem(capaPng(), nomeCapa()); }catch(e){}
    if(r === "ok") avisar("Capa salva na Galeria (pasta Hermeson hits)");
    else avisar("Não consegui salvar a capa.", true);
  };
  const enviarCapa = $("btnShareCapa");
  if(enviarCapa){
    enviarCapa.hidden = false;
    enviarCapa.onclick = () => {
      let r = "erro";
      try{ r = NATIVO.compartilharImagem(capaPng(), nomeCapa(), "Enviar capa"); }catch(e){}
      if(r !== "ok") avisar("Não consegui enviar a capa.", true);
    };
  }
}

/* ---------- 8. CHAVE DA API: COLA UMA VEZ E O CELULAR GUARDA ---------- */
const campo = $("apikey");
if(campo){
  const salva = lerChave();
  if(salva && !campo.value.trim()){
    campo.value = salva;
    campo.dispatchEvent(new Event("input", { bubbles: true }));   // o app se conecta com a chave guardada
  }

  const info = document.createElement("div");
  info.className = "hh-chave"; info.id = "hhChaveInfo";
  info.innerHTML = '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Guardada neste celular. Não precisa colar de novo.</span>'
    + '<button type="button" id="hhApagarChave">Apagar</button>';
  (campo.closest(".row") || campo).insertAdjacentElement("afterend", info);

  const passos = document.createElement("ol");
  passos.className = "hh-passos"; passos.id = "hhPassos";
  passos.innerHTML = '<li>Toque em <b>Pegar minha chave grátis</b> e entre com sua conta Google.</li>'
    + '<li>Crie a chave e copie.</li>'
    + '<li>Volte aqui e cole no campo <b>Chave da API</b>. O app guarda a chave e você não precisa colar de novo.</li>';
  const pegar = document.querySelector('#view-ajustes a[href*="aistudio.google.com"]');
  (pegar || info).insertAdjacentElement("afterend", passos);

  const mostrar = () => { const tem = !!campo.value.trim(); info.hidden = !tem; passos.hidden = tem; };
  campo.addEventListener("input", () => { guardarChave(campo.value.trim()); mostrar(); });
  $("hhApagarChave").onclick = () => {
    campo.value = "";
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    avisar("Chave apagada deste celular.");
  };
  mostrar();

  // tira o aviso antigo de "cole de novo sempre que abrir o app"
  document.querySelectorAll("#view-ajustes .hint").forEach(p => {
    p.textContent = p.textContent.replace(/\s*A chave fica só enquanto o app está aberto[^.]*\./i, "");
  });
}

}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();

})();
