// ============================================================
//  INVENTORY MANAGER — Google Apps Script Backend (v9)
//
//  Column order in the Sheet:
//  ID, Name, Type, Condition, Unit, SKU, MPN, Location,
//  Quantity, Min Stock, Unit Cost, Manufacturer, Supplier 1,
//  Supplier 2, URL, Notes, Last Updated
//
//  AFTER UPDATING THIS FILE:
//  Deploy > Manage deployments > edit (pencil) > New version > Deploy
//  The Web App URL stays the same — no changes needed in the HTML.
// ============================================================

const SHEET_NAME = "Inventory";

const HEADERS = [
  "ID",
  "Name",
  "Type",            // "Asset" or "Inventory Item"
  "Condition",       // "New", "Used - Working", "Not Working", "Unknown"
  "Unit",            // "Each", "Package", etc.
  "SKU",
  "MPN",
  "Location",
  "Quantity",
  "Min Stock",
  "Unit Cost",
  "Manufacturer",
  "Supplier 1",
  "Supplier 2",
  "URL",
  "Notes",
  "Last Updated",
];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#E8F0FE");
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1,  80);   // ID
    sheet.setColumnWidth(2,  200);  // Name
    sheet.setColumnWidth(3,  120);  // Type
    sheet.setColumnWidth(4,  120);  // Condition
    sheet.setColumnWidth(5,  90);   // Unit
    sheet.setColumnWidth(6,  120);  // SKU
    sheet.setColumnWidth(7,  140);  // MPN
    sheet.setColumnWidth(8,  100);  // Location
    sheet.setColumnWidth(9,  80);   // Quantity
    sheet.setColumnWidth(10, 90);   // Min Stock
    sheet.setColumnWidth(11, 100);  // Unit Cost
    sheet.setColumnWidth(12, 140);  // Manufacturer
    sheet.setColumnWidth(13, 140);  // Supplier 1
    sheet.setColumnWidth(14, 140);  // Supplier 2
    sheet.setColumnWidth(15, 250);  // URL
    sheet.setColumnWidth(16, 200);  // Notes
    sheet.setColumnWidth(17, 150);  // Last Updated
  }

  return sheet;
}

// ── All requests come in as GET so CORS works from any origin ──
function doGet(e) {
  const p      = e.parameter || {};
  const action = p.action || "";
  let result;

  try {
    switch (action) {
      case "getAll":    result = getAllItems();                      break;
      case "add":       result = addItem(p);                        break;
      case "update":    result = updateItem(p);                     break;
      case "delete":    result = deleteItem(p.id);                  break;
      case "updateQty": result = updateQty(p.id, Number(p.delta));  break;
      default:          result = { error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Return all rows as an array of item objects ──
function getAllItems() {
  const sheet = getOrCreateSheet();
  const data  = sheet.getDataRange().getValues();

  if (data.length <= 1) return { items: [] };

  return {
    items: data.slice(1).map(row => ({
      id:           String(row[0]),
      name:         row[1],
      type:         row[2],
      condition:    row[3],
      unit:         row[4],
      sku:          row[5],
      mpn:          row[6],
      location:     row[7],
      qty:          Number(row[8]),
      min:          Number(row[9]),
      unitCost:     row[10],
      manufacturer: row[11],
      supplier1:    row[12],
      supplier2:    row[13],
      url:          row[14],
      notes:        row[15],
      updated:      row[16],
    }))
  };
}

// ── Append a new row ──
function addItem(p) {
  const sheet = getOrCreateSheet();
  const id    = String(Date.now());

  sheet.appendRow([
    id,
    p.name         || "",
    p.type         || "Inventory Item",
    p.condition    || "Unknown",
    p.unit         || "Each",
    p.sku          || "",
    p.mpn          || "",
    p.location     || "",
    Number(p.qty)  || 0,
    Number(p.min)  || 1,
    p.unitCost !== "" ? Number(p.unitCost) : "",
    p.manufacturer || "",
    p.supplier1    || "",
    p.supplier2    || "",
    p.url          || "",
    p.notes        || "",
    new Date().toLocaleString(),
  ]);

  return { success: true, id };
}

// ── Update all fields for an existing row ──
function updateItem(p) {
  const sheet = getOrCreateSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.id)) {
      sheet.getRange(i + 1, 2, 1, 16).setValues([[
        p.name         || "",
        p.type         || "Inventory Item",
        p.condition    || "Unknown",
        p.unit         || "Each",
        p.sku          || "",
        p.mpn          || "",
        p.location     || "",
        Number(p.qty)  || 0,
        Number(p.min)  || 1,
        p.unitCost !== "" ? Number(p.unitCost) : "",
        p.manufacturer || "",
        p.supplier1    || "",
        p.supplier2    || "",
        p.url          || "",
        p.notes        || "",
        new Date().toLocaleString(),
      ]]);
      return { success: true };
    }
  }

  return { error: "Item not found" };
}

// ── Delete a row by ID ──
function deleteItem(id) {
  const sheet = getOrCreateSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { error: "Item not found" };
}

// ── Update only the quantity and last-updated timestamp ──
function updateQty(id, delta) {
  const sheet = getOrCreateSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const newQty = Math.max(0, Number(rows[i][8]) + delta);
      sheet.getRange(i + 1, 9).setValue(newQty);
      sheet.getRange(i + 1, 17).setValue(new Date().toLocaleString());
      return { success: true, qty: newQty };
    }
  }

  return { error: "Item not found" };
}
