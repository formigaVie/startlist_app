
function loadStartlist() {
  alert("📥 Startliste laden – Funktion folgt");
}
function loadProgram() {
  alert("🕒 Programmzeitplan laden – Funktion folgt");
}
function filterTable() {
  alert("🔍 Filtern – Funktion folgt");
}
function exportPDF() {
  const el = document.getElementById("startlistSection");
  html2pdf().from(el).save("Startliste.pdf");
}
