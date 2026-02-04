[file content begin]
// 스케줄 관리 전역 변수
let schedules = [
    { id: 1, day: '', startTime: '12:00', endTime: '12:20' },
    { id: 2, day: '', startTime: '12:00', endTime: '12:20' }
];
let nextScheduleId = 3;

// 스케줄 렌더링
function renderSchedules() {
    const container = document.getElementById('schedulesContainer');
    
    container.innerHTML = schedules.map((schedule, index) => `
        <div class="schedule-item" data-schedule-id="${schedule.id}">
            <div class="schedule-section-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>📅 스케줄 ${index + 1}</span>
                ${schedules.length > 1 ? `
                    <button type="button" class="schedule-delete-btn" onclick="removeSchedule(${schedule.id})" title="삭제">
                        ×
                    </button>
                ` : ''}
            </div>
            <div class="form-grid" style="grid-template-columns: 1fr 2fr; margin-bottom: 10px;">
                <div class="form-group">
                    <label for="day${schedule.id}">요일</label>
                    <select id="day${schedule.id}" data-schedule-id="${schedule.id}" data-field="day" onchange="updateScheduleField(${schedule.id}, 'day', this.value)">
                        <option value="">요일 선택</option>
                        <option value="월" ${schedule.day === '월' ? 'selected' : ''}>월요일</option>
                        <option value="화" ${schedule.day === '화' ? 'selected' : ''}>화요일</option>
                        <option value="수" ${schedule.day === '수' ? 'selected' : ''}>수요일</option>
                        <option value="목" ${schedule.day === '목' ? 'selected' : ''}>목요일</option>
                        <option value="금" ${schedule.day === '금' ? 'selected' : ''}>금요일</option>
                        <option value="토" ${schedule.day === '토' ? 'selected' : ''}>토요일</option>
                        <option value="일" ${schedule.day === '일' ? 'selected' : ''}>일요일</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>시간</label>
                    <div class="time-group">
                        <input type="time" id="startTime${schedule.id}" 
                               value="${schedule.startTime}" 
                               data-schedule-id="${schedule.id}" 
                               data-field="startTime"
                               step="300"
                               onchange="updateScheduleField(${schedule.id}, 'startTime', this.value)">
                        <span style="font-weight: bold; color: #666;">~</span>
                        <input type="time" id="endTime${schedule.id}" 
                               value="${schedule.endTime}" 
                               data-schedule-id="${schedule.id}" 
                               data-field="endTime"
                               step="300"
                               onchange="updateScheduleField(${schedule.id}, 'endTime', this.value)">
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 스케줄 필드 업데이트 (명시적 호출)
function updateScheduleField(scheduleId, field, value) {
    console.log(`🔄 스케줄 업데이트: ID=${scheduleId}, 필드=${field}, 값=${value}`);
    
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
        schedule[field] = value;
        console.log(`✅ 스케줄 ${scheduleId} 업데이트 완료:`, schedule);
    }
    
    // 디버그: 현재 모든 스케줄 출력
    console.log('📋 현재 모든 스케줄:', schedules);
}

// 스케줄 추가
function addSchedule() {
    if (schedules.length >= 7) {
        showAlert('최대 7개의 스케줄까지 추가할 수 있습니다!');
        return;
    }
    
    schedules.push({
        id: nextScheduleId++,
        day: '',
        startTime: '12:00',
        endTime: '12:20'
    });
    
    renderSchedules();
    showAlert(`스케줄 ${schedules.length}이(가) 추가되었습니다!`);
}

// 스케줄 삭제
function removeSchedule(scheduleId) {
    if (schedules.length <= 1) {
        showAlert('최소 1개의 스케줄은 있어야 합니다!');
        return;
    }
    
    const index = schedules.findIndex(s => s.id === scheduleId);
    if (index !== -1) {
        schedules.splice(index, 1);
        renderSchedules();
        showAlert('스케줄이 삭제되었습니다!');
    }
}

// ⭐ 핵심 수정: 스케줄 데이터 가져오기 (회원 추가/수정 시 사용)
function getSchedulesData() {
    console.log('📋 getSchedulesData() 호출됨');
    
    // 1. schedules 배열에서 유효한 데이터만 필터링
    const validSchedules = schedules.filter(s => {
        const isValid = s.day && s.day !== '' && s.startTime && s.endTime;
        console.log(`🔍 스케줄 ${s.id} 유효성 체크:`, { day: s.day, startTime: s.startTime, endTime: s.endTime, isValid });
        return isValid;
    });
    
    console.log('✅ 유효한 스케줄:', validSchedules);
    
    // 2. 유효한 스케줄이 없으면 빈 배열 반환 (null이 아닌)
    if (validSchedules.length === 0) {
        console.log('⚠️ 유효한 스케줄이 없어서 빈 배열 반환');
        return [];
    }
    
    // 3. id 필드 제거하고 순수 데이터만 반환
    const cleanSchedules = validSchedules.map(s => ({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime
    }));
    
    console.log('💾 저장할 스케줄 데이터:', cleanSchedules);
    return cleanSchedules;
}

// 스케줄 데이터 설정 (회원 편집 시 사용)
function setSchedulesData(memberSchedules) {
    console.log('📥 setSchedulesData() 호출:', memberSchedules);
    
    if (!memberSchedules || memberSchedules.length === 0) {
        schedules = [
            { id: 1, day: '', startTime: '12:00', endTime: '12:20' },
            { id: 2, day: '', startTime: '12:00', endTime: '12:20' }
        ];
        nextScheduleId = 3;
    } else {
        // 기존 스케줄보다 많을 경우 추가 생성
        schedules = memberSchedules.map((s, index) => ({
            id: index + 1,
            day: s.day || '',
            startTime: s.startTime || '12:00',
            endTime: s.endTime || '12:20'
        }));
        
        // 추가 스케줄이 2개 미만이면 빈 스케줄 추가
        while (schedules.length < 2) {
            schedules.push({
                id: schedules.length + 1,
                day: '',
                startTime: '12:00',
                endTime: '12:20'
            });
        }
        
        nextScheduleId = schedules.length + 1;
    }
    renderSchedules();
}

// 스케줄 초기화 (폼 초기화 시 사용)
function resetSchedules() {
    console.log('🔄 스케줄 초기화');
    schedules = [
        { id: 1, day: '', startTime: '12:00', endTime: '12:20' },
        { id: 2, day: '', startTime: '12:00', endTime: '12:20' }
    ];
    nextScheduleId = 3;
    renderSchedules();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 schedule.js 로드됨');
    renderSchedules();
});
[file content end]