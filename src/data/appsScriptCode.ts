/**
 * Mã nguồn Google Apps Script (GAS) hoàn chỉnh để dán vào Google Sheet.
 * Hướng dẫn nhanh:
 * 1. Mở Google Sheet mới.
 * 2. Chọn Tiện ích mở rộng (Extensions) > Apps Script.
 * 3. Dán toàn bộ mã nguồn bên dưới vào file Code.gs (xóa code cũ nếu có).
 * 4. Bấm "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web app).
 * 6. Mục "Ai có quyền truy cập" (Who has access): Chọn "Bất kỳ ai" (Anyone).
 * 7. Bấm "Triển khai" (Deploy) và sao chép URL Ứng dụng web dán vào trang Quản trị.
 */

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ===============================================================
 * HỆ THỐNG CHẤM ĐIỂM TRIỂN LÃM NGHỆ THUẬT (4 TỔ) - GOOGLE APPS SCRIPT
 * TỰ ĐỘNG ĐỒNG BỘ: KẾT QUẢ CHẤM ĐIỂM & ẢNH TÁC PHẨM CÁC TỔ
 * ===============================================================
 */

var SHEET_NAME = "KetQuaChamDiem";
var EXHIBITS_SHEET_NAME = "DanhSachTacPham";

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Tạo tiêu đề cột
    var headers = [
      "Thời gian",
      "Họ và tên",
      "Tổ của người chấm",
      "Điểm Tổ 1",
      "Điểm Tổ 2",
      "Điểm Tổ 3",
      "Điểm Tổ 4",
      "Mã định danh (ID)"
    ];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1e2531").setFontColor("#f1ede3").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(2, 220);
    sheet.setColumnWidth(3, 130);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 220);
  }
  return sheet;
}

function getOrCreateExhibitsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EXHIBITS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(EXHIBITS_SHEET_NAME);
    var headers = ["ID", "Tổ", "Tiêu đề tác phẩm", "Link ảnh (Google Drive / URL)"];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1e2531").setFontColor("#f1ede3").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 60);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 450);
  }
  return sheet;
}

// Xử lý lấy toàn bộ dữ liệu chấm điểm & tác phẩm (GET)
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
    var data = sheet.getDataRange().getValues();
    var votes = [];
    
    // Bỏ dòng tiêu đề (i = 1)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[1]) continue; // Bỏ qua nếu không có tên
      
      var timestamp = row[0] ? new Date(row[0]).toISOString() : new Date().toISOString();
      var displayName = String(row[1]);
      var groupNumber = parseInt(row[2]) || 1;
      var s1 = row[3] === "" || isNaN(Number(row[3])) ? null : Number(row[3]);
      var s2 = row[4] === "" || isNaN(Number(row[4])) ? null : Number(row[4]);
      var s3 = row[5] === "" || isNaN(Number(row[5])) ? null : Number(row[5]);
      var s4 = row[6] === "" || isNaN(Number(row[6])) ? null : Number(row[6]);
      var memberRaw = row[7] ? String(row[7]) : displayName.toUpperCase();
      
      votes.push({
        memberRaw: memberRaw,
        displayName: displayName,
        groupNumber: groupNumber,
        scores: { 1: s1, 2: s2, 3: s3, 4: s4 },
        timestamp: timestamp
      });
    }

    // Đọc danh sách ảnh tác phẩm nếu có
    var exhibitsSheet = getOrCreateExhibitsSheet();
    var exData = exhibitsSheet.getDataRange().getValues();
    var exhibits = [];
    for (var j = 1; j < exData.length; j++) {
      var exRow = exData[j];
      if (exRow[0]) {
        exhibits.push({
          id: parseInt(exRow[0]) || j,
          groupNumber: parseInt(exRow[1]) || j,
          title: String(exRow[2] || "Tác phẩm Tổ " + (exRow[1] || j)),
          url: String(exRow[3] || "")
        });
      }
    }
    
    var output = JSON.stringify({
      success: true,
      count: votes.length,
      votes: votes,
      exhibits: exhibits.length > 0 ? exhibits : null,
      lastSync: new Date().toISOString()
    });
    
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Xử lý gửi phiếu chấm điểm HOẶC cập nhật ảnh tác phẩm (POST)
function doPost(e) {
  try {
    var payload = {};
    
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    // Trường hợp 1: Ban tổ chức lưu danh sách ảnh tác phẩm
    if (payload.action === "saveExhibits" && Array.isArray(payload.exhibits)) {
      var exSheet = getOrCreateExhibitsSheet();
      exSheet.clearContents();
      var exHeaders = ["ID", "Tổ", "Tiêu đề tác phẩm", "Link ảnh (Google Drive / URL)"];
      exSheet.appendRow(exHeaders);
      var headerRange = exSheet.getRange(1, 1, 1, exHeaders.length);
      headerRange.setBackground("#1e2531").setFontColor("#f1ede3").setFontWeight("bold").setHorizontalAlignment("center");
      
      for (var k = 0; k < payload.exhibits.length; k++) {
        var ex = payload.exhibits[k];
        exSheet.appendRow([ex.id, ex.groupNumber, ex.title, ex.url]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã lưu và đồng bộ toàn bộ ảnh tác phẩm lên Google Sheets thành công!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Trường hợp 2: Học sinh gửi phiếu chấm điểm
    var sheet = getOrCreateSheet();
    var memberRaw = payload.memberRaw || "";
    var displayName = payload.displayName || "";
    var groupNumber = parseInt(payload.groupNumber) || 1;
    var scores = payload.scores || {};
    var timestamp = payload.timestamp || new Date().toLocaleString("vi-VN");
    
    var s1 = scores["1"] !== undefined && scores["1"] !== null ? scores["1"] : "";
    var s2 = scores["2"] !== undefined && scores["2"] !== null ? scores["2"] : "";
    var s3 = scores["3"] !== undefined && scores["3"] !== null ? scores["3"] : "";
    var s4 = scores["4"] !== undefined && scores["4"] !== null ? scores["4"] : "";
    
    var data = sheet.getDataRange().getValues();
    var existingRowIndex = -1;
    
    // Tìm xem thành viên này đã từng gửi điểm chưa (dựa vào cột Mã định danh ID hoặc Tên)
    for (var i = 1; i < data.length; i++) {
      var rowMemberRaw = String(data[i][7] || "").toUpperCase().trim();
      var rowName = String(data[i][1] || "").toUpperCase().trim();
      var targetRaw = String(memberRaw || displayName).toUpperCase().trim();
      
      if (rowMemberRaw === targetRaw || rowName === targetRaw) {
        existingRowIndex = i + 1; // 1-indexed trong Sheets
        break;
      }
    }
    
    var rowValues = [
      new Date(),
      displayName,
      groupNumber,
      s1,
      s2,
      s3,
      s4,
      memberRaw || displayName.toUpperCase()
    ];
    
    if (existingRowIndex > 0) {
      // Cập nhật dòng cũ
      sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      // Thêm dòng mới
      sheet.appendRow(rowValues);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã lưu kết quả chấm điểm thành công vào Google Sheets!",
      member: displayName,
      updated: existingRowIndex > 0
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
