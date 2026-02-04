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
    if (members.length === 0) {
        showAlert('내보낼 회원 데이터가 없습니다!');
        return;
    }
    
    try {
        // 회원 데이터 시트
        const membersData = members.map(member => [
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
            member.endTime2 || '',
            member.gender || '',
            member.birthYear || '',
            member.skillLevel !== undefined && member.skillLevel !== null ? 
                (member.skillLevel === -1 ? '희망' : 
                 member.skillLevel === 0 ? '0부' : 
                 `${member.skillLevel}부`) : '',
            member.awards ? member.awards.join('; ') : '',
            member.etc || ''
        ]);
        
        const headers = [
            '이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', 
            '월회비', '담당코치', '출석목표횟수', '현재출석횟수', 
            '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간', 
            '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간',
            '성별', '생년', '부수(실력)', '수상경력', '기타'
        ];
        
        const wsData = [headers, ...membersData];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 열 너비 설정
        const wscols = [
            {wch: 10}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 30}, {wch: 30}
        ];
        ws['!cols'] = wscols;
        
        // 설정 데이터 시트
        const settingsData = [
            ['구장명', settings.clubName || ''],
            ['자동 잠금 시간(분)', settings.lockTimeout || 60],
            ['코치1', settings.coaches[0] || ''],
            ['코치2', settings.coaches[1] || ''],
            ['코치3', settings.coaches[2] || ''],
            ['코치4', settings.coaches[3] || ''],
            ['월회비 기본값1', settings.feePresets[0] || 0],
            ['월회비 기본값2', settings.feePresets[1] || 0],
            ['월회비 기본값3', settings.feePresets[2] || 0],
            ['월회비 기본값4', settings.feePresets[3] || 0],
            ['월회비 기본값5', settings.feePresets[4] || 0]
        ];
        
        const wsSettings = XLSX.utils.aoa_to_sheet(settingsData);
        
        // 통합 문서 생성
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "회원데이터");
        XLSX.utils.book_append_sheet(wb, wsSettings, "설정");
        
        // 파일 저장
        const clubName = settings.clubName ? `_${settings.clubName}` : '';
        const fileName = `회원관리_데이터${clubName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showAlert(`${members.length}명의 회원 데이터를 엑셀 파일로 내보냈습니다!`);
        
    } catch (error) {
        console.error('엑셀 내보내기 오류:', error);
        showAlert(`엑셀 내보내기 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 엑셀 템플릿 다운로드
function downloadTemplate() {
    try {
        // 템플릿 데이터 생성 (새로운 필드 포함)
        const templateData = [
            ['이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', '월회비', '담당코치', '출석목표횟수', '현재출석횟수', '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간', '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간', '성별', '생년', '부수(실력)', '수상경력', '기타'],
            ['홍길동', '010-1234-5678', 'hong@email.com', '서울시 강남구', '2024-01-15', '100000', '김코치', '8', '0', '월', '13:00', '13:20', '수', '15:00', '15:20', '남', '1990', '5부', '2023년 탁구대회 우승; 2022년 개인전 준우승', '특이사항 없음'],
            ['김영희', '010-8765-4321', 'kim@email.com', '서울시 서초구', '2024-01-20', '70000', '이코치', '12', '3', '화', '14:00', '14:20', '목', '16:00', '16:20', '여', '1995', '3부', '2022년 단체전 우승', '좌손잡이'],
            ['※ 참고:', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 요일: 월,화,수,목,금,토,일 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 시간 형식: 13:00, 14:30 등', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 성별: 남 또는 여', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 부수(실력): 희망, 0부, 1부, 2부, ... 10부 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 수상경력: 여러 개일 경우 세미콜론(;)으로 구분', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 이 시트를 수정하지 마세요', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        // 열 너비 설정 (새로운 필드 포함)
        const wscols = [
            {wch: 10}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 30}, {wch: 30}
        ];
        ws['!cols'] = wscols;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "회원등록템플릿");
        
        XLSX.writeFile(wb, "회원등록_템플릿_신규.xlsx");
        showAlert('엑셀 템플릿이 다운로드되었습니다! (새로운 필드 포함)');
        
    } catch (error) {
        console.error('템플릿 생성 오류:', error);
        showAlert('템플릿 생성 중 오류가 발생했습니다.');
    }
}

// 데이터 엑셀 가져오기
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        showAlert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다!');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            
            const importedMembers = [];
            
            rows.forEach(row => {
                if (row.length === 0 || !row[0]) return;
                
                // 전화번호 처리
                let phone = row[1] || '';
                if (typeof phone === 'number') {
                    phone = phone.toString();
                    if (phone.length === 11 && phone.startsWith('010')) {
                        phone = phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                    } else if (phone.length === 10) {
                        phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                    }
                }
                
                // 부수 처리
                let skillLevel = null;
                if (row[17] !== undefined && row[17] !== '') {
                    const skillText = String(row[17]).trim();
                    if (skillText === '희망') {
                        skillLevel = -1;
                    } else if (skillText === '0부' || skillText === '선출') {
                        skillLevel = 0;
                    } else if (skillText.endsWith('부')) {
                        const level = parseInt(skillText.replace('부', ''));
                        if (!isNaN(level)) {
                            skillLevel = level;
                        }
                    } else {
                        const level = parseInt(skillText);
                        if (!isNaN(level)) {
                            skillLevel = level;
                        }
                    }
                }
                
                // 수상경력 처리
                let awards = [];
                if (row[18] !== undefined && row[18] !== '') {
                    const awardsText = String(row[18]);
                    // 세미콜론으로 구분된 수상경력 분리
                    awards = awardsText.split(';').map(a => a.trim()).filter(a => a !== '');
                }
                
                const member = {
                    name: String(row[0] || ''),
                    phone: phone,
                    email: String(row[2] || ''),
                    address: String(row[3] || ''),
                    registerDate: row[4] ? String(row[4]) : new Date().toISOString().split('T')[0],
                    fee: row[5] ? parseInt(row[5]) : null,
                    coach: String(row[6] || ''),
                    targetCount: row[7] ? parseInt(row[7]) : 0,
                    currentCount: row[8] ? parseInt(row[8]) : 0,
                    day1: row[9] ? String(row[9]) : null,
                    startTime1: row[10] ? String(row[10]) : null,
                    endTime1: row[11] ? String(row[11]) : null,
                    day2: row[12] ? String(row[12]) : null,
                    startTime2: row[13] ? String(row[13]) : null,
                    endTime2: row[14] ? String(row[14]) : null,
                    // 새로운 필드들
                    gender: row[15] ? String(row[15]) : '',
                    birthYear: row[16] ? parseInt(row[16]) : null,
                    skillLevel: skillLevel,
                    awards: awards,
                    etc: row[19] ? String(row[19]) : '',
                    photo: '',
                    attendanceDates: [],
                    attendanceHistory: [],
                    paymentHistory: []
                };
                
                importedMembers.push(member);
            });
            
            // 설정 시트 읽기
            if (workbook.SheetNames.length > 1) {
                const settingsSheetName = workbook.SheetNames[1];
                const settingsWorksheet = workbook.Sheets[settingsSheetName];
                const settingsJson = XLSX.utils.sheet_to_json(settingsWorksheet, { header: 1 });
                
                settingsJson.forEach(row => {
                    if (row.length >= 2) {
                        const key = row[0];
                        const value = row[1];
                        
                        if (key === '구장명') {
                            settings.clubName = String(value || '');
                            document.getElementById('clubNameDisplay').textContent = settings.clubName || '구장명을 설정하세요';
                        }
                        else if (key === '자동 잠금 시간(분)') {
                            settings.lockTimeout = parseInt(value) || 60;
                        }
                        else if (key === '코치1') settings.coaches[0] = String(value || '');
                        else if (key === '코치2') settings.coaches[1] = String(value || '');
                        else if (key === '코치3') settings.coaches[2] = String(value || '');
                        else if (key === '코치4') settings.coaches[3] = String(value || '');
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
            
            // 데이터 적용
            if (importedMembers.length > 0) {
                const importConfirmed = members.length === 0 || 
                    confirm(`현재 ${members.length}명의 회원이 있습니다. 엑셀 파일의 ${importedMembers.length}명으로 교체하시겠습니까?\n(주의: 기존 데이터는 삭제됩니다)`);
                
                if (importConfirmed) {
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
            showAlert(`엑셀 파일 처리 중 오류가 발생했습니다: ${error.message}`);
        }
        
        event.target.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}