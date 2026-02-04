// member.js 파일의 showMemberDetails 함수 내에서 이메일과 생년 표시 부분 수정
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
    
    // 이메일 정보 (설정에 따라 표시)
    if (settings.showEmail && member.email) {
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
    
    // 생년 정보 추가 (설정에 따라 표시)
    if (settings.showBirthYear && member.birthYear) {
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