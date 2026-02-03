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
    // 모든 스케줄 입력 필드에 이벤트 리스너 추가
    document.querySelectorAll('[data-schedule-id]').forEach(element => {
        if (element.tagName === 'SELECT' || element.tagName === 'INPUT') {
            // change와 input 이벤트 모두 처리
            element.addEventListener('change', updateScheduleData);
            element.addEventListener('input', updateScheduleData);
        }
    });
}

// 스케줄 데이터 업데이트 (즉시 schedules 배열에 반영)
function updateScheduleData(event) {
    const scheduleId = parseInt(event.target.dataset.scheduleId);
    const field = event.target.dataset.field;
    const value = event.target.value;
    
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
        schedule[field] = value;
        // 디버깅용 로그
        console.log('✅ 스케줄 업데이트:', { 
            id: scheduleId, 
            field, 
            value, 
            현재스케줄: schedule,
            전체스케줄: schedules 
        });
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

// ⭐ 핵심 수정: 스케줄 데이터 가져오기 (회원 추가/수정 시 사용)
function getSchedulesData() {
    console.log('📋 getSchedulesData 호출됨');
    
    // 1. 폼에서 직접 최신 값을 읽어옴 (안전장치)
    const freshSchedules = schedules.map(schedule => {
        const dayEl = document.getElementById(`day${schedule.id}`);
        const startTimeEl = document.getElementById(`startTime${schedule.id}`);
        const endTimeEl = document.getElementById(`endTime${schedule.id}`);
        
        return {
            day: dayEl ? dayEl.value : schedule.day,
            startTime: startTimeEl ? startTimeEl.value : schedule.startTime,
            endTime: endTimeEl ? endTimeEl.value : schedule.endTime
        };
    });
    
    console.log('📝 폼에서 읽은 스케줄:', freshSchedules);
    
    // 2. 유효한 스케줄만 필터링 (요일, 시작시간, 종료시간이 모두 있는 것)
    const validSchedules = freshSchedules.filter(s => {
        const isValid = s.day && s.day !== '' && s.startTime && s.endTime;
        if (!isValid) {
            console.log('❌ 유효하지 않은 스케줄:', s);
        }
        return isValid;
    });
    
    console.log('✅ 유효한 스케줄:', validSchedules);
    
    // 3. 빈 배열이면 null 반환 (Firebase가 빈 배열을 저장하지 않는 문제 방지)
    if (validSchedules.length === 0) {
        console.log('⚠️ 유효한 스케줄이 없어서 null 반환');
        return null;
    }
    
    console.log('💾 저장할 스케줄 데이터:', validSchedules);
    return validSchedules;
}

// 스케줄 데이터 설정 (회원 편집 시 사용)
function setSchedulesData(memberSchedules) {
    console.log('📥 setSchedulesData 호출:', memberSchedules);
    
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