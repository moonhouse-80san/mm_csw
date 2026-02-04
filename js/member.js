// 전역 변수
let currentSort = 'name';
let sortAscending = true;

// 검색 함수
function searchMembers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (searchTerm === '') {
        filteredMembers = [...members];
    } else {
        filteredMembers = members.filter(member => {
            return member.name.toLowerCase().includes(searchTerm) ||
                   (member.phone && String(member.phone).includes(searchTerm));
        });
    }
    
    // 현재 정렬 방식에 따라 렌더링
    if (currentSort === 'coach') {
        renderMembersByCoach(); // 코치별 렌더링 (coach.js에서 정의)
    } else {
        sortMembers(currentSort, true); // 기존 방식
    }
}

// 정렬 함수
function sortMembers(sortBy, fromSearch) {
    if (!fromSearch) {
        if (currentSort === sortBy) {
            sortAscending = !sortAscending;
        } else {
            sortAscending = true;
        }
        currentSort = sortBy;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            const labels = { name: '이름순', registerDate: '등록일순', coach: '코치별' };
            btn.textContent = labels[btn.dataset.sort] || btn.textContent;
        });
        const activeBtn = document.querySelector(`.filter-btn[data-sort="${sortBy}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            if (sortBy !== 'coach') {
                activeBtn.textContent += sortAscending ? ' ▲' : ' ▼';
            }
        }
    }
    
    // 코치별 정렬 선택 시
    if (sortBy === 'coach') {
        renderMembersByCoach(); // coach.js에서 정의
        return;
    }
    
    // 기존 정렬 로직 (이름순, 등록일순)
    let sortTarget = filteredMembers;
    
    switch(sortBy) {
        case 'name':
            sortTarget.sort((a, b) => {
                const cmp = a.name.localeCompare(b.name);
                return sortAscending ? cmp : -cmp;
            });
            break;
        case 'registerDate':
            sortTarget.sort((a, b) => {
                if (!a.registerDate && !b.registerDate) return 0;
                if (!a.registerDate) return 1;
                if (!b.registerDate) return -1;
                const cmp = new Date(a.registerDate) - new Date(b.registerDate);
                return sortAscending ? cmp : -cmp;
            });
            break;
    }
    
    filteredMembers = sortTarget;
    renderMembers();
}

// 기본 회원 목록 렌더링
function renderMembers() {
    // 코치순 정렬일 경우 코치별 렌더링 호출
    if (currentSort === 'coach') {
        renderMembersByCoach(); // coach.js에서 정의
        return;
    }
    
    const listEl = document.getElementById('listSection');
    const countEl = document.getElementById('memberCount');

    countEl.textContent = `${members.length}명`;

    if (filteredMembers.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
                <p>${document.getElementById('searchInput').value ? '검색 결과가 없습니다' : '등록된 회원이 없습니다'}</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = filteredMembers.map((member, index) => {
        const originalIndex = members.indexOf(member);
        const phoneLink = member.phone ? 
            `<div><a href="tel:${String(member.phone).replace(/-/g, '')}" class="phone-link">📞 ${member.phone}</a></div>` : '';

        let scheduleBadges = '';
        
        // 새로운 schedules 배열 형식
        if (member.schedules && member.schedules.length > 0) {
            member.schedules.forEach(schedule => {
                if (schedule.day && schedule.startTime && schedule.endTime) {
                    scheduleBadges += `<span class="schedule-badge">${dayNames[schedule.day]} ${schedule.startTime}~${schedule.endTime}</span>`;
                }
            });
        } else {
            // 기존 day1, day2 형식 (하위 호환)
            if (member.day1 && member.startTime1 && member.endTime1) {
                scheduleBadges += `<span class="schedule-badge">${dayNames[member.day1]} ${member.startTime1}~${member.endTime1}</span>`;
            }
            if (member.day2 && member.startTime2 && member.endTime2) {
                scheduleBadges += `<span class="schedule-badge">${dayNames[member.day2]} ${member.startTime2}~${member.endTime2}</span>`;
            }
        }

        const currentCount = member.currentCount || 0;
        const targetCount = member.targetCount || 0;

        let attendanceCount = '';
        if (targetCount > 0) {
            attendanceCount = `
                <span class="attendance-count" style="display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; background: 
                #fff; color: #ff6600; border-radius: 2px; font-size: 14px; font-weight: 500; margin-left: 5px; white-space: nowrap;">
                    📊 ${currentCount}/${targetCount}회
                </span>
            `;
        }

        let coachBadge = '';
        if (member.coach) {
            coachBadge = `<span class="coach-badge">🏋️ ${member.coach}</span>`;
        }

        const editBtnClass = isUnlocked ? 'btn-edit' : 'btn-edit btn-edit-disabled btn-hidden';
        const deleteBtnClass = isUnlocked ? 'btn-delete' : 'btn-delete btn-delete-disabled btn-hidden';

        return `
        <div class="member-card">
            <div class="member-content">
                <div class="member-header">
                    <div class="member-name" style="cursor: pointer; color: #000; text-decoration: none;" 
                         onclick="showMemberDetails(${originalIndex})">
                        ${member.name}
                        ${attendanceCount}
                    </div>
                    <div class="member-actions">
                        <button class="${editBtnClass}" data-index="${originalIndex}" onclick="editMember(${originalIndex}); resetLockTimer();">
                            수정
                        </button>
                        <button class="${deleteBtnClass}" data-index="${originalIndex}" onclick="checkLockBeforeDelete(${originalIndex});">
                            삭제
                        </button>
                    </div>
                </div>
                <div class="member-info">
                    <div class="phone-fee-row">
                        ${phoneLink}
                        ${member.fee !== null && member.fee !== undefined ? `<span class="member-fee">💰 월회비:${formatNumber(member.fee)}원</span>` : ''}
                    </div>
                    <div class="member-meta-row">
                        ${coachBadge}
                        ${scheduleBadges ? `<div class="schedule-container">${scheduleBadges}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// 회원 상세 정보 팝업
function showMemberDetails(index) {
    const member = members[index];
    
    // 잠금 툴팁이 표시되어 있다면 숨기기
    const lockTooltip = document.getElementById('lockTooltip');
    if (lockTooltip) {
        lockTooltip.classList.remove('visible');
    }
    
    let detailsHTML = `
        <div class="member-details-modal">
            <div class="member-details-header">
                <h2>${member.name}</h2>
                <button class="close-btn" onclick="closeMemberDetails()">×</button>
            </div>
            
            <div class="member-details-content">
    `;
    
    if (member.photo) {
        detailsHTML += `
            <div class="member-details-photo">
                <img src="${member.photo}" alt="${member.name}" style="width: 200px; height: 200px; border-radius: 10px; object-fit: cover; margin-bottom: 20px;">
            </div>
        `;
    }
    
    detailsHTML += `
        <div class="member-details-section">
            <h3>기본 정보</h3>
            <table class="member-details-table">
    `;
    
    if (member.phone) {
        detailsHTML += `<tr><td>📞 전화번호:</td><td><a href="tel:${String(member.phone).replace(/-/g, '')}">${member.phone}</a></td></tr>`;
    }
    if (member.email) {
        detailsHTML += `<tr><td>📧 이메일:</td><td>${member.email}</td></tr>`;
    }
    if (member.address) {
        detailsHTML += `<tr><td>📍 주소:</td><td>${member.address}</td></tr>`;
    }
    if (member.registerDate) {
        detailsHTML += `<tr><td>📅 등록일:</td><td>${formatDate(member.registerDate)}</td></tr>`;
    }
    if (member.fee) {
        detailsHTML += `<tr><td>💰 월회비:</td><td>${formatNumber(member.fee)}원</td></tr>`;
    }
    if (member.coach) {
        detailsHTML += `<tr><td>🏋️ 담당 코치:</td><td><strong>${member.coach}</strong></td></tr>`;
    }
    // 성별 정보 추가
    if (member.gender) {
        detailsHTML += `<tr><td>⚤ 성별:</td><td>${member.gender}</td></tr>`;
    }
    
    // 생년 정보 추가
    if (member.birthYear) {
        detailsHTML += `<tr><td>🎂 생년:</td><td>${member.birthYear}년생</td></tr>`;
    }
    
    // 부수 정보 추가
    if (member.skillLevel !== undefined && member.skillLevel !== null) {
        let skillText = '';
        if (member.skillLevel === -1) {
            skillText = '희망';
        } else if (member.skillLevel === 0) {
            skillText = '0부 (입문)';
        } else {
            skillText = `${member.skillLevel}부`;
        }
        detailsHTML += `<tr><td>🏓 부수 (실력):</td><td>${skillText}</td></tr>`;
    }
    
    const targetCount = member.targetCount || 0;
    const currentCount = member.currentCount || 0;
    if (targetCount > 0) {
        detailsHTML += `<tr><td>📊 현재 출석:</td><td>${currentCount}/${targetCount}회</td></tr>`;
    }
    
    detailsHTML += `
            </table>
        </div>
    `;

    // 잠금 해제 상태에서만 비밀글 표시
    if (isUnlocked && member.privateMemo) {
        detailsHTML += `
            <div class="member-details-section">
                <h3>📝 비밀글 (관리자용)</h3>
                <div class="etc-details" style="background: #fff8e1; border-left: 4px solid #FF9800;">
                    ${member.privateMemo.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    }
    
    // 입금 내역은 잠금 해제 시에만 표시
    if (isUnlocked) {
        const payments = member.paymentHistory || [];
        if (payments.length > 0) {
            const sortedPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date));
            const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

            detailsHTML += `
                <div class="member-details-section">
                    <h3>💳 회비 입금 내역</h3>
                    <table class="payment-history-table">
                        <thead>
                            <tr>
                                <th>입금날</th>
                                <th>입금금액</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            sortedPayments.forEach(p => {
                detailsHTML += `<tr><td>${formatDate(p.date)}</td><td>${formatNumber(p.amount)}원</td></tr>`;
            });
            detailsHTML += `
                        </tbody>
                    </table>
                    <div class="payment-history-total">
                        <span class="total-label">합계:</span>
                        <span>${formatNumber(totalAmount)}원</span>
                    </div>
                </div>
            `;
        }
    } else {
        // 잠금 상태일 때는 입금 내역 대신 안내 메시지 표시
        const payments = member.paymentHistory || [];
        if (payments.length > 0) {
            detailsHTML += `
                <div class="member-details-section">
                    <h3>💳 회비 입금 내역</h3>
                    <div style="text-align: center; padding: 20px; background: #f9f9f9; border-radius: 8px; color: #666;">
                        🔒 입금 내역을 보려면 잠금을 해제해주세요
                    </div>
                </div>
            `;
        }
    }
    
    // 스케줄 정보 표시
    const memberSchedules = [];
    if (member.schedules && member.schedules.length > 0) {
        memberSchedules.push(...member.schedules);
    } else {
        // 기존 형식 호환
        if (member.day1 && member.startTime1 && member.endTime1) {
            memberSchedules.push({ day: member.day1, startTime: member.startTime1, endTime: member.endTime1 });
        }
        if (member.day2 && member.startTime2 && member.endTime2) {
            memberSchedules.push({ day: member.day2, startTime: member.startTime2, endTime: member.endTime2 });
        }
    }
    
    if (memberSchedules.length > 0) {
        detailsHTML += `
            <div class="member-details-section">
                <h3>스케줄</h3>
                <table class="member-details-table">
        `;
        memberSchedules.forEach((schedule, index) => {
            detailsHTML += `<tr><td>📅 스케줄 ${index + 1}:</td><td>${dayNames[schedule.day]} ${schedule.startTime}~${schedule.endTime}</td></tr>`;
        });
        detailsHTML += `
                </table>
            </div>
        `;
    }
    
    const allDates = getAllAttendanceDates(member);
    if (allDates.length > 0) {
        detailsHTML += `
            <div class="member-details-section">
                <h3>출석 기록 (전체 ${allDates.length}건)</h3>
                <div class="attendance-dates">
        `;
        const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a)).slice(0, 20);
        sortedDates.forEach(date => {
            const formattedDate = formatDate(date);
            detailsHTML += `<span class="attendance-date-badge">${formattedDate}</span>`;
        });
        if (allDates.length > 20) {
            detailsHTML += `<span style="font-size: 12px; color: #999; align-self: center;">+${allDates.length - 20}건 더...</span>`;
        }
        detailsHTML += `
                </div>
            </div>
        `;
    }

    // 수상경력 섹션 추가
    if (member.awards && member.awards.length > 0) {
        detailsHTML += `
            <div class="member-details-section">
                <h3>🏆 수상경력</h3>
                <div class="awards-details">
        `;
        member.awards.forEach((award, index) => {
            detailsHTML += `<div class="award-item">${index + 1}. ${award}</div>`;
        });
        detailsHTML += `
                </div>
            </div>
        `;
    }
    
    // 기타란 섹션 추가
    if (member.etc) {
        detailsHTML += `
            <div class="member-details-section">
                <h3>📝 기타</h3>
                <div class="etc-details">
                    ${member.etc.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    }

    detailsHTML += `
            </div>
            <div class="member-details-footer">
    `;
    
    // 수정 버튼은 잠금 해제 시에만 표시
    if (isUnlocked) {
        detailsHTML += `<button class="btn btn-edit" onclick="editMember(${index}); closeMemberDetails();">수정</button>`;
    }
    
    detailsHTML += `
                <button class="btn btn-secondary" onclick="closeMemberDetails()">닫기</button>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.id = 'memberDetailsModal';
    modal.className = 'modal active';
    modal.innerHTML = detailsHTML;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMemberDetails();
        }
    });
    
    resetLockTimer();
}

// 회원의 모든 출석 날짜 가져오기
function getAllAttendanceDates(member) {
    const history = member.attendanceHistory || [];
    const current = member.attendanceDates || [];
    const allSet = new Set([...history, ...current]);
    return Array.from(allSet);
}

function closeMemberDetails() {
    const modal = document.getElementById('memberDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// 회원 편집 폼 채우기 (이름 입력란으로 포커스 이동)
function editMember(index) {
    const member = members[index];
    
    // 폼 섹션에 수정 모드 클래스 추가 (선택사항)
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.classList.add('form-edit-mode');
    }
    
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

    setSelectedCoach(member.coach || ''); // coach.js에서 정의

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

// 스케줄 렌더링
function renderSchedule() {
    const scheduleEl = document.getElementById('scheduleContent');

    const scheduleByDay = {};
    daysOfWeek.forEach(day => {
        scheduleByDay[day] = [];
    });

    members.forEach(member => {
        // 새로운 schedules 배열 형식
        if (member.schedules && member.schedules.length > 0) {
            member.schedules.forEach(schedule => {
                if (schedule.day && schedule.startTime && schedule.endTime) {
                    scheduleByDay[schedule.day].push({
                        name: member.name,
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        coach: member.coach || ''
                    });
                }
            });
        } else {
            // 기존 day1, day2 형식 (하위 호환)
            if (member.day1 && member.startTime1 && member.endTime1) {
                scheduleByDay[member.day1].push({
                    name: member.name,
                    startTime: member.startTime1,
                    endTime: member.endTime1,
                    coach: member.coach || ''
                });
            }
            if (member.day2 && member.startTime2 && member.endTime2) {
                scheduleByDay[member.day2].push({
                    name: member.name,
                    startTime: member.startTime2,
                    endTime: member.endTime2,
                    coach: member.coach || ''
                });
            }
        }
    });

    let scheduleHTML = '';
    
    daysOfWeek.forEach(day => {
        const dayMembers = scheduleByDay[day];

        const timeSlots = {};
        dayMembers.forEach(member => {
            const timeKey = `${member.startTime}-${member.endTime}`;
            if (!timeSlots[timeKey]) {
                timeSlots[timeKey] = {
                    startTime: member.startTime,
                    endTime: member.endTime,
                    members: []
                };
            }
            timeSlots[timeKey].members.push({ name: member.name, coach: member.coach });
        });

        const sortedTimeSlots = Object.values(timeSlots).sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
        });

        scheduleHTML += `
            <div class="day-schedule">
                <div class="day-header">
                    <div class="day-name">
                        ${dayNames[day]}
                        <span class="day-count">${dayMembers.length}명</span>
                    </div>
                </div>
        `;

        if (sortedTimeSlots.length === 0) {
            scheduleHTML += `
                <div class="no-schedule">
                    등록된 스케줄이 없습니다
                </div>
            `;
        } else {
            sortedTimeSlots.forEach(slot => {
                scheduleHTML += `
                    <div class="time-slot">
                        <div class="time-range">${slot.startTime} ~ ${slot.endTime}</div>
                        <div class="time-members">
                            ${slot.members.map(m => {
                                const coachTag = m.coach ? `<span class="time-member-coach">${m.coach}</span>` : '';
                                return `<span class="time-member">${m.name}${coachTag}</span>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            });
        }

        scheduleHTML += `</div>`;
    });
    
    scheduleEl.innerHTML = scheduleHTML;
}

// 탭 전환
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll('.schedule-section').forEach(section => {
        section.classList.remove('active');
    });

    if (tabName === 'list') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('listSection').style.display = 'block';
        document.getElementById('scheduleSection').classList.remove('active');
    } else if (tabName === 'schedule') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('listSection').style.display = 'none';
        document.getElementById('scheduleSection').classList.add('active');
        renderSchedule();
    }
    resetLockTimer();
}