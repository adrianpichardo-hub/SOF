// ────────────────────────────────────────────────
// ISA - Statement of Facts Generator
// Versión mejorada 2025 – más robusta y mantenible
// ────────────────────────────────────────────────

const CONFIG = {
  bargePrefixes: ['HB', 'LHG', 'ORE', 'CIE', 'MAG', 'TBN', 'SCF', 'NAV'],
  defaultObservation: 'DESCARGA A PILA',
  agencyEvents: [
    { id: 'h_arr', label: (rem, lug) => `${rem} + 12 barcazas amarra en ${lug}.` },
    { id: 'h_ali', label: () => 'Carta de alistamiento extendida.' },
    { id: 'h_aut', label: () => 'Autoridades y agencia a bordo.' },
    { id: 'h_pla', label: () => 'Libre plática otorgada.' }
  ]
};

const bargeRegex = new RegExp(`(${CONFIG.bargePrefixes.join('|')})\\s*(\\d+)`, 'i');
const timeRegex  = /\b(\d{1,2}:\d{2})\b/g;

document.addEventListener('DOMContentLoaded', () => {
  const btnProcesar = document.getElementById('btnProcesar');
  const btnXLS      = document.getElementById('btnXLS');
  const btnLimpiar  = document.getElementById('btnLimpiar');

  btnProcesar.addEventListener('click', procesarLog);
  btnXLS.addEventListener('click',     descargarExcel);
  btnLimpiar.addEventListener('click',  limpiarTodo);
});

function procesarLog() {
  const logText = document.getElementById('logInput').value.trim();
  const fecha   = document.getElementById('v_fec').value.trim();
  const rem     = document.getElementById('v_rem').value.trim() || 'REMOLCADOR';
  const lugar   = document.getElementById('v_lug').value.trim() || 'LUGAR';

  const tbody = document.getElementById('bodySOF');
  tbody.innerHTML = '';

  const rows = [];

  // 1. Eventos fijos de agencia
  CONFIG.agencyEvents.forEach(event => {
    const hora = document.getElementById(event.id)?.value?.trim();
    if (!hora) return;
    const obs = typeof event.label === 'function' ? event.label(rem, lugar) : event.label;
    rows.push({ fecha, barcaza: '---', desde: hora, hasta: '', obs, css: '' });
  });

  // 2. Parseo del log
  let barcazaActual = '---';
  const lineas = logText.split(/\r?\n/);

  lineas.forEach(linea => {
    linea = linea.trim();
    if (linea.length < 6) return;

    // Detectar cambio de barcaza
    const bargeMatch = linea.match(bargeRegex);
    if (bargeMatch) {
      barcazaActual = bargeMatch[0].toUpperCase();
    }

    // Extraer todos los horarios de la línea
    const tiempos = [...linea.matchAll(timeRegex)].map(m => m[1]);
    if (!tiempos.length) return;

    // Limpiar texto de observación
    let obs = linea
      .replace(timeRegex, '')
      .replace(bargeRegex, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (obs.length < 3) obs = CONFIG.defaultObservation;

    const desde = tiempos[0] || '';
    const hasta = tiempos[1] || '';

    // Regla especial para finalización
    if (/DRAFT FINAL|FINALIZA|termina|concluye/i.test(obs)) {
      rows.push({
        fecha,
        barcaza: barcazaActual,
        desde,
        hasta: '',
        obs: `FINALIZA DESCARGA DE BARCAZA ${barcazaActual}`,
        css: 'row-fix'
      });
    }

    rows.push({ fecha, barcaza: barcazaActual, desde, hasta, obs: obs.toUpperCase(), css: '' });
  });

  // Ordenar por hora (simple – solo HH:mm)
  rows.sort((a, b) => a.desde.localeCompare(b.desde));

  // Renderizar
  rows.forEach(r => {
    const tr = document.createElement('tr');
    if (r.css) tr.className = r.css;

    tr.innerHTML = `
      <td>${r.fecha}</td>
      <td>${r.barcaza}</td>
      <td>${r.desde}</td>
      <td>${r.hasta}</td>
      <td>${r.obs}</td>
    `;
    tbody.appendChild(tr);
  });

  btnXLS.style.display = rows.length > 0 ? 'inline-block' : 'none';
}

function descargarExcel() {
  const fecha = document.getElementById('v_fec').value.trim() || 'SOF';
  const filename = `SOF_${fecha.replace(/\//g,'-')}.xlsx`;

  const table = document.getElementById('tablaSOF');
  const wb = XLSX.utils.table_to_book(table, { sheet: { name: 'SOF' } });
  XLSX.writeFile(wb, filename);
}

function limpiarTodo() {
  document.getElementById('logInput').value = '';
  document.getElementById('bodySOF').innerHTML = '';
  document.getElementById('btnXLS').style.display = 'none';
}
