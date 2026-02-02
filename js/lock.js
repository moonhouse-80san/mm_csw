// 보안 관련 변수
let isUnlocked = false;
let remainingTime = 60 * 60; // 60분 (초 단위)
let lockInterval = null;

// 폼 입력란 클릭 시 잠금 툴팁 표시
document.addEventListener('DOMContentLoaded', function() {
    const formSection = document.querySelector('.form-section');
    if (!formSection) return;

    formSection.addEventListener('click', function(e) {
        const target = e.target;
        const isInput = target.closest('input, select, textarea, button, label');
        if (!isInput) return;

        const tooltip = document.getElementById('lockTooltip');
        const tooltipText = document.getElementById('lockTooltipText');

        if (!isUnlocked) {
            tooltipText.textContent = '🔒 잠김 상태 - 수정/삭제 암호를 입력해주세요';
            tooltip.classList.remove('unlocked-style');
            tooltip.classList.add('visible');
        } else {
            tooltipText.textContent = `🔓 잠금 해제됨 - ${formatTime(remainingTime)} 후 자동 잠금`;
            tooltip.classList.add('unlocked-style');
            tooltip.classList.add('visible');
        }
    });
});

// 잠금 상태 업데이트 (버튼 텍스트도 변경)
function updateLockStatus() {
    const updateBtn = document.getElementById('updateBtn');
    const unlockBtn = document.querySelector('.unlock-btn');
    const tooltip = document.getElementById('lockTooltip');
    const tooltipText = document.getElementById('lockTooltipText');

    if (isUnlocked) {
        // 잠금 해제된 상태
        updateBtn.classList.remove('btn-disabled');
        updateBtn.classList.add('btn-update');
        updateBtn.textContent = '수정';
        
        // 잠금 해제 버튼 텍스트 변경
        if (unlockBtn) {
            unlockBtn.textContent = '🔓 잠금';
            unlockBtn.style.background = '#FF9800'; // 주황색으로 변경
        }
        
        showMemberButtons();
        tooltip.classList.remove('visible');
    } else {
        // 잠긴 상태
        updateBtn.classList.remove('btn-update');
        updateBtn.classList.add('btn-disabled');
        updateBtn.textContent = '수정';
        
        // 잠금 해제 버튼 텍스트 변경
        if (unlockBtn) {
            unlockBtn.textContent = '🔓 잠금 해제';
            unlockBtn.style.background = '#2196F3'; // 파란색으로 복원
        }
        
        hideMemberButtons();
        tooltip.classList.remove('visible');
        tooltipText.textContent = '🔒 잠김 상태 - 수정/삭제 암호를 입력해주세요';
    }
    
    // 회원 목록도 다시 렌더링해서 버튼 상태 업데이트
    renderMembers();
}

// 잠금 해제 함수 수정
function unlockEditButtons() {
    const password = document.getElementById('lockPassword').value;
    const unlockBtn = document.querySelector('.unlock-btn');

    if (!password) {
        showAlert('암호를 입력해주세요!');
        return;
    }

    // 이미 잠금 해제된 상태에서 올바른 암호를 입력하면 즉시 잠금
    if (isUnlocked && password === settings.editPassword) {
        isUnlocked = false;
        remainingTime = settings.lockTimeout * 60;

        if (lockInterval) {
            clearInterval(lockInterval);
            lockInterval = null;
        }

        document.getElementById('lockPassword').value = '';
        updateLockStatus(); // 상태 업데이트
        showAlert('앱이 잠겼습니다!');
        
        // 잠금 해제 버튼 텍스트 변경
        if (unlockBtn) {
            unlockBtn.textContent = '🔒 잠김 상태';
            unlockBtn.style.background = '#2196F3';
        }
        return;
    }

    if (password === settings.editPassword) {
        isUnlocked = true;
        remainingTime = settings.lockTimeout * 60;

        startAutoLockTimer();
        document.getElementById('lockPassword').value = '';
        updateLockStatus(); // 상태 업데이트
        showAlert(`잠금이 해제되었습니다! ${settings.lockTimeout}분 후 자동으로 잠깁니다.`);
        resetLockTimer();
        
        // 잠금 해제 버튼 텍스트 변경
        if (unlockBtn) {
            unlockBtn.textContent = '🔓 잠금 해제된 상태';
            unlockBtn.style.background = '#FF9800';
        }
    } else {
        showAlert('암호가 틀렸습니다!');
    }
}

// 자동 잠금 타이머 시작
function startAutoLockTimer() {
    if (lockInterval) {
        clearInterval(lockInterval);
    }

    lockInterval = setInterval(() => {
        remainingTime--;
        updateTimerDisplay();

        if (remainingTime <= 0) {
            lockEditButtons();
        }
    }, 1000);
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
    const tooltipText = document.getElementById('lockTooltipText');
    if (isUnlocked) {
        tooltipText.textContent = `🔓 잠금 해제됨 - ${formatTime(remainingTime)} 후 자동 잠금`;
    }
}

// 시간 형식화 (MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 잠금
function lockEditButtons() {
    isUnlocked = false;

    if (lockInterval) {
        clearInterval(lockInterval);
        lockInterval = null;
    }

    document.getElementById('lockTooltip').classList.remove('visible');
    updateLockStatus();
    showAlert('자동 잠금되었습니다. 다시 암호를 입력해주세요.');
}

// 타이머 리셋 (활동 감지)
function resetLockTimer() {
    if (isUnlocked) {
        remainingTime = settings.lockTimeout * 60;
        updateTimerDisplay();
    }
}

// 회원 목록의 수정/삭제 버튼 숨기기
function hideMemberButtons() {
    document.querySelectorAll('.btn-edit, .btn-delete, .btn-edit-disabled, .btn-delete-disabled').forEach(btn => {
        btn.classList.add('btn-hidden');
    });
}

// 회원 목록의 수정/삭제 버튼 표시하기
function showMemberButtons() {
    document.querySelectorAll('.btn-edit, .btn-delete').forEach(btn => {
        btn.classList.remove('btn-hidden');
    });
}

// 수정 전 잠금 확인 (수정이 성공한 경우에만 상단 이동)
function checkLockBeforeUpdate() {
    if (!isUnlocked) {
        showAlert('수정 기능을 사용하려면 먼저 잠금을 해제해주세요!');
        document.getElementById('lockPassword').focus();
        return false;
    }
    resetLockTimer();
    
    // updateMember 함수가 성공적으로 실행되면 그 안에서 상단 이동 처리
    return updateMember(); // updateMember()가 boolean을 반환하도록 수정해야 함
}

// 삭제 전 잠금 확인
function checkLockBeforeDelete(index) {
    if (!isUnlocked) {
        showAlert('삭제 기능을 사용하려면 먼저 잠금을 해제해주세요!');
        document.getElementById('lockPassword').focus();
        return false;
    }
    resetLockTimer();
    showDeleteModal(index);
    return true;
}

// 활동 감지 이벤트 리스너 추가
document.addEventListener('click', resetLockTimer);
document.addEventListener('keydown', resetLockTimer);
document.addEventListener('scroll', resetLockTimer);