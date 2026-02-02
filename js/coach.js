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