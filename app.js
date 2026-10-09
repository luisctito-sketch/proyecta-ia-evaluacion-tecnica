
const $ = id => document.getElementById(id);
const clean = s => (s ?? "").toString().replace(/\s+/g," ").trim();
const norm = s => clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc = s => (s ?? "").toString().replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt = (x,d=5) => Number.isFinite(x) ? x.toLocaleString("es-BO",{maximumFractionDigits:d}) : "—";
const lines = s => (s||"").split(/\n+/).map(x=>x.replace(/^\s*(?:[-•*]|\d+[.)-]?)\s*/,"").trim()).filter(Boolean);
const hasAny=(t,a)=>{const n=norm(t);return a.some(x=>n.includes(norm(x)));};
function parseNum(s){ if(s===null||s===undefined||clean(s)==="") return NaN; return Number(String(s).trim().replace(/\s/g,"").replace(",",".")); }
function parseSeries(text){return text.split(/[\n;]+/).map(parseNum).filter(Number.isFinite);}
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;}
function varianceSample(a){if(a.length<2)return NaN;const m=mean(a);return a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1);}
function stdev(a){return Math.sqrt(varianceSample(a));}
function median(a){if(!a.length)return NaN;const b=[...a].sort((x,y)=>x-y),n=b.length;return n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2;}
function show(el,cls,html){el.className=`output-box ${cls}`;el.innerHTML=html;el.classList.remove("hidden");}

const indicators = [
  // Metrología
  {id:"accuracy",group:"Metrología y medición",name:"Exactitud de medición",mentions:["all"],layers:["hardware","integrated"],desc:"Cercanía del resultado al valor de referencia. No se expresa como una magnitud única universal.",formula:"Sustentar con error, sesgo e incertidumbre.",data:"Valor(es) medido(s) + referencia.",sources:"VIM/BIPM, instrumento patrón, datasheet, calibración."},
  {id:"precision",group:"Metrología y medición",name:"Precisión / repetibilidad",mentions:["all"],layers:["hardware","integrated"],desc:"Concordancia entre mediciones repetidas bajo condiciones definidas.",formula:"s, s², CV cuando corresponda.",data:"Serie de mediciones repetidas.",sources:"VIM/BIPM, método experimental."},
  {id:"absrel",group:"Metrología y medición",name:"Error absoluto / relativo / porcentual",mentions:["all"],layers:["hardware","integrated"],desc:"Diferencia entre medición y referencia, en valor absoluto o relativo.",formula:"|x−xref|; |x−xref|/|xref|×100.",data:"Pares medido–referencia.",sources:"Instrumento patrón, modelo, simulación, especificación."},
  {id:"mae",group:"Metrología y medición",name:"MAE / RMSE / sesgo",mentions:["all"],layers:["hardware","software","firmware","integrated"],desc:"Métricas agregadas para comparar una serie con valores de referencia.",formula:"MAE, RMSE, error medio firmado.",data:"Dos series pareadas.",sources:"Modelo matemático, simulación, patrón."},
  {id:"uncertainty",group:"Metrología y medición",name:"Incertidumbre de medición",mentions:["all"],layers:["hardware","integrated"],desc:"Parámetro asociado a la dispersión de valores atribuibles al mensurando.",formula:"Evaluación Tipo A/B y combinación según modelo.",data:"Repeticiones + especificaciones de instrumentos/fuentes.",sources:"JCGM/GUM, certificado, datasheet."},

  // Confiabilidad / disponibilidad
  {id:"availability",group:"Confiabilidad y continuidad",name:"Disponibilidad",mentions:["all"],layers:["hardware","software","firmware","integrated"],desc:"Proporción del tiempo en que el sistema estuvo operativo.",formula:"Top/(Top+Tfuera)×100.",data:"Tiempo operativo y fuera de servicio.",sources:"Requerimiento, SLA, estándar o diseño."},
  {id:"mtbf",group:"Confiabilidad y continuidad",name:"MTBF",mentions:["all"],layers:["hardware","software","firmware","integrated"],desc:"Tiempo medio entre fallas observadas en el periodo definido.",formula:"Tiempo operativo / Nº de fallas.",data:"Bitácora de fallas + tiempo.",sources:"Histórico, requisito, fabricante o bibliografía."},
  {id:"mttr",group:"Confiabilidad y continuidad",name:"MTTR",mentions:["all"],layers:["hardware","software","firmware","integrated"],desc:"Tiempo medio requerido para restablecer el servicio tras una falla.",formula:"Tiempo total de reparación / Nº fallas.",data:"Tiempos de recuperación.",sources:"SLA, requisito o bibliografía."},
  {id:"successrate",group:"Confiabilidad y continuidad",name:"Tasa de operaciones exitosas",mentions:["all"],layers:["software","firmware","integrated"],desc:"Porcentaje de operaciones, ciclos o transacciones completadas correctamente.",formula:"Éxitos / intentos ×100.",data:"Conteo de intentos y éxitos.",sources:"Requerimiento de diseño o estándar del servicio."},

  // Eficiencia/eficacia/productividad
  {id:"efficiency",group:"Eficiencia, eficacia y productividad",name:"Eficiencia",mentions:["all"],layers:["hardware","software","firmware","integrated"],desc:"Relación entre salida útil y recursos consumidos; debe definirse según el sistema.",formula:"Salida útil / entrada ×100 o métrica específica.",data:"Salida útil + energía/tiempo/memoria/etc.",sources:"Modelo físico, línea base, requerimiento."},
  {id:"energy",group:"Eficiencia, eficacia y productividad",name:"Consumo energético / ciclo de trabajo",mentions:["all"],layers:["hardware","firmware","integrated"],desc:"Energía utilizada y porcentaje de tiempo activo de cargas o módulos.",formula:"P=VI; E=Pt; duty=tactivo/ttotal×100.",data:"V, I/P, tiempo activo.",sources:"Datasheet, línea base, objetivo energético."},
  {id:"effectiveness",group:"Eficiencia, eficacia y productividad",name:"Eficacia",mentions:["all"],layers:["all"],desc:"Grado en que se alcanza una meta técnica cuantificada.",formula:"Resultado alcanzado / meta ×100 (si son comparables).",data:"Meta y resultado.",sources:"Objetivo específico o requerimiento cuantificado."},
  {id:"productivity",group:"Eficiencia, eficacia y productividad",name:"Productividad",mentions:["all"],layers:["software","firmware","integrated"],desc:"Salida útil obtenida por unidad de recurso.",formula:"Salida útil / recurso (tiempo, energía, memoria, costo técnico).",data:"Producción útil + recurso.",sources:"Línea base, benchmark, especificación."},

  // Control
  {id:"stability",group:"Control y automatización",name:"Estabilidad / porcentaje dentro de rango",mentions:["control","general"],layers:["firmware","integrated"],desc:"Capacidad de mantener la variable en el rango o alrededor del punto de operación.",formula:"Nº lecturas dentro de rango/N×100 + dispersión.",data:"Serie temporal + límites.",sources:"Objetivo de control, proceso, libro o norma sectorial."},
  {id:"overshoot",group:"Control y automatización",name:"Sobreimpulso",mentions:["control"],layers:["firmware","integrated"],desc:"Exceso máximo de la respuesta respecto al valor final o de referencia.",formula:"Mp%=(ypico−yss)/|yss−y0|×100.",data:"y0, yss, ypico.",sources:"Especificación de diseño, modelo/simulación, bibliografía de control."},
  {id:"settling",group:"Control y automatización",name:"Tiempo de establecimiento",mentions:["control"],layers:["firmware","integrated"],desc:"Tiempo para que la respuesta permanezca dentro de una banda definida alrededor del valor final.",formula:"Determinar sobre la serie temporal y banda declarada.",data:"Tiempo + respuesta + banda.",sources:"Requisito, simulación, modelo."},
  {id:"rise",group:"Control y automatización",name:"Tiempo de subida",mentions:["control"],layers:["firmware","integrated"],desc:"Tiempo de transición entre porcentajes definidos del cambio total (comúnmente 10–90%).",formula:"t90−t10, si esa convención es adoptada.",data:"Serie temporal.",sources:"Criterio de diseño / herramienta de análisis."},
  {id:"steadystate",group:"Control y automatización",name:"Error estacionario",mentions:["control"],layers:["firmware","integrated"],desc:"Diferencia entre referencia y salida en régimen permanente.",formula:"ess = r − yss.",data:"Referencia + salida estable.",sources:"Modelo, simulación, requisito."},
  {id:"iae",group:"Control y automatización",name:"IAE / ISE / ITAE",mentions:["control"],layers:["firmware","integrated"],desc:"Índices integrales del error para comparar estrategias de control.",formula:"IAE=∫|e|dt; ISE=∫e²dt; ITAE=∫t|e|dt.",data:"Serie temporal de error.",sources:"Modelo/controlador, libro técnico, simulación."},

  // Telecom
  {id:"latency",group:"Telecomunicaciones y QoS",name:"Retardo / latencia",mentions:["telecom"],layers:["hardware","software","firmware","integrated"],desc:"Tiempo de transferencia extremo a extremo o entre puntos definidos.",formula:"Promedio/percentiles del retardo según método.",data:"Tiempos de envío/recepción o herramienta de red.",sources:"ITU-T Y.1540/Y.1541, requisito de servicio."},
  {id:"jitter",group:"Telecomunicaciones y QoS",name:"Variación del retardo (jitter/IPDV)",mentions:["telecom"],layers:["software","firmware","integrated"],desc:"Variación temporal del retardo de paquetes.",formula:"Según definición adoptada; documentar método.",data:"Serie de retardos.",sources:"ITU-T Y.1540/Y.1541."},
  {id:"packetloss",group:"Telecomunicaciones y QoS",name:"Pérdida de paquetes",mentions:["telecom"],layers:["software","firmware","integrated"],desc:"Fracción de paquetes enviados que no llegan al destino.",formula:"Perdidos/enviados×100.",data:"Enviados y recibidos.",sources:"ITU-T, SLA, requisito."},
  {id:"throughput",group:"Telecomunicaciones y QoS",name:"Throughput / capacidad útil",mentions:["telecom"],layers:["hardware","software","firmware","integrated"],desc:"Tasa real de datos útiles recibidos.",formula:"Bits útiles/tiempo.",data:"Bytes/bits recibidos + tiempo.",sources:"Estándar de enlace, ITU, datasheet, requisito."},
  {id:"ber",group:"Telecomunicaciones y QoS",name:"BER / tasa de error de bits",mentions:["telecom"],layers:["hardware","firmware","integrated"],desc:"Proporción de bits erróneos respecto a bits transmitidos.",formula:"Bits erróneos/bits totales.",data:"Patrón transmitido y recibido.",sources:"Estándar del sistema, literatura, fabricante."},
  {id:"rssi",group:"Telecomunicaciones y QoS",name:"RSSI / SNR / cobertura",mentions:["telecom"],layers:["hardware","integrated"],desc:"Indicadores físicos del enlace y cobertura en condiciones definidas.",formula:"Medición directa; evitar convertirlos en 'calidad %' sin modelo.",data:"RSSI/SNR por ubicación/distancia.",sources:"Datasheet, estándar radio, planificación, modelo de propagación."},

  // Software
  {id:"response",group:"Software y firmware",name:"Tiempo de respuesta",mentions:["all"],layers:["software","firmware","integrated"],desc:"Tiempo desde una solicitud/evento hasta la respuesta definida.",formula:"trespuesta−tsolicitud.",data:"Marcas de tiempo o logs.",sources:"Requerimiento, benchmark, ISO/IEC 25010 como marco de calidad."},
  {id:"defects",group:"Software y firmware",name:"Tasa de fallos / defectos observados",mentions:["all"],layers:["software","firmware"],desc:"Frecuencia de fallos durante casos de prueba o tiempo de operación.",formula:"Fallos/casos o fallos/tiempo.",data:"Casos, fallos, logs.",sources:"Plan de pruebas, requisito, benchmark."},
  {id:"resource",group:"Software y firmware",name:"Uso de recursos",mentions:["all"],layers:["software","firmware"],desc:"CPU, RAM, flash, almacenamiento o consumo temporal respecto a la capacidad disponible.",formula:"Uso/capacidad×100.",data:"Medición de recursos.",sources:"Datasheet, perfilador, requerimiento."},
  {id:"quality",group:"Software y firmware",name:"Calidad del producto ICT/software",mentions:["all"],layers:["software","firmware","integrated"],desc:"Evaluación de características de calidad pertinentes, sin convertir ISO/IEC 25010 en un puntaje universal.",formula:"Matriz de métricas seleccionadas.",data:"Métricas por característica.",sources:"ISO/IEC 25010:2023 + requisitos del proyecto."},

  // Electromedicina
  {id:"essential",group:"Electromedicina",name:"Desempeño esencial",mentions:["electromed"],layers:["hardware","software","firmware","integrated"],desc:"Función cuyo deterioro o pérdida puede generar riesgo inaceptable; requiere definición específica del dispositivo.",formula:"No existe fórmula universal; se evalúan límites funcionales definidos.",data:"Pruebas funcionales y límites.",sources:"IEC 60601-1 y norma particular aplicable."},
  {id:"risk",group:"Electromedicina",name:"Riesgo y eficacia de controles",mentions:["electromed"],layers:["hardware","software","firmware","integrated"],desc:"Verifica que los controles de riesgo identificados se implementen y sean eficaces.",formula:"Matriz de riesgos y verificación de controles; no un simple porcentaje universal.",data:"Peligros, controles, evidencias.",sources:"ISO 14971:2019 / gestión de riesgos."},
  {id:"alarm",group:"Electromedicina",name:"Desempeño de alarmas / detección",mentions:["electromed"],layers:["software","firmware","integrated"],desc:"Respuesta correcta ante eventos definidos. Si es clasificación, pueden usarse sensibilidad/especificidad con cautela.",formula:"TPR=TP/(TP+FN); TNR=TN/(TN+FP), si corresponde.",data:"Matriz de casos positivos/negativos.",sources:"Requisito clínico/técnico aplicable; no sustituye validación clínica."},
  {id:"medsoft",group:"Electromedicina",name:"Proceso/calidad del software médico",mentions:["electromed"],layers:["software","firmware"],desc:"Trazabilidad de requisitos, riesgos, arquitectura, pruebas y mantenimiento del software.",formula:"Matriz de cumplimiento; no puntaje universal.",data:"Documentación y evidencias.",sources:"IEC 62304 cuando corresponda."},

  // Seguridad/calidad total
  {id:"safety",group:"Seguridad y calidad global",name:"Seguridad técnica",mentions:["all"],layers:["hardware","software","firmware","integrated"],desc:"Ausencia/mitigación de condiciones peligrosas según el alcance del proyecto.",formula:"Verificación de requisitos y controles; no existe un % universal de 'seguridad'.",data:"Checklist, fallas, protecciones, pruebas.",sources:"Norma sectorial, requisitos, análisis de riesgos."},
  {id:"qos",group:"Seguridad y calidad global",name:"Calidad de servicio (QoS)",mentions:["telecom","general"],layers:["software","firmware","integrated"],desc:"Conjunto de métricas de servicio: retardo, pérdida, variación, capacidad, disponibilidad, etc.",formula:"Matriz multindicador.",data:"Métricas de servicio.",sources:"ITU-T, SLA, requerimientos."},
  {id:"totalquality",group:"Seguridad y calidad global",name:"Calidad total / índice global",mentions:["all"],layers:["integrated"],desc:"Síntesis ponderada de indicadores previamente evaluados. No es una fórmula universal.",formula:"Σ wi·si, con pesos justificados y Σwi=1.",data:"Indicadores normalizados + pesos.",sources:"Criterios del proyecto / modelo de calidad elegido."},
];

let recommended = new Set();

function allowedByMention(i,m){return i.mentions.includes("all") || i.mentions.includes(m);}
function allowedByLayer(i,l){return i.layers.includes("all") || i.layers.includes(l);}
function selectedIndicators(){const ids=new Set([...document.querySelectorAll(".indicator-check:checked")].map(x=>x.value));return indicators.filter(i=>ids.has(i.id));}
function renderIndicators(filter=""){
  const m=$("mention").value, layer=$("targetLayer").value, q=norm(filter);
  const filtered=indicators.filter(i=>allowedByMention(i,m) && allowedByLayer(i,layer) && (!q || norm(i.name+" "+i.desc+" "+i.group).includes(q)));
  const groups=[...new Set(filtered.map(i=>i.group))];
  $("indicatorGroups").innerHTML=groups.map(g=>{
    const arr=filtered.filter(i=>i.group===g);
    return `<div class="indicator-group"><h4>${esc(g)}</h4><p>${groupHelp(g)}</p>${
      arr.map(i=>`<label class="indicator-option ${recommended.has(i.id)?"recommended":""}">
      <input class="indicator-check" type="checkbox" value="${i.id}">
      <span><b>${esc(i.name)}${recommended.has(i.id)?'<span class="rec-chip">SUGERIDO</span>':""}</b>
      <small>${esc(i.desc)}</small></span></label>`).join("")
    }</div>`;
  }).join("");
  document.querySelectorAll(".indicator-check").forEach(x=>x.addEventListener("change",updateCounter));
  updateCounter();
}
function groupHelp(g){
  const map={
    "Metrología y medición":"Para variables medidas frente a patrón o mediciones repetidas.",
    "Confiabilidad y continuidad":"Para operación prolongada, fallas y recuperación.",
    "Eficiencia, eficacia y productividad":"Para relacionar resultados con recursos y metas.",
    "Control y automatización":"Para dinámica, estabilidad y calidad de control.",
    "Telecomunicaciones y QoS":"Para desempeño de enlaces y servicios de comunicación.",
    "Software y firmware":"Para desempeño y calidad del código/sistema digital.",
    "Electromedicina":"Para desempeño esencial, riesgos y software médico cuando corresponda.",
    "Seguridad y calidad global":"Para requisitos de seguridad y síntesis de calidad."
  }; return map[g]||"";
}
function updateCounter(){
  const s=selectedIndicators();
  $("indicatorCounter").textContent=`${s.length} indicador${s.length===1?"":"es"} seleccionado${s.length===1?"":"s"}`;
  $("indicatorAdvice").textContent=s.length ? "Cada indicador necesitará una referencia/criterio y una interpretación." : "Selecciona únicamente indicadores demostrables con tus datos.";
}
$("indicatorSearch").addEventListener("input",e=>renderIndicators(e.target.value));
$("mention").addEventListener("change",()=>{recommended.clear();renderIndicators($("indicatorSearch").value);});
$("targetLayer").addEventListener("change",()=>{recommended.clear();renderIndicators($("indicatorSearch").value);});
$("clearIndicatorsBtn").addEventListener("click",()=>{document.querySelectorAll(".indicator-check").forEach(x=>x.checked=false);updateCounter();});
$("selectRecommendedBtn").addEventListener("click",()=>{document.querySelectorAll(".indicator-check").forEach(x=>{if(recommended.has(x.value))x.checked=true;});updateCounter();});

function suggestIds(){
  const m=$("mention").value, layer=$("targetLayer").value;
  const text=norm([$(`generalObjective`)?.value,$(`specificObjectives`)?.value,$(`problemStatement`)?.value,$(`targetPurpose`)?.value,$(`projectSystem`)?.value].join(" "));
  const ids=new Set();
  // base by layer
  if(layer==="hardware"){["accuracy","precision","absrel","uncertainty","efficiency","energy","safety"].forEach(x=>ids.add(x));}
  if(layer==="software"){["response","successrate","defects","resource","quality","availability"].forEach(x=>ids.add(x));}
  if(layer==="firmware"){["response","successrate","availability","defects","resource","safety"].forEach(x=>ids.add(x));}
  if(layer==="integrated"){["availability","efficiency","effectiveness","safety"].forEach(x=>ids.add(x));}
  // by mention
  if(m==="control"){["stability","overshoot","settling","steadystate","iae"].forEach(x=>ids.add(x));}
  if(m==="telecom"){["latency","jitter","packetloss","throughput","availability","qos"].forEach(x=>ids.add(x));}
  if(m==="electromed"){["accuracy","precision","essential","risk","safety","alarm"].forEach(x=>ids.add(x));}
  // objective keywords
  if(/medir|medicion|sensor|precision|exactitud|calibr/.test(text)) ["accuracy","precision","absrel","mae","uncertainty"].forEach(x=>ids.add(x));
  if(/confiab|disponib|continu|falla|robust/.test(text)) ["availability","mtbf","mttr"].forEach(x=>ids.add(x));
  if(/energia|consumo|eficien/.test(text)) ["efficiency","energy"].forEach(x=>ids.add(x));
  if(/eficac|cumplir|objetivo|impacto/.test(text)) ids.add("effectiveness");
  if(/productiv|rendimiento|procesamiento/.test(text)) ids.add("productivity");
  if(/latencia|retardo|paquete|red|wifi|iot|mqtt|http|lora|comunic/.test(text)) ["latency","jitter","packetloss","throughput","qos"].forEach(x=>ids.add(x));
  if(/control|pid|setpoint|estabilidad|sobreimpulso|respuesta/.test(text)) ["stability","overshoot","settling","steadystate"].forEach(x=>ids.add(x));
  if(/segur|riesgo|alarma|proteccion/.test(text)) ["safety","risk"].forEach(x=>ids.add(x));
  if(/software|aplicacion|interfaz|firmware|algoritmo/.test(text)) ["response","successrate","defects","quality"].forEach(x=>ids.add(x));
  return [...ids].filter(id=>{
    const i=indicators.find(x=>x.id===id);
    return i && allowedByMention(i,m) && allowedByLayer(i,layer);
  });
}
$("suggestIndicatorsBtn").addEventListener("click",()=>{
  const og=clean($("generalObjective").value), oe=lines($("specificObjectives").value);
  const ids=suggestIds(); recommended=new Set(ids); renderIndicators($("indicatorSearch").value);
  const names=ids.map(id=>indicators.find(i=>i.id===id)?.name).filter(Boolean);
  const cls=(og&&oe.length)?"ok":"warn";
  show($("suggestionOutput"),cls,`<h4>${cls==="ok"?"🟢 INDICADORES SUGERIDOS":"🟡 SUGERENCIA PROVISIONAL"}</h4>
    <p>Según la mención, la capa evaluada y las palabras presentes en tus objetivos, conviene considerar:</p>
    <p><b>${names.length?names.map(esc).join(" · "):"No se detectaron suficientes pistas. Selecciona manualmente."}</b></p>
    <p class="small">La sugerencia no obliga a usar todos. Elimina cualquier indicador que no pueda demostrarse con datos o no tenga relación con los objetivos.</p>`);
});
renderIndicators();

/* Matrix of external criteria */
function buildIndicatorMatrix(final=false){
  const s=selectedIndicators();
  if(!s.length) return `<div class="output-box bad"><b>Selecciona al menos un indicador.</b></div>`;
  if(!final){
    return `<table class="validation-table"><thead><tr><th>Indicador</th><th>Qué evalúa</th><th>Fórmula / método</th><th>Datos requeridos</th><th>Fuente externa sugerida</th><th>Fuente elegida / cita</th><th>Criterio / umbral</th></tr></thead><tbody>${
      s.map(i=>`<tr><td><b>${esc(i.name)}</b></td><td>${esc(i.desc)}</td><td>${esc(i.formula)}</td><td>${esc(i.data)}</td><td>${esc(i.sources)}</td><td contenteditable="true">[Completar]</td><td contenteditable="true">[Completar]</td></tr>`).join("")
    }</tbody></table>`;
  }
  const target=clean($("targetName").value)||clean($("projectSystem").value)||"[elemento evaluado]";
  return `<table class="validation-table"><thead><tr><th>Elemento evaluado</th><th>Indicador</th><th>Método/Fórmula</th><th>Resultado</th><th>Fuente externa</th><th>Criterio</th><th>Comparación</th><th>Decisión técnica</th><th>Evidencia</th></tr></thead><tbody>${
    s.map(i=>`<tr><td contenteditable="true">${esc(target)}</td><td>${esc(i.name)}</td><td>${esc(i.formula)}</td><td contenteditable="true">[Resultado + unidad]</td><td contenteditable="true">[Fuente/cita]</td><td contenteditable="true">[Umbral/rango]</td><td contenteditable="true">[Cumple / Parcial / No cumple]</td><td contenteditable="true">[Interpretación y acción]</td><td contenteditable="true">[Tabla, gráfica, log, captura...]</td></tr>`).join("")
  }</tbody></table>`;
}
$("buildIndicatorMatrixBtn").addEventListener("click",()=>{$("indicatorMatrixOutput").innerHTML=buildIndicatorMatrix(false);});
$("buildFinalMatrixBtn").addEventListener("click",()=>{$("finalMatrixOutput").innerHTML=buildIndicatorMatrix(true);});
$("copyFinalMatrixBtn").addEventListener("click",async()=>{
  const table=$("finalMatrixOutput").querySelector("table"); if(!table)return;
  const rows=[...table.rows].map(r=>[...r.cells].map(c=>clean(c.innerText)).join("\t")).join("\n");
  await navigator.clipboard.writeText(rows); $("copyFinalMatrixBtn").textContent="Matriz copiada";
  setTimeout(()=>$("copyFinalMatrixBtn").textContent="Copiar como TSV",1500);
});

/* Calculator tabs */
document.querySelectorAll(".calc-tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".calc-tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".calc-panel").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active"); $(btn.dataset.panel).classList.add("active");
}));

$("calcStatsBtn").addEventListener("click",()=>{
  const a=parseSeries($("statsData").value);
  if(a.length<2){show($("statsOutput"),"bad","<b>Se necesitan al menos 2 valores para calcular dispersión. Para una evaluación defendible, realiza más repeticiones cuando sea viable.</b>");return;}
  const m=mean(a),v=varianceSample(a),s=Math.sqrt(v),med=median(a),min=Math.min(...a),max=Math.max(...a),cv=Math.abs(m)>1e-15?100*s/Math.abs(m):NaN;
  show($("statsOutput"),a.length<3?"warn":"ok",`<div class="stats-grid">
    <div class="stat"><span class="k">n</span><span class="v">${a.length}</span><span class="d">mediciones</span></div>
    <div class="stat"><span class="k">Media</span><span class="v">${fmt(m,8)}</span><span class="d">x̄</span></div>
    <div class="stat"><span class="k">Varianza muestral</span><span class="v">${fmt(v,8)}</span><span class="d">s²</span></div>
    <div class="stat"><span class="k">Desv. estándar</span><span class="v">${fmt(s,8)}</span><span class="d">s</span></div>
    <div class="stat"><span class="k">Mediana</span><span class="v">${fmt(med,8)}</span><span class="d">descriptivo</span></div>
    <div class="stat"><span class="k">Mínimo</span><span class="v">${fmt(min,8)}</span><span class="d">serie</span></div>
    <div class="stat"><span class="k">Máximo</span><span class="v">${fmt(max,8)}</span><span class="d">serie</span></div>
    <div class="stat"><span class="k">CV</span><span class="v">${Number.isFinite(cv)?fmt(cv,5)+" %":"N/A"}</span><span class="d">solo si tiene sentido físico</span></div>
  </div><p><b>Interpretación:</b> la desviación estándar describe dispersión/repetibilidad. No demuestra por sí sola exactitud frente a un patrón.</p>`);
});

$("calcErrorsBtn").addEventListener("click",()=>{
  const r=parseSeries($("refData").value),m=parseSeries($("measuredData").value);
  if(!r.length||r.length!==m.length){show($("errorsOutput"),"bad","<b>Las dos series deben tener el mismo número de valores y estar pareadas.</b>");return;}
  const e=m.map((x,i)=>x-r[i]), ae=e.map(Math.abs), mae=mean(ae), rmse=Math.sqrt(mean(e.map(x=>x*x))), bias=mean(e);
  const pct=r.map((x,i)=>x!==0?Math.abs(e[i])/Math.abs(x)*100:NaN), validPct=pct.filter(Number.isFinite);
  const mape=validPct.length===pct.length?mean(validPct):NaN;
  const rows=r.map((x,i)=>`<tr><td>${i+1}</td><td>${fmt(x,7)}</td><td>${fmt(m[i],7)}</td><td>${fmt(e[i],7)}</td><td>${fmt(ae[i],7)}</td><td>${Number.isFinite(pct[i])?fmt(pct[i],4)+" %":"N/A"}</td></tr>`).join("");
  show($("errorsOutput"),"ok",`<div class="stats-grid">
    <div class="stat"><span class="k">MAE</span><span class="v">${fmt(mae,8)}</span><span class="d">error absoluto medio</span></div>
    <div class="stat"><span class="k">RMSE</span><span class="v">${fmt(rmse,8)}</span><span class="d">penaliza errores grandes</span></div>
    <div class="stat"><span class="k">Sesgo</span><span class="v">${fmt(bias,8)}</span><span class="d">error medio firmado</span></div>
    <div class="stat"><span class="k">MAPE</span><span class="v">${Number.isFinite(mape)?fmt(mape,5)+" %":"N/A"}</span><span class="d">no válido si hay referencia 0</span></div>
  </div><table><thead><tr><th>Nº</th><th>Referencia</th><th>Medido</th><th>Error firmado</th><th>|Error|</th><th>Error %</th></tr></thead><tbody>${rows}</tbody></table>
  <p><b>No confundas:</b> un MAE pequeño solo es “aceptable” si existe un criterio externo o de diseño que lo respalde.</p>`);
});

$("calcReliabilityBtn").addEventListener("click",()=>{
  const total=parseNum($("totalTime").value),down=parseNum($("downTime").value),n=parseInt($("failures").value||"0",10),rep=parseNum($("repairTime").value),u=clean($("timeUnit").value)||"h";
  if(!Number.isFinite(total)||total<=0||!Number.isFinite(down)||down<0||down>total||n<0){show($("reliabilityOutput"),"bad","<b>Revisa tiempo total, tiempo fuera de servicio y número de fallas.</b>");return;}
  const op=total-down,avail=op/total*100,mtbf=n>0?op/n:NaN,mttr=(n>0&&Number.isFinite(rep))?rep/n:NaN;
  show($("reliabilityOutput"),"ok",`<div class="stats-grid">
    <div class="stat"><span class="k">Tiempo operativo</span><span class="v">${fmt(op,5)} ${esc(u)}</span><span class="d">total - fuera de servicio</span></div>
    <div class="stat"><span class="k">Disponibilidad</span><span class="v">${fmt(avail,5)} %</span><span class="d">durante el periodo observado</span></div>
    <div class="stat"><span class="k">MTBF</span><span class="v">${Number.isFinite(mtbf)?fmt(mtbf,5)+" "+esc(u):"Sin fallas"}</span><span class="d">interpretar con el periodo de prueba</span></div>
    <div class="stat"><span class="k">MTTR</span><span class="v">${Number.isFinite(mttr)?fmt(mttr,5)+" "+esc(u):"N/A"}</span><span class="d">requiere tiempo de reparación</span></div>
  </div><p>Estos indicadores describen <b>la prueba realizada</b>. No extrapoles automáticamente el MTBF de una prueba académica corta a la vida útil real del sistema.</p>`);
});

$("calcPerformanceBtn").addEventListener("click",()=>{
  const out=parseNum($("usefulOutput").value),inp=parseNum($("inputResource").value),ach=parseNum($("achieved").value),tar=parseNum($("target").value);
  const eff=Number.isFinite(out)&&Number.isFinite(inp)&&inp!==0?out/inp*100:NaN;
  const efa=Number.isFinite(ach)&&Number.isFinite(tar)&&tar!==0?ach/tar*100:NaN;
  if(!Number.isFinite(eff)&&!Number.isFinite(efa)){show($("performanceOutput"),"bad","<b>Ingresa al menos un par válido de valores.</b>");return;}
  show($("performanceOutput"),"ok",`<div class="stats-grid">
    <div class="stat"><span class="k">Eficiencia</span><span class="v">${Number.isFinite(eff)?fmt(eff,5)+" %":"N/A"}</span><span class="d">salida útil / entrada</span></div>
    <div class="stat"><span class="k">Eficacia</span><span class="v">${Number.isFinite(efa)?fmt(efa,5)+" %":"N/A"}</span><span class="d">alcanzado / meta</span></div>
  </div><p><b>Precaución:</b> estas razones solo son válidas si numerador y denominador representan magnitudes o metas comparables y están correctamente definidas para el proyecto.</p>`);
});

$("calcTelecomBtn").addEventListener("click",()=>{
  const sent=parseInt($("sentPackets").value||"0",10),recv=parseInt($("receivedPackets").value||"0",10),bits=parseNum($("usefulBits").value),t=parseNum($("transferSeconds").value),d=parseSeries($("delayData").value);
  if(sent<=0||recv<0||recv>sent){show($("telecomOutput"),"bad","<b>Revisa los paquetes enviados y recibidos.</b>");return;}
  const loss=(sent-recv)/sent*100,thr=Number.isFinite(bits)&&Number.isFinite(t)&&t>0?bits/t:NaN,dm=d.length?mean(d):NaN,ds=d.length>1?stdev(d):NaN;
  show($("telecomOutput"),"ok",`<div class="stats-grid">
    <div class="stat"><span class="k">Pérdida</span><span class="v">${fmt(loss,5)} %</span><span class="d">${sent-recv} paquetes perdidos</span></div>
    <div class="stat"><span class="k">Throughput</span><span class="v">${Number.isFinite(thr)?fmt(thr,3)+" bit/s":"N/A"}</span><span class="d">datos útiles / tiempo</span></div>
    <div class="stat"><span class="k">Retardo medio</span><span class="v">${Number.isFinite(dm)?fmt(dm,5)+" ms":"N/A"}</span><span class="d">si se ingresó la serie</span></div>
    <div class="stat"><span class="k">Dispersión del retardo</span><span class="v">${Number.isFinite(ds)?fmt(ds,5)+" ms":"N/A"}</span><span class="d">desv. estándar descriptiva; no sustituye definición formal de IPDV</span></div>
  </div><p>Para declarar QoS, documenta topología, dirección, carga, tamaño de paquetes, herramienta y clase/criterio aplicable. ITU-T Y.1540 define parámetros; Y.1541 establece objetivos/clases para contextos específicos.</p>`);
});

$("calcControlBtn").addEventListener("click",()=>{
  const y0=parseNum($("y0").value),yss=parseNum($("yss").value),yp=parseNum($("ypeak").value),yf=parseNum($("yfinal").value);
  if(![y0,yss,yp,yf].every(Number.isFinite)){show($("controlOutput"),"bad","<b>Completa los cuatro valores.</b>");return;}
  const den=Math.abs(yss-y0),mp=den>0?(yp-yss)/den*100:NaN,ess=yss-yf;
  show($("controlOutput"),"ok",`<div class="stats-grid">
    <div class="stat"><span class="k">Sobreimpulso</span><span class="v">${Number.isFinite(mp)?fmt(mp,5)+" %":"N/A"}</span><span class="d">respecto al cambio total</span></div>
    <div class="stat"><span class="k">Error estacionario</span><span class="v">${fmt(ess,7)}</span><span class="d">referencia - valor en régimen</span></div>
  </div><p>El tiempo de subida y de establecimiento requieren la <b>serie temporal completa</b> y una convención explícita. Por ejemplo, herramientas de control suelen usar 10–90 % para tiempo de subida y una banda definida para establecimiento.</p>`);
});

/* Interpretation */
$("buildInterpretationBtn").addEventListener("click",()=>{
  const ind=clean($("interpIndicator").value),resS=clean($("interpResult").value),unit=clean($("interpUnit").value),src=clean($("interpSource").value),critS=clean($("interpCriterion").value),dir=$("interpDirection").value,meaning=clean($("interpMeaning").value);
  if(!ind||!resS||!src||!critS){show($("interpretationOutput"),"bad","<h4>🔵 FALTA INFORMACIÓN</h4><p>Debes indicar como mínimo indicador, resultado, fuente externa y criterio.</p>");return;}
  const res=parseNum(resS),crit=parseNum(critS); let decision="debe evaluarse manualmente";
  if(Number.isFinite(res)&&Number.isFinite(crit)){
    if(dir==="ge")decision=res>=crit?"cumple":"no cumple";
    if(dir==="le")decision=res<=crit?"cumple":"no cumple";
    if(dir==="eq")decision=Math.abs(res-crit)<=Math.max(Math.abs(crit)*0.01,1e-9)?"se aproxima al criterio":"presenta diferencia respecto al criterio";
  }
  const para=`Para evaluar ${ind}, se obtuvo un resultado de ${resS}${unit?" "+unit:""}. Este valor se comparó con el criterio de ${critS}${unit?" "+unit:""} establecido o sustentado mediante ${src}. Bajo la condición de comparación seleccionada, el resultado ${decision}. ${meaning?`Desde el punto de vista técnico, ${meaning.charAt(0).toLowerCase()+meaning.slice(1)}`:"La interpretación final debe vincular este resultado con el elemento evaluado y con el Objetivo Específico correspondiente."} Por consiguiente, la decisión técnica debe sustentarse conjuntamente en el valor calculado, la evidencia experimental y la validez de la referencia utilizada.`;
  show($("interpretationOutput"),decision==="no cumple"?"warn":"ok",`<h4>Párrafo base</h4><p id="generatedInterpretation">${esc(para)}</p><button id="copyInterpNow" type="button">Copiar párrafo</button>`);
  $("copyInterpNow").addEventListener("click",()=>navigator.clipboard.writeText(para));
});

/* Reviewer */
function firstPerson(text){return text.match(/\b(yo|nosotros|nosotras|hicimos|realizamos|calculamos|evaluamos|medimos|comparamos|obtuvimos|nuestro|nuestra)\b/gi)||[];}
$("reviewEvaluationBtn").addEventListener("click",()=>{
  const t=clean($("evaluationText").value);
  if(!t){show($("reviewOutput"),"bad","<h4>🔵 FALTA INFORMACIÓN</h4><p>Pega la evaluación técnica.</p>");return;}
  const checks=[
    [hasAny(t,["indicador","criterio","precisión","precision","confiabilidad","eficiencia","exactitud","disponibilidad"])?"good":"bad","Se identifican indicadores técnicos."],
    [hasAny(t,["error absoluto","error relativo","error porcentual","media","promedio","varianza","desviación","desviacion","mae","rmse","mtbf","mttr","disponibilidad"])?"good":"warn","Se presentan cálculos o métricas cuantitativas cuando corresponden."],
    [hasAny(t,["norma","iso","iec","ieee","itu","datasheet","fabricante","libro","modelo matemático","modelo matematico","simulación","simulacion","referencia"])?"good":"bad","Existe al menos una fuente externa o referencia de comparación."],
    [hasAny(t,["criterio de aceptación","criterio de aceptacion","umbral","límite","limite","rango","valor esperado"])?"good":"bad","Se declara un criterio o umbral de aceptación."],
    [hasAny(t,["cumple","no cumple","aceptable","superior","inferior","compar"])?"good":"warn","Se compara explícitamente el resultado con el criterio."],
    [hasAny(t,["por consiguiente","implica","significa","debido","indica","se concluye","técnicamente","tecnicamente"])?"good":"bad","Se interpreta el significado técnico del resultado."],
    [hasAny(t,["hardware","software","firmware","subsistema","sensor","actuador","enlace","algoritmo","componente"])?"good":"warn","Se identifica el objeto o capa evaluada."],
    [hasAny(t,["objetivo general","objetivo específico","objetivo especifico","problema"])?"good":"warn","Conviene vincular la evaluación con los objetivos/problema."]
  ];
  if(firstPerson(t).length)checks.push(["warn","Se detecta primera persona; usa redacción científica impersonal."]);
  if(hasAny(t,["98 % de exactitud","99 % de exactitud","exactitud del 9","exactitud ="]))checks.push(["warn","Revisa el uso numérico de “exactitud”. El VIM no la trata como una magnitud única; susténtala mediante error/incertidumbre o define expresamente tu métrica."]);
  const bad=checks.some(x=>x[0]==="bad"),warn=checks.some(x=>x[0]==="warn");
  show($("reviewOutput"),bad?"bad":warn?"warn":"ok",`<h4>${bad?"🟠 REQUIERE REFORMULACIÓN":warn?"🟡 CUMPLE PARCIALMENTE":"🟢 CUMPLE"}</h4>
  <ul>${checks.map(x=>`<li class="status-${x[0]}">${x[1]}</li>`).join("")}</ul>
  <p><b>Regla final:</b> cada indicador debe cerrar con resultado → referencia externa → criterio → comparación → interpretación → relación con objetivo.</p>`);
});

function deepPrompt(){
  const s=selectedIndicators();
  return `ACTÚA COMO REVISOR TÉCNICO-METROLÓGICO DE UN PROYECTO DE GRADO DE INGENIERÍA ELECTRÓNICA.

OBJETIVO: revisar la sección de EVALUACIÓN TÉCNICA, posterior a las pruebas funcionales.

REGLAS:
- No inventes mediciones, fuentes, normas, umbrales ni resultados.
- Distingue exactitud de precisión. Según VIM, exactitud no es una magnitud a la que se asigne directamente un valor numérico.
- Revisa teoría de errores y estadística cuando correspondan: media, varianza muestral, desviación estándar, error absoluto, relativo y porcentual, MAE, RMSE, sesgo e incertidumbre si fue incluida.
- Cada indicador debe tener: definición, fórmula o método, datos, unidad, fuente externa, criterio de aceptación, resultado, comparación e interpretación.
- La fuente externa puede ser norma/recomendación, datasheet oficial, libro/artículo técnico, web oficial, instrumento de referencia, simulación, modelo matemático, línea base o requerimiento de diseño debidamente justificado.
- No aceptar frases como “el sistema es 98% confiable/preciso/seguro” si no se define exactamente cómo se obtuvo ese porcentaje.
- La evaluación puede aplicarse a hardware, software, firmware, sistema, subsistema o componente.
- En Telecomunicaciones considerar, cuando proceda: retardo, variación de retardo, pérdida, throughput/capacidad, BER, RSSI/SNR, cobertura y disponibilidad.
- En Control y Automatización considerar, cuando proceda: error estacionario, estabilidad, porcentaje dentro de rango, tiempo de subida, tiempo de establecimiento, sobreimpulso, IAE/ISE/ITAE y energía de control.
- En Electromedicina considerar, cuando proceda: exactitud/repetibilidad de medición, desempeño esencial, alarmas, gestión de riesgos, seguridad eléctrica y software médico; no afirmar certificación ni validación clínica sin evidencia.
- Para software/firmware puede usarse ISO/IEC 25010 como marco de características de calidad, pero no convertirlo en un puntaje universal sin un modelo de métricas explícito.
- Para seguridad no inventar un porcentaje universal; usar requisitos/riesgos/controles y evidencia aplicable.
- Por cada evaluación debe existir un párrafo que interprete el significado del resultado y diga si cumple o no el indicador externo.
- Relacionar la evaluación con Problema, Objetivo General y Objetivos Específicos.
- Redacción científica impersonal.

DATOS DEL PROYECTO:
Título: ${$("projectTitle").value||"[NO INGRESADO]"}
Problema: ${$("problemStatement").value||"[NO INGRESADO]"}
Formulación: ${$("problemQuestion").value||"[NO INGRESADA]"}
Objetivo General: ${$("generalObjective").value||"[NO INGRESADO]"}
Objetivos Específicos:
${$("specificObjectives").value||"[NO INGRESADOS]"}
Mención: ${$("mention").options[$("mention").selectedIndex].text}
Objeto evaluado: ${$("targetLayer").value} / ${$("targetLevel").value} / ${$("targetName").value||"[NO INGRESADO]"}
Función: ${$("targetPurpose").value||"[NO INGRESADA]"}

INDICADORES SELECCIONADOS:
${s.length?s.map((x,i)=>`${i+1}. ${x.name} — ${x.formula}`).join("\n"):"[NINGUNO]"}

TEXTO A REVISAR:
${$("evaluationText").value||"[NO INGRESADO]"}

RESPONDE CON:
1. DICTAMEN: 🟢 CUMPLE / 🟡 CUMPLE PARCIALMENTE / 🟠 REQUIERE REFORMULACIÓN / 🔴 NO CUMPLE / 🔵 FALTA INFORMACIÓN.
2. A. TRAZABILIDAD CON PROBLEMA Y OBJETIVOS.
3. B. OBJETO EVALUADO Y ALCANCE.
4. C. PERTINENCIA DE LOS INDICADORES.
5. D. TEORÍA DE ERRORES Y ESTADÍSTICA.
6. E. EXACTITUD, PRECISIÓN Y CONFIABILIDAD: uso correcto de conceptos.
7. F. FUENTES EXTERNAS Y CRITERIOS DE ACEPTACIÓN.
8. G. CÁLCULOS: coherencia de fórmulas, unidades y datos.
9. H. COMPARACIÓN RESULTADO–CRITERIO.
10. I. INTERPRETACIÓN TÉCNICA DE CADA INDICADOR.
11. J. HARDWARE, SOFTWARE Y FIRMWARE.
12. K. CONSIDERACIONES ESPECÍFICAS DE LA MENCIÓN.
13. L. TABLAS, GRÁFICAS Y EVIDENCIAS.
14. M. REDACCIÓN CIENTÍFICA.
15. N. QUÉ FALTA Y CÓMO CORREGIRLO, SIN INVENTAR INFORMACIÓN.`;
}
$("copyDeepPromptBtn").addEventListener("click",async()=>{
  await navigator.clipboard.writeText(deepPrompt()); $("promptStatus").textContent="Prompt copiado.";
  setTimeout(()=>$("promptStatus").textContent="",1600);
});
