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
                    <select id="day${schedule.id}" data-schedule-id="${schedule.id}" data-field="day">
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
                               step="300">
                        <input type="time" id="endTime${schedule.id}" 
                               value="${schedule.endTime}" 
                               data-schedule-id="${schedule.id}" 
                               data-field="endTime"
                               step="300">
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // 이벤트 리스너 추가
    attachScheduleEventListeners();
}

// 스케줄 입력 이벤트 리스너 추가
function attachScheduleEventListeners() {
    document.querySelectorAll('[data-schedule-id]').forEach(element => {
        if (element.tagName === 'SELECT' || element.tagName === 'INPUT') {
            element.removeEventListener('change', updateScheduleData); // 중복 방지
            element.addEventListener('change', updateScheduleData);
        }
    });
}

// 스케줄 데이터 업데이트
function updateScheduleData(event) {
    const scheduleId = parseInt(event.target.dataset.scheduleId);
    const field = event.target.dataset.field;
    const value = event.target.value;
    
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
        schedule[field] = value;
        console.log('updateScheduleData - 스케줄 업데이트:', { scheduleId, field, value, schedule });
    }
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

// 스케줄 데이터 가져오기 (회원 추가/수정 시 사용)
function getSchedulesData() {
    // 현재 DOM에서 직접 값을 읽어옴
    const result = [];
    
    schedules.forEach(schedule => {
        const dayEl = document.getElementById(`day${schedule.id}`);
        const startTimeEl = document.getElementById(`startTime${schedule.id}`);
        const endTimeEl = document.getElementById(`endTime${schedule.id}`);
        
        if (dayEl && startTimeEl && endTimeEl) {
            const day = dayEl.value;
            const startTime = startTimeEl.value;
            const endTime = endTimeEl.value;
            
            // 모든 필드가 채워진 경우만 추가
            if (day && startTime && endTime) {
                result.push({
                    day: day,
                    startTime: startTime,
                    endTime: endTime
                });
            }
        }
    });
    
    console.log('getSchedulesData - 최종 결과:', result);
    return result;
}

// 스케줄 데이터 설정 (회원 편집 시 사용)
function setSchedulesData(memberSchedules) {
    console.log('setSchedulesData - 받은 데이터:', memberSchedules);
    
    if (!memberSchedules || memberSchedules.length === 0) {
        schedules = [
            { id: 1, day: '', startTime: '12:00', endTime: '12:20' },
            { id: 2, day: '', startTime: '12:00', endTime: '12:20' }
        ];
        nextScheduleId = 3;
    } else {
        schedules = memberSchedules.map((s, index) => ({
            id: index + 1,
            day: s.day || '',
            startTime: s.startTime || '12:00',
            endTime: s.endTime || '12:20'
        }));
        nextScheduleId = schedules.length + 1;
    }
    
    console.log('setSchedulesData - 설정된 스케줄:', schedules);
    renderSchedules();
}

// 스케줄 초기화 (폼 초기화 시 사용)
function resetSchedules() {
    schedules = [
        { id: 1, day: '', startTime: '12:00', endTime: '12:20' },
        { id: 2, day: '', startTime: '12:00', endTime: '12:20' }
    ];
    nextScheduleId = 3;
    console.log('resetSchedules - 스케줄 초기화됨');
    renderSchedules();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    renderSchedules();
    console.log('schedule.js - 초기화 완료');
});