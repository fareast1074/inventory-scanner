// --- MANUAL ENTRY LOGIC ---
function submitManualEntry() {
    const input = document.getElementById('manualBarcode');
    const barcode = input.value.trim();
    
    if (barcode) {
        handleScannedCode(barcode);
        input.value = ""; // Clear input after submission
    } else {
        alert("Please enter a valid barcode.");
    }
}

// Optional: Allow pressing "Enter" inside the manual input box
document.getElementById('manualBarcode')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitManualEntry();
    }
});
