// 코치 pill 버튼 렌더링
function renderCoachButtons() {
    const container = document.getElementById('coachBtnGroup');
    container.innerHTML = '';

    const activeCoaches = settings.coaches.filter(name => name && name.trim() !== '');

    if (activeCoaches.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #999; padding: 8px 0;">코치가 등록되지 않았습니다. 관리자 설정에서 코치를 추가해주세요.</div>';
        return;
    }

    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = 'coach-btn active';
    noneBtn.dataset.value = '';
    noneBtn.textContent = '미선택';
    noneBtn.onclick = () => selectCoachBtn(noneBtn);
    container.appendChild(noneBtn);

    activeCoaches.forEach((name) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'coach-btn';
        btn.dataset.value = name;
        btn.textContent = name;
        btn.onclick = () => selectCoachBtn(btn);
        container.appendChild(btn);
    });
}

// 코치 버튼 선택 처리
function selectCoachBtn(clickedBtn) {
    document.querySelectorAll('.coach-btn').forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
}

// 선택된 코치 값 가져오기
function getSelectedCoach() {
    const active = document.querySelector('.coach-btn.active');
    return active ? active.dataset.value : '';
}

// 코치 버튼에 값 설정
function setSelectedCoach(coachName) {
    document.querySelectorAll('.coach-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === coachName);
    });
    const hasMatch = document.querySelector(`.coach-btn[data-value="${coachName}"]`);
    if (!hasMatch) {
        const noneBtn = document.querySelector('.coach-btn[data-value=""]');
        if (noneBtn) noneBtn.classList.add('active');
    }
}

// ========== 코치별 회원 목록 렌더링 함수들 ==========

// 코치별 회원 수 계산
function countMembersByCoach() {
    const coachCounts = {};
    const noCoachCount = { count: 0, name: '미선택' };
    
    members.forEach(member => {
        if (member.coach && member.coach.trim() !== '') {
            coachCounts[member.coach] = (coachCounts[member.coach] || 0) + 1;
        } else {
            noCoachCount.count++;
        }
    });
    
    return { coachCounts, noCoachCount };
}

// 코치별 회원 목록 렌더링
function renderMembersByCoach() {
    const listEl = document.getElementById('listSection');
    const countEl = document.getElementById('memberCount');
    
    // 코치별 회원 수 계산
    const { coachCounts, noCoachCount } = countMembersByCoach();
    
    // 총회원수 옆에 코치별 회원수 표시
    let countText = `${members.length}명`;
    
    // 코치별 회원수 추가 (코치가 있는 경우만)
    const activeCoaches = Object.keys(coachCounts);
    if (activeCoaches.length > 0) {
        const coachCountTexts = activeCoaches.map(coach => 
            `${coach}:${coachCounts[coach]}`
        );
        
        // 미선택 회원이 있는 경우 추가
        if (noCoachCount.count > 0) {
            coachCountTexts.push(`미선택:${noCoachCount.count}`);
        }
        
        countText += ` (${coachCountTexts.join(', ')})`;
    }
    
    countEl.textContent = countText;
    
    // 검색어 가져오기
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // 코치별로 회원 그룹화
    const membersByCoach = {};
    const noCoachMembers = [];
    
    // 검색어가 있는 경우 필터링
    let targetMembers = members;
    if (searchTerm) {
        targetMembers = members.filter(member => {
            return member.name.toLowerCase().includes(searchTerm) ||
                   (member.phone && String(member.phone).includes(searchTerm));
        });
    }
    
    // 코치별로 그룹화
    targetMembers.forEach(member => {
        if (member.coach && member.coach.trim() !== '') {
            if (!membersByCoach[member.coach]) {
                membersByCoach[member.coach] = [];
            }
            membersByCoach[member.coach].push(member);
        } else {
            noCoachMembers.push(member);
        }
    });
    
    // 모든 회원이 없으면 빈 상태 표시
    if (targetMembers.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
                <p>${searchTerm ? '검색 결과가 없습니다' : '등록된 회원이 없습니다'}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // 코치별로 섹션 생성 (코치 이름 순 정렬)
    const sortedCoaches = Object.keys(membersByCoach).sort();
    
    // 각 코치별 섹션
    sortedCoaches.forEach(coach => {
        const coachMembers = membersByCoach[coach];
        if (coachMembers.length === 0) return;
        
        // 코치별 회원 수
        const coachMemberCount = coachMembers.length;
        
        html += `
            <div class="coach-section">
                <div class="coach-section-header">
                    <div class="coach-title">
                        <span class="coach-badge">🏋️ ${coach}</span>
                        <span class="coach-count">${coachMemberCount}명</span>
                    </div>
                </div>
                <div class="coach-members-list">
                    ${renderCoachMembersList(coachMembers)}
                </div>
            </div>
        `;
    });
    
    // 미선택 회원 섹션 (있는 경우만)
    if (noCoachMembers.length > 0) {
        html += `
            <div class="coach-section">
                <div class="coach-section-header">
                    <div class="coach-title">
                        <span class="coach-badge">👤 미선택</span>
                        <span class="coach-count">${noCoachMembers.length}명</span>
                    </div>
                </div>
                <div class="coach-members-list">
                    ${renderCoachMembersList(noCoachMembers)}
                </div>
            </div>
        `;
    }
    
    listEl.innerHTML = html;
}

// 코치별 회원 목록 렌더링 (공통 함수)
function renderCoachMembersList(membersList) {
    return membersList.map((member, index) => {
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
                <span class="attendance-count" style="margin-left: 8px;">
                    📊 ${currentCount}/${targetCount}회
                </span>
            `;
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
                        ${scheduleBadges ? `<div class="schedule-container">${scheduleBadges}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}