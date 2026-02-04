let currentYear = 2026;
let currentMonth = 0;
let selectedDate = null;

// 출석 알림 모달 표시
function showAttendanceAlert(memberName, currentCount, targetCount) {
    const message = `<strong>${memberName}</strong> 회원님<br>현재 출석: <strong>${currentCount}회</strong> / 출석: <strong>${targetCount}회</strong><br><br>회비입금이 임박했습니다!`;
    document.getElementById('attendanceAlertMessage').innerHTML = message;
    document.getElementById('attendanceAlertModal').classList.add('active');
    playNotificationSound();
}

function closeAttendanceAlert() {
    document.getElementById('attendanceAlertModal').classList.remove('active');
}

// 출석 완료 SMS 발송 (네이티브 SMS 앱 실행)
function sendAttendanceCompleteSMS(memberName, memberPhone, targetCount) {
    if (!memberPhone) {
        showAlert('회원의 전화번호가 등록되어 있지 않습니다.');
        return;
    }
    
    // 전화번호에서 하이픈 제거
    const phoneNumber = String(memberPhone).replace(/-/g, '');
    
    // SMS 메시지 내용
    const clubName = settings.clubName || '탁구클럽';
    const message = `${memberName}회원님 출석 횟수가 완료 되었습니다.\n다음 레슨 까지 회비 납부를 부탁드립니다.\n감사합니다.\n\n- ${clubName}`;
    
    // 모바일 환경 체크
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 모바일: SMS 앱 열기
        const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
    } else {
        // PC: 전화번호와 메시지를 클립보드에 복사
        const textToCopy = `전화번호: ${phoneNumber}\n\n메시지:\n${message}`;
        
        // 클립보드 복사 시도
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showAlert('전화번호와 메시지가 클립보드에 복사되었습니다!\n\n핸드폰으로 문자를 보내주세요.');
            }).catch(() => {
                // 클립보드 복사 실패 시 텍스트 표시
                showSMSTextModal(phoneNumber, message);
            });
        } else {
            // 구형 브라우저: 텍스트 표시
            showSMSTextModal(phoneNumber, message);
        }
    }
}

// SMS 메시지를 모달로 표시 (PC 환경용)
function showSMSTextModal(phoneNumber, message) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>📱 문자 메시지</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div style="padding: 20px 0;">
                <div style="margin-bottom: 15px;">
                    <strong>받는 사람:</strong><br>
                    <input type="text" value="${phoneNumber}" readonly 
                           style="width: 100%; padding: 10px; margin-top: 5px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                <div>
                    <strong>메시지:</strong><br>
                    <textarea readonly style="width: 100%; min-height: 150px; padding: 10px; margin-top: 5px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: inherit;">${message}</textarea>
                </div>
            </div>
            <div class="modal-buttons">
                <button style="background: #2196F3;" onclick="copyToClipboard('${phoneNumber}', \`${message.replace(/`/g, '\\`')}\`)">복사하기</button>
                <button style="background: #9E9E9E;" onclick="this.closest('.modal').remove()">닫기</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 클립보드 복사 헬퍼 함수
function copyToClipboard(phoneNumber, message) {
    const textToCopy = `전화번호: ${phoneNumber}\n\n메시지:\n${message}`;
    
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showAlert('전화번호와 메시지가 복사되었습니다!');
    } catch (err) {
        showAlert('복사에 실패했습니다. 수동으로 복사해주세요.');
    }
    
    document.body.removeChild(textArea);
}

// 알림음 재생
function playNotificationSound() {
    const audio = document.getElementById('notificationSound');
    audio.play().catch(e => console.log('알림음 재생 실패:', e));
}

// 달력 토글
function toggleCalendar() {
    if (members.length === 0) {
        showAlert('등록된 회원이 없습니다.');
        return;
    }
    
    const hasMembersWithTarget = members.some(member => {
        const targetCount = member.targetCount || 0;
        return targetCount > 0;
    });
    
    if (!hasMembersWithTarget) {
        showAlert('목표 출석 횟수가 설정된 회원이 없습니다.\n회원 정보에서 목표 출석 횟수를 설정해주세요.');
        return;
    }
    
    const calendar = document.getElementById('formCalendar');
    const toggleText = document.getElementById('calendarToggleText');
    
    if (calendar.style.display === 'none') {
        calendar.style.display = 'block';
        toggleText.textContent = '달력 닫기';
        renderFormCalendar();
    } else {
        calendar.style.display = 'none';
        toggleText.textContent = '달력 열기';
    }
    resetLockTimer();
}

// 달력 렌더링
function renderFormCalendar() {
    const grid = document.getElementById('formCalendarGrid');
    grid.innerHTML = '';

    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    document.getElementById('formCalendarTitle').textContent = `${currentYear}년 ${monthNames[currentMonth]}`;

    const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    const todayDate = today.getDate();

    // 이전 달 날짜
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = `<div class="calendar-day-number">${daysInPrevMonth - i}</div>`;
        grid.appendChild(day);
    }

    // 현재 달 날짜
    for (let date = 1; date <= daysInMonth; date++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        
        if (isCurrentMonth && date === todayDate) {
            day.classList.add('today');
        }

        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

        let hasAttendance = false;
        members.forEach(member => {
            const allDates = getAllAttendanceDates(member);
            if (allDates.includes(dateStr)) {
                hasAttendance = true;
            }
        });

        if (hasAttendance) {
            day.classList.add('has-attendance');
        }

        day.innerHTML = `
            <div class="calendar-day-number">${date}</div>
            ${hasAttendance ? '<div class="calendar-attendance-dot"></div>' : ''}
        `;

        day.onclick = () => selectDate(currentYear, currentMonth, date);
        grid.appendChild(day);
    }

    // 다음 달 날짜
    const remainingCells = 42 - (firstDay + daysInMonth);
    for (let date = 1; date <= remainingCells; date++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = `<div class="calendar-day-number">${date}</div>`;
        grid.appendChild(day);
    }
}

function previousMonthForm() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderFormCalendar();
}

function nextMonthForm() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderFormCalendar();
}

function selectDate(year, month, date) {
    const hasMembersWithTarget = members.some(member => {
        const targetCount = member.targetCount || 0;
        return targetCount > 0;
    });
    
    if (!hasMembersWithTarget) {
        showAlert('목표 출석 횟수가 설정된 회원이 없습니다.\n회원 정보에서 목표 출석 횟수를 설정해주세요.');
        return;
    }

    selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    showAttendanceSelectModal();
}

function showAttendanceSelectModal() {
    const modal = document.getElementById('attendanceSelectModal');
    const list = document.getElementById('memberSelectList');
    const searchInput = document.getElementById('attendanceSearchInput');
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    list.innerHTML = '';

    const validMembers = members.filter(member => {
        const targetCount = member.targetCount || 0;
        return targetCount > 0;
    });

    if (validMembers.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">목표 출석 횟수가 설정된 회원이 없습니다.<br>회원 정보에서 목표 출석 횟수를 설정해주세요.</p>';
        modal.classList.add('active');
        return;
    }

    renderAttendanceMemberList(validMembers);
    modal.classList.add('active');
}

function renderAttendanceMemberList(membersToShow) {
    const list = document.getElementById('memberSelectList');
    list.innerHTML = '';
    
    if (membersToShow.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">검색 결과가 없습니다.</p>';
        return;
    }

    membersToShow.forEach((member, index) => {
        const originalIndex = members.indexOf(member);
        const alreadyChecked = member.attendanceDates && member.attendanceDates.includes(selectedDate);
        const currentCount = member.currentCount || 0;
        const targetCount = member.targetCount || 8;

        const item = document.createElement('div');
        item.style.cssText = 'padding: 15px; border-bottom: 1px solid #e0e0e0; cursor: pointer; transition: background 0.3s;';
        item.innerHTML = `
		<div style="display: flex; align-items: center; gap: 10px;">
			<div style="flex: 1;">
				<div class="member-title">
					<span class="member-name">${member.name}</span>

					<span class="attendance-count">
						📊 ${currentCount}/${targetCount}회
					</span>

					${member.coach ? `<span class="coach-badge">🏋️${member.coach}</span>` : ''}
				</div>
			</div>

			<div style="color: ${alreadyChecked ? '#4CAF50' : '#999'}; font-size: 24px;">
				${alreadyChecked ? '✓' : '○'}
			</div>
		</div>
        `;
        
        item.onmouseover = () => item.style.background = '#f8f9fa';
        item.onmouseout = () => item.style.background = 'white';
        item.onclick = () => toggleAttendance(originalIndex);
        
        list.appendChild(item);
    });
}

function filterAttendanceMembers() {
    const searchInput = document.getElementById('attendanceSearchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    let validMembers = members.filter(member => {
        const targetCount = member.targetCount || 0;
        return targetCount > 0;
    });
    
    if (searchTerm) {
        validMembers = validMembers.filter(member => 
            member.name.toLowerCase().includes(searchTerm) ||
            (member.phone && String(member.phone).includes(searchTerm))
        );
    }
    
    renderAttendanceMemberList(validMembers);
}

function closeAttendanceSelectModal() {
    document.getElementById('attendanceSelectModal').classList.remove('active');
    selectedDate = null;
}

function toggleAttendance(memberIndex) {
    const member = members[memberIndex];

    if (!member.attendanceDates) {
        member.attendanceDates = [];
    }
    if (!member.attendanceHistory) {
        member.attendanceHistory = [];
    }

    const dateIndex = member.attendanceDates.indexOf(selectedDate);

    if (dateIndex === -1) {
        member.attendanceDates.push(selectedDate);
        member.currentCount = (member.currentCount || 0) + 1;

        const targetCount = member.targetCount || 0;

        if (targetCount > 0 && member.currentCount === targetCount - 1) {
            showAttendanceAlert(member.name, member.currentCount, targetCount);
        }
        else if (targetCount > 0 && member.currentCount >= targetCount) {
            // 출석 완료 처리
            member.attendanceDates.forEach(date => {
                if (!member.attendanceHistory.includes(date)) {
                    member.attendanceHistory.push(date);
                }
            });

            member.currentCount = 0;
            member.attendanceDates = [];

            saveToFirebase();
            renderMembers();
            
            // 출석 완료 알림 모달 표시 (SMS 버튼 포함)
            showAttendanceCompleteModal(member.name, member.phone, targetCount);
        } else if (targetCount > 0) {
            showAlert(`${member.name} 출석 체크 완료! (${member.currentCount}/${targetCount}회)`);
        } else {
            showAlert(`${member.name} 출석 체크 완료!`);
        }
    } else {
        member.attendanceDates.splice(dateIndex, 1);
        member.currentCount = Math.max(0, (member.currentCount || 0) - 1);
        const targetCount = member.targetCount || 0;
        if (targetCount > 0) {
            showAlert(`${member.name} 출석이 취소되었습니다. (${member.currentCount}/${targetCount}회)`);
        } else {
            showAlert(`${member.name} 출석이 취소되었습니다.`);
        }
    }

    saveToFirebase();
    renderMembers();

    const calendar = document.getElementById('formCalendar');
    if (calendar.style.display !== 'none') {
        renderFormCalendar();
    }

    closeAttendanceSelectModal();
}

// 출석 완료 모달 표시 (SMS 버튼 포함)
function showAttendanceCompleteModal(memberName, memberPhone, targetCount) {
    const modal = document.createElement('div');
    modal.id = 'attendanceCompleteModal';
    modal.className = 'modal active attendance-alert-modal';
    modal.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 400px;">
            <div class="attendance-alert-icon">🎉</div>
            <h2 style="color: #4CAF50; font-size: 28px; margin-bottom: 15px;">출석 완료!</h2>
            <p style="font-size: 18px; color: #666; margin-bottom: 25px; line-height: 1.6;">
                <strong>${memberName}</strong> 회원님<br>
                목표 <strong>${targetCount}회</strong>를 달성했습니다!<br>
                출석 횟수가 초기화되었습니다.<br>
                <small style="color: #999;">(출석 기록은 유지됩니다)</small>
            </p>
            <div class="modal-buttons" style="flex-direction: column; gap: 10px;">
                <button class="btn" style="background: #4CAF50; width: 100%; padding: 15px;" onclick="sendAttendanceCompleteSMS('${memberName}', '${memberPhone}', ${targetCount}); closeAttendanceCompleteModal();">
                    📱 문자 메시지 보내기
                </button>
                <button class="btn" style="background: #2196F3; width: 100%; padding: 15px;" onclick="closeAttendanceCompleteModal()">
                    확인
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeAttendanceCompleteModal();
        }
    });
    
    playNotificationSound();
}

// 출석 완료 모달 닫기
function closeAttendanceCompleteModal() {
    const modal = document.getElementById('attendanceCompleteModal');
    if (modal) {
        modal.remove();
    }
}

// 현재 날짜로 달력 초기화
const now = new Date();
currentYear = now.getFullYear();
currentMonth = now.getMonth();