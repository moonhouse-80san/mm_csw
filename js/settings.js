function openSettings() {
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordModal').classList.add('active');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

function checkPassword() {
    const inputPassword = document.getElementById('passwordInput').value;
    if (inputPassword === settings.adminPassword) {
        closePasswordModal();
        openSettingsDialog();
    } else {
        showAlert('비밀번호가 틀렸습니다!');
    }
}

function openSettingsDialog() {
    document.getElementById('clubNameInput').value = settings.clubName || '';
    document.getElementById('lockTimeoutInput').value = settings.lockTimeout || 60;
    document.getElementById('feePreset1').value = settings.feePresets[0] || '';
    document.getElementById('feePreset2').value = settings.feePresets[1] || '';
    document.getElementById('feePreset3').value = settings.feePresets[2] || '';
    document.getElementById('feePreset4').value = settings.feePresets[3] || '';
    document.getElementById('feePreset5').value = settings.feePresets[4] || '';
    document.getElementById('editPassword').value = settings.editPassword || '0000';
    document.getElementById('adminPassword').value = '';

    document.getElementById('coachName1').value = settings.coaches[0] || '';
    document.getElementById('coachName2').value = settings.coaches[1] || '';
    document.getElementById('coachName3').value = settings.coaches[2] || '';
    document.getElementById('coachName4').value = settings.coaches[3] || '';

    document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
    settings.clubName = document.getElementById('clubNameInput').value.trim();

    const lockTimeout = parseInt(document.getElementById('lockTimeoutInput').value);
    if (lockTimeout && lockTimeout >= 1 && lockTimeout <= 120) {
        settings.lockTimeout = lockTimeout;
    } else {
        settings.lockTimeout = 60;
    }

    settings.coaches = [
        document.getElementById('coachName1').value.trim(),
        document.getElementById('coachName2').value.trim(),
        document.getElementById('coachName3').value.trim(),
        document.getElementById('coachName4').value.trim()
    ];

    settings.feePresets = [
        parseInt(document.getElementById('feePreset1').value) || 0,
        parseInt(document.getElementById('feePreset2').value) || 0,
        parseInt(document.getElementById('feePreset3').value) || 0,
        parseInt(document.getElementById('feePreset4').value) || 0,
        parseInt(document.getElementById('feePreset5').value) || 0
    ];

    const newEditPassword = document.getElementById('editPassword').value;
    if (newEditPassword) {
        settings.editPassword = newEditPassword;
    }

    const newPassword = document.getElementById('adminPassword').value;
    if (newPassword) {
        settings.adminPassword = newPassword;
    }

    saveToFirebase();
    if (settings.clubName) {
        document.getElementById('clubNameDisplay').textContent = settings.clubName;
    }
    updateFeePresetButtons();
    renderCoachButtons();
    closeSettings();
    showAlert('설정이 저장되었습니다!');

    if (newEditPassword) {
        isUnlocked = false;
        remainingTime = settings.lockTimeout * 60;
        if (lockInterval) {
            clearInterval(lockInterval);
            lockInterval = null;
        }
        updateLockStatus();
    }
}

// 데이터 내보내기 / 가져오기
function exportData() {
    const data = {
        members: members,
        settings: settings,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `회원데이터_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert('데이터가 내보내기되었습니다!');
    resetLockTimer();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.members) {
                members = data.members.map(normalizeMember);
                filteredMembers = [...members];
                saveToFirebase();
            }

            if (data.settings) {
                if (data.settings.clubName) {
                    settings.clubName = data.settings.clubName;
                    document.getElementById('clubNameDisplay').textContent = settings.clubName;
                }
                if (data.settings.feePresets) {
                    settings.feePresets = data.settings.feePresets;
                }
                if (data.settings.adminPassword) {
                    settings.adminPassword = data.settings.adminPassword;
                }
                if (data.settings.editPassword) {
                    settings.editPassword = data.settings.editPassword;
                }
                if (data.settings.lockTimeout) {
                    settings.lockTimeout = data.settings.lockTimeout;
                }
                if (data.settings.coaches) {
                    settings.coaches = data.settings.coaches;
                }
                updateFeePresetButtons();
                renderCoachButtons();
            }

            renderMembers();
            renderSchedule();
            closeSettings();
            showAlert('데이터를 성공적으로 가져왔습니다!');

            isUnlocked = false;
            remainingTime = settings.lockTimeout * 60;
            updateLockStatus();

        } catch (error) {
            showAlert('잘못된 파일 형식입니다!');
        }
    };
    reader.readAsText(file);
}