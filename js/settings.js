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

// 데이터 엑셀 내보내기 - 개선된 버전
function exportData() {
    if (members.length === 0) {
        showAlert('내보낼 회원 데이터가 없습니다!');
        return;
    }
    
    try {
        // 회원 데이터 시트
        const membersData = members.map(member => {
            // 스케줄 데이터 처리 (최대 7개까지 지원)
            const scheduleData = [];
            
            if (member.schedules && member.schedules.length > 0) {
                // 새로운 schedules 배열 형식
                for (let i = 0; i < 7; i++) {
                    if (i < member.schedules.length) {
                        const schedule = member.schedules[i];
                        scheduleData.push(
                            schedule.day || '',
                            schedule.startTime || '',
                            schedule.endTime || ''
                        );
                    } else {
                        scheduleData.push('', '', '');
                    }
                }
            } else {
                // 기존 day1, day2 형식 (하위 호환)
                scheduleData.push(
                    member.day1 || '',
                    member.startTime1 || '',
                    member.endTime1 || '',
                    member.day2 || '',
                    member.startTime2 || '',
                    member.endTime2 || '',
                    '', '', '', // 스케줄 3
                    '', '', '', // 스케줄 4
                    '', '', '', // 스케줄 5
                    '', '', '', // 스케줄 6
                    '', '', ''  // 스케줄 7
                );
            }
            
            return [
                member.name || '',
                member.phone || '',
                member.email || '',
                member.address || '',
                member.registerDate || '',
                member.fee || '',
                member.coach || '',
                member.targetCount || 0,
                member.currentCount || 0,
                ...scheduleData,
                member.gender || '',
                member.birthYear || '',
                member.skillLevel !== undefined && member.skillLevel !== null ? 
                    (member.skillLevel === -1 ? '희망' : 
                     member.skillLevel === 0 ? '0부' : 
                     `${member.skillLevel}부`) : '',
                member.awards ? member.awards.join('; ') : '',
                member.etc || ''
            ];
        });
        
        const headers = [
            '이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', 
            '월회비', '담당코치', '출석목표횟수', '현재출석횟수',
            // 스케줄 1-7
            '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간',
            '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간',
            '스케줄3_요일', '스케줄3_시작시간', '스케줄3_종료시간',
            '스케줄4_요일', '스케줄4_시작시간', '스케줄4_종료시간',
            '스케줄5_요일', '스케줄5_시작시간', '스케줄5_종료시간',
            '스케줄6_요일', '스케줄6_시작시간', '스케줄6_종료시간',
            '스케줄7_요일', '스케줄7_시작시간', '스케줄7_종료시간',
            '성별', '생년', '부수(실력)', '수상경력', '기타'
        ];
        
        const wsData = [headers, ...membersData];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 열 너비 설정
        const wscols = [
            {wch: 10}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12},
            // 스케줄 1-7 (각 3칸)
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
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

// 엑셀 템플릿 다운로드 - 스케줄 7개 지원
function downloadTemplate() {
    try {
        // 템플릿 데이터 생성 (스케줄 7개)
        const templateData = [
            [
                '이름', '전화번호', '이메일', '주소', '등록일(YYYY-MM-DD)', '월회비', '담당코치', '출석목표횟수', '현재출석횟수',
                '스케줄1_요일', '스케줄1_시작시간', '스케줄1_종료시간',
                '스케줄2_요일', '스케줄2_시작시간', '스케줄2_종료시간',
                '스케줄3_요일', '스케줄3_시작시간', '스케줄3_종료시간',
                '스케줄4_요일', '스케줄4_시작시간', '스케줄4_종료시간',
                '스케줄5_요일', '스케줄5_시작시간', '스케줄5_종료시간',
                '스케줄6_요일', '스케줄6_시작시간', '스케줄6_종료시간',
                '스케줄7_요일', '스케줄7_시작시간', '스케줄7_종료시간',
                '성별', '생년', '부수(실력)', '수상경력', '기타'
            ],
            [
                '홍길동', '010-1234-5678', 'hong@email.com', '서울시 강남구', '2024-01-15', '100000', '김코치', '8', '0',
                '월', '13:00', '13:20',
                '수', '15:00', '15:20',
                '', '', '',
                '', '', '',
                '', '', '',
                '', '', '',
                '', '', '',
                '남', '1990', '5부', '2023년 탁구대회 우승; 2022년 개인전 준우승', '특이사항 없음'
            ],
            [
                '김영희', '010-8765-4321', 'kim@email.com', '서울시 서초구', '2024-01-20', '70000', '이코치', '12', '3',
                '화', '14:00', '14:20',
                '목', '16:00', '16:20',
                '토', '10:00', '10:20',
                '', '', '',
                '', '', '',
                '', '', '',
                '', '', '',
                '여', '1995', '3부', '2022년 단체전 우승', '좌손잡이'
            ],
            ['※ 참고:', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 요일: 월,화,수,목,금,토,일 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 시간 형식: 13:00, 14:30 등', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 성별: 남 또는 여', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 부수(실력): 희망, 0부, 1부, 2부, ... 10부 중 선택', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 수상경력: 여러 개일 경우 세미콜론(;)으로 구분', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['※ 스케줄은 최대 7개까지 입력 가능', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        // 열 너비 설정
        const wscols = [
            {wch: 10}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 12}, {wch: 12},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 8}, {wch: 8}, {wch: 12}, {wch: 30}, {wch: 30}
        ];
        ws['!cols'] = wscols;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "회원등록템플릿");
        
        XLSX.writeFile(wb, "회원등록_템플릿_스케줄7개.xlsx");
        showAlert('엑셀 템플릿이 다운로드되었습니다! (스케줄 최대 7개 지원)');
        
    } catch (error) {
        console.error('템플릿 생성 오류:', error);
        showAlert('템플릿 생성 중 오류가 발생했습니다.');
    }
}

// 데이터 엑셀 가져오기 - 스케줄 7개 지원
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
                const skillColumnIndex = 9 + (7 * 3) + 2; // 스케줄 7개 후의 부수 위치
                if (row[skillColumnIndex] !== undefined && row[skillColumnIndex] !== '') {
                    const skillText = String(row[skillColumnIndex]).trim();
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
                const awardsColumnIndex = skillColumnIndex + 1;
                if (row[awardsColumnIndex] !== undefined && row[awardsColumnIndex] !== '') {
                    const awardsText = String(row[awardsColumnIndex]);
                    awards = awardsText.split(';').map(a => a.trim()).filter(a => a !== '');
                }
                
                // 스케줄 처리 (최대 7개)
                const schedules = [];
                for (let i = 0; i < 7; i++) {
                    const baseIndex = 9 + (i * 3);
                    const day = row[baseIndex] ? String(row[baseIndex]) : '';
                    const startTime = row[baseIndex + 1] ? String(row[baseIndex + 1]) : '';
                    const endTime = row[baseIndex + 2] ? String(row[baseIndex + 2]) : '';
                    
                    if (day && startTime && endTime) {
                        schedules.push({
                            day: day,
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                }
                
                const etcColumnIndex = awardsColumnIndex + 1;
                
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
                    schedules: schedules, // 새로운 배열 형식
                    gender: row[9 + (7 * 3)] ? String(row[9 + (7 * 3)]) : '',
                    birthYear: row[9 + (7 * 3) + 1] ? parseInt(row[9 + (7 * 3) + 1]) : null,
                    skillLevel: skillLevel,
                    awards: awards,
                    etc: row[etcColumnIndex] ? String(row[etcColumnIndex]) : '',
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