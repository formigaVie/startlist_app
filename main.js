let disziplinZeiten = {};
let startEntries = [];

function normalize(str){
  return str
    ? str.toUpperCase().replace(/\(.*?\)/g,"").trim()
    : "";
}

// =========================
// EVENTS
// =========================
document.getElementById("programInput")
  .addEventListener("change", e => parseProgram(e.target.files[0]));

document.getElementById("startlistInput")
  .addEventListener("change", e => parseStartlist(e.target.files[0]));

// =========================
// PROGRAM PARSER
// =========================
async function parseProgram(file){

  const reader = new FileReader();

  return new Promise((resolve, reject) => {

    reader.onload = async () => {

      try{

        const pdf = await pdfjsLib.getDocument({
          data:new Uint8Array(reader.result)
        }).promise;

        let text = "";

        for(let p=1; p<=pdf.numPages; p++){

          const page = await pdf.getPage(p);
          const content = await page.getTextContent();

          text += content.items.map(i => i.str).join(" ");
          text += "\n";
        }

        const dateRegex =
          /(Friday|Saturday|Sunday),\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/g;

        const timeRegex =
          /(\d{1,2}:\d{2})\s+[–-]\s+(\d{1,2}:\d{2})\s+([A-Za-z\s&()]+)/g;

        let currentDate = "";
        let match;

        while((match = dateRegex.exec(text)) !== null){

          currentDate =
            new Date(match[2]).toISOString().split("T")[0];

          const section = text.substring(match.index);

          let t;

          while((t = timeRegex.exec(section)) !== null){

            disziplinZeiten[normalize(t[3])] = {
              start: t[1],
              datum: currentDate
            };
          }
        }

        console.log("Programm geladen:", disziplinZeiten);

        resolve();

      }catch(err){

        console.error(err);
        reject(err);
      }
    };

    reader.onerror = reject;

    reader.readAsArrayBuffer(file);

  });
}

// =========================
// STARTLIST PARSER
// =========================
async function parseStartlist(file){

  const reader = new FileReader();

  return new Promise((resolve, reject) => {

    reader.onload = async () => {

      try{

        const pdf = await pdfjsLib.getDocument({
          data:new Uint8Array(reader.result)
        }).promise;
        
        startEntries = [];

        let fullText = "";

        for(let p=1; p<=pdf.numPages; p++){

          const page = await pdf.getPage(p);
          const content = await page.getTextContent();

          let items = content.items.map(i => ({
            text: i.str.trim(),
            x: i.transform[4],
            y: i.transform[5]
          }));

          items.sort((a,b)=>{

            if(Math.abs(b.y - a.y) > 5)
              return b.y - a.y;

            return a.x - b.x;
          });

          items.forEach(i=>{
            fullText += i.text + " ";
          });

          fullText += "\n";
        }

        fullText = fullText
          .replace(/\s+/g," ")
          .replace(/Tap/g,"TAP")
          .replace(/Open/g,"OPEN");

        const regex =
          /(\d{1,4})\s+(.*?)(?=\s+\d{1,4}\s+|$)/gs;

        let match;

        while((match = regex.exec(fullText)) !== null){

          let nr = match[1];
          let block = match[2].trim();

          let kategorie = "";

          const kategorien = [
            "Production Number",
            "Duo/Trio/Quartet",
            "Formation",
            "Group",
            "Solo"
          ];

          kategorien.forEach(k=>{
            if(block.toUpperCase().includes(k.toUpperCase()))
              kategorie = k;
          });

          let disziplin = "";

          Object.keys(disziplinZeiten).forEach(d=>{
            if(block.toUpperCase().includes(d.toUpperCase()))
              disziplin = d;
          });

          let schule = "";

          let schoolMatch =
            block.match(/([A-Z][A-Za-z\s&\-]+(?:AT|DE|SK|CZ|HU))/);

          if(schoolMatch)
            schule = schoolMatch[1];
          if(startEntries.some(e => e.nr === nr))
          continue;
          startEntries.push({
            nr,
            routine: block,
            schule,
            disziplin,
            kategorie
          });
        }

        console.log("🔥 Einträge erkannt:", startEntries.length);
        console.log(startEntries);

        renderTable();

        resolve();

      }catch(err){

        console.error(err);
        reject(err);
      }
    };

    reader.onerror = reject;

    reader.readAsArrayBuffer(file);

  });
}

// =========================
// LINK LOADERS
// =========================
async function loadFromLink(){

  const url = document.getElementById("pdfLink").value;

  try{

    console.log("Lade Startlisten PDF...");

    const response = await fetch(url);

    if(!response.ok)
      throw new Error("Startlisten PDF konnte nicht geladen werden");

    const blob = await response.blob();

    console.log("Startlisten PDF geladen");

    const file =
      new File([blob], "startliste.pdf");

    await parseStartlist(file);

  }catch(err){

    console.error(err);
    alert("Startlisten PDF Fehler");
  }
}

async function loadProgramFromLink(){

  const url = document.getElementById("programLink").value;

  try{

    console.log("Lade Programm PDF...");

    const response = await fetch(url);

    if(!response.ok)
      throw new Error("Programm PDF konnte nicht geladen werden");

    const blob = await response.blob();

    console.log("Programm PDF geladen");

    const file =
      new File([blob], "programm.pdf");

    await parseProgram(file);

  }catch(err){

    console.error(err);
    alert("Programm PDF Fehler");
  }
}

// =========================
// DURATIONS
// =========================
function getDurations(){

  return {
    "SOLO": parseInt(document.getElementById("durSOLO").value) || 100,
    "DUO/TRIO/QUARTET": parseInt(document.getElementById("durDUO").value) || 120,
    "GROUP": parseInt(document.getElementById("durGROUP").value) || 180,
    "FORMATION": parseInt(document.getElementById("durFORMATION").value) || 240,
    "PRODUCTION NUMBER": parseInt(document.getElementById("durPROD").value) || 270
  };
}

// =========================
// TABLE RENDER
// =========================
function renderTable(){

  const tbody =
    document.getElementById("tableBody");

  tbody.innerHTML = "";

  let durations = getDurations();
  let times = {};

  startEntries.forEach(e=>{

let disKey = Object.keys(disziplinZeiten)
  .find(k =>
    normalize(e.routine).includes(k)
  );

// Fallback
if(!disKey){

  disKey =
    Object.keys(disziplinZeiten)[0];
}

    let datum =
      disziplinZeiten[disKey]?.datum || "";

    if(!times[disKey])
      times[disKey] =
        disziplinZeiten[disKey].start;

    let start = times[disKey];

    let dur =
      durations[normalize(e.kategorie)] || 120;
    dur = parseInt(dur);

    times[disKey] =
  timeAdd(start, dur);

    tbody.innerHTML += `
      <tr>
        <td>${datum}</td>
        <td>${e.nr}</td>
        <td>${e.routine}</td>
        <td>${e.schule}</td>
        <td>${e.disziplin}</td>
        <td>${e.kategorie}</td>
        <td>${start}</td>
      </tr>`;
  });
}

// =========================
// TIME HELPER
// =========================
function timeAdd(t, seconds){

  let [h,m] = t.split(":").map(Number);

  // aktuelle Zeit in Sekunden
  let total =
    (h * 3600) +
    (m * 60) +
    seconds;

  // neue Stunden
  let newH =
    Math.floor(total / 3600);

  // Restsekunden nach Stunden
  let remain =
    total % 3600;

  // Minuten korrekt berechnen
  let newM =
    Math.floor(remain / 60);

  // Sicherheit gegen >59
  if(newM >= 60){

    newH += Math.floor(newM / 60);
    newM = newM % 60;
  }

  return (
    String(newH).padStart(2,"0")
    + ":"
    + String(newM).padStart(2,"0")
  );
}
// =========================
// PDF EXPORT
// =========================
function exportPDF(){

  const element =
    document.getElementById("dataTable");

  const today =
    new Date().toLocaleDateString("de-DE");

  html2pdf()
    .from(element)
    .toPdf()
    .get("pdf")
    .then(pdf=>{

      const pages =
        pdf.internal.getNumberOfPages();

      for(let i=1;i<=pages;i++){

        pdf.setPage(i);

        pdf.setFontSize(8);

        pdf.text(
          "Exportdatum: " + today + " | Quelle: GitHub Pages",
          10,
          290
        );

        pdf.text(
          "Seite " + i + " von " + pages,
          180,
          290
        );
      }
    })
    .save("Startliste.pdf");
}
