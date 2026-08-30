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
 * ===============================================================
 */

var SHEET_NAME = "KetQuaChamDiem";

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

// Xử lý lấy toàn bộ dữ liệu chấm điểm (GET)
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
    
    var output = JSON.stringify({
      success: true,
      count: votes.length,
      votes: votes,
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

// Xử lý gửi phiếu chấm điểm (POST)
function doPost(e) {
  try {
    var sheet = getOrCreateSheet();
    var payload = {};
    
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    
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
