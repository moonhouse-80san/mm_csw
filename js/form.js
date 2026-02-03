// 전역 변수
let currentEditIndex = null;
let deleteIndex = null;
let currentPaymentList = [];
let currentAwards = [];
let isPhotoRemoved = false;

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
    const awardInput = document.getElementById('awardInput');
    if (awardInput) {
        awardInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                addAward();
            }
        });
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
    if (!awardInput) return;
    
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
    if (!container) return;
    
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
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const registerDateInput = document.getElementById('registerDate');
    const feeInput = document.getElementById('fee');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const targetCountInput = document.getElementById('targetCount');
    const birthYearInput = document.getElementById('birthYear');
    const skillLevelInput = document.getElementById('skillLevel');
    const etcInput = document.getElementById('etc');
    
    if (!nameInput) {
        showAlert('이름 입력창을 찾을 수 없습니다!');
        return;
    }
    
    const name = nameInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const registerDate = registerDateInput ? registerDateInput.value : '';
    const feeValue = feeInput ? feeInput.value : '';
    const fee = safeParseInt(feeValue);
    const email = emailInput ? emailInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    const coach = getSelectedCoach();
    const gender = getSelectedGender();
    const birthYear = birthYearInput && birthYearInput.value ? parseInt(birthYearInput.value) : null;
    const skillLevel = skillLevelInput && skillLevelInput.value ? parseInt(skillLevelInput.value) : null;
    const etc = etcInput ? etcInput.value.trim() : '';
    const awards = [...currentAwards];
    
    // 스케줄 데이터 가져오기
    const schedulesData = getSchedulesData ? getSchedulesData() : [];

    if (!name) {
        showAlert('이름을 입력해주세요!');
        nameInput.focus();
        return;
    }

    // 스케줄 유효성 검사
    for (let i = 0; i < schedulesData.length; i++) {
        const schedule = schedulesData[i];
        if (schedule.startTime >= schedule.endTime) {
            showAlert(`스케줄 ${i + 1}의 종료시간은 시작시간보다 커야 합니다!`);
            return;
        }
    }

    // 스케줄 충돌 검사
    const conflict = checkScheduleConflicts(schedulesData, coach);
    if (conflict.conflict) {
        showAlert(`코치 [${coach}] 시간 충돌!\n${conflict.memberName} 회원이 이미 ${conflict.existingTime}에 등록되어 있습니다.`);
        return;
    }

    const targetCount = targetCountInput && targetCountInput.value ? 
                       parseInt(targetCountInput.value) || 0 : 0;

    const member = {
        name: name,
        phone: phone,
        photo: currentPhotoData || '',
        registerDate: registerDate || new Date().toISOString().split('T')[0],
        fee: fee,
        coach: coach || '',
        targetCount: targetCount,
        currentCount: 0,
        attendanceDates: [],
        attendanceHistory: [],
        paymentHistory: [],
        schedules: schedulesData,
        email: email,
        address: address,
        gender: gender || '',
        birthYear: birthYear,
        skillLevel: skillLevel,
        awards: awards,
        etc: etc
    };

    console.log('저장할 회원 데이터:', member);
    console.log('스케줄 데이터 확인:', schedulesData);

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

    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const registerDateInput = document.getElementById('registerDate');
    const feeInput = document.getElementById('fee');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const targetCountInput = document.getElementById('targetCount');
    const birthYearInput = document.getElementById('birthYear');
    const skillLevelInput = document.getElementById('skillLevel');
    const etcInput = document.getElementById('etc');
    
    if (!nameInput) {
        showAlert('이름 입력창을 찾을 수 없습니다!');
        return;
    }
    
    const name = nameInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const registerDate = registerDateInput ? registerDateInput.value : '';
    const feeValue = feeInput ? feeInput.value : '';
    const fee = safeParseInt(feeValue);
    const email = emailInput ? emailInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    const coach = getSelectedCoach();
    const gender = getSelectedGender();
    const birthYear = birthYearInput && birthYearInput.value ? parseInt(birthYearInput.value) : null;
    const skillLevel = skillLevelInput && skillLevelInput.value ? parseInt(skillLevelInput.value) : null;
    const etc = etcInput ? etcInput.value.trim() : '';
    const awards = [...currentAwards];
    
    // 스케줄 데이터 가져오기
    const schedulesData = getSchedulesData ? getSchedulesData() : [];

    if (!name) {
        showAlert('이름을 입력해주세요!');
        nameInput.focus();
        return;
    }

    // 스케줄 유효성 검사
    for (let i = 0; i < schedulesData.length; i++) {
        const schedule = schedulesData[i];
        if (schedule.startTime >= schedule.endTime) {
            showAlert(`스케줄 ${i + 1}의 종료시간은 시작시간보다 커야 합니다!`);
            return;
        }
    }

    // 스케줄 충돌 검사
    const conflict = checkScheduleConflicts(schedulesData, coach, currentEditIndex);
    if (conflict.conflict) {
        showAlert(`코치 [${coach}] 시간 충돌!\n${conflict.memberName} 회원이 이미 ${conflict.existingTime}에 등록되어 있습니다.`);
        return;
    }

    const targetCount = targetCountInput && targetCountInput.value !== "" ? 
                       parseInt(targetCountInput.value) || 0 : 
                       members[currentEditIndex].targetCount || 0;

    const existingHistory = members[currentEditIndex].attendanceHistory || [];
    const paymentHistory = currentPaymentList || [];

    // 이미지 처리
    let newPhoto = '';
    if (isPhotoRemoved) {
        newPhoto = '';
    } else if (currentPhotoData !== null) {
        newPhoto = currentPhotoData;
    } else {
        newPhoto = members[currentEditIndex].photo || '';
    }

    const updatedMember = {
        ...members[currentEditIndex],
        name: name,
        phone: phone,
        photo: newPhoto,
        registerDate: registerDate || members[currentEditIndex].registerDate,
        fee: fee,
        coach: coach || '',
        targetCount: targetCount,
        currentCount: members[currentEditIndex].currentCount || 0,
        attendanceDates: members[currentEditIndex].attendanceDates || [],
        attendanceHistory: existingHistory,
        paymentHistory: paymentHistory,
        schedules: schedulesData,
        email: email,
        address: address,
        gender: gender || '',
        birthYear: birthYear,
        skillLevel: skillLevel,
        awards: awards,
        etc: etc
    };

    console.log('수정된 회원 데이터:', updatedMember);
    console.log('스케줄 데이터 확인:', schedulesData);

    members[currentEditIndex] = updatedMember;

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
    
    return true;
}

// 회원 편집 폼 채우기
function editMember(index) {
    const member = members[index];
    
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.add('form-edit-mode');
    }
    
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const registerDateInput = document.getElementById('registerDate');
    const feeInput = document.getElementById('fee');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const targetCountInput = document.getElementById('targetCount');
    const currentCountInput = document.getElementById('currentCount');
    const birthYearInput = document.getElementById('birthYear');
    const skillLevelInput = document.getElementById('skillLevel');
    const etcInput = document.getElementById('etc');
    
    if (nameInput) nameInput.value = member.name || '';
    if (phoneInput) phoneInput.value = member.phone || '';
    if (registerDateInput) registerDateInput.value = member.registerDate || '';
    if (feeInput) feeInput.value = member.fee !== null && member.fee !== undefined ? member.fee : '';
    if (emailInput) emailInput.value = member.email || '';
    if (addressInput) addressInput.value = member.address || '';
    if (targetCountInput) targetCountInput.value = member.targetCount || 0;
    if (currentCountInput) currentCountInput.value = member.currentCount || 0;
    if (birthYearInput) birthYearInput.value = member.birthYear || '';
    if (skillLevelInput) skillLevelInput.value = member.skillLevel || '';
    if (etcInput) etcInput.value = member.etc || '';

    setSelectedCoach(member.coach || '');
    setSelectedGender(member.gender || '');
    setAwardsList(member.awards || []);

    // 스케줄 데이터 설정
    if (member.schedules && member.schedules.length > 0) {
        console.log('편집할 회원의 스케줄 데이터:', member.schedules);
        setSchedulesData(member.schedules);
    } else {
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
        console.log('레거시 스케줄 데이터:', legacySchedules);
        setSchedulesData(legacySchedules.length > 0 ? legacySchedules : null);
    }

    document.getElementById('paymentSection').style.display = 'block';
    renderPaymentList(member.paymentHistory || []);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    const paymentAmount = document.getElementById('paymentAmount');
    if (paymentAmount) {
        paymentAmount.value = member.fee !== null && member.fee !== undefined ? member.fee : '';
    }

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
            nameInput.focus();
            nameInput.select();
        }
    }, 300);
    
    resetLockTimer();
}

// 폼 초기화
function clearForm() {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const registerDateInput = document.getElementById('registerDate');
    const feeInput = document.getElementById('fee');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const targetCountInput = document.getElementById('targetCount');
    const currentCountInput = document.getElementById('currentCount');
    const birthYearInput = document.getElementById('birthYear');
    const skillLevelInput = document.getElementById('skillLevel');
    const etcInput = document.getElementById('etc');
    
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (registerDateInput) registerDateInput.value = '';
    if (feeInput) feeInput.value = '';
    if (emailInput) emailInput.value = '';
    if (addressInput) addressInput.value = '';
    if (targetCountInput) targetCountInput.value = '0';
    if (currentCountInput) currentCountInput.value = '0';
    if (birthYearInput) birthYearInput.value = '';
    if (skillLevelInput) skillLevelInput.value = '';
    if (etcInput) etcInput.value = '';

    setSelectedCoach('');
    setSelectedGender('');
    currentAwards = [];
    renderAwardsList();
    resetSchedules();
    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('paymentDate').value = '';
    document.getElementById('paymentAmount').value = '';
    currentPaymentList = [];
    renderPaymentList([]);
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
    
    const focusName = document.getElementById('name');
    if (focusName) {
        focusName.focus();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 회비 입금 내역 관리
function addPaymentEntry() {
    const dateInput = document.getElementById('paymentDate');
    const amountInput = document.getElementById('paymentAmount');
    if (!dateInput || !amountInput) return;
    
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
    if (!container) return;

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

// 스케줄 충돌 체크
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