let currentEditIndex = null;
let deleteIndex = null;
let currentPaymentList = [];

// 회원 추가
function addMember() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const registerDate = document.getElementById('registerDate').value;
    const fee = document.getElementById('fee').value;
    const day1 = document.getElementById('day1').value;
    const startTime1 = document.getElementById('startTime1').value;
    const endTime1 = document.getElementById('endTime1').value;
    const day2 = document.getElementById('day2').value;
    const startTime2 = document.getElementById('startTime2').value;
    const endTime2 = document.getElementById('endTime2').value;
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const coach = getSelectedCoach();

    if (!name) {
        showAlert('이름을 입력해주세요!');
        return;
    }

    if (day1 && startTime1 && endTime1) {
        if (startTime1 >= endTime1) {
            showAlert('첫 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
            return;
        }
    }
    if (day2 && startTime2 && endTime2) {
        if (startTime2 >= endTime2) {
            showAlert('두 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
            return;
        }
    }

    const conflict = checkTimeConflict(
        day1 && startTime1 && endTime1 ? day1 : null,
        day1 && startTime1 && endTime1 ? startTime1 : null,
        day1 && startTime1 && endTime1 ? endTime1 : null,
        day2 && startTime2 && endTime2 ? day2 : null,
        day2 && startTime2 && endTime2 ? startTime2 : null,
        day2 && startTime2 && endTime2 ? endTime2 : null,
        coach
    );
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
        fee: fee ? parseInt(fee) : null,
        coach: coach,
        targetCount: targetCount,
        currentCount: 0,
        attendanceDates: [],
        attendanceHistory: [],
        paymentHistory: [],
        day1: day1 || null,
        startTime1: startTime1 || null,
        endTime1: endTime1 || null,
        day2: day2 || null,
        startTime2: startTime2 || null,
        endTime2: endTime2 || null,
        email,
        address
    };

    members.push(member);
    saveToFirebase();
    filteredMembers = [...members];
    renderMembers();
    renderSchedule();
    clearForm();
    showAlert('회원이 추가되었습니다!');
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
    const fee = document.getElementById('fee').value;
    const day1 = document.getElementById('day1').value;
    const startTime1 = document.getElementById('startTime1').value;
    const endTime1 = document.getElementById('endTime1').value;
    const day2 = document.getElementById('day2').value;
    const startTime2 = document.getElementById('startTime2').value;
    const endTime2 = document.getElementById('endTime2').value;
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const coach = getSelectedCoach();

    if (!name) {
        showAlert('이름을 입력해주세요!');
        return;
    }

    if (day1 && startTime1 && endTime1) {
        if (startTime1 >= endTime1) {
            showAlert('첫 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
            return;
        }
    }
    if (day2 && startTime2 && endTime2) {
        if (startTime2 >= endTime2) {
            showAlert('두 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
            return;
        }
    }

    const conflict = checkTimeConflict(
        day1 && startTime1 && endTime1 ? day1 : null,
        day1 && startTime1 && endTime1 ? startTime1 : null,
        day1 && startTime1 && endTime1 ? endTime1 : null,
        day2 && startTime2 && endTime2 ? day2 : null,
        day2 && startTime2 && endTime2 ? startTime2 : null,
        day2 && startTime2 && endTime2 ? endTime2 : null,
        coach,
        currentEditIndex
    );
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

    members[currentEditIndex] = {
        name,
        phone,
        photo: currentPhotoData !== null ? currentPhotoData : (members[currentEditIndex].photo || ''),
        registerDate: registerDate || members[currentEditIndex].registerDate,
        fee: fee ? parseInt(fee) : null,
        coach: coach,
        targetCount: targetCount,
        currentCount: members[currentEditIndex].currentCount || 0,
        attendanceDates: members[currentEditIndex].attendanceDates || [],
        attendanceHistory: existingHistory,
        paymentHistory: paymentHistory,
        day1: day1 || null,
        startTime1: startTime1 || null,
        endTime1: endTime1 || null,
        day2: day2 || null,
        startTime2: startTime2 || null,
        endTime2: endTime2 || null,
        email,
        address
    };

    saveToFirebase();
    filteredMembers = [...members];
    renderMembers();
    renderSchedule();
    clearForm();
    showAlert('회원 정보가 수정되었습니다!');
    resetLockTimer();
}

// 회원 편집 폼 채우기
function editMember(index) {
    const member = members[index];
    document.getElementById('name').value = member.name;
    document.getElementById('phone').value = member.phone || '';
    document.getElementById('registerDate').value = member.registerDate || '';
    document.getElementById('fee').value = member.fee || '';
    document.getElementById('day1').value = member.day1 || '';
    document.getElementById('startTime1').value = member.startTime1 || '';
    document.getElementById('endTime1').value = member.endTime1 || '';
    document.getElementById('day2').value = member.day2 || '';
    document.getElementById('startTime2').value = member.startTime2 || '';
    document.getElementById('endTime2').value = member.endTime2 || '';
    document.getElementById('email').value = member.email || '';
    document.getElementById('address').value = member.address || '';
    document.getElementById("targetCount").value = member.targetCount || 0;
    document.getElementById("currentCount").value = member.currentCount || 0;

    setSelectedCoach(member.coach || '');

    document.getElementById('paymentSection').style.display = 'block';
    renderPaymentList(member.paymentHistory || []);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentAmount').value = member.fee || '';

    if (member.photo) {
        currentPhotoData = member.photo;
        displayPhotoPreview();
    } else {
        removePhoto();
    }

    currentEditIndex = index;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetLockTimer();
}

// 폼 초기화
function clearForm() {
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('registerDate').value = '';
    document.getElementById('fee').value = '';
    document.getElementById('day1').value = '';
    document.getElementById('startTime1').value = '';
    document.getElementById('endTime1').value = '';
    document.getElementById('day2').value = '';
    document.getElementById('startTime2').value = '';
    document.getElementById('endTime2').value = '';
    document.getElementById('email').value = '';
    document.getElementById('address').value = '';
    document.getElementById("targetCount").value = "0";
    document.getElementById("currentCount").value = "0";

    setSelectedCoach('');

    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('paymentDate').value = '';
    document.getElementById('paymentAmount').value = '';
    currentPaymentList = [];
    document.getElementById('paymentList').innerHTML = '';

    removePhoto();
    currentEditIndex = null;
    resetLockTimer();
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
    amountInput.value = currentFee || '';
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

// 스케줄 충돌 체크
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