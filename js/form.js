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
    const phone = document.getElementById('phone').value.trim();
    const registerDate = document.getElementById('registerDate').value;
    const feeValue = document.getElementById('fee').value;
    const fee = safeParseInt(feeValue); // 안전한 변환
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const coach = getSelectedCoach();
    
    // 새로운 필드들
    const gender = getSelectedGender();
    const birthYear = document.getElementById('birthYear').value ? parseInt(document.getElementById('birthYear').value) : null;
    const skillLevel = document.getElementById('skillLevel').value ? parseInt(document.getElementById('skillLevel').value) : null;
    const etc = document.getElementById('etc').value.trim();
    const awards = [...currentAwards];

    // 스케줄 데이터 가져오기
    const schedulesData = getSchedulesData();

    if (!name) {
        showAlert('이름을 입력해주세요!');
        document.getElementById('name').focus();
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

    const targetCountInput = document.getElementById('targetCount').value;
    const targetCount = targetCountInput === "" ? 0 : parseInt(targetCountInput) || 0;

    const member = {
        name,
        phone,
        photo: currentPhotoData || '',
        registerDate: registerDate || new Date().toISOString().split('T')[0],
        fee: fee, // 안전하게 변환된 값 (null 가능)
        coach: coach,
        targetCount: targetCount,
        currentCount: 0,
        attendanceDates: [],
        attendanceHistory: [],
        paymentHistory: [],
        schedules: schedulesData, // 배열로 저장
        email,
        address,
        // 새로운 필드들
        gender: gender || '',
        birthYear: birthYear,
        skillLevel: skillLevel,
        awards: awards,
        etc: etc
    };

    members.push(member);
    saveToFirebase();
    filteredMembers = [...members];
    renderMembers();
    renderSchedule();
    clearForm();
    showAlert('회원이 추가되었습니다!');
    
    // 수정 모드 클래스 제거
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.remove('form-edit-mode');
    }
    
    // 상단으로 스크롤 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 회원 수정
function updateMember() {
    if (currentEditIndex === null) {
        showAlert('수정할 회원을 선택해주세요!');
        return;
    }

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const registerDate = document.getElementById('registerDate').value;
    const feeValue = document.getElementById('fee').value;
    const fee = safeParseInt(feeValue); // 안전한 변환
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const coach = getSelectedCoach();
    
    // 새로운 필드들
    const gender = getSelectedGender();
    const birthYear = document.getElementById('birthYear').value ? parseInt(document.getElementById('birthYear').value) : null;
    const skillLevel = document.getElementById('skillLevel').value ? parseInt(document.getElementById('skillLevel').value) : null;
    const etc = document.getElementById('etc').value.trim();
    const awards = [...currentAwards];

    // 스케줄 데이터 가져오기
    const schedulesData = getSchedulesData();

    if (!name) {
        showAlert('이름을 입력해주세요!');
        document.getElementById('name').focus();
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

    const targetCountInput = document.getElementById('targetCount').value;
    const targetCount = targetCountInput === "" ? 
                       members[currentEditIndex].targetCount || 0 : 
                       parseInt(targetCountInput) || 0;

    const existingHistory = members[currentEditIndex].attendanceHistory || [];
    const paymentHistory = currentPaymentList || [];

    // 이미지 처리: isPhotoRemoved 플래그 확인
    let newPhoto = '';
    if (isPhotoRemoved) {
        // 이미지가 명시적으로 삭제된 경우
        newPhoto = '';
    } else if (currentPhotoData !== null) {
        // 새 이미지가 업로드된 경우
        newPhoto = currentPhotoData;
    } else {
        // 이미지가 변경되지 않았으면 기존 이미지 유지
        newPhoto = members[currentEditIndex].photo || '';
    }

    members[currentEditIndex] = {
        ...members[currentEditIndex],
        name,
        phone,
        photo: newPhoto, // 올바르게 처리된 이미지
        registerDate: registerDate || members[currentEditIndex].registerDate,
        fee: fee, // 안전하게 변환된 값 (null 가능)
        coach: coach,
        targetCount: targetCount,
        currentCount: members[currentEditIndex].currentCount || 0,
        attendanceDates: members[currentEditIndex].attendanceDates || [],
        attendanceHistory: existingHistory,
        paymentHistory: paymentHistory,
        schedules: schedulesData, // 배열로 저장
        email,
        address,
        // 새로운 필드들
        gender: gender || '',
        birthYear: birthYear,
        skillLevel: skillLevel,
        awards: awards,
        etc: etc
    };

    saveToFirebase();
    filteredMembers = [...members];
    renderMembers();
    renderSchedule();
    clearForm();
    showAlert('회원 정보가 수정되었습니다!');
    resetLockTimer();
    
    // 수정 모드 클래스 제거
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.remove('form-edit-mode');
    }
    
    // 상단으로 스크롤 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 삭제 플래그 초기화
    isPhotoRemoved = false;
}

// 회원 편집 폼 채우기
function editMember(index) {
    const member = members[index];
    
    // 폼 섹션에 수정 모드 클래스 추가
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
    document.getElementById("targetCount").value = member.targetCount || 0;
    document.getElementById("currentCount").value = member.currentCount || 0;

    // 코치 설정
    setSelectedCoach(member.coach || '');

    // 새로운 필드들 채우기
    setSelectedGender(member.gender || '');
    document.getElementById('birthYear').value = member.birthYear || '';
    document.getElementById('skillLevel').value = member.skillLevel || '';
    document.getElementById('etc').value = member.etc || '';
    setAwardsList(member.awards || []);

    // 스케줄 데이터 설정
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

    // 회비 입금 내역
    document.getElementById('paymentSection').style.display = 'block';
    renderPaymentList(member.paymentHistory || []);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentAmount').value = member.fee !== null && member.fee !== undefined ? member.fee : '';

    // 사진
    if (member.photo) {
        currentPhotoData = member.photo;
        displayPhotoPreview();
    } else {
        currentPhotoData = null;
        displayPhotoPreview();
    }

    // 삭제 플래그 초기화
    isPhotoRemoved = false;

    currentEditIndex = index;
    
    // 상단으로 스크롤 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 이름 입력란에 포커스 이동 (스크롤 완료 후)
    setTimeout(() => {
        const nameInput = document.getElementById('name');
        if (nameInput) {
            nameInput.focus();
            // 텍스트 선택 (편집 용이성)
            nameInput.select();
        }
    }, 300); // 스크롤 애니메이션 시간 고려
    
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
    document.getElementById("currentCount").value = "0";

    // 코치 초기화
    setSelectedCoach('');

    // 새로운 필드들 초기화
    setSelectedGender('');
    document.getElementById('birthYear').value = '';
    document.getElementById('skillLevel').value = '';
    document.getElementById('etc').value = '';
    currentAwards = [];
    renderAwardsList();

    // 스케줄 초기화
    resetSchedules();

    // 회비 입금 내역 초기화
    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('paymentDate').value = '';
    document.getElementById('paymentAmount').value = '';
    currentPaymentList = [];
    document.getElementById('paymentList').innerHTML = '';

    // 사진 초기화
    currentPhotoData = null;
    isPhotoRemoved = false;
    displayPhotoPreview();
    document.getElementById('photoInput').value = '';
    
    currentEditIndex = null;
    
    // 수정 모드 클래스 제거
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.remove('form-edit-mode');
    }
    
    resetLockTimer();
    
    // 이름 입력란에 포커스
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.focus();
    }
    
    // 상단으로 스크롤 이동
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

        // 회원의 스케줄 가져오기 (새 형식 또는 기존 형식)
        const memberSchedules = member.schedules || [];
        
        // 기존 day1, day2 형식도 체크
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

        // 각 스케줄 비교
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

// 스케줄 충돌 체크 (기존 방식 - 하위 호환)
function checkTimeConflict(day1, startTime1, endTime1, day2, startTime2, endTime2, coach, excludeIndex = null) {
    if (!coach) return { conflict: false };

    for (let i = 0; i < members.length; i++) {
        if (excludeIndex !== null && i === excludeIndex) continue;

        const member = members[i];
        if (member.coach !== coach) continue;

        if (day1 && startTime1 && endTime1) {
            if (member.day1 === day1 && member.startTime1 && member.endTime1) {
                if (timesOverlap(startTime1, endTime1, member.startTime1, member.endTime1)) {
                    return {
                        conflict: true,
                        memberName: member.name,
                        existingTime: `${dayNames[member.day1]} ${member.startTime1}~${member.endTime1}`
                    };
                }
            }
            if (member.day2 === day1 && member.startTime2 && member.endTime2) {
                if (timesOverlap(startTime1, endTime1, member.startTime2, member.endTime2)) {
                    return {
                        conflict: true,
                        memberName: member.name,
                        existingTime: `${dayNames[member.day2]} ${member.startTime2}~${member.endTime2}`
                    };
                }
            }
        }

        if (day2 && startTime2 && endTime2) {
            if (member.day1 === day2 && member.startTime1 && member.endTime1) {
                if (timesOverlap(startTime2, endTime2, member.startTime1, member.endTime1)) {
                    return {
                        conflict: true,
                        memberName: member.name,
                        existingTime: `${dayNames[member.day1]} ${member.startTime1}~${member.endTime1}`
                    };
                }
            }
            if (member.day2 === day2 && member.startTime2 && member.endTime2) {
                if (timesOverlap(startTime2, endTime2, member.startTime2, member.endTime2)) {
                    return {
                        conflict: true,
                        memberName: member.name,
                        existingTime: `${dayNames[member.day2]} ${member.startTime2}~${member.endTime2}`
                    };
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