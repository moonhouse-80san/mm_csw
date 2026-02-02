// 현재 수정 중인 회원의 출석 초기화
function resetCurrentAttendance() {
    if (!isUnlocked) {
        showAlert('먼저 잠금을 해제해주세요!');
        return;
    }

    if (currentEditIndex === null) {
        showAlert('먼저 수정할 회원을 선택해주세요!');
        return;
    }

    document.getElementById('confirmModal').classList.add('active');
}

// 출석 초기화 실행
function confirmResetAttendance() {
    document.getElementById('confirmModal').classList.remove('active');

    const member = members[currentEditIndex];

    if (!member.attendanceHistory) {
        member.attendanceHistory = [];
    }
    if (member.attendanceDates && member.attendanceDates.length > 0) {
        member.attendanceDates.forEach(date => {
            if (!member.attendanceHistory.includes(date)) {
                member.attendanceHistory.push(date);
            }
        });
    }

    member.currentCount = 0;
    member.attendanceDates = [];
    
    document.getElementById('currentCount').value = 0;
    
    saveToFirebase();
    renderMembers();
    
    const calendar = document.getElementById('formCalendar');
    if (calendar.style.display !== 'none') {
        renderFormCalendar();
    }
    
    showAlert(`${member.name} 회원의 출석이 초기화되었습니다. (0/${member.targetCount || 0}회)\n출석 기록은 유지됩니다.`);
    resetLockTimer();
}

// 출석 초기화 모달 닫기
function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

// 삭제 모달 표시
function showDeleteModal(index) {
    deleteIndex = index;
    document.getElementById('deleteModal').classList.add('active');
    resetLockTimer();
}

function confirmDelete() {
    if (deleteIndex !== null) {
        members.splice(deleteIndex, 1);
        saveToFirebase();
        filteredMembers = [...members];
        renderMembers();
        renderSchedule();
        deleteIndex = null;
        closeModal();
        showAlert('회원이 삭제되었습니다!');
        resetLockTimer();
    }
}

function closeModal() {
    document.getElementById('deleteModal').classList.remove('active');
}

// 알림 모달
function showAlert(message) {
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

function closeAlertModal() {
    document.getElementById('alertModal').classList.remove('active');
}