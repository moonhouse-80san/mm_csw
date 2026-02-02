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

// 데이터 엑셀 내보내기
function exportData() {
    try {
        // 회원 데이터를 엑셀 형식으로 변환
        const wsData = [];
        
        // 헤더 행 추가
        const headers = [
            '이름', '전화번호', '이메일', '주소', '등록일', '월회비', 
            '담당코치', '출석목표횟수', '현재출석횟수',
            '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간',
            '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간'
        ];
        wsData.push(headers);
        
        // 회원 데이터 행 추가
        members.forEach(member => {
            const row = [
                member.name || '',
                member.phone || '',
                member.email || '',
                member.address || '',
                member.registerDate || '',
                member.fee || '',
                member.coach || '',
                member.targetCount || 0,
                member.currentCount || 0,
                member.day1 || '',
                member.startTime1 || '',
                member.endTime1 || '',
                member.day2 || '',
                member.startTime2 || '',
                member.endTime2 || ''
            ];
            wsData.push(row);
        });
        
        // 워크시트 생성
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 열 너비 설정
        const wscols = [
            {wch: 10}, // 이름
            {wch: 15}, // 전화번호
            {wch: 20}, // 이메일
            {wch: 25}, // 주소
            {wch: 12}, // 등록일
            {wch: 10}, // 월회비
            {wch: 10}, // 담당코치
            {wch: 12}, // 출석목표횟수
            {wch: 12}, // 현재출석횟수
            {wch: 10}, // 스케줄1_요일
            {wch: 10}, // 스케줄1_시작시간
            {wch: 10}, // 스케줄1_종료시간
            {wch: 10}, // 스케줄2_요일
            {wch: 10}, // 스케줄2_시작시간
            {wch: 10}  // 스케줄2_종료시간
        ];
        ws['!cols'] = wscols;
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "회원목록");
        
        // 추가 시트: 설정 정보
        const settingsData = [
            ['구장명', settings.clubName || ''],
            ['관리자 비밀번호', '********'],
            ['수정/삭제 암호', '********'],
            ['자동 잠금 시간(분)', settings.lockTimeout || 60],
            ['코치1', settings.coaches[0] || ''],
            ['코치2', settings.coaches[1] || ''],
            ['코치3', settings.coaches[2] || ''],
            ['코치4', settings.coaches[3] || ''],
            ['월회비 기본값1', settings.feePresets[0] || ''],
            ['월회비 기본값2', settings.feePresets[1] || ''],
            ['월회비 기본값3', settings.feePresets[2] || ''],
            ['월회비 기본값4', settings.feePresets[3] || ''],
            ['월회비 기본값5', settings.feePresets[4] || ''],
            ['내보내기 날짜', new Date().toLocaleString('ko-KR')]
        ];
        
        const wsSettings = XLSX.utils.aoa_to_sheet(settingsData);
        const settingsCols = [
            {wch: 20},
            {wch: 20}
        ];
        wsSettings['!cols'] = settingsCols;
        XLSX.utils.book_append_sheet(wb, wsSettings, "설정정보");
        
        // 추가 시트: 출석 기록
        const attendanceData = [['이름', '출석날짜', '출석횟수']];
        members.forEach(member => {
            if (member.attendanceHistory && member.attendanceHistory.length > 0) {
                member.attendanceHistory.forEach(date => {
                    attendanceData.push([member.name, date, '과거 기록']);
                });
            }
            if (member.attendanceDates && member.attendanceDates.length > 0) {
                member.attendanceDates.forEach(date => {
                    attendanceData.push([member.name, date, '현재 기록']);
                });
            }
        });
        
        if (attendanceData.length > 1) {
            const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceData);
            const attendanceCols = [
                {wch: 15},
                {wch: 15},
                {wch: 15}
            ];
            wsAttendance['!cols'] = attendanceCols;
            XLSX.utils.book_append_sheet(wb, wsAttendance, "출석기록");
        }
        
        // 파일 저장
        const fileName = `회원관리데이터_${settings.clubName || '구장'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('엑셀 파일로 내보내기되었습니다!');
        resetLockTimer();
        
    } catch (error) {
        console.error('엑셀 내보내기 오류:', error);
        showAlert('엑셀 내보내기 중 오류가 발생했습니다.');
    }
}

// 데이터 엑셀 가져오기
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일 확장자 확인
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        showAlert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다!');
        event.target.value = ''; // 파일 선택 초기화
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 첫 번째 시트(회원목록) 읽기
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // 헤더 제거 (첫 번째 행)
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            
            const importedMembers = [];
            
            rows.forEach(row => {
                if (row.length === 0 || !row[0]) return; // 빈 행 또는 이름 없는 행 건너뛰기
                
                const member = {
                    name: row[0] || '',
                    phone: row[1] || '',
                    email: row[2] || '',
                    address: row[3] || '',
                    registerDate: row[4] || new Date().toISOString().split('T')[0],
                    fee: parseInt(row[5]) || null,
                    coach: row[6] || '',
                    targetCount: parseInt(row[7]) || 0,
                    currentCount: parseInt(row[8]) || 0,
                    day1: row[9] || null,
                    startTime1: row[10] || null,
                    endTime1: row[11] || null,
                    day2: row[12] || null,
                    startTime2: row[13] || null,
                    endTime2: row[14] || null,
                    photo: '',
                    attendanceDates: [],
                    attendanceHistory: [],
                    paymentHistory: []
                };
                
                importedMembers.push(member);
            });
            
            // 설정 시트 읽기 (두 번째 시트)
            if (workbook.SheetNames.length > 1) {
                const settingsSheetName = workbook.SheetNames[1];
                const settingsWorksheet = workbook.Sheets[settingsSheetName];
                const settingsJson = XLSX.utils.sheet_to_json(settingsWorksheet, { header: 1 });
                
                settingsJson.forEach(row => {
                    if (row.length >= 2) {
                        const key = row[0];
                        const value = row[1];
                        
                        if (key === '구장명') {
                            settings.clubName = value;
                            document.getElementById('clubNameDisplay').textContent = value || '구장명을 설정하세요';
                        }
                        else if (key === '자동 잠금 시간(분)') {
                            settings.lockTimeout = parseInt(value) || 60;
                        }
                        else if (key === '코치1') settings.coaches[0] = value || '';
                        else if (key === '코치2') settings.coaches[1] = value || '';
                        else if (key === '코치3') settings.coaches[2] = value || '';
                        else if (key === '코치4') settings.coaches[3] = value || '';
                        else if (key === '월회비 기본값1') settings.feePresets[0] = parseInt(value) || 0;
                        else if (key === '월회비 기본값2') settings.feePresets[1] = parseInt(value) || 0;
                        else if (key === '월회비 기본값3') settings.feePresets[2] = parseInt(value) || 0;
                        else if (key === '월회비 기본값4') settings.feePresets[3] = parseInt(value) || 0;
                        else if (key === '월회비 기본값5') settings.feePresets[4] = parseInt(value) || 0;
                    }
                });
                
                updateFeePresetButtons();
                renderCoachButtons();
            }
            
            // 데이터 적용 전 확인 메시지
            if (importedMembers.length > 0) {
                if (members.length > 0) {
                    if (confirm(`현재 ${members.length}명의 회원이 있습니다. 엑셀 파일의 ${importedMembers.length}명으로 교체하시겠습니까?\n(주의: 기존 데이터는 삭제됩니다)`)) {
                        members = importedMembers;
                        filteredMembers = [...members];
                        saveToFirebase();
                        renderMembers();
                        renderSchedule();
                        showAlert(`${importedMembers.length}명의 회원 데이터를 성공적으로 가져왔습니다!`);
                        
                        // 잠금 상태 초기화
                        isUnlocked = false;
                        remainingTime = settings.lockTimeout * 60;
                        updateLockStatus();
                    }
                } else {
                    members = importedMembers;
                    filteredMembers = [...members];
                    saveToFirebase();
                    renderMembers();
                    renderSchedule();
                    showAlert(`${importedMembers.length}명의 회원 데이터를 성공적으로 가져왔습니다!`);
                    
                    // 잠금 상태 초기화
                    isUnlocked = false;
                    remainingTime = settings.lockTimeout * 60;
                    updateLockStatus();
                }
            } else {
                showAlert('가져올 회원 데이터가 없습니다!');
            }
            
            closeSettings();
            
        } catch (error) {
            console.error('엑셀 가져오기 오류:', error);
            showAlert('엑셀 파일 형식이 올바르지 않습니다!');
        }
        
        // 파일 선택 초기화
        event.target.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}

// 엑셀 템플릿 다운로드 기능 추가
function downloadTemplate() {
    try {
        // 템플릿 데이터 생성
        const templateData = [
            ['이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', '월회비', '담당코치', '출석목표횟수', '현재출석횟수', '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간', '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간'],
            ['홍길동', '010-1234-5678', 'hong@email.com', '서울시 강남구', '2024-01-15', '100000', '김코치', '8', '0', '월', '13:00', '13:20', '수', '15:00', '15:20'],
            ['김영희', '010-8765-4321', 'kim@email.com', '서울시 서초구', '2024-01-20', '70000', '이코치', '12', '3', '화', '14:00', '14:20', '목', '16:00', '16:20'],
            ['※ 참고:', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 요일: 월,화,수,목,금,토,일 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 시간 형식: 13:00, 14:30 등', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 이 시트를 수정하지 마세요', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        // 열 너비 설정
        const wscols = [
            {wch: 10}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}
        ];
        ws['!cols'] = wscols;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "회원등록템플릿");
        
        XLSX.writeFile(wb, "회원등록_템플릿.xlsx");
        showAlert('엑셀 템플릿이 다운로드되었습니다!');
        
    } catch (error) {
        console.error('템플릿 생성 오류:', error);
        showAlert('템플릿 생성 중 오류가 발생했습니다.');
    }
}