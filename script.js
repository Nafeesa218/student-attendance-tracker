
"use strict";

const STORAGE_KEY = "studentAttendanceTrackerV1";

const studentForm = document.getElementById("studentForm");
const studentNameInput = document.getElementById("studentName");
const studentIdInput = document.getElementById("studentId");
const studentList = document.getElementById("studentList");
const searchInput = document.getElementById("searchInput");
const formMessage = document.getElementById("formMessage");
const historyDateInput = document.getElementById("historyDate");
const historyList = document.getElementById("historyList");

let students = [];
let records = [];

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    students = Array.isArray(saved.students) ? saved.students : [];
    records = Array.isArray(saved.records) ? saved.records : [];
  } catch (error) {
    students = [];
    records = [];
    showMessage("Saved data could not be read. Please check your browser storage.", "error");
  }
}

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ students, records })
    );
    return true;
  } catch (error) {
    showMessage("Could not save data. Check your browser storage space.", "error");
    return false;
  }
}

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showMessage(message, type = "success") {
  formMessage.textContent = message;
  formMessage.className = message ? `message ${type}` : "message";
}

function getRecord(studentId, date = getToday()) {
  return records.find(
    record => record.studentId === studentId && record.date === date
  );
}

function createButton(text, className, onClick, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = `button ${className}`;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function updateDashboard() {
  const todaysRecords = records.filter(
    record => record.date === getToday()
  );
  const present = todaysRecords.filter(
    record => record.status === "Present"
  ).length;
  const absent = todaysRecords.filter(
    record => record.status === "Absent"
  ).length;
  const marked = present + absent;
  const rate = marked ? Math.round((present / marked) * 100) : 0;

  document.getElementById("totalStudents").textContent = students.length;
  document.getElementById("presentCount").textContent = present;
  document.getElementById("absentCount").textContent = absent;
  document.getElementById("attendanceRate").textContent = `${rate}%`;
}

function renderStudents() {
  studentList.replaceChildren();

  const query = searchInput.value.trim().toLowerCase();
  const filtered = students.filter(student =>
    student.name.toLowerCase().includes(query) ||
    student.studentId.toLowerCase().includes(query)
  );

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = students.length
      ? "No students match your search."
      : "No students added yet. Add your first student above.";
    studentList.append(empty);
    return;
  }

  filtered.forEach(student => {
    const row = document.createElement("div");
    row.className = "student-row";

    const info = document.createElement("div");
    info.className = "student-info";

    const name = document.createElement("strong");
    name.textContent = student.name;

    const id = document.createElement("span");
    id.textContent = `ID: ${student.studentId}`;

    const status = document.createElement("span");
    const currentRecord = getRecord(student.id);
    status.className = `status-label ${currentRecord ? currentRecord.status : ""}`;
    status.textContent = currentRecord
      ? currentRecord.status
      : "Not marked";

    info.append(name, id, document.createElement("br"), status);

    const actions = document.createElement("div");
    actions.className = "student-actions";

    actions.append(
      createButton("Present", "button-present", () =>
        markAttendance(student.id, "Present"),
        currentRecord?.status === "Present"
      ),
      createButton("Absent", "button-absent", () =>
        markAttendance(student.id, "Absent"),
        currentRecord?.status === "Absent"
      ),
      createButton("Remove", "button-remove", () =>
        removeStudent(student.id))
    );

    row.append(info, actions);
    studentList.append(row);
  });
}

function markAttendance(studentId, status) {
  const student = students.find(item => item.id === studentId);
  if (!student) return;

  const previousRecords = records;
  records = records.filter(
    record => !(record.studentId === studentId && record.date === getToday())
  );

  records.push({
    studentId,
    studentName: student.name,
    date: getToday(),
    status
  });

  if (!saveData()) {
    records = previousRecords;
    return;
  }

  showMessage(`${student.name} marked ${status.toLowerCase()}.`, "success");
  renderAll();
}

function removeStudent(studentId) {
  const student = students.find(item => item.id === studentId);
  if (!student) return;

  if (!confirm(`Remove ${student.name} and their attendance records?`)) {
    return;
  }

  const previousStudents = students;
  const previousRecords = records;

  students = students.filter(item => item.id !== studentId);
  records = records.filter(record => record.studentId !== studentId);

  if (!saveData()) {
    students = previousStudents;
    records = previousRecords;
    return;
  }

  showMessage("Student removed successfully.", "success");
  renderAll();
}

function renderHistory() {
  historyList.replaceChildren();

  const selectedDate = historyDateInput.value;
  const filtered = records
    .filter(record => !selectedDate || record.date === selectedDate)
    .slice()
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      a.studentName.localeCompare(b.studentName)
    );

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No attendance records found.";
    historyList.append(empty);
    return;
  }

  filtered.forEach(record => {
    const row = document.createElement("div");
    row.className = "history-row";

    const date = document.createElement("strong");
    date.textContent = record.date;

    const detail = document.createElement("span");
    detail.textContent =
      ` — ${record.studentName} (${record.studentId || "Student"}): ${record.status}`;

    row.append(date, detail);
    historyList.append(row);
  });
}

function renderAll() {
  updateDashboard();
  renderStudents();
  renderHistory();
}

function addStudent(event) {
  event.preventDefault();

  const name = studentNameInput.value.trim();
  const studentId = studentIdInput.value.trim();

  if (!name || !studentId) {
    showMessage("Please enter both student name and student ID.", "error");
    return;
  }

  const duplicate = students.some(student =>
    student.studentId.toLowerCase() === studentId.toLowerCase()
  );

  if (duplicate) {
    showMessage("This student ID already exists. Please use a unique ID.", "error");
    return;
  }

  students.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    name
  });

  if (!saveData()) {
    students.pop();
    return;
  }

  studentForm.reset();
  showMessage(`${name} added successfully.`, "success");
  renderAll();
}

function exportCSV() {
  if (!records.length) {
    showMessage("There are no attendance records to export yet.", "error");
    return;
  }

  const rows = [
    ["Date", "Student ID", "Student Name", "Status"],
    ...records.map(record => [
      record.date,
      record.studentId || "",
      record.studentName,
      record.status
    ])
  ];

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "student-attendance.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showMessage("Attendance CSV exported.", "success");
}

studentForm.addEventListener("submit", addStudent);
searchInput.addEventListener("input", renderStudents);
historyDateInput.addEventListener("change", renderHistory);

document.getElementById("clearFilterButton").addEventListener("click", () => {
  historyDateInput.value = "";
  renderHistory();
});

document.getElementById("exportButton").addEventListener("click", exportCSV);

document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

loadData();
renderAll();
    
