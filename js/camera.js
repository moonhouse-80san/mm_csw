let currentPhotoData = null;
let cameraStream = null;
let currentCameraType = 'environment'; // 'user'에서 'environment'로 변경 (후면 카메라 우선)

function switchCamera(cameraType) {
    currentCameraType = cameraType;

    document.getElementById('frontCameraBtn').classList.toggle('active', cameraType === 'user');
    document.getElementById('rearCameraBtn').classList.toggle('active', cameraType === 'environment');

    restartCamera();
}

async function restartCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: {
                facingMode: currentCameraType,
                width: { ideal: 1280 },
                height: { ideal: 1280 }
            },
            audio: false
        };

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('cameraVideo');
        video.srcObject = cameraStream;

        if (currentCameraType === 'user') {
            video.style.transform = 'scaleX(-1)';
        } else {
            video.style.transform = 'none';
        }
        
    } catch (error) {
        console.error('카메라 재시작 실패:', error);
        showAlert('카메라에 접근할 수 없습니다.');
    }
}

async function openCamera() {
    try {
        const constraints = {
            video: {
                facingMode: currentCameraType, // 기본값이 후면 카메라
                width: { ideal: 1280 },
                height: { ideal: 1280 }
            },
            audio: false
        };

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('cameraVideo');
        video.srcObject = cameraStream;

        if (currentCameraType === 'user') {
            video.style.transform = 'scaleX(-1)';
        }

        document.getElementById('cameraModal').classList.add('active');

    } catch (error) {
        console.error('카메라 접근 실패:', error);
        showAlert('카메라에 접근할 수 없습니다. 갤러리에서 사진을 선택해주세요.');
        document.getElementById('photoInput').click();
    }
}

function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const video = document.getElementById('cameraVideo');
    video.srcObject = null;
    video.style.transform = '';
    document.getElementById('cameraModal').classList.remove('active');
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = 400;
    canvas.height = 400;

    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = 1;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (videoAspect > canvasAspect) {
        drawHeight = video.videoHeight;
        drawWidth = video.videoHeight * canvasAspect;
        offsetX = (video.videoWidth - drawWidth) / 2;
        offsetY = 0;
    } else {
        drawWidth = video.videoWidth;
        drawHeight = video.videoWidth / canvasAspect;
        offsetX = 0;
        offsetY = (video.videoHeight - drawHeight) / 2;
    }

    context.drawImage(
        video, 
        offsetX, offsetY, drawWidth, drawHeight,
        0, 0, canvas.width, canvas.height
    );

    if (currentCameraType === 'user') {
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        tempContext.translate(canvas.width, 0);
        tempContext.scale(-1, 1);
        tempContext.drawImage(canvas, 0, 0);

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(tempCanvas, 0, 0);
    }

    canvas.toBlob((blob) => {
        if (blob) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentPhotoData = e.target.result;
                isPhotoRemoved = false; // 새 사진이 추가되었으므로 삭제 플래그 해제
                displayPhotoPreview();
                closeCamera();
                showAlert('사진이 촬영되었습니다!');
            };
            reader.readAsDataURL(blob);
        }
    }, 'image/jpeg', 0.8);
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showAlert('사진 크기는 5MB 이하여야 합니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = 400;
            canvas.height = 400;

            const scale = Math.max(400 / img.width, 400 / img.height);
            const newWidth = img.width * scale;
            const newHeight = img.height * scale;
            const x = (400 - newWidth) / 2;
            const y = (400 - newHeight) / 2;

            ctx.drawImage(img, x, y, newWidth, newHeight);

            currentPhotoData = canvas.toDataURL('image/jpeg', 0.8);
            isPhotoRemoved = false; // 새 사진이 추가되었으므로 삭제 플래그 해제
            displayPhotoPreview();
            showAlert('사진이 업로드되었습니다!');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function displayPhotoPreview() {
    const container = document.getElementById('photoPreviewContainer');
    const preview = document.getElementById('photoPreview');

    if (currentPhotoData) {
        preview.src = currentPhotoData;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function removePhoto() {
    currentPhotoData = null;
    isPhotoRemoved = true; // 삭제 플래그 설정
    displayPhotoPreview();
    document.getElementById('photoInput').value = '';
    showAlert('사진이 삭제되었습니다. 수정 버튼을 눌러 저장하세요.');
}