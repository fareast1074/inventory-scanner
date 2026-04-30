// --- CONFIGURATION ---
const AUTH_PASS = "1234";
const MASTER_PASS = "admin";
const MONTH_ORDER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// --- STATE MANAGEMENT ---
let scanHistory = []; 
let masterDB = {}; 
let rawMasterRows = []; 
let pendingUploads = JSON.parse(localStorage.getItem('pending_queue')) || [];
let activeLocks = {};

let currentItem = null;
let loggedInUser = "";
let html5QrCode = null;
let currentGaugeValue = 0;
let targetGaugeValue = 0;
let isOnline = false;

let selectedLoc = "CORRECT";
let selectedDue = "VALID";
let selectedMsa = "NO";

let failureChartInstance = null;

// --- CONNECTION ---
db.ref(".info/connected").on("value", (snap) => {
    isOnline = snap.val() === true;
    const syncIcon = document.getElementById('syncStatus');
    if (syncIcon) {
        if (isOnline) {
            syncIcon.style.background = "#2e7d32"; 
            processOfflineQueue();
        } else {
            syncIcon.style.background = "#d32f2f"; 
        }
    }
});

// --- REALTIME ---
db.ref('audit_history').on('value', (snapshot) => {
    const data = snapshot.val();
    scanHistory = data ? Object.values(data).sort((a, b) => b.id - a.id) : [];
    updateDisplay();
});

db.ref('master_list').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        masterDB = data.masterDB;
        rawMasterRows = data.rawMasterRows;
        rebuildFilters();
        updateDisplay();
    }
});

// --- DISPLAY ---
function updateDisplay() {
    document.getElementById('totalScans').innerText = scanHistory.length;
    document.getElementById('totalFails').innerText = scanHistory.filter(x => x.isFail).length;

    document.getElementById('inventoryBody').innerHTML = scanHistory.map(i => `
        <tr class="${i.isFail ? 'row-fail' : ''}">
            <td>${i.time}</td>
            <td>${i.barcode}</td>
            <td>${i.name}</td>
            <td>${i.pic}</td>
            <td>${i.locRes}</td>
            <td>${i.dueRes}</td>
            <td>${i.msaRes}</td>
            <td>${i.remark}</td>
        </tr>
    `).join('');
}

// --- SCAN HANDLER ---
async function handleScannedCode(barcode) {
    if (!barcode) return;

    const lookupCode = barcode.toUpperCase();
    const masterInfo = masterDB[lookupCode];

    currentItem = masterInfo || {
        barcode,
        name: "UNREGISTERED",
        loc: "N/A",
        due: "N/A",
        msa: "N/A",
        status: "N/A",
        isUnregistered: true
    };

    document.getElementById('qcModal').style.display = 'flex';
}

// --- TOGGLE ---
function setToggle(type, val) {
    if(type === 'Loc') selectedLoc = val;
    if(type === 'Due') selectedDue = val;
    if(type === 'Msa') selectedMsa = val;
}

// ✅ UPDATED LOGIC HERE
function submitQC() {
    if(!currentItem) return;

    const remarkValue = document.getElementById('qcRemark').value.trim();

    const failed = (
        selectedLoc === "WRONG" || 
        selectedDue === "EXPIRED" || 
        currentItem.isUnregistered ||
        remarkValue !== ""   // 🔥 THIS IS THE NEW RULE
    );

    const auditData = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        barcode: currentItem.barcode,
        name: currentItem.name,
        pic: loggedInUser,
        locRes: selectedLoc,
        dueRes: selectedDue,
        msaRes: selectedMsa,
        remark: remarkValue || "-",
        isFail: failed,
        isUnregistered: currentItem.isUnregistered
    };

    if (isOnline) {
        const newRef = db.ref('audit_history').push();
        auditData.cloudId = newRef.key;
        newRef.set(auditData);
    } else {
        pendingUploads.push(auditData);
        localStorage.setItem('pending_queue', JSON.stringify(pendingUploads));
        scanHistory.unshift(auditData);
    }

    closeModal();
}

function closeModal() {
    document.getElementById('qcModal').style.display = 'none';
    document.getElementById('qcRemark').value = "";
    currentItem = null;
    updateDisplay();
}

// --- LOGIN ---
function checkLogin() {
    const u = document.getElementById('username').value;
    if (u && document.getElementById('password').value === AUTH_PASS) {
        loggedInUser = u;
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
    } else {
        alert("Invalid Credentials");
    }
}
