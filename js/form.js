// 전역 변수
let currentEditIndex = null;
let deleteIndex = null;
let currentPaymentList = [];
let currentAwards = [];
let isPhotoRemoved = false; // 이미지 삭제 플래그 추가

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 성별 버튼 이벤트 리스너
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 수상경력 입력창 엔터 키 이벤트
    document.getElementById('awardInput').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            addAward();
        }
    });
    
    // 현재 출석 횟수 입력란 초기 상태 설정
    const currentCountInput = document.getElementById('currentCount');
    if (currentCountInput) {
        if (!isUnlocked) {
            currentCountInput.setAttribute('readonly', true);
            currentCountInput.style.background = '#f0f0f0';
        }
    }
});

// 선택된 성별 값 가져오기
function getSelectedGender() {
    const activeBtn = document.querySelector('.gender-btn.active');
    return activeBtn ? activeBtn.dataset.value : '';
}

// 성별 값 설정하기
function setSelectedGender(gender) {
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === gender);
    });
}

// 수상경력 추가
function addAward() {
    const awardInput = document.getElementById('awardInput');
    const awardText = awardInput.value.trim();
    
    if (!awardText) {
        showAlert('수상경력을 입력해주세요!');
        return;
    }
    
    currentAwards.push(awardText);
    renderAwardsList();
    awardInput.value = '';
    awardInput.focus();
}

// 수상경력 삭제
function deleteAward(index) {
    currentAwards.splice(index, 1);
    renderAwardsList();
}

// 수상경력 목록 렌더링
function renderAwardsList() {
    const container = document.getElementById('awardsList');
    
    if (currentAwards.length === 0) {
        container.innerHTML = '<div style="font-size:13px; color:#999; padding:8px 0; text-align:center;">수상경력이 없습니다</div>';
        return;
    }
    
    container.innerHTML = currentAwards.map((award, index) => `
        <div class="award-list-item">
            <div class="award-text">🏆 ${award}</div>
            <button class="award-delete-btn" onclick="deleteAward(${index})">×</button>
        </div>
    `).join('');
}

// 수상경력 목록 설정
function setAwardsList(awards) {
    currentAwards = awards || [];
    renderAwardsList();
}

// 안전한 숫자 변환 헬퍼 함수
function safeParseInt(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
}

// 회원 추가
function addMember() {
    const name = document.getElementById('name').value.trim();
    
    if (!name) {
        showAlert('이름을 입력해주세요!');
        document.getElementById('name').focus();
        return;
    }

    const phone = document.getElementById('phone').value.trim();
    const registerDate = document.getElementById('registerDate').value;
    const feeValue = document.getElementById('fee').value;
    const fee = safeParseInt(feeValue);
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const coach = getSelectedCoach();
    
    // 새로운 필드들
    const gender = getSelectedGender();
    const birthYear = document.getElementById('birthYear').value ? parseInt(document.getElementById('birthYear').value) : null;
    const skillLevel = document.getElementById('skillLevel').value ? parseInt(document.getElementById('skillLevel').value) : null;
    const etc = document.getElementById('etc').value.trim();
    const privateMemo = document.getElementById('privateMemo').value.trim(); // 비밀글 추가
    const awards = [...currentAwards];

    // 현재 출석 횟수
    const currentCountInput = document.getElementById('currentCount').value;
    const currentCount = currentCountInput === "" ? 0 : parseInt(currentCountInput) || 0;

    // 스케줄 데이터 가져오기
    const schedulesData = getSchedulesData();
    console.log('addMember - schedulesData:', schedulesData);

    // 스케줄 유효성 검사
    for (let i = 0; i < schedulesData.length; i++) {
        const schedule = schedulesData[i];
        if (!schedule.day || !schedule.startTime || !schedule.endTime) {
            continue; // 빈 스케줄은 건너뛰기
        }
        if (schedule.startTime >= schedule.endTime) {
            showAlert(`스케줄 ${i + 1}의 종료시간은 시작시간보다 커야 합니다!`);
            return;
        }
    }

    // 스케줄 충돌 검사 (유효한 스케줄만)
    const validSchedules = schedulesData.filter(s => s.day && s.startTime && s.endTime);
    if (validSchedules.length > 0 && coach) {
        const conflict = checkScheduleConflicts(validSchedules, coach);
        if (conflict.conflict) {
            showAlert(`코치 [${coach}] 시간 충돌!\n${conflict.memberName} 회원이 이미 ${conflict.existingTime}에 등록되어 있습니다.`);
            return;
        }
    }

    const targetCountInput = document.getElementById('targetCount').value;
    const targetCount = targetCountInput === "" ? 0 : parseInt(targetCountInput) || 0;

    const member = {
        name,
        phone,
        photo: currentPhotoData || '',
        registerDate: registerDate || new Date().toISOString().split('T')[0],
        fee: fee,
        coach: coach,
        targetCount: targetCount,
        currentCount: currentCount,
        attendanceDates: [],
        attendanceHistory: [],
        paymentHistory: [],
        schedules: validSchedules, // 유효한 스케줄만 저장
        email,
        address,
        gender: gender || '',
        birthYear: birthYear,
        skillLevel: skillLevel,
        awards: awards,
        etc: etc,
        privateMemo: privateMemo // 비밀글 저장
    };

    console.log('addMember - 저장할 회원 데이터:', member);

    members.push(member);
    saveToFirebase();
    filteredMembers = [...members];
    renderMembers();
    renderSchedule();
    clearForm();
    showAlert('회원이 추가되었습니다!');
    
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.remove('form-edit-mode');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 회원 수정
function updateMember() {
    if (currentEditIndex === null) {
        showAlert('수정할 회원을 선택해주세요!');
        return;
    }

    const name = document.getElementById('name').value.trim();
    
    if (!name) {
        showAlert('이름을 입력해주세요!');
        document.getElementById('name').focus();
        return;
    }

    const phone = document.getElementById('phone').value.trim();
    const registerDate = document.getElementById('registerDate').value;
    const feeValue = document.getElementById('fee').value;
    const fee = safeParseInt(feeValue);
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const coach = getSelectedCoach();
    
    const gender = getSelectedGender();
    const birthYear = document.getElementById('birthYear').value ? parseInt(document.getElementById('birthYear').value) : null;
    const skillLevel = document.getElementById('skillLevel').value ? parseInt(document.getElementById('skillLevel').value) : null;
    const etc = document.getElementById('etc').value.trim();
    const privateMemo = document.getElementById('privateMemo').value.trim(); // 비밀글 추가
    const awards = [...currentAwards];

    // 현재 출석 횟수
    const currentCountInput = document.getElementById('currentCount').value;
    const currentCount = currentCountInput === "" ? 
                       members[currentEditIndex].currentCount || 0 : 
                       parseInt(currentCountInput) || 0;

    // 스케줄 데이터 가져오기
    const schedulesData = getSchedulesData();
    console.log('updateMember - schedulesData:', schedulesData);

    // 스케줄 유효성 검사
    for (let i = 0; i < schedulesData.length; i++) {
        const schedule = schedulesData[i];
        if (!schedule.day || !schedule.startTime || !schedule.endTime) {
            continue;
        }
        if (schedule.startTime >= schedule.endTime) {
            showAlert(`스케줄 ${i + 1}의 종료시간은 시작시간보다 커야 합니다!`);
            return;
        }
    }

    // 스케줄 충돌 검사
    const validSchedules = schedulesData.filter(s => s.day && s.startTime && s.endTime);
    if (validSchedules.length > 0 && coach) {
        const conflict = checkScheduleConflicts(validSchedules, coach, currentEditIndex);
        if (conflict.conflict) {
            showAlert(`코치 [${coach}] 시간 충돌!\n${conflict.memberName} 회원이 이미 ${conflict.existingTime}에 등록되어 있습니다.`);
            return;
        }
    }

    const targetCountInput = document.getElementById('targetCount').value;
    const targetCount = targetCountInput === "" ? 
                       members[currentEditIndex].targetCount || 0 : 
                       parseInt(targetCountInput) || 0;

    const existingHistory = members[currentEditIndex].attendanceHistory || [];
    const paymentHistory = currentPaymentList || [];

    let newPhoto = '';
    if (isPhotoRemoved) {
        newPhoto = '';
    } else if (currentPhotoData !== null) {
        newPhoto = currentPhotoData;
    } else {
        newPhoto = members[currentEditIndex].photo || '';
    }

    members[currentEditIndex] = {
        ...members[currentEditIndex],
        name,
        phone,
        photo: newPhoto,
        registerDate: registerDate || members[currentEditIndex].registerDate,
        fee: fee,
        coach: coach,
        targetCount: targetCount,
        currentCount: currentCount,
        attendanceDates: members[currentEditIndex].attendanceDates || [],
        attendanceHistory: existingHistory,
        paymentHistory: paymentHistory,
        schedules: validSchedules, // 유효한 스케줄만 저장
        email,
        address,
        gender: gender || '',
        birthYear: birthYear,
        skillLevel: skillLevel,
        awards: awards,
        etc: etc,
        privateMemo: privateMemo // 비밀글 저장
    };

    console.log('updateMember - 수정된 회원 데이터:', members[currentEditIndex]);

    saveToFirebase();
    filteredMembers = [...members];
    renderMembers();
    renderSchedule();
    clearForm();
    showAlert('회원 정보가 수정되었습니다!');
    resetLockTimer();
    
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.remove('form-edit-mode');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    isPhotoRemoved = false;
}

// 회원 편집 폼 채우기
function editMember(index) {
    const member = members[index];
    
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.add('form-edit-mode');
    }
    
    document.getElementById('name').value = member.name;
    document.getElementById('phone').value = member.phone || '';
    document.getElementById('registerDate').value = member.registerDate || '';
    document.getElementById('fee').value = member.fee !== null && member.fee !== undefined ? member.fee : '';
    document.getElementById('email').value = member.email || '';
    document.getElementById('address').value = member.address || '';
    
    // 현재 출석 횟수 입력란 - 잠금 해제 상태에 따라 readonly 설정
    const currentCountInput = document.getElementById("currentCount");
    currentCountInput.value = member.currentCount || 0;
    
    // 잠금 해제 상태에 따라 읽기전용 설정
    if (isUnlocked) {
        currentCountInput.removeAttribute('readonly');
        currentCountInput.style.background = '#ffffff'; // 하얀색 배경
    } else {
        currentCountInput.setAttribute('readonly', true);
        currentCountInput.style.background = '#f0f0f0'; // 회색 배경
    }
    
    document.getElementById("targetCount").value = member.targetCount || 0;

    setSelectedCoach(member.coach || '');
    setSelectedGender(member.gender || '');
    document.getElementById('birthYear').value = member.birthYear || '';
    document.getElementById('skillLevel').value = member.skillLevel || '';
    document.getElementById('etc').value = member.etc || '';
    
    // 비밀글 - 잠금 해제 상태에 따라 표시
    const privateMemoSection = document.getElementById('privateMemoSection');
    const privateMemoInput = document.getElementById('privateMemo');
    if (isUnlocked) {
        privateMemoSection.style.display = 'block';
        privateMemoInput.value = member.privateMemo || '';
    } else {
        privateMemoSection.style.display = 'none';
        privateMemoInput.value = '';
    }
    
    setAwardsList(member.awards || []);

    // 스케줄 데이터 설정
    console.log('editMember - member.schedules:', member.schedules);
    if (member.schedules && member.schedules.length > 0) {
        setSchedulesData(member.schedules);
    } else {
        // 기존 day1, day2 형식 호환
        const legacySchedules = [];
        if (member.day1 && member.startTime1 && member.endTime1) {
            legacySchedules.push({
                day: member.day1,
                startTime: member.startTime1,
                endTime: member.endTime1
            });
        }
        if (member.day2 && member.startTime2 && member.endTime2) {
            legacySchedules.push({
                day: member.day2,
                startTime: member.startTime2,
                endTime: member.endTime2
            });
        }
        setSchedulesData(legacySchedules.length > 0 ? legacySchedules : null);
    }

    document.getElementById('paymentSection').style.display = 'block';
    renderPaymentList(member.paymentHistory || []);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentAmount').value = member.fee !== null && member.fee !== undefined ? member.fee : '';

    if (member.photo) {
        currentPhotoData = member.photo;
        displayPhotoPreview();
    } else {
        currentPhotoData = null;
        displayPhotoPreview();
    }

    isPhotoRemoved = false;
    currentEditIndex = index;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
setTimeout(() => {
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.setAttribute('readonly', 'readonly');
        nameInput.focus();
        nameInput.select();
        setTimeout(() => {
            nameInput.removeAttribute('readonly');
        }, 100);
    }
}, 300);
    
    resetLockTimer();
}

// 폼 초기화
function clearForm() {
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('registerDate').value = '';
    document.getElementById('fee').value = '';
    document.getElementById('email').value = '';
    document.getElementById('address').value = '';
    document.getElementById("targetCount").value = "0";
    
    // 현재 출석 횟수 입력란 초기화
    const currentCountInput = document.getElementById("currentCount");
    currentCountInput.value = "0";
    if (isUnlocked) {
        currentCountInput.removeAttribute('readonly');
        currentCountInput.style.background = '#ffffff';
    } else {
        currentCountInput.setAttribute('readonly', true);
        currentCountInput.style.background = '#f0f0f0';
    }

    setSelectedCoach('');
    setSelectedGender('');
    document.getElementById('birthYear').value = '';
    document.getElementById('skillLevel').value = '';
    document.getElementById('etc').value = '';
    
    // 비밀글 초기화
    const privateMemoSection = document.getElementById('privateMemoSection');
    const privateMemoInput = document.getElementById('privateMemo');
    if (isUnlocked) {
        privateMemoSection.style.display = 'block';
        privateMemoInput.value = '';
    } else {
        privateMemoSection.style.display = 'none';
        privateMemoInput.value = '';
    }
    
    currentAwards = [];
    renderAwardsList();

    resetSchedules();

    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('paymentDate').value = '';
    document.getElementById('paymentAmount').value = '';
    currentPaymentList = [];
    document.getElementById('paymentList').innerHTML = '';

    currentPhotoData = null;
    isPhotoRemoved = false;
    displayPhotoPreview();
    document.getElementById('photoInput').value = '';
    
    currentEditIndex = null;
    
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.remove('form-edit-mode');
    }
    
    resetLockTimer();
    
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.focus();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 회비 입금 내역 관리
function addPaymentEntry() {
    const dateInput = document.getElementById('paymentDate');
    const amountInput = document.getElementById('paymentAmount');
    const date = dateInput.value;
    const amount = amountInput.value ? parseInt(amountInput.value) : null;

    if (!date) {
        showAlert('입금날을 입력해주세요!');
        return;
    }
    if (!amount || amount <= 0) {
        showAlert('입금금액을 올바르게 입력해주세요!');
        return;
    }

    currentPaymentList.push({ date: date, amount: amount });
    renderPaymentList(currentPaymentList);

    dateInput.value = new Date().toISOString().split('T')[0];
    const currentFee = (currentEditIndex !== null && members[currentEditIndex]) ? members[currentEditIndex].fee : null;
    amountInput.value = currentFee !== null && currentFee !== undefined ? currentFee : '';
}

function deletePaymentEntry(index) {
    currentPaymentList.splice(index, 1);
    renderPaymentList(currentPaymentList);
}

function renderPaymentList(list) {
    currentPaymentList = list;
    const container = document.getElementById('paymentList');

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="font-size:13px; color:#999; padding:8px 0; text-align:center;">입금 내역이 없습니다</div>';
        return;
    }

    const sorted = list.map((item, idx) => ({ ...item, originalIndex: idx }))
        .sort((a, b) => b.date.localeCompare(a.date));

    container.innerHTML = sorted.map(item => `
        <div class="payment-list-item">
            <div class="payment-info">
                <span class="payment-date">${formatDate(item.date)}</span>
                <span class="payment-amount">${formatNumber(item.amount)}원</span>
            </div>
            <button class="payment-delete-btn" onclick="deletePaymentEntry(${item.originalIndex})">×</button>
        </div>
    `).join('');
}

// 스케줄 충돌 체크 (새로운 배열 방식)
function checkScheduleConflicts(schedulesData, coach, excludeIndex = null) {
    if (!coach) return { conflict: false };

    for (let i = 0; i < members.length; i++) {
        if (excludeIndex !== null && i === excludeIndex) continue;

        const member = members[i];
        if (member.coach !== coach) continue;

        const memberSchedules = member.schedules || [];
        
        if (!member.schedules) {
            if (member.day1 && member.startTime1 && member.endTime1) {
                memberSchedules.push({
                    day: member.day1,
                    startTime: member.startTime1,
                    endTime: member.endTime1
                });
            }
            if (member.day2 && member.startTime2 && member.endTime2) {
                memberSchedules.push({
                    day: member.day2,
                    startTime: member.startTime2,
                    endTime: member.endTime2
                });
            }
        }

        for (const newSchedule of schedulesData) {
            for (const existingSchedule of memberSchedules) {
                if (newSchedule.day === existingSchedule.day) {
                    if (timesOverlap(
                        newSchedule.startTime,
                        newSchedule.endTime,
                        existingSchedule.startTime,
                        existingSchedule.endTime
                    )) {
                        return {
                            conflict: true,
                            memberName: member.name,
                            existingTime: `${dayNames[existingSchedule.day]} ${existingSchedule.startTime}~${existingSchedule.endTime}`
                        };
                    }
                }
            }
        }
    }
    return { conflict: false };
}

// 시간 겹침 판별 헬퍼
function timesOverlap(s1, e1, s2, e2) {
    return (s1 >= s2 && s1 < e2) ||
           (e1 > s2 && e1 <= e2) ||
           (s1 <= s2 && e1 >= e2);
}